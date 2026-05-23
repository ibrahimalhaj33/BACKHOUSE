from django.urls import path
from .views import (
    CategoryListView,
    ListingListView,
    ListingDetailView,
    MyListingsView,
    DashboardMetricsView,
)

urlpatterns = [
    path("categories/", CategoryListView.as_view(), name="listing-categories"),
    path("", ListingListView.as_view(), name="listing-list"),
    path("<int:pk>/", ListingDetailView.as_view(), name="listing-detail"),
    path("my/", MyListingsView.as_view(), name="listing-my"),
    path("dashboard/metrics/", DashboardMetricsView.as_view(), name="dashboard-metrics"),
]
