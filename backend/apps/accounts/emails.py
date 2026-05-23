from django.core.mail import send_mail
from django.conf import settings


def send_verification_email(user, code):
    """Send a 6-digit verification code to the user's email."""
    send_mail(
        subject=f"BackHouse — Your verification code is {code}",
        message=(
            f"Hello {user.first_name},\n\n"
            f"Thanks for registering with BackHouse!\n\n"
            f"Your email verification code is:\n\n"
            f"    {code}\n\n"
            f"Enter this 6-digit code in the verification screen to activate your account.\n"
            f"This code expires in 15 minutes.\n\n"
            f"If you did not create an account with us, you can safely ignore this email.\n\n"
            f"— The BackHouse Team"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email(user, token):
    reset_url = f"{settings.FRONTEND_URL}/forgot-password.html?token={token}&step=reset"
    send_mail(
        subject="Reset your BackHouse password",
        message=(
            f"Hello {user.first_name},\n\n"
            f"We received a request to reset your password. Click the link below:\n"
            f"{reset_url}\n\n"
            f"This link expires in 1 hour. If you did not request this, ignore this email.\n\n"
            f"— The BackHouse Team"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
