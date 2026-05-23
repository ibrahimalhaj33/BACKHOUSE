from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny

from apps.core.responses import success, error
from apps.core.pagination import StandardPagination
from apps.listings.models import Listing
from apps.listings.serializers import ListingSerializer
from apps.listings.filters import ListingFilter
from apps.orders.models import Order
from .models import Rating, Favorite, SavedSearch
from .serializers import (
    RatingSerializer, CreateRatingSerializer,
    FavoriteSerializer,
    SavedSearchSerializer,
)


# ─── RATINGS ─────────────────────────────────────────

class RatingListView(APIView):
    """GET: list current user's ratings (received + given). POST: create a rating."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        kind = request.GET.get("type", "received")  # received | given | both
        user = request.user

        if kind == "given":
            qs = Rating.objects.filter(rater=user)
        elif kind == "both":
            qs = Rating.objects.filter(rater=user) | Rating.objects.filter(ratee=user)
        else:
            qs = Rating.objects.filter(ratee=user)

        qs = qs.select_related("rater", "ratee", "order",
                               "rater__business_profile", "ratee__business_profile")

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = RatingSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = CreateRatingSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return error("Please correct the errors below.",
                         code="VALIDATION_ERROR", fields=serializer.errors, status=400)
        rating = serializer.save()
        return success(
            data=RatingSerializer(rating, context={"request": request}).data,
            status=201,
        )


class RatingSummaryView(APIView):
    """GET: summary stats for the current user's received ratings."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        received = Rating.objects.filter(ratee=user)

        breakdown = {str(s): received.filter(stars=s).count() for s in range(1, 6)}

        # Last 30 days delta
        from datetime import timedelta
        cutoff = timezone.now() - timedelta(days=30)
        recent_count = received.filter(created_at__gte=cutoff).count()

        return success(data={
            "average": float(user.rating),
            "total": int(user.total_reviews),
            "recent_30d": recent_count,
            "breakdown": breakdown,
        })


class PendingRatingsView(APIView):
    """GET: completed orders the user hasn't rated yet (so the UI can prompt them)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Orders where user participated as buyer or seller, status=COMPLETED, not yet rated
        as_buyer = Order.objects.filter(buyer=user, status=Order.Status.COMPLETED).exclude(
            ratings__rater=user, ratings__direction=Rating.Direction.BUYER_RATES_SELLER,
        )
        as_seller = Order.objects.filter(seller=user, status=Order.Status.COMPLETED).exclude(
            ratings__rater=user, ratings__direction=Rating.Direction.SELLER_RATES_BUYER,
        )
        pending = (as_buyer | as_seller).distinct().select_related("listing", "buyer", "seller")
        # Return minimal fields (id + names + counterpart) — frontend already has full order in My Purchases
        data = [{
            "order_id": o.id,
            "listing_name": o.listing_name,
            "counterpart_id": o.seller_id if o.buyer_id == user.id else o.buyer_id,
            "counterpart_name": (o.seller.full_name if o.buyer_id == user.id else o.buyer.full_name),
            "completed_at": o.updated_at,
            "i_am": "buyer" if o.buyer_id == user.id else "seller",
        } for o in pending]
        return success(data=data)


# ─── FAVORITES ───────────────────────────────────────

class FavoriteListView(APIView):
    """GET: paginated list of my favorites. POST: add a favorite by listing_id."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Favorite.objects.filter(user=request.user)
            .select_related("listing", "listing__seller", "listing__seller__business_profile", "listing__category")
            .prefetch_related("listing__images")
        )
        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = FavoriteSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        listing_id = request.data.get("listing")
        if not listing_id:
            return error("listing id required.", code="VALIDATION_ERROR", status=400)
        try:
            listing = Listing.objects.get(pk=listing_id)
        except Listing.DoesNotExist:
            return error("Listing not found.", code="NOT_FOUND", status=404)
        fav, created = Favorite.objects.get_or_create(user=request.user, listing=listing)
        return success(
            data=FavoriteSerializer(fav, context={"request": request}).data,
            status=201 if created else 200,
        )


