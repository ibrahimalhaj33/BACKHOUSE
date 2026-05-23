"""
Custom Django SMTP backend with relaxed SSL verification.

⚠️  DEV ONLY ⚠️
This skips certificate verification to work around local proxies/antiviruses
(e.g. Kaspersky, Bitdefender, corporate firewalls) that intercept HTTPS and
present self-signed certificates. In production, use the standard
`django.core.mail.backends.smtp.EmailBackend` and ensure your server's CA
bundle is valid.

Activate by setting:
    EMAIL_BACKEND = "apps.core.email_backend.CertifiSSLEmailBackend"
"""
import ssl
from django.core.mail.backends.smtp import EmailBackend


class CertifiSSLEmailBackend(EmailBackend):
    @property
    def ssl_context(self):
        # Build a permissive context that skips verification (dev-only)
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx

    @ssl_context.setter
    def ssl_context(self, value):
        pass
