from django.db import models, transaction
from django.conf import settings
from django.utils import timezone
from apps.listings.models import Listing


class Conversation(models.Model):
    """A 1-to-1 chat thread between two users, optionally about a specific listing."""
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="conversations",
    )
    listing = models.ForeignKey(
        Listing,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="conversations",
    )
    last_message_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "conversations"
        ordering = ["-last_message_at"]

    def __str__(self):
        return f"Conversation #{self.pk}"

    @classmethod
    def get_or_create_between(cls, user_a, user_b, listing=None):
        """Find an existing conversation between two users (and optional listing) or create one."""
        if user_a.id == user_b.id:
            raise ValueError("Cannot start a conversation with yourself.")

        qs = (
            cls.objects
            .filter(participants=user_a)
            .filter(participants=user_b)
        )
        if listing is not None:
            qs = qs.filter(listing=listing)
        else:
            qs = qs.filter(listing__isnull=True)

        existing = qs.first()
        if existing:
            return existing, False

        with transaction.atomic():
            conv = cls.objects.create(listing=listing)
            conv.participants.add(user_a, user_b)
        return conv, True

    def other_participant(self, user):
        return self.participants.exclude(pk=user.pk).first()


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    body = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"Msg #{self.pk} from {self.sender_id}"

    def mark_read(self):
        if self.read_at is None:
            self.read_at = timezone.now()
            self.save(update_fields=["read_at"])
