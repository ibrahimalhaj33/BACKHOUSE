from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.core.responses import success, error
from apps.core.pagination import StandardPagination
from apps.listings.models import Listing
from .models import Order, OrderStatusHistory
from .serializers import (
    OrderSerializer,
    CreateOrderSerializer,
    UpdateOrderStatusSerializer,
)


# ─── Sustainability tier thresholds (kg of waste diverted) ───
TIER_THRESHOLDS = [
    (1000, "Sustainability Champion", "workspace_premium"),
    (200,  "Waste Guardian",          "auto_awesome"),
    (50,   "Eco Conscious",           "eco"),
    (0,    "Starter",                 "spa"),
]


def _tier_for_kg(kg):
    for threshold, label, icon in TIER_THRESHOLDS:
        if kg >= threshold:
            return {"label": label, "icon": icon, "threshold": threshold}
    return {"label": "Starter", "icon": "spa", "threshold": 0}


# Surplus marketplace assumption: items sell at ~70% of retail, so each JOD spent
# represents ~0.43 JOD saved vs. retail (0.30 / 0.70). Adjust if you have real retail prices.
SAVINGS_MULTIPLIER = 0.43


# ─── Role-based status transitions ──────────────────────────
# What each role is allowed to transition the order TO from its current state.
SELLER_ALLOWED = {
    Order.Status.PENDING: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.PICKUP_SCHEDULED, Order.Status.COMPLETED, Order.Status.CANCELLED},
    # Allow self-transition for reschedule (same status, different pickup_date)
    Order.Status.PICKUP_SCHEDULED: {Order.Status.PICKUP_SCHEDULED, Order.Status.COMPLETED, Order.Status.CANCELLED},
}
BUYER_ALLOWED = {
    Order.Status.PENDING: {Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.CANCELLED},
}

# Seller transitions that require the listing to still be able to fulfill the order
FULFILLMENT_TRANSITIONS = {
    Order.Status.CONFIRMED,
    Order.Status.PICKUP_SCHEDULED,
    Order.Status.COMPLETED,
}


def _can_fulfill(order):
    """Check that the underlying listing can still satisfy the order quantity."""
    if not order.listing:
        return False, "The original listing no longer exists. Cancel this order."
    listing = order.listing
    if listing.status in (Listing.Status.INACTIVE, Listing.Status.EXPIRED):
        return False, f"Listing is {listing.status.lower()} — cannot proceed. Reactivate it or cancel the order."
    if listing.quantity_available < order.quantity:
        return (False,
                f"Insufficient stock: {listing.quantity_available} {listing.unit} available, "
                f"but order needs {order.quantity}.")
    return True, ""


