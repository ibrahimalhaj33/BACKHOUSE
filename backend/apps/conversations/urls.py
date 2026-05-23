from django.urls import path
from .views import (
    ConversationListView,
    ConversationDetailView,
    ConversationMessagesView,
    MarkReadView,
    MarkUnreadView,
    DeleteConversationView,
    UnreadCountView,
)

urlpatterns = [
    path("", ConversationListView.as_view(), name="conversation-list"),
    path("unread-count/", UnreadCountView.as_view(), name="conversation-unread-count"),
    path("<int:pk>/", ConversationDetailView.as_view(), name="conversation-detail"),
    path("<int:pk>/messages/", ConversationMessagesView.as_view(), name="conversation-messages"),
    path("<int:pk>/read/", MarkReadView.as_view(), name="conversation-mark-read"),
    path("<int:pk>/unread/", MarkUnreadView.as_view(), name="conversation-mark-unread"),
    path("<int:pk>/delete/", DeleteConversationView.as_view(), name="conversation-delete"),
]
