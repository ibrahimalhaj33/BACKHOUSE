from django.contrib import admin
from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "email", "subject", "is_resolved", "created_at")
    list_filter = ("subject", "is_resolved", "created_at")
    search_fields = ("full_name", "email", "message")
    readonly_fields = ("full_name", "email", "phone", "subject", "message", "created_at")
    list_editable = ("is_resolved",)
