import django_filters
from .models import Listing


class ListingFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(field_name="name", lookup_expr="icontains")
    category = django_filters.NumberFilter(field_name="category__id")
    category_name = django_filters.CharFilter(field_name="category__name", lookup_expr="iexact")
    price_min = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    price_max = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    status = django_filters.CharFilter(field_name="status", lookup_expr="iexact")
    expiry_days = django_filters.NumberFilter(method="filter_expiry_days")

    # ─── HORECA-specific filters ─────────────────────────────
    # Location: filter by the seller's business city (case-insensitive)
    city = django_filters.CharFilter(
        field_name="seller__business_profile__city", lookup_expr="iexact"
    )
    # Bulk: at least N units available (for restaurants ordering in volume)
    min_quantity = django_filters.NumberFilter(
        field_name="quantity_available", lookup_expr="gte"
    )
    # Same-day pickup: items that expire today/tomorrow (perishables to grab now)
    urgent = django_filters.BooleanFilter(method="filter_urgent")
    # Verified seller (has business profile with a registration_number)
    verified = django_filters.BooleanFilter(method="filter_verified")

    class Meta:
        model = Listing
        fields = ["search", "category", "category_name", "price_min", "price_max",
                  "status", "city", "min_quantity"]

    def filter_expiry_days(self, queryset, name, value):
        from django.utils import timezone
        from datetime import timedelta
        cutoff = timezone.now().date() + timedelta(days=int(value))
        return queryset.filter(expiry_date__lte=cutoff)

    def filter_urgent(self, queryset, name, value):
        from django.utils import timezone
        from datetime import timedelta
        if not value:
            return queryset
        cutoff = timezone.now().date() + timedelta(days=1)
        return queryset.filter(expiry_date__lte=cutoff, expiry_date__isnull=False)

    def filter_verified(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.exclude(
            seller__business_profile__registration_number__exact=""
        ).filter(seller__business_profile__registration_number__isnull=False)
