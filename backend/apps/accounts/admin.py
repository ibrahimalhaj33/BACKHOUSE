from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, BusinessProfile, UserPreferences, EmailVerificationToken, PasswordResetToken


class BusinessProfileInline(admin.StackedInline):
    model = BusinessProfile
    can_delete = False
    verbose_name_plural = "Business Profile"
    fields = ("business_name", "business_type", "registration_number", "phone_display", "address", "city", "country")
    readonly_fields = ("phone_display",)

    def phone_display(self, obj):
        return obj.user.phone
    phone_display.short_description = "Phone"


class UserPreferencesInline(admin.TabularInline):
    model = UserPreferences
    can_delete = False
    verbose_name_plural = "Preferences"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = [BusinessProfileInline, UserPreferencesInline]
    list_display = ("email", "full_name", "role", "is_email_verified", "is_active", "rating", "total_sales", "date_joined")
    list_filter = ("role", "is_email_verified", "is_active", "is_staff")
    search_fields = ("email", "first_name", "last_name", "business_profile__business_name")
    ordering = ("-date_joined",)
    readonly_fields = ("date_joined", "updated_at", "rating", "total_sales", "total_reviews", "initials")

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name", "phone", "avatar", "initials")}),
        ("Role & Stats", {"fields": ("role", "rating", "total_sales", "total_reviews")}),
        ("Status", {"fields": ("is_active", "is_email_verified", "is_staff", "is_superuser")}),
        ("Permissions", {"fields": ("groups", "user_permissions")}),
        ("Timestamps", {"fields": ("date_joined", "updated_at")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "first_name", "last_name", "role", "password1", "password2"),
        }),
    )

    def initials(self, obj):
        return obj.initials
    initials.short_description = "Initials"


@admin.register(BusinessProfile)
class BusinessProfileAdmin(admin.ModelAdmin):
    list_display = ("business_name", "business_type", "city", "country", "user")
    search_fields = ("business_name", "registration_number", "user__email")
    list_filter = ("business_type", "city", "country")


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ("user", "is_used", "created_at", "expires_at")
    list_filter = ("is_used",)
    readonly_fields = ("token", "created_at")
