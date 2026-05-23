import math
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from apps.core.responses import success, error
from apps.core.pagination import StandardPagination
from .models import Category, Listing
from .serializers import (
    CategorySerializer,
    ListingSerializer,
    CreateListingSerializer,
    UpdateListingSerializer,
)
from .filters import ListingFilter


def _parse_float(v):
    try:
        return float(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _haversine(lat1, lng1, listing):
    """Great-circle distance in km between buyer (lat1,lng1) and a listing's seller location."""
    bp = getattr(listing.seller, "business_profile", None) if listing.seller_id else None
    if not bp or bp.latitude is None or bp.longitude is None:
        return None
    lat2 = float(bp.latitude)
    lng2 = float(bp.longitude)
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


class CategoryListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        categories = Category.objects.all()
        return success(data=CategorySerializer(categories, many=True).data)


class ListingListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Listing.objects.select_related("seller", "seller__business_profile").prefetch_related("images")
        queryset = queryset.filter(status=Listing.Status.ACTIVE)

        # Hide the buyer's own listings — sellers shouldn't see their own products
        # in the public marketplace (use My Listings instead).
        if request.user.is_authenticated:
            queryset = queryset.exclude(seller=request.user)

        # Apply filters manually
        f = ListingFilter(request.GET, queryset=queryset)
        queryset = f.qs

        # Search
        search = request.GET.get("search", "")
        if search:
            queryset = queryset.filter(name__icontains=search)

        # Ordering
        ordering = request.GET.get("ordering", "-created_at")
        allowed = ["price", "-price", "created_at", "-created_at", "expiry_date", "-expiry_date"]
        if ordering in allowed:
            queryset = queryset.order_by(ordering)

        # ─── Geolocation: filter by Haversine distance if buyer provided lat/lng ──
        # Query: ?lat=31.95&lng=35.93&radius_km=10
        buyer_lat = _parse_float(request.GET.get("lat"))
        buyer_lng = _parse_float(request.GET.get("lng"))
        radius_km = _parse_float(request.GET.get("radius_km"))

        context = {"request": request}
        if buyer_lat is not None and buyer_lng is not None:
            # Materialize listings, compute distance, optionally filter, then resort
            all_listings = list(queryset)
            for li in all_listings:
                li._distance_km = _haversine(buyer_lat, buyer_lng, li)
            # Filter by radius
            if radius_km is not None and radius_km > 0:
                all_listings = [
                    li for li in all_listings
                    if li._distance_km is not None and li._distance_km <= radius_km
                ]
            # If no explicit ordering provided, sort by distance (closest first)
            if ordering not in allowed or ordering == "-created_at":
                all_listings.sort(key=lambda li: (li._distance_km is None, li._distance_km or 0))
            queryset = all_listings
            context["buyer_lat"] = buyer_lat
            context["buyer_lng"] = buyer_lng

        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ListingSerializer(page, many=True, context=context)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        if not request.user.is_authenticated:
            return error("Authentication required.", code="NOT_AUTHENTICATED", status=401)

        serializer = CreateListingSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return error("Please correct the errors below.", code="VALIDATION_ERROR",
                         fields=serializer.errors, status=400)
        listing = serializer.save()
        return success(
            data=ListingSerializer(listing, context={"request": request}).data,
            status=201,
        )


class ListingDetailView(APIView):
    permission_classes = [AllowAny]

    def _get_listing(self, pk):
        try:
            return Listing.objects.select_related(
                "seller", "seller__business_profile"
            ).prefetch_related("images").get(pk=pk)
        except Listing.DoesNotExist:
            return None

    def get(self, request, pk):
        listing = self._get_listing(pk)
        if not listing:
            return error("Listing not found.", code="NOT_FOUND", status=404)
        # Increment views
        Listing.objects.filter(pk=pk).update(views_count=listing.views_count + 1)
        return success(data=ListingSerializer(listing, context={"request": request}).data)

    def patch(self, request, pk):
        listing = self._get_listing(pk)
        if not listing:
            return error("Listing not found.", code="NOT_FOUND", status=404)
        if listing.seller != request.user:
            return error("You can only edit your own listings.", code="PERMISSION_DENIED", status=403)

        serializer = UpdateListingSerializer(listing, data=request.data, partial=True)
        if not serializer.is_valid():
            return error("Please correct the errors below.", code="VALIDATION_ERROR",
                         fields=serializer.errors, status=400)
        listing = serializer.save()
        return success(data=ListingSerializer(listing, context={"request": request}).data)

    def delete(self, request, pk):
        listing = self._get_listing(pk)
        if not listing:
            return error("Listing not found.", code="NOT_FOUND", status=404)
        if listing.seller != request.user:
            return error("You can only delete your own listings.", code="PERMISSION_DENIED", status=403)
        listing.delete()
        return success(data={"message": "Listing deleted successfully."})


class MyListingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            Listing.objects
            .filter(seller=request.user)
            .select_related("seller", "seller__business_profile", "category")
            .prefetch_related("images")
            .order_by("-created_at")
        )

        # Apply the shared filter (status, search, category, price_min/max, expiry_days)
        f = ListingFilter(request.GET, queryset=queryset)
        queryset = f.qs

        # Allow client-controlled ordering, but only on safe fields
        ordering = request.GET.get("ordering")
        allowed = {"price", "-price", "created_at", "-created_at",
                   "expiry_date", "-expiry_date", "views_count", "-views_count"}
        if ordering in allowed:
            queryset = queryset.order_by(ordering)

        # Paginate
        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ListingSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class DashboardMetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.orders.models import Order
        from apps.conversations.models import Message
        user = request.user
        active_qs = Listing.objects.filter(seller=user, status=Listing.Status.ACTIVE)
        reserved_qs = Listing.objects.filter(seller=user, status=Listing.Status.RESERVED)
        expiring_qs = active_qs.filter(expiry_date__isnull=False)

        active_value = sum(float(l.price) * l.quantity_available for l in active_qs)

        # Waste redirected (kg): completed orders × their listing's unit weight, plus
        # the kg of any currently Reserved listings (in-flight off-market inventory).
        completed_orders = Order.objects.filter(seller=user, status=Order.Status.COMPLETED)
        waste_kg = sum(l.weight_kg for l in reserved_qs)
        for o in completed_orders.select_related("listing"):
            if o.listing:
                per_unit = Listing.UNIT_KG_CONVERSION.get(o.listing.unit, 0)
                waste_kg += float(o.quantity) * per_unit

        expiring_count = sum(1 for l in expiring_qs if l.is_expiring)

        # Pending orders the seller needs to act on
        pending_orders = Order.objects.filter(
            seller=user, status=Order.Status.PENDING
        ).count()

        # Total revenue = sum of completed order totals
        total_revenue = sum(
            float(o.total_price) for o in completed_orders
        )

        return success(data={
            "active_listings": active_qs.count(),
            "total_listings": Listing.objects.filter(seller=user).count(),
            "active_value": round(active_value, 2),
            "waste_redirected_kg": round(waste_kg, 2),
            "waste_redirected_display": _format_weight(waste_kg),
            "expiring_soon": expiring_count,
            "pending_orders": pending_orders,
            "unread_messages": Message.objects.filter(
                conversation__participants=user,
                read_at__isnull=True,
            ).exclude(sender_id=user.id).count(),
            "total_revenue": f"{total_revenue:.2f}",
        })


def _format_weight(kg: float) -> str:
    """Human-readable weight: '1.40 Tons' / '450.00 kg'."""
    if kg >= 1000:
        return f"{kg / 1000:.2f} Tons"
    return f"{kg:.2f} kg"
