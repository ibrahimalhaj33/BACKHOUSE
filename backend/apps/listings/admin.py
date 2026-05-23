from django.contrib import admin
from .models import Category, Listing, ListingImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 1
    readonly_fields = ("created_at",)


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    inlines = [ListingImageInline]
    list_display = ("name", "seller", "price", "unit", "quantity_available", "status", "expiry_date", "views_count")
    list_filter = ("status", "unit", "category")
    search_fields = ("name", "sku", "seller__email", "seller__business_profile__business_name")
    ordering = ("-created_at",)
    readonly_fields = ("sku", "views_count", "created_at", "updated_at")
