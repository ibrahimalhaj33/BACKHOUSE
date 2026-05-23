import secrets
from datetime import timedelta
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken


def generate_secure_token():
    return secrets.token_urlsafe(48)


def generate_verification_code():
    """6-digit numeric code (with cryptographic randomness)."""
    return f"{secrets.randbelow(900000) + 100000:06d}"


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh["email"] = user.email
    refresh["full_name"] = user.full_name
    refresh["role"] = user.role
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def create_email_verification_token(user):
    """Create (or replace) a 6-digit verification code for the user."""
    from .models import EmailVerificationToken
    EmailVerificationToken.objects.filter(user=user).delete()
    code = generate_verification_code()
    EmailVerificationToken.objects.create(user=user, token=code)
    return code


def create_password_reset_token(user):
    from .models import PasswordResetToken
    token = generate_secure_token()
    PasswordResetToken.objects.create(
        user=user,
        token=token,
        expires_at=timezone.now() + timedelta(hours=1),
    )
    return token
