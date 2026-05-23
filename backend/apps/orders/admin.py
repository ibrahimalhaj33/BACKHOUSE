from django.contrib import admin
from .models import Order, OrderStatusHistory


class StatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ("from_status", "to_status", "changed_by", "note", "created_at")
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "listing_name", "buyer", "seller", "quantity",
                    "total_price", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("listing_name", "listing_sku",
                     "buyer__email", "seller__email")
    readonly_fields = ("listing_name", "listing_sku", "unit_price", "total_price",
                       "created_at", "updated_at")
    inlines = [StatusHistoryInline]
