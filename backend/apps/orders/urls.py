from django.urls import path
from .views import (
    OrderListView,
    MyPurchasesView,
    MySalesView,
    OrderDetailView,
    BuyerScorecardView,
    SellerDashboardView,
    ConfirmPickupView,
)

urlpatterns = [
    path("", OrderListView.as_view(), name="order-list"),
    path("purchases/", MyPurchasesView.as_view(), name="order-purchases"),
    path("sales/", MySalesView.as_view(), name="order-sales"),
    path("scorecard/", BuyerScorecardView.as_view(), name="order-scorecard"),
    path("seller-dashboard/", SellerDashboardView.as_view(), name="seller-dashboard"),
    path("<int:pk>/confirm-pickup/", ConfirmPickupView.as_view(), name="order-confirm-pickup"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
]
