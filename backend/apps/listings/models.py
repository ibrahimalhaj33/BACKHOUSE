from django.db import models
from django.conf import settings
from django.utils import timezone


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, blank=True)  # material symbol name

    class Meta:
        db_table = "categories"
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Listing(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "Active", "Active"
        RESERVED = "Reserved", "Reserved"
        INACTIVE = "Inactive", "Inactive"
        EXPIRED = "Expired", "Expired"

    class Unit(models.TextChoices):
        KG = "KG", "KG"
        UNITS = "Units", "Units"
        LITERS = "Liters", "Liters"
        TONS = "Tons", "Tons"
        BOXES = "Boxes", "Boxes"
        PALLETS = "Pallets", "Pallets"

    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listings",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="listings",
    )

    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=20, choices=Unit.choices, default=Unit.UNITS)
    quantity_available = models.PositiveIntegerField(default=0)
    quantity_total = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    expiry_date = models.DateField(null=True, blank=True)
    views_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "listings"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — {self.seller.full_name}"

    def save(self, *args, **kwargs):
        # Auto-deactivate if quantity hits zero (before persisting, so the saved row
        # reflects the new status in one round-trip)
        if self.quantity_available <= 0 and self.status in (self.Status.ACTIVE, self.Status.RESERVED):
            self.status = self.Status.INACTIVE

        if not self.sku:
            # Auto-generate SKU on first save
            super().save(*args, **kwargs)
            self.sku = f"SKU-{self.pk:04d}"
            Listing.objects.filter(pk=self.pk).update(sku=self.sku)
        else:
            super().save(*args, **kwargs)

        self._auto_expire()

    def _auto_expire(self):
        if self.expiry_date and self.expiry_date < timezone.now().date():
            if self.status == self.Status.ACTIVE:
                Listing.objects.filter(pk=self.pk).update(status=self.Status.EXPIRED)
                self.status = self.Status.EXPIRED

    @property
    def expiry_days(self):
        if not self.expiry_date:
            return 999
        delta = self.expiry_date - timezone.now().date()
        return max(delta.days, 0)

    @property
    def is_expiring(self):
        return self.expiry_days <= 5 and self.status != self.Status.EXPIRED

    @property
    def primary_image_url(self):
        img = self.images.filter(is_primary=True).first()
        if not img:
            img = self.images.first()
        return img.image.url if img else None

    # ─── Sustainability metrics ─────────────────────────────
    # Rough kg-equivalent of one unit, used for "Waste Redirected" KPI
    UNIT_KG_CONVERSION = {
        Unit.KG.value: 1,
        Unit.TONS.value: 1000,
        Unit.LITERS.value: 1,       # assume ~1L = 1kg (water-equivalent)
        Unit.UNITS.value: 0.5,      # rough average per-unit weight
        Unit.BOXES.value: 10,       # ~10 kg per box
        Unit.PALLETS.value: 500,    # ~500 kg per pallet
    }

    @property
    def weight_kg(self):
        """Approximate weight in kg for the available quantity of this listing."""
        per_unit = self.UNIT_KG_CONVERSION.get(self.unit, 0)
        return float(self.quantity_available) * per_unit


class ListingImage(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="listings/")
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "listing_images"

    def save(self, *args, **kwargs):
        # Ensure only one primary image per listing
        if self.is_primary:
            ListingImage.objects.filter(listing=self.listing, is_primary=True).update(is_primary=False)
        super().save(*args, **kwargs)
