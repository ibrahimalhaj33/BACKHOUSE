from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils import timezone
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        BUYER = "buyer", "Buyer"
        SELLER = "seller", "Seller"
        BOTH = "both", "Buyer & Seller"

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.BOTH)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    # Seller stats (updated via signals in Phase 5)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_sales = models.PositiveIntegerField(default=0)
    total_reviews = models.PositiveIntegerField(default=0)

    is_email_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    date_joined = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.full_name} <{self.email}>"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def initials(self) -> str:
        parts = [self.first_name[:1], self.last_name[:1]]
        return "".join(p.upper() for p in parts if p)

    def can_sell(self):
        return self.role in (self.Role.SELLER, self.Role.BOTH)

    def can_buy(self):
        return self.role in (self.Role.BUYER, self.Role.BOTH)


class BusinessProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="business_profile")
    business_name = models.CharField(max_length=200)
    business_type = models.CharField(max_length=100, blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, default="Amman")
    state = models.CharField(max_length=100, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default="Jordan")
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)
    company_size = models.CharField(max_length=100, blank=True)
    waste_volume = models.CharField(max_length=100, blank=True)

    # Geolocation (set automatically when seller creates listings or via Settings)
    latitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True,
        help_text="WGS-84 latitude (-90 to 90)"
    )
    longitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True,
        help_text="WGS-84 longitude (-180 to 180)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "business_profiles"

    def __str__(self):
        return self.business_name


class UserPreferences(models.Model):
    class Language(models.TextChoices):
        ENGLISH = "en", "English"
        ARABIC = "ar", "Arabic"

    class Timezone(models.TextChoices):
        AMMAN = "Asia/Amman", "Amman (GMT+3)"
        DUBAI = "Asia/Dubai", "Dubai (GMT+4)"
        RIYADH = "Asia/Riyadh", "Riyadh (GMT+3)"
        LONDON = "Europe/London", "London (GMT+0)"
        NEW_YORK = "America/New_York", "New York (GMT-5)"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="preferences")
    email_notifications = models.BooleanField(default=True)
    sms_alerts = models.BooleanField(default=False)
    # Granular notification triggers
    notify_new_messages = models.BooleanField(default=True)
    notify_transaction_updates = models.BooleanField(default=True)
    language = models.CharField(max_length=50, choices=Language.choices, default=Language.ENGLISH)
    timezone = models.CharField(max_length=50, choices=Timezone.choices, default=Timezone.AMMAN)
    public_profile = models.BooleanField(default=False)
    anonymous_analytics = models.BooleanField(default=True)

    class Meta:
        db_table = "user_preferences"

    def __str__(self):
        return f"Preferences for {self.user.email}"


class EmailVerificationToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="email_verification_token")
    token = models.CharField(max_length=64)  # 6-digit code (no longer unique across users)
    created_at = models.DateTimeField(auto_now_add=True)
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "email_verification_tokens"

    def is_expired(self):
        return (timezone.now() - self.created_at).total_seconds() > 15 * 60   # 15 minutes


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_tokens")
    token = models.CharField(max_length=64, unique=True)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "password_reset_tokens"

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at
