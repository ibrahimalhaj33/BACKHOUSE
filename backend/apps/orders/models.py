from decimal import Decimal
from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from apps.listings.models import Listing


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PICKUP_SCHEDULED = "pickup_scheduled", "Pickup Scheduled"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="purchases",
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sales",
    )
    listing = models.ForeignKey(
        Listing,
        on_delete=models.SET_NULL,   # keep order history even if listing deleted
        null=True,
        related_name="orders",
    )

    # Snapshot fields — captured at time of order so historical accuracy is preserved
    listing_name = models.CharField(max_length=255)
    listing_sku = models.CharField(max_length=100, blank=True)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    pickup_date = models.DateTimeField(null=True, blank=True)
    buyer_confirmed_pickup = models.BooleanField(
        default=False,
        help_text="True once the buyer has confirmed the seller's proposed pickup time.",
    )
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.pk} — {self.listing_name} ({self.status})"

    @transaction.atomic
    def mark_completed(self):
        """Mark order completed and decrement the underlying listing's inventory."""
        if self.status == self.Status.COMPLETED:
            return
        self.status = self.Status.COMPLETED
        self.save(update_fields=["status", "updated_at"])
        if self.listing:
            # Decrement seller's stock; the Listing.save() hook will auto-deactivate at 0
            new_qty = max(0, self.listing.quantity_available - self.quantity)
            self.listing.quantity_available = new_qty
            self.listing.save()

    def cancel(self):
        self.status = self.Status.CANCELLED
        self.save(update_fields=["status", "updated_at"])


class OrderStatusHistory(models.Model):
    """Audit trail for status changes — used for buyer/seller transparency."""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "order_status_history"
        ordering = ["-created_at"]
