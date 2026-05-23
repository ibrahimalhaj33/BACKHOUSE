from decimal import Decimal
from rest_framework import serializers
from apps.listings.models import Listing
from .models import Order


class OrderSerializer(serializers.ModelSerializer):
    """Read-only view of an order, including buyer/seller display info."""
    buyer_name = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    listing_image = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    pickup_date_display = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "buyer", "buyer_name",
            "seller", "seller_name",
            "listing", "listing_name", "listing_sku", "listing_image",
            "quantity", "unit_price", "total_price", "price",
            "status",
            "pickup_date", "pickup_date_display", "buyer_confirmed_pickup",
            "notes",
            "created_at", "updated_at",
        )
        read_only_fields = fields  # writes happen through dedicated serializers

    def _user_display(self, user):
        if not user:
            return ""
        bp = getattr(user, "business_profile", None)
        return bp.business_name if bp else user.full_name

    def get_buyer_name(self, obj):
        return self._user_display(obj.buyer)

    def get_seller_name(self, obj):
        return self._user_display(obj.seller)

    def get_listing_image(self, obj):
        request = self.context.get("request")
        if obj.listing:
            img = obj.listing.images.filter(is_primary=True).first() or obj.listing.images.first()
            if img and request:
                return request.build_absolute_uri(img.image.url)
        return None

    def get_price(self, obj):
        return f"{obj.total_price:.2f} JOD"

    def get_pickup_date_display(self, obj):
        if not obj.pickup_date:
            return None
        # Convert to the server's local timezone (Asia/Amman) for human display
        from django.utils import timezone
        return timezone.localtime(obj.pickup_date).strftime("%a, %b %d %I:%M %p")


class CreateOrderSerializer(serializers.Serializer):
    """Buyer-side: place an order on a listing."""
    listing = serializers.PrimaryKeyRelatedField(queryset=Listing.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        listing = attrs["listing"]
        qty = attrs["quantity"]
        buyer = self.context["request"].user

        if listing.seller_id == buyer.id:
            raise serializers.ValidationError("You cannot order your own listing.")
        if listing.status != Listing.Status.ACTIVE:
            raise serializers.ValidationError("This listing is not available.")
        if qty > listing.quantity_available:
            raise serializers.ValidationError(
                f"Only {listing.quantity_available} {listing.unit} available."
            )
        return attrs

    def create(self, validated_data):
        listing = validated_data["listing"]
        qty = validated_data["quantity"]
        notes = validated_data.get("notes", "")
        buyer = self.context["request"].user

        return Order.objects.create(
            buyer=buyer,
            seller=listing.seller,
            listing=listing,
            listing_name=listing.name,
            listing_sku=listing.sku,
            quantity=qty,
            unit_price=listing.price,
            total_price=Decimal(qty) * listing.price,
            status=Order.Status.PENDING,
            notes=notes,
        )


class UpdateOrderStatusSerializer(serializers.Serializer):
    """Used by seller (confirm/schedule/complete) and buyer (cancel)."""
    status = serializers.ChoiceField(choices=Order.Status.choices)
    pickup_date = serializers.DateTimeField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
