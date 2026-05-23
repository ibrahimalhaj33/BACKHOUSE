import base64
import uuid
from django.core.files.base import ContentFile
from rest_framework import serializers
from .models import Category, Listing, ListingImage


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "icon")


class ListingImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ListingImage
        fields = ("id", "url", "is_primary")

    def get_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class ListingSerializer(serializers.ModelSerializer):
    """
    Returns data in the exact shape the frontend expects.
    Field names match listings-data.js DEFAULT_LISTINGS structure.
    """
    # Frontend-compatible field names
    image = serializers.SerializerMethodField()
    inventoryCurrent = serializers.IntegerField(source="quantity_available", read_only=True)
    inventoryTotal = serializers.IntegerField(source="quantity_total", read_only=True)
    quantity = serializers.IntegerField(source="quantity_available", read_only=True)
    numericPrice = serializers.DecimalField(source="price", max_digits=10, decimal_places=2, read_only=True)
    price = serializers.SerializerMethodField()
    expiryDays = serializers.IntegerField(source="expiry_days", read_only=True)
    expiring = serializers.BooleanField(source="is_expiring", read_only=True)
    views = serializers.IntegerField(source="views_count", read_only=True)
    status = serializers.CharField(read_only=True)
    category = serializers.SerializerMethodField()

    # Seller fields
    seller_name = serializers.SerializerMethodField()
    seller_initials = serializers.SerializerMethodField()
    seller_rating = serializers.SerializerMethodField()
    seller_reviews = serializers.SerializerMethodField()
    distance = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            "id", "name", "sku", "image",
            "inventoryCurrent", "inventoryTotal", "quantity", "unit",
            "price", "numericPrice", "status",
            "expiryDays", "expiring", "views",
            "seller", "seller_name", "seller_initials", "seller_rating", "seller_reviews",
            "distance", "distance_km", "category", "description", "expiry_date", "created_at",
        )

    def get_image(self, obj):
        request = self.context.get("request")
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if img and request:
            return request.build_absolute_uri(img.image.url)
        return None  # No default — frontend renders a placeholder

    def get_price(self, obj):
        return f"{obj.price:.2f} JOD"

    def get_seller_name(self, obj):
        bp = getattr(obj.seller, "business_profile", None)
        return bp.business_name if bp else obj.seller.full_name

    def get_seller_initials(self, obj):
        bp = getattr(obj.seller, "business_profile", None)
        if bp:
            words = bp.business_name.split()
            return "".join(w[0].upper() for w in words[:2])
        return obj.seller.initials

    def get_seller_rating(self, obj):
        return float(obj.seller.rating)

    def get_seller_reviews(self, obj):
        return obj.seller.total_reviews

    def get_distance(self, obj):
        # If view pre-computed a distance, surface it (e.g. "3.2 km")
        d = getattr(obj, "_distance_km", None)
        if d is not None:
            return f"{d:.1f} km"
        # Otherwise show the seller's business city or em-dash
        bp = getattr(obj.seller, "business_profile", None)
        return bp.city if bp and bp.city else "—"

    def get_category(self, obj):
        return obj.category.name if obj.category else ""

    def get_distance_km(self, obj):
        d = getattr(obj, "_distance_km", None)
        return d  # number or None


def _normalize_unit(value):
    """Normalize unit input (case-insensitive) to a valid Listing.Unit value."""
    if not value:
        return Listing.Unit.UNITS
    value_lower = str(value).strip().lower()
    for choice_value, _ in Listing.Unit.choices:
        if choice_value.lower() == value_lower:
            return choice_value
    return Listing.Unit.UNITS  # fallback


def _resolve_category(value):
    """Resolve a category from either a PK (int) or a name (str). Returns Category or None."""
    if value in (None, "", "null"):
        return None
    # Try as primary key
    try:
        return Category.objects.get(pk=int(value))
    except (ValueError, TypeError, Category.DoesNotExist):
        pass
    # Try by name (case-insensitive); auto-create if missing
    name = str(value).strip()
    if not name:
        return None
    existing = Category.objects.filter(name__iexact=name).first()
    if existing:
        return existing
    slug = name.lower().replace(" ", "-").replace("&", "and")
    return Category.objects.create(name=name, slug=slug)


class CreateListingSerializer(serializers.Serializer):
    """Accepts frontend create-listing.html form data."""
    name = serializers.CharField(max_length=255)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity = serializers.IntegerField(min_value=1)
    unit = serializers.CharField(required=False, allow_blank=True, default="Units")
    description = serializers.CharField(required=False, allow_blank=True, default="")
    expiry_date = serializers.DateField(required=False, allow_null=True, default=None)
    category = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)
    image_base64 = serializers.CharField(required=False, allow_blank=True, default="")
    # Optional — if frontend captured the user's geolocation during creation, save it to their profile
    seller_latitude = serializers.FloatField(required=False, allow_null=True)
    seller_longitude = serializers.FloatField(required=False, allow_null=True)

    def validate_unit(self, value):
        return _normalize_unit(value)

    def create(self, validated_data):
        image_base64 = validated_data.pop("image_base64", "")
        quantity = validated_data.pop("quantity")
        category_value = validated_data.pop("category", None)
        lat = validated_data.pop("seller_latitude", None)
        lng = validated_data.pop("seller_longitude", None)
        seller = self.context["request"].user

        # If the frontend sent the seller's geolocation and they don't have
        # one stored yet, save it to their BusinessProfile so buyer-radius
        # filters can find their listings.
        if lat is not None and lng is not None:
            bp = getattr(seller, "business_profile", None)
            if bp and (bp.latitude is None or bp.longitude is None):
                bp.latitude = lat
                bp.longitude = lng
                bp.save(update_fields=["latitude", "longitude", "updated_at"])

        category = _resolve_category(category_value)

        listing = Listing.objects.create(
            seller=seller,
            quantity_available=quantity,
            quantity_total=quantity,
            category=category,
            **validated_data,
        )

        if image_base64:
            _save_base64_image(listing, image_base64)

        return listing


class UpdateListingSerializer(serializers.ModelSerializer):
    image_base64 = serializers.CharField(required=False, allow_blank=True, write_only=True)
    quantity = serializers.IntegerField(required=False, min_value=1, write_only=True)
    unit = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Listing
        fields = ("name", "price", "quantity", "quantity_available", "unit", "description",
                  "expiry_date", "status", "category", "image_base64")
        extra_kwargs = {"quantity_available": {"required": False}}

    def validate_unit(self, value):
        return _normalize_unit(value) if value else value

    def update(self, instance, validated_data):
        image_base64 = validated_data.pop("image_base64", "")
        quantity = validated_data.pop("quantity", None)
        category_value = validated_data.pop("category", serializers.empty)

        if quantity is not None:
            instance.quantity_available = quantity
        if category_value is not serializers.empty:
            instance.category = _resolve_category(category_value)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if image_base64:
            _save_base64_image(instance, image_base64)
        return instance


def _save_base64_image(listing, base64_string):
    """Decode a base64 image string and save it as a ListingImage."""
    try:
        if "," in base64_string:
            base64_string = base64_string.split(",", 1)[1]
        image_data = base64.b64decode(base64_string)
        filename = f"listing_{listing.pk}_{uuid.uuid4().hex[:8]}.jpg"
        listing.images.filter(is_primary=True).update(is_primary=False)
        img = ListingImage(listing=listing, is_primary=True)
        img.image.save(filename, ContentFile(image_data), save=True)
    except Exception:
        pass
