from rest_framework import serializers
from apps.accounts.models import User
from apps.listings.models import Listing
from apps.listings.serializers import ListingSerializer
from apps.orders.models import Order
from .models import Rating, Favorite, SavedSearch


# ─── RATINGS ──────────────────────────────────────────

class RatingSerializer(serializers.ModelSerializer):
    rater_name = serializers.SerializerMethodField()
    rater_initials = serializers.SerializerMethodField()
    rater_avatar = serializers.SerializerMethodField()
    ratee_name = serializers.SerializerMethodField()
    ratee_initials = serializers.SerializerMethodField()
    listing_name = serializers.SerializerMethodField()

    class Meta:
        model = Rating
        fields = (
            "id", "order", "direction", "stars", "comment",
            "rater", "rater_name", "rater_initials", "rater_avatar",
            "ratee", "ratee_name", "ratee_initials",
            "listing_name",
            "created_at",
        )
        read_only_fields = fields

    def _display(self, user):
        if not user:
            return ""
        bp = getattr(user, "business_profile", None)
        return bp.business_name if bp else user.full_name

    def get_rater_name(self, obj): return self._display(obj.rater)
    def get_rater_initials(self, obj): return obj.rater.initials
    def get_ratee_name(self, obj): return self._display(obj.ratee)
    def get_ratee_initials(self, obj): return obj.ratee.initials

    def get_rater_avatar(self, obj):
        request = self.context.get("request")
        if obj.rater.avatar and request:
            return request.build_absolute_uri(obj.rater.avatar.url)
        return None

    def get_listing_name(self, obj):
        return obj.order.listing_name if obj.order_id else None


class CreateRatingSerializer(serializers.Serializer):
    order = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all())
    stars = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        order = attrs["order"]
        user = self.context["request"].user

        # Only rate completed orders
        if order.status != Order.Status.COMPLETED:
            raise serializers.ValidationError("You can only rate completed orders.")

        # User must be a participant in this order
        if user.id == order.buyer_id:
            direction = Rating.Direction.BUYER_RATES_SELLER
            ratee = order.seller
        elif user.id == order.seller_id:
            direction = Rating.Direction.SELLER_RATES_BUYER
            ratee = order.buyer
        else:
            raise serializers.ValidationError("You did not participate in this order.")

        # Prevent duplicate rating
        if Rating.objects.filter(order=order, rater=user, direction=direction).exists():
            raise serializers.ValidationError("You have already rated this order.")

        attrs["direction"] = direction
        attrs["ratee"] = ratee
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        return Rating.objects.create(
            order=validated_data["order"],
            rater=user,
            ratee=validated_data["ratee"],
            direction=validated_data["direction"],
            stars=validated_data["stars"],
            comment=validated_data.get("comment", ""),
        )


# ─── FAVORITES ────────────────────────────────────────

class FavoriteSerializer(serializers.ModelSerializer):
    """Embed the full listing snapshot in each favorite for the frontend list."""
    listing = ListingSerializer(read_only=True)

    class Meta:
        model = Favorite
        fields = ("id", "listing", "created_at")
        read_only_fields = fields


# ─── SAVED SEARCHES ───────────────────────────────────

class SavedSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedSearch
        fields = (
            "id", "name",
            "search", "category", "price_min", "price_max",
            "expiry_days", "radius_km", "notify_email",
            "created_at", "last_run_at",
        )
        read_only_fields = ("id", "created_at", "last_run_at")