class FavoriteToggleView(APIView):
    """POST: toggle a listing in my favorites. Returns {favorited: bool, total}."""
    permission_classes = [IsAuthenticated]

    def post(self, request, listing_id):
        try:
            listing = Listing.objects.get(pk=listing_id)
        except Listing.DoesNotExist:
            return error("Listing not found.", code="NOT_FOUND", status=404)
        fav = Favorite.objects.filter(user=request.user, listing=listing).first()
        if fav:
            fav.delete()
            favorited = False
        else:
            Favorite.objects.create(user=request.user, listing=listing)
            favorited = True
        total = Favorite.objects.filter(user=request.user).count()
        return success(data={"favorited": favorited, "total": total, "listing_id": listing.id})


class FavoriteIdsView(APIView):
    """GET: just the set of listing IDs the user has favorited (for fast UI hydration)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ids = list(
            Favorite.objects.filter(user=request.user).values_list("listing_id", flat=True)
        )
        return success(data={"ids": ids})


class FavoriteDeleteView(APIView):
    """DELETE: remove a favorite by id."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            fav = Favorite.objects.get(pk=pk, user=request.user)
        except Favorite.DoesNotExist:
            return error("Favorite not found.", code="NOT_FOUND", status=404)
        fav.delete()
        return success(data={"message": "Removed from favorites."})


# ─── SAVED SEARCHES ──────────────────────────────────

class SavedSearchListView(APIView):
    """GET: my saved searches. POST: create one."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = SavedSearch.objects.filter(user=request.user)
        serializer = SavedSearchSerializer(qs, many=True)
        return success(data=serializer.data)

    def post(self, request):
        serializer = SavedSearchSerializer(data=request.data)
        if not serializer.is_valid():
            return error("Please correct the errors below.",
                         code="VALIDATION_ERROR", fields=serializer.errors, status=400)
        obj = serializer.save(user=request.user)
        return success(data=SavedSearchSerializer(obj).data, status=201)


class SavedSearchDetailView(APIView):
    """GET / PATCH / DELETE a single saved search."""
    permission_classes = [IsAuthenticated]

    def _get(self, pk, user):
        try:
            return SavedSearch.objects.get(pk=pk, user=user)
        except SavedSearch.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self._get(pk, request.user)
        if not obj:
            return error("Saved search not found.", code="NOT_FOUND", status=404)
        return success(data=SavedSearchSerializer(obj).data)

    def patch(self, request, pk):
        obj = self._get(pk, request.user)
        if not obj:
            return error("Saved search not found.", code="NOT_FOUND", status=404)
        serializer = SavedSearchSerializer(obj, data=request.data, partial=True)
        if not serializer.is_valid():
            return error("Please correct the errors below.",
                         code="VALIDATION_ERROR", fields=serializer.errors, status=400)
        serializer.save()
        return success(data=SavedSearchSerializer(obj).data)

    def delete(self, request, pk):
        obj = self._get(pk, request.user)
        if not obj:
            return error("Saved search not found.", code="NOT_FOUND", status=404)
        obj.delete()
        return success(data={"message": "Saved search deleted."})


class RunSavedSearchView(APIView):
    """GET: run a saved search and return matching listings (paginated)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            saved = SavedSearch.objects.get(pk=pk, user=request.user)
        except SavedSearch.DoesNotExist:
            return error("Saved search not found.", code="NOT_FOUND", status=404)

        queryset = (
            Listing.objects.filter(status=Listing.Status.ACTIVE)
            .select_related("seller", "seller__business_profile", "category")
            .prefetch_related("images")
        )
        # Apply filters using ListingFilter
        params = saved.to_query_params()
        f = ListingFilter(params, queryset=queryset)
        queryset = f.qs

        # Update last_run_at
        saved.last_run_at = timezone.now()
        saved.save(update_fields=["last_run_at"])

        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ListingSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)