class OrderListView(APIView):
    """POST: buyer creates an order."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return error("Please correct the errors below.",
                         code="VALIDATION_ERROR", fields=serializer.errors, status=400)
        order = serializer.save()
        OrderStatusHistory.objects.create(
            order=order, to_status=order.status, changed_by=request.user,
            note="Order placed",
        )
        return success(
            data=OrderSerializer(order, context={"request": request}).data,
            status=201,
        )


class MyPurchasesView(APIView):
    """GET: current user's purchases (orders they placed as a buyer)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Order.objects.filter(buyer=request.user)
            .select_related("buyer", "seller", "seller__business_profile",
                            "listing")
            .prefetch_related("listing__images")
        )

        status_filter = request.GET.get("status")
        if status_filter:
            qs = qs.filter(status__iexact=status_filter)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = OrderSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class MySalesView(APIView):
    """GET: orders placed on the current user's listings (seller view)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Order.objects.filter(seller=request.user)
            .select_related("buyer", "buyer__business_profile",
                            "seller", "listing")
            .prefetch_related("listing__images")
        )

        status_filter = request.GET.get("status")
        if status_filter:
            qs = qs.filter(status__iexact=status_filter)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = OrderSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class SellerDashboardView(APIView):
    """GET: aggregate sales metrics for the current seller."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta

        user = request.user
        all_orders = Order.objects.filter(seller=user)
        completed = all_orders.filter(status=Order.Status.COMPLETED).select_related("listing")

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

        # Monthly revenue (this calendar month vs last)
        this_month_orders = completed.filter(created_at__gte=month_start)
        last_month_orders = completed.filter(created_at__gte=prev_month_start, created_at__lt=month_start)
        this_month_revenue = sum(float(o.total_price) for o in this_month_orders)
        last_month_revenue = sum(float(o.total_price) for o in last_month_orders)
        revenue_trend = _percent_change(last_month_revenue, this_month_revenue)

        # Waste diverted this month → CO2 equivalent
        this_month_kg = 0.0
        for o in this_month_orders:
            if o.listing:
                per_unit = Listing.UNIT_KG_CONVERSION.get(o.listing.unit, 0)
                this_month_kg += float(o.quantity) * per_unit
        this_month_co2 = this_month_kg * 2.5  # ~2.5 kg CO2 per kg waste

        # All-time waste diverted (used for warehouse space)
        all_time_kg = 0.0
        for o in completed:
            if o.listing:
                per_unit = Listing.UNIT_KG_CONVERSION.get(o.listing.unit, 0)
                all_time_kg += float(o.quantity) * per_unit
        # Warehouse space: rough conversion ~1.3 sq.ft per kg of typical stored goods
        space_sqft = all_time_kg * 1.3
        space_target = 1000

        # Circular efficiency = % of seller's listings that have at least one completed order
        seller_listings = Listing.objects.filter(seller=user)
        total_listings = seller_listings.count()
        sold_listings = (
            seller_listings.filter(orders__status=Order.Status.COMPLETED).distinct().count()
        )
        circular_efficiency = (
            (sold_listings / total_listings * 100) if total_listings else 0
        )

        # Status counts for tab badges
        status_counts = {
            "pending":           all_orders.filter(status=Order.Status.PENDING).count(),
            "confirmed":         all_orders.filter(status=Order.Status.CONFIRMED).count(),
            "pickup_scheduled":  all_orders.filter(status=Order.Status.PICKUP_SCHEDULED).count(),
            "completed":         all_orders.filter(status=Order.Status.COMPLETED).count(),
            "cancelled":         all_orders.filter(status=Order.Status.CANCELLED).count(),
        }

        return success(data={
            # Hero
            "monthly_co2_kg": round(this_month_co2, 2),
            "monthly_co2_display": _format_co2(this_month_co2),
            # Sales Performance card
            "monthly_revenue": round(this_month_revenue, 2),
            "monthly_revenue_display": _format_currency(this_month_revenue),
            "monthly_revenue_trend_pct": round(revenue_trend, 1),
            "circular_efficiency_pct": round(circular_efficiency, 1),
            "sold_listings": sold_listings,
            "total_listings": total_listings,
            # Warehouse Space Saved
            "space_saved_sqft": round(space_sqft, 0),
            "space_target_sqft": space_target,
            "space_progress_pct": min(round(space_sqft / space_target * 100, 0), 100),
            # Tab counts
            "status_counts": status_counts,
        })


def _percent_change(old, new):
    if old == 0:
        return 100.0 if new > 0 else 0.0
    return (new - old) / old * 100


def _format_co2(kg):
    if kg >= 1000:
        return f"{kg / 1000:.1f}t CO2e"
    return f"{kg:.0f}kg CO2e"


class ConfirmPickupView(APIView):
    """POST: buyer confirms the seller's proposed pickup time."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return error("Order not found.", code="NOT_FOUND", status=404)
        if order.buyer_id != request.user.id:
            return error("Only the buyer can confirm their own pickup.",
                         code="PERMISSION_DENIED", status=403)
        if order.status != Order.Status.PICKUP_SCHEDULED:
            return error("This order has no scheduled pickup to confirm.",
                         code="INVALID_STATE", status=400)
        if not order.pickup_date:
            return error("No pickup date is set on this order.",
                         code="INVALID_STATE", status=400)

        if not order.buyer_confirmed_pickup:
            order.buyer_confirmed_pickup = True
            order.save(update_fields=["buyer_confirmed_pickup", "updated_at"])
            OrderStatusHistory.objects.create(
                order=order, from_status=order.status, to_status=order.status,
                changed_by=request.user, note="Buyer confirmed pickup time",
            )
        return success(data=OrderSerializer(order, context={"request": request}).data)


class BuyerScorecardView(APIView):
    """GET: buyer's sustainability metrics (waste diverted, savings, tier)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        completed = (
            Order.objects
            .filter(buyer=request.user, status=Order.Status.COMPLETED)
            .select_related("listing")
        )

        # Total waste diverted (kg) — based on each completed order's listing unit weight
        waste_kg = 0.0
        for o in completed:
            if o.listing:
                per_unit = Listing.UNIT_KG_CONVERSION.get(o.listing.unit, 0)
                waste_kg += float(o.quantity) * per_unit

        # Total spent across all completed orders
        total_spent = sum(float(o.total_price) for o in completed)

        # Estimated procurement savings vs retail (surplus is sold at a discount)
        procurement_savings = total_spent * SAVINGS_MULTIPLIER

        # CO2 estimate: ~2.5 kg CO2 per kg of food waste avoided (rough industry avg)
        co2_kg = waste_kg * 2.5

        tier = _tier_for_kg(waste_kg)

        # Distance to next tier
        next_tier = None
        for threshold, label, icon in reversed(TIER_THRESHOLDS):
            if threshold > waste_kg:
                next_tier = {
                    "label": label,
                    "threshold": threshold,
                    "kg_remaining": round(threshold - waste_kg, 2),
                }
                break

        return success(data={
            "waste_diverted_kg": round(waste_kg, 2),
            "waste_diverted_display": _format_kg(waste_kg),
            "co2_avoided_kg": round(co2_kg, 2),
            "total_spent": round(total_spent, 2),
            "procurement_savings": round(procurement_savings, 2),
            "procurement_savings_display": _format_currency(procurement_savings),
            "completed_orders": completed.count(),
            "tier": tier,
            "next_tier": next_tier,
        })


