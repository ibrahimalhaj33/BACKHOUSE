from django.conf import settings
from django.core.mail import EmailMessage, send_mail
from rest_framework import serializers
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny

from .responses import success, error
from .models import ContactMessage


CONTACT_INBOX = "backhouse788@gmail.com"


def _notify_inbox(obj):
    """Forward a contact submission to the BackHouse inbox."""
    subject_label = dict(
        getattr(ContactMessage, "SUBJECT_CHOICES", []) or []
    ).get(obj.subject, obj.subject or "—")

    body = (
        f"New inquiry from the BackHouse contact form.\n\n"
        f"Name:    {obj.full_name}\n"
        f"Email:   {obj.email}\n"
        f"Phone:   {obj.phone or '—'}\n"
        f"Subject: {subject_label}\n"
        f"Sent at: {obj.created_at:%Y-%m-%d %H:%M}\n\n"
        f"--- Message ---\n{obj.message}\n"
    )
    msg = EmailMessage(
        subject=f"[BackHouse Contact] {subject_label} — {obj.full_name}",
        body=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[CONTACT_INBOX],
        reply_to=[obj.email] if obj.email else None,
    )
    msg.send(fail_silently=True)


def _confirm_sender(obj):
    """Send a confirmation receipt to the person who submitted the form."""
    if not obj.email:
        return

    subject_label = dict(
        getattr(ContactMessage, "SUBJECT_CHOICES", []) or []
    ).get(obj.subject, obj.subject or "—")

    body = (
        f"Hello {obj.full_name or 'there'},\n\n"
        f"Thank you for contacting BackHouse — we've received your inquiry and "
        f"a member of our team will get back to you shortly.\n\n"
        f"For your records, here is a copy of what you sent:\n"
        f"-----------------------------------------------\n"
        f"Subject: {subject_label}\n"
        f"Sent at: {obj.created_at:%Y-%m-%d %H:%M}\n\n"
        f"{obj.message}\n"
        f"-----------------------------------------------\n\n"
        f"If you need to add anything, just reply to this email.\n\n"
        f"— The BackHouse Team\n"
        f"{CONTACT_INBOX}"
    )
    send_mail(
        subject="We received your inquiry — BackHouse",
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[obj.email],
        fail_silently=True,
    )


class ContactMessageSerializer(serializers.ModelSerializer):
    # Override as a plain CharField so the model's ChoiceField validator
    # doesn't reject the human-readable labels coming from the <select>.
    subject = serializers.CharField(required=False, allow_blank=True, max_length=64)

    class Meta:
        model = ContactMessage
        fields = ("full_name", "email", "phone", "subject", "message")

    def validate_subject(self, value):
        # Accept the human-readable labels too (matches the <select> options)
        mapping = {
            "Logistics Support": "logistics",
            "Account Inquiries": "account",
            "Partnership Proposal": "partnership",
            "Technical Assistance": "technical",
        }
        v = (value or "").strip()
        if v in mapping:
            return mapping[v]
        # If frontend already sent an enum value, keep it; otherwise default
        valid = {c[0] for c in (getattr(ContactMessage, "SUBJECT_CHOICES", []) or [])}
        low = v.lower()
        if low in valid:
            return low
        return "other"

    def validate_message(self, value):
        v = (value or "").strip()
        if len(v) < 10:
            raise serializers.ValidationError("Please provide at least 10 characters of detail.")
        if len(v) > 5000:
            raise serializers.ValidationError("Message is too long (max 5000 characters).")
        return v


class ContactView(APIView):
    """POST: receive a contact-form submission from the public Contact page."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ContactMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return error(
                "Please correct the errors below.",
                code="VALIDATION_ERROR",
                fields=serializer.errors,
                status=400,
            )
        obj = serializer.save()
        _notify_inbox(obj)
        _confirm_sender(obj)
        return success(
            data={"id": obj.id, "message": "Thank you! We've received your inquiry and will respond soon."},
            status=201,
        )
