from django.urls import path
from .views import (
    RatingListView, RatingSummaryView, PendingRatingsView,
    FavoriteListView, FavoriteToggleView, FavoriteIdsView, FavoriteDeleteView,
    SavedSearchListView, SavedSearchDetailView, RunSavedSearchView,
)

urlpatterns = [
    # Ratings
    path("ratings/", RatingListView.as_view(), name="rating-list"),
    path("ratings/summary/", RatingSummaryView.as_view(), name="rating-summary"),
    path("ratings/pending/", PendingRatingsView.as_view(), name="rating-pending"),

    # Favorites
    path("favorites/", FavoriteListView.as_view(), name="favorite-list"),
    path("favorites/ids/", FavoriteIdsView.as_view(), name="favorite-ids"),
    path("favorites/toggle/<int:listing_id>/", FavoriteToggleView.as_view(), name="favorite-toggle"),
    path("favorites/<int:pk>/", FavoriteDeleteView.as_view(), name="favorite-delete"),

    # Saved searches
    path("searches/", SavedSearchListView.as_view(), name="search-list"),
    path("searches/<int:pk>/", SavedSearchDetailView.as_view(), name="search-detail"),
    path("searches/<int:pk>/run/", RunSavedSearchView.as_view(), name="search-run"),
]
