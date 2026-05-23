import re

from django.db import transaction
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, BusinessProfile, UserPreferences


# ──────────────────────────────────────────────
# Strong-password policy
# ──────────────────────────────────────────────
PASSWORD_SPECIAL_RE = re.compile(r"[!@#$%^&*()_\-+=\[\]{};:'\",.<>/?\\|`~]")


def enforce_strong_password(value: str) -> str:
    """
    Server-side strong-password gate used on register, reset, and change flows.
    Requires: 8+ chars, upper, lower, digit, special, no whitespace.
    Also runs Django's built-in validators (common/numeric/similar to user).
    """
    v = value or ""
    errors = []
    if len(v) < 8:
        errors.append("Password must be at least 8 characters long.")
    if len(v) > 72:
        errors.append("Password is too long (max 72 characters).")
    if re.search(r"\s", v):
        errors.append("Password must not contain spaces.")
    if not re.search(r"[A-Z]", v):
        errors.append("Add at least one uppercase letter (A–Z).")
    if not re.search(r"[a-z]", v):
        errors.append("Add at least one lowercase letter (a–z).")
    if not re.search(r"\d", v):
        errors.append("Add at least one number (0–9).")
    if not PASSWORD_SPECIAL_RE.search(v):
        errors.append("Add at least one special character (e.g. ! @ # $ %).")
    if errors:
        raise serializers.ValidationError(errors)
    # Layer Django's defaults (common-password, numeric-only, user-similarity)
    validate_password(v)
    return v


# ──────────────────────────────────────────────
# Auth serializers
# ──────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    # Step 1 — business info
    business_name = serializers.CharField(max_length=200)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)

    # Step 2 — address (Amman / Jordan)
    street_address = serializers.CharField(required=False, allow_blank=True, default="")
    city = serializers.CharField(max_length=100, required=False, allow_blank=True, default="Amman")
    state = serializers.CharField(max_length=100, required=False, allow_blank=True, default="Amman")
    zip_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    country = serializers.CharField(max_length=100, required=False, allow_blank=True, default="Jordan")
    latitude = serializers.FloatField(required=False, allow_null=True, default=None)
    longitude = serializers.FloatField(required=False, allow_null=True, default=None)

    def validate_zip_code(self, value):
        v = (value or "").strip()
        if v and not v.isdigit():
            raise serializers.ValidationError("Postal code must contain only digits.")
        if v and len(v) != 5:
            raise serializers.ValidationError("Jordanian postal codes are 5 digits (e.g. 11183).")
        return v

    def validate_country(self, value):
        # Force Jordan — BackHouse is Amman-only for now
        return "Jordan"

    # Step 3 — HORECA operations
    industry = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")
    company_size = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")
    waste_volume = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()

    def validate_password(self, value):
        return enforce_strong_password(value)

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop("password")
        email = validated_data.pop("email")
        business_name = validated_data.pop("business_name")
        phone = validated_data.pop("phone", "")

        parts = business_name.strip().split(" ", 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        # Every BackHouse account can both buy and sell — no role gate at signup.
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role=User.Role.BOTH,
        )
        bp_kwargs = dict(
            user=user,
            business_name=business_name,
            business_type=validated_data.pop("industry", ""),
            address=validated_data.pop("street_address", ""),
            city=validated_data.pop("city", "Amman"),
            state=validated_data.pop("state", "Amman"),
            zip_code=validated_data.pop("zip_code", ""),
            country=validated_data.pop("country", "Jordan"),
            company_size=validated_data.pop("company_size", ""),
            waste_volume=validated_data.pop("waste_volume", ""),
        )
        # Optional GPS pin from the register form
        lat = validated_data.pop("latitude", None)
        lng = validated_data.pop("longitude", None)
        if lat is not None and lng is not None:
            bp_kwargs["latitude"] = lat
            bp_kwargs["longitude"] = lng
        BusinessProfile.objects.create(**bp_kwargs)
        UserPreferences.objects.create(user=user)
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["full_name"] = user.full_name
        token["role"] = user.role
        return token

    def validate(self, attrs):
        # Normalize email to lowercase to match how it was stored at registration
        if "email" in attrs and isinstance(attrs["email"], str):
            attrs["email"] = attrs["email"].lower().strip()
        data = super().validate(attrs)
        data["user"] = UserMeSerializer(self.user).data
        return data


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return value.lower()


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        enforce_strong_password(attrs["password"])
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs.pop("confirm_new_password"):
            raise serializers.ValidationError({"confirm_new_password": "Passwords do not match."})
        enforce_strong_password(attrs["new_password"])
        return attrs


# ──────────────────────────────────────────────
# Profile serializers
# ──────────────────────────────────────────────

class BusinessProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessProfile
        exclude = ("id", "user", "created_at", "updated_at")


class UserPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreferences
        exclude = ("id", "user")


class UserMeSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    initials = serializers.ReadOnlyField()
    business_profile = BusinessProfileSerializer(read_only=True)
    preferences = UserPreferencesSerializer(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "first_name", "last_name", "full_name", "initials",
            "phone", "role", "avatar", "rating", "total_sales", "total_reviews",
            "is_email_verified", "date_joined",
            "business_profile", "preferences",
        )
        read_only_fields = ("id", "email", "rating", "total_sales", "total_reviews", "is_email_verified", "date_joined")


class UpdateAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("first_name", "last_name", "phone", "avatar")


class UpdateBusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessProfile
        exclude = ("id", "user", "created_at", "updated_at")
