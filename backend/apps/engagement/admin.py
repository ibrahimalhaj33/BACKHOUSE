from django.contrib import admin
from .models import Rating, Favorite, SavedSearch


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "rater", "ratee", "direction", "stars", "created_at")
    list_filter = ("direction", "stars", "created_at")
    search_fields = ("rater__email", "ratee__email", "comment")


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "listing", "created_at")
    search_fields = ("user__email", "listing__name")


@admin.register(SavedSearch)
class SavedSearchAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "name", "search", "category", "created_at", "last_run_at")
    search_fields = ("user__email", "name", "search")
