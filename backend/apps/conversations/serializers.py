from rest_framework import serializers
from django.db.models import Q
from apps.accounts.models import User
from apps.listings.models import Listing
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    is_mine = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()
    sender_initials = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ("id", "conversation", "sender", "sender_name", "sender_initials",
                  "body", "read_at", "created_at", "is_mine")
        read_only_fields = fields

    def get_is_mine(self, obj):
        user = self.context.get("request").user if self.context.get("request") else None
        return user is not None and obj.sender_id == user.id

    def get_sender_name(self, obj):
        bp = getattr(obj.sender, "business_profile", None)
        return bp.business_name if bp else obj.sender.full_name

    def get_sender_initials(self, obj):
        return obj.sender.initials


class ConversationSerializer(serializers.ModelSerializer):
    """Used in the chat list — includes a preview of the last message."""
    other_party_id = serializers.SerializerMethodField()
    other_party_name = serializers.SerializerMethodField()
    other_party_initials = serializers.SerializerMethodField()
    other_party_avatar = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    listing_name = serializers.SerializerMethodField()
    listing_image = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ("id",
                  "listing", "listing_name", "listing_image",
                  "other_party_id", "other_party_name", "other_party_initials", "other_party_avatar",
                  "last_message", "last_message_at", "unread_count",
                  "created_at")
        read_only_fields = fields

    def _other(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.other_participant(request.user)
        return None

    def get_other_party_id(self, obj):
        u = self._other(obj)
        return u.id if u else None

    def get_other_party_name(self, obj):
        u = self._other(obj)
        if not u:
            return ""
        bp = getattr(u, "business_profile", None)
        return bp.business_name if bp else u.full_name

    def get_other_party_initials(self, obj):
        u = self._other(obj)
        return u.initials if u else ""

    def get_other_party_avatar(self, obj):
        request = self.context.get("request")
        u = self._other(obj)
        if u and u.avatar and request:
            return request.build_absolute_uri(u.avatar.url)
        return None

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if not msg:
            return None
        # Replace inline-image data URLs with a friendly placeholder for previews
        body_preview = "📷 Image" if msg.body.startswith("data:image/") else msg.body[:200]
        return {
            "id": msg.id,
            "body": body_preview,
            "sender_id": msg.sender_id,
            "created_at": msg.created_at,
        }

    def get_unread_count(self, obj):
        request = self.context.get("request")
        if not (request and request.user.is_authenticated):
            return 0
        return obj.messages.filter(read_at__isnull=True).exclude(sender_id=request.user.id).count()

    def get_listing_name(self, obj):
        return obj.listing.name if obj.listing else None

    def get_listing_image(self, obj):
        request = self.context.get("request")
        if obj.listing:
            img = obj.listing.images.filter(is_primary=True).first() or obj.listing.images.first()
            if img and request:
                return request.build_absolute_uri(img.image.url)
        return None


class StartConversationSerializer(serializers.Serializer):
    """Start a conversation with another user, optionally about a listing, with an optional first message."""
    recipient = serializers.IntegerField(min_value=1)
    listing = serializers.IntegerField(required=False, allow_null=True, default=None)
    body = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_recipient(self, value):
        try:
            return User.objects.get(pk=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("Recipient not found.")

    def validate_listing(self, value):
        if value in (None, "", "null"):
            return None
        try:
            return Listing.objects.get(pk=value)
        except Listing.DoesNotExist:
            raise serializers.ValidationError("Listing not found.")


class SendMessageSerializer(serializers.Serializer):
    body = serializers.CharField()

    def validate_body(self, value):
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("Message body cannot be empty.")
        # Allow up to ~1 MB (data: URLs for small images are encoded inline)
        if len(v) > 1_000_000:
            raise serializers.ValidationError("Message too long (max ~1 MB).")
        return v
