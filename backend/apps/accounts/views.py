from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.core.responses import success, error
from .models import User, EmailVerificationToken, PasswordResetToken
from .serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    ChangePasswordSerializer,
    UserMeSerializer,
    UpdateAccountSerializer,
    UpdateBusinessSerializer,
    UserPreferencesSerializer,
)
from .tokens import create_email_verification_token, create_password_reset_token
from .emails import send_verification_email, send_password_reset_email


# ──────────────────────────────────────────────
# Registration
# ──────────────────────────────────────────────

class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=RegisterSerializer, responses={201: UserMeSerializer})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return error(
                "Please correct the errors below.",
                code="VALIDATION_ERROR",
                fields=serializer.errors,
                status=400,
            )

        user = serializer.save()

        token = create_email_verification_token(user)
        try:
            send_verification_email(user, token)
        except Exception:
            pass  # Don't block registration if email fails in dev

        from .tokens import get_tokens_for_user
        tokens = get_tokens_for_user(user)

        return success(
            data={
                "user": UserMeSerializer(user).data,
                "tokens": tokens,
                "message": "Account created. Please verify your email.",
            },
            status=201,
        )


# ──────────────────────────────────────────────
# Login / Logout / Token
# ──────────────────────────────────────────────

class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return error(
                "Email or password is incorrect.",
                code="INVALID_CREDENTIALS",
                status=401,
            )
        data = serializer.validated_data
        return success(data={
            "user": data["user"],
            "tokens": {
                "access": data["access"],
                "refresh": data["refresh"],
            },
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return error("Refresh token is required.", code="MISSING_TOKEN", status=400)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return error("Invalid or expired token.", code="INVALID_TOKEN", status=400)
        return success(data={"message": "Logged out successfully."})


class TokenRefreshAPIView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return error("Invalid or expired refresh token.", code="INVALID_TOKEN", status=401)
        return success(data={"access": serializer.validated_data["access"]})


# ──────────────────────────────────────────────
# Email verification
# ──────────────────────────────────────────────

class VerifyEmailView(APIView):
    """POST: verify the email using a 6-digit code. Accepts {email, code}."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        code = (request.data.get("code") or "").strip()

        if not email or not code:
            return error("Email and verification code are required.",
                         code="MISSING_FIELDS", status=400)
        # Normalize: strip spaces, dashes the user might have typed
        code = code.replace(" ", "").replace("-", "")
        if not code.isdigit() or len(code) != 6:
            return error("Enter the 6-digit code from your email.",
                         code="INVALID_FORMAT", status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return error("No account found with that email.", code="USER_NOT_FOUND", status=404)

        if user.is_email_verified:
            return success(data={"message": "Already verified.", "already_verified": True})

        try:
            token_obj = EmailVerificationToken.objects.get(user=user)
        except EmailVerificationToken.DoesNotExist:
            return error("No verification code on file. Request a new one.",
                         code="NO_CODE", status=400)

        if token_obj.is_expired():
            token_obj.delete()
            return error("This code has expired. Request a new one.",
                         code="CODE_EXPIRED", status=400)

        # Brute-force protection: lock out after 5 wrong attempts
        if token_obj.attempts >= 5:
            return error("Too many incorrect attempts. Please request a new code.",
                         code="TOO_MANY_ATTEMPTS", status=429)

        if token_obj.token != code:
            token_obj.attempts += 1
            token_obj.save(update_fields=["attempts"])
            remaining = 5 - token_obj.attempts
            return error(
                f"Incorrect code. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
                code="INVALID_CODE", status=400,
            )

        # Success
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])
        token_obj.delete()
        return success(data={"message": "Email verified successfully."})


class ResendVerificationCodeView(APIView):
    """POST: re-send the 6-digit code to a given (unverified) email."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return error("Email is required.", code="MISSING_EMAIL", status=400)
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't leak which emails exist
            return success(data={"message": "If this email is registered, a code was sent."})
        if user.is_email_verified:
            return success(data={"message": "Already verified.", "already_verified": True})

        code = create_email_verification_token(user)
        try:
            send_verification_email(user, code)
        except Exception:
            pass
        return success(data={"message": "A new code has been sent to your email."})


class ResendVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_email_verified:
            return error("Email is already verified.", code="ALREADY_VERIFIED", status=400)
        token = create_email_verification_token(user)
        try:
            send_verification_email(user, token)
        except Exception:
            return error("Failed to send verification email. Please try again.", code="EMAIL_FAILED", status=500)
        return success(data={"message": "Verification email sent."})


# ──────────────────────────────────────────────
# Password reset
# ──────────────────────────────────────────────

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return error("Invalid email address.", code="VALIDATION_ERROR", status=400)

        email = serializer.validated_data["email"]
        # Always return success to prevent email enumeration
        try:
            user = User.objects.get(email=email)
            token = create_password_reset_token(user)
            send_password_reset_email(user, token)
        except User.DoesNotExist:
            pass

        return success(data={"message": "If this email is registered, you will receive a reset link."})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return error(
                "Please correct the errors below.",
                code="VALIDATION_ERROR",
                fields=serializer.errors,
                status=400,
            )

        token_value = serializer.validated_data["token"]
        new_password = serializer.validated_data["password"]

        try:
            token_obj = PasswordResetToken.objects.select_related("user").get(token=token_value)
        except PasswordResetToken.DoesNotExist:
            return error("Invalid or expired reset token.", code="INVALID_TOKEN", status=400)

        if not token_obj.is_valid():
            return error("This reset link has expired. Please request a new one.", code="TOKEN_EXPIRED", status=400)

        with transaction.atomic():
            user = token_obj.user
            user.set_password(new_password)
            user.save(update_fields=["password"])
            token_obj.is_used = True
            token_obj.save(update_fields=["is_used"])

        return success(data={"message": "Password reset successfully. You can now log in."})


# ──────────────────────────────────────────────
# Profile
# ──────────────────────────────────────────────

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return success(data=serializer.data)


class UpdateAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = UpdateAccountSerializer(request.user, data=request.data, partial=True)
        if not serializer.is_valid():
            return error(
                "Please correct the errors below.",
                code="VALIDATION_ERROR",
                fields=serializer.errors,
                status=400,
            )
        serializer.save()
        return success(data=UserMeSerializer(request.user).data)


class UpdateLocationView(APIView):
    """POST: save the user's current geolocation (lat/lng) to their business profile."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            lat = float(request.data.get("latitude"))
            lng = float(request.data.get("longitude"))
        except (TypeError, ValueError):
            return error("latitude and longitude required (numbers).",
                         code="VALIDATION_ERROR", status=400)
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return error("Latitude/longitude out of range.",
                         code="VALIDATION_ERROR", status=400)
        bp = getattr(request.user, "business_profile", None)
        if not bp:
            return error("Business profile not found.", code="NOT_FOUND", status=404)
        bp.latitude = lat
        bp.longitude = lng
        bp.save(update_fields=["latitude", "longitude", "updated_at"])
        return success(data={"latitude": float(bp.latitude), "longitude": float(bp.longitude)})


class UpdateBusinessView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "business_profile", None)
        if not profile:
            return error("Business profile not found.", code="NOT_FOUND", status=404)
        return success(data=UpdateBusinessSerializer(profile).data)

    def patch(self, request):
        profile = getattr(request.user, "business_profile", None)
        if not profile:
            return error("Business profile not found.", code="NOT_FOUND", status=404)
        serializer = UpdateBusinessSerializer(profile, data=request.data, partial=True)
        if not serializer.is_valid():
            return error(
                "Please correct the errors below.",
                code="VALIDATION_ERROR",
                fields=serializer.errors,
                status=400,
            )
        serializer.save()
        return success(data=serializer.data)


class UpdatePreferencesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs = getattr(request.user, "preferences", None)
        if not prefs:
            return error("Preferences not found.", code="NOT_FOUND", status=404)
        return success(data=UserPreferencesSerializer(prefs).data)

    def patch(self, request):
        prefs = getattr(request.user, "preferences", None)
        if not prefs:
            return error("Preferences not found.", code="NOT_FOUND", status=404)
        serializer = UserPreferencesSerializer(prefs, data=request.data, partial=True)
        if not serializer.is_valid():
            return error(
                "Please correct the errors below.",
                code="VALIDATION_ERROR",
                fields=serializer.errors,
                status=400,
            )
        serializer.save()
        return success(data=serializer.data)


class DeactivateAccountView(APIView):
    """POST: deactivate the current user's account.
    Sets is_active=False, hides their active listings, and blacklists the refresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # 1. Mark account inactive (user can no longer log in)
        user.is_active = False
        user.save(update_fields=["is_active"])

        # 2. Hide all of the user's Active listings → Inactive so they vanish from the marketplace
        from apps.listings.models import Listing
        Listing.objects.filter(seller=user, status=Listing.Status.ACTIVE).update(
            status=Listing.Status.INACTIVE
        )

        # 3. Optionally blacklist their current refresh token so the JWT is killed
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass

        return success(data={"message": "Account deactivated. We're sorry to see you go."})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return error(
                "Please correct the errors below.",
                code="VALIDATION_ERROR",
                fields=serializer.errors,
                status=400,
            )
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        return success(data={"message": "Password changed successfully."})
