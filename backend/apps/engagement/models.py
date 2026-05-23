from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.listings.models import Listing
from apps.orders.models import Order


class Rating(models.Model):
    """
    A 1-5 star rating left by a user about another user, tied to a completed order.
    """
    class Direction(models.TextChoices):
        BUYER_RATES_SELLER = "buyer_to_seller", "Buyer → Seller"
        SELLER_RATES_BUYER = "seller_to_buyer", "Seller → Buyer"

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="ratings"
    )
    rater = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="ratings_given",
    )
    ratee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="ratings_received",
    )
    direction = models.CharField(max_length=20, choices=Direction.choices)
    stars = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ratings"
        ordering = ["-created_at"]
        # Each user can only rate once per order in a given direction
        constraints = [
            models.UniqueConstraint(
                fields=["order", "rater", "direction"],
                name="unique_rating_per_order_direction_rater",
            )
        ]

    def __str__(self):
        return f"{self.rater_id} → {self.ratee_id}: {self.stars}★ on Order #{self.order_id}"


class Favorite(models.Model):
    """A listing saved to the user's favorites."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="favorites",
    )
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="favorited_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "favorites"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "listing"],
                name="unique_favorite_per_user_listing",
            )
        ]

    def __str__(self):
        return f"{self.user_id} ♥ Listing #{self.listing_id}"


class SavedSearch(models.Model):
    """
    A reusable search filter the user wants to revisit. Stored as a structured
    set of filter fields plus optional name.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="saved_searches",
    )
    name = models.CharField(max_length=120, blank=True)

    # Filter parameters — same keys the listings endpoint understands
    search = models.CharField(max_length=255, blank=True)
    category = models.CharField(max_length=120, blank=True)
    price_min = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_max = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expiry_days = models.PositiveIntegerField(null=True, blank=True)
    radius_km = models.PositiveIntegerField(null=True, blank=True)

    notify_email = models.BooleanField(default=False, help_text="Email me when new matching listings appear.")

    created_at = models.DateTimeField(auto_now_add=True)
    last_run_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "saved_searches"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name or f"Saved search #{self.pk}"

    def to_query_params(self):
        """Return the filter as a dict ready to send to /api/listings/."""
        params = {}
        if self.search: params["search"] = self.search
        if self.category: params["category"] = self.category
        if self.price_min is not None: params["price_min"] = str(self.price_min)
        if self.price_max is not None: params["price_max"] = str(self.price_max)
        if self.expiry_days: params["expiry_days"] = str(self.expiry_days)
        return params
