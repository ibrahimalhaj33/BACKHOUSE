"""
Signals that keep User.rating and User.total_reviews in sync with the Rating model.
"""
from django.db.models import Avg, Count
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Rating


def _recompute_user_rating(user):
    received = Rating.objects.filter(ratee=user)
    agg = received.aggregate(avg=Avg("stars"), count=Count("id"))
    user.rating = round(agg["avg"] or 0, 2)
    user.total_reviews = agg["count"] or 0
    user.save(update_fields=["rating", "total_reviews"])


@receiver(post_save, sender=Rating)
def rating_saved(sender, instance, **kwargs):
    _recompute_user_rating(instance.ratee)


@receiver(post_delete, sender=Rating)
def rating_deleted(sender, instance, **kwargs):
    _recompute_user_rating(instance.ratee)
