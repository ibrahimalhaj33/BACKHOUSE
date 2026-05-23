from django.apps import AppConfig


class EngagementConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.engagement"

    def ready(self):
        # Wire up signals (auto-update User.rating averages)
        from . import signals  # noqa