def _format_kg(kg: float) -> str:
    if kg >= 1000:
        return f"{kg / 1000:.2f} tons"
    if kg >= 1:
        return f"{kg:.0f} kg"
    return f"{kg:.2f} kg"


def _format_currency(amount: float) -> str:
    if amount >= 1000:
        return f"{amount / 1000:.1f}k JOD"
    return f"{amount:.2f} JOD"


class OrderDetailView(APIView):
    """GET / PATCH / DELETE a single order."""
    permission_classes = [IsAuthenticated]

    def _get(self, pk, user):
        try:
            order = Order.objects.select_related(
                "buyer", "seller", "listing",
                "buyer__business_profile", "seller__business_profile",
            ).get(pk=pk)
        except Order.DoesNotExist:
            return None
        if order.buyer_id != user.id and order.seller_id != user.id:
            return False  # exists but not theirs
        return order

    def get(self, request, pk):
        order = self._get(pk, request.user)
        if order is None:
            return error("Order not found.", code="NOT_FOUND", status=404)
        if order is False:
            return error("You don't have access to this order.",
                         code="PERMISSION_DENIED", status=403)
        return success(data=OrderSerializer(order, context={"request": request}).data)

    def patch(self, request, pk):
        order = self._get(pk, request.user)
        if order is None:
            return error("Order not found.", code="NOT_FOUND", status=404)
        if order is False:
            return error("You don't have access to this order.",
                         code="PERMISSION_DENIED", status=403)

        serializer = UpdateOrderStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return error("Invalid update.", code="VALIDATION_ERROR",
                         fields=serializer.errors, status=400)

        new_status = serializer.validated_data["status"]
        is_buyer = order.buyer_id == request.user.id
        is_seller = order.seller_id == request.user.id
        allowed = (BUYER_ALLOWED if is_buyer else SELLER_ALLOWED).get(order.status, set())

        if new_status not in allowed:
            return error(
                f"Cannot transition from '{order.status}' to '{new_status}'.",
                code="INVALID_TRANSITION", status=400,
            )

        # If the seller is moving toward fulfillment, the listing must still be able to deliver
        if is_seller and new_status in FULFILLMENT_TRANSITIONS:
            ok, reason = _can_fulfill(order)
            if not ok:
                return error(reason, code="LISTING_UNAVAILABLE", status=400)

        old_status = order.status

        if new_status == Order.Status.COMPLETED:
            order.mark_completed()  # also decrements listing inventory
        else:
            order.status = new_status
            pickup = serializer.validated_data.get("pickup_date")
            if pickup is not None:
                # New/changed pickup time → buyer must re-confirm
                if order.pickup_date != pickup:
                    order.buyer_confirmed_pickup = False
                order.pickup_date = pickup
            notes = serializer.validated_data.get("notes")
            if notes is not None:
                order.notes = notes
            order.save()

        OrderStatusHistory.objects.create(
            order=order, from_status=old_status, to_status=new_status,
            changed_by=request.user,
            note=serializer.validated_data.get("notes", ""),
        )

        return success(data=OrderSerializer(order, context={"request": request}).data)

    def delete(self, request, pk):
        """Convenience cancel — same as PATCH status=cancelled."""
        order = self._get(pk, request.user)
        if order is None:
            return error("Order not found.", code="NOT_FOUND", status=404)
        if order is False:
            return error("You don't have access to this order.",
                         code="PERMISSION_DENIED", status=403)
        if order.status in (Order.Status.COMPLETED, Order.Status.CANCELLED):
            return error("Cannot cancel a completed/cancelled order.",
                         code="INVALID_TRANSITION", status=400)
        old_status = order.status
        order.cancel()
        OrderStatusHistory.objects.create(
            order=order, from_status=old_status, to_status=Order.Status.CANCELLED,
            changed_by=request.user, note="Cancelled",
        )
        return success(data={"message": "Order cancelled."})
