from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    TokenRefreshAPIView,
    VerifyEmailView,
    ResendVerificationView,
    ResendVerificationCodeView,
    ForgotPasswordView,
    ResetPasswordView,
    MeView,
    UpdateAccountView,
    UpdateBusinessView,
    UpdateLocationView,
    UpdatePreferencesView,
    ChangePasswordView,
    DeactivateAccountView,
)

urlpatterns = [
    # Auth
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", TokenRefreshAPIView.as_view(), name="auth-token-refresh"),

    # Email verification
    path("verify-email/", VerifyEmailView.as_view(), name="auth-verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="auth-resend-verification"),
    path("resend-code/", ResendVerificationCodeView.as_view(), name="auth-resend-code"),

    # Password reset
    path("forgot-password/", ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("reset-password/", ResetPasswordView.as_view(), name="auth-reset-password"),

    # Profile
    path("me/", MeView.as_view(), name="auth-me"),
    path("me/account/", UpdateAccountView.as_view(), name="auth-update-account"),
    path("me/business/", UpdateBusinessView.as_view(), name="auth-update-business"),
    path("me/location/", UpdateLocationView.as_view(), name="auth-update-location"),
    path("me/preferences/", UpdatePreferencesView.as_view(), name="auth-update-preferences"),
    path("me/change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("me/deactivate/", DeactivateAccountView.as_view(), name="auth-deactivate"),
]
