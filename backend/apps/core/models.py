from django.db import models


class ContactMessage(models.Model):
    """A contact-form submission from the public Contact page."""
    class Subject(models.TextChoices):
        LOGISTICS = "logistics", "Logistics Support"
        ACCOUNT = "account", "Account Inquiries"
        PARTNERSHIP = "partnership", "Partnership Proposal"
        TECHNICAL = "technical", "Technical Assistance"
        OTHER = "other", "Other"

    full_name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    subject = models.CharField(max_length=30, choices=Subject.choices, default=Subject.OTHER)
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "contact_messages"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} — {self.subject} ({self.created_at:%Y-%m-%d})"
