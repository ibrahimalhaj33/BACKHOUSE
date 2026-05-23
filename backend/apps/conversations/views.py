from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from apps.core.responses import success, error
from apps.core.pagination import StandardPagination
from .models import Conversation, Message
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
    StartConversationSerializer,
    SendMessageSerializer,
)


class ConversationListView(APIView):
    """GET: current user's conversations. POST: start a new one."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (
            Conversation.objects
            .filter(participants=request.user)
            .prefetch_related("participants", "participants__business_profile",
                              "messages", "listing__images")
            .order_by("-last_message_at")
        )

        # Optional filter by listing id (to find existing convo about a specific product)
        listing_id = request.GET.get("listing")
        if listing_id:
            qs = qs.filter(listing_id=listing_id)

        paginator = StandardPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ConversationSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = StartConversationSerializer(data=request.data)
        if not serializer.is_valid():
            return error("Please correct the errors below.",
                         code="VALIDATION_ERROR", fields=serializer.errors, status=400)

        recipient = serializer.validated_data["recipient"]
        listing = serializer.validated_data.get("listing")
        body = serializer.validated_data.get("body", "").strip()

        if recipient.id == request.user.id:
            return error("Cannot start a conversation with yourself.",
                         code="VALIDATION_ERROR", status=400)

        conv, created = Conversation.get_or_create_between(request.user, recipient, listing)

        if body:
            Message.objects.create(conversation=conv, sender=request.user, body=body)
            conv.last_message_at = timezone.now()
            conv.save(update_fields=["last_message_at"])

        return success(
            data=ConversationSerializer(conv, context={"request": request}).data,
            status=201 if created else 200,
        )


class ConversationDetailView(APIView):
    """GET: conversation metadata. (Messages are at a sub-endpoint.)"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            conv = (
                Conversation.objects
                .prefetch_related("participants", "participants__business_profile", "messages", "listing__images")
                .get(pk=pk)
            )
        except Conversation.DoesNotExist:
            return error("Conversation not found.", code="NOT_FOUND", status=404)
        if not conv.participants.filter(pk=request.user.pk).exists():
            return error("You don't have access to this conversation.",
                         code="PERMISSION_DENIED", status=403)
        return success(data=ConversationSerializer(conv, context={"request": request}).data)


class ConversationMessagesView(APIView):
    """GET: list messages. POST: send a new message."""
    permission_classes = [IsAuthenticated]

    def _get_convo(self, pk, user):
        try:
            conv = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return None
        if not conv.participants.filter(pk=user.pk).exists():
            return False
        return conv

    def get(self, request, pk):
        conv = self._get_convo(pk, request.user)
        if conv is None:
            return error("Conversation not found.", code="NOT_FOUND", status=404)
        if conv is False:
            return error("Forbidden.", code="PERMISSION_DENIED", status=403)

        qs = conv.messages.order_by("created_at").select_related("sender", "sender__business_profile")
        serializer = MessageSerializer(qs, many=True, context={"request": request})

        # Auto-mark all incoming unread messages as read
        conv.messages.filter(read_at__isnull=True).exclude(sender_id=request.user.id).update(
            read_at=timezone.now()
        )

        return success(data=serializer.data)

    def post(self, request, pk):
        conv = self._get_convo(pk, request.user)
        if conv is None:
            return error("Conversation not found.", code="NOT_FOUND", status=404)
        if conv is False:
            return error("Forbidden.", code="PERMISSION_DENIED", status=403)

        serializer = SendMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return error("Please correct the errors below.",
                         code="VALIDATION_ERROR", fields=serializer.errors, status=400)

        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            body=serializer.validated_data["body"],
        )
        conv.last_message_at = msg.created_at
        conv.save(update_fields=["last_message_at"])

        return success(
            data=MessageSerializer(msg, context={"request": request}).data,
            status=201,
        )


class MarkReadView(APIView):
    """POST: mark all messages in a conversation as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            conv = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return error("Conversation not found.", code="NOT_FOUND", status=404)
        if not conv.participants.filter(pk=request.user.pk).exists():
            return error("Forbidden.", code="PERMISSION_DENIED", status=403)
        conv.messages.filter(read_at__isnull=True).exclude(sender_id=request.user.id).update(
            read_at=timezone.now()
        )
        return success(data={"message": "Marked as read."})


class MarkUnreadView(APIView):
    """POST: mark the latest received message as unread again."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            conv = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return error("Conversation not found.", code="NOT_FOUND", status=404)
        if not conv.participants.filter(pk=request.user.pk).exists():
            return error("Forbidden.", code="PERMISSION_DENIED", status=403)
        # Reset read_at on the most recent message that someone else sent
        latest = conv.messages.exclude(sender_id=request.user.id).order_by("-created_at").first()
        if latest:
            latest.read_at = None
            latest.save(update_fields=["read_at"])
        return success(data={"message": "Marked as unread."})


class DeleteConversationView(APIView):
    """DELETE: remove a conversation for both participants (hard delete since 1-to-1)."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            conv = Conversation.objects.get(pk=pk)
        except Conversation.DoesNotExist:
            return error("Conversation not found.", code="NOT_FOUND", status=404)
        if not conv.participants.filter(pk=request.user.pk).exists():
            return error("Forbidden.", code="PERMISSION_DENIED", status=403)
        conv.delete()  # cascades to messages
        return success(data={"message": "Conversation deleted."})


class UnreadCountView(APIView):
    """GET: total unread messages across all conversations for the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        total = (
            Message.objects
            .filter(conversation__participants=request.user, read_at__isnull=True)
            .exclude(sender_id=request.user.id)
            .count()
        )
        return success(data={"unread_count": total})
