from rest_framework.views import exception_handler
from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    NotFound,
    ValidationError,
    Throttled,
)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return None

    error_map = {
        NotAuthenticated: ("NOT_AUTHENTICATED", "Authentication credentials were not provided."),
        AuthenticationFailed: ("AUTHENTICATION_FAILED", "Invalid or expired token."),
        PermissionDenied: ("PERMISSION_DENIED", "You do not have permission to perform this action."),
        NotFound: ("NOT_FOUND", "The requested resource was not found."),
        Throttled: ("THROTTLED", "Too many requests. Please try again later."),
    }

    for exc_class, (code, default_message) in error_map.items():
        if isinstance(exc, exc_class):
            response.data = {
                "success": False,
                "data": None,
                "error": {
                    "code": code,
                    "message": str(exc.detail) if hasattr(exc, "detail") and isinstance(exc.detail, str) else default_message,
                },
            }
            return response

    if isinstance(exc, ValidationError):
        fields = _flatten_validation_errors(exc.detail)
        response.data = {
            "success": False,
            "data": None,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Please correct the errors below.",
                "fields": fields,
            },
        }
        return response

    # Fallback for any other DRF exception
    response.data = {
        "success": False,
        "data": None,
        "error": {
            "code": "ERROR",
            "message": response.data.get("detail", "An unexpected error occurred.") if isinstance(response.data, dict) else "An unexpected error occurred.",
        },
    }
    return response


def _flatten_validation_errors(detail, prefix=""):
    result = {}
    if isinstance(detail, dict):
        for key, value in detail.items():
            full_key = f"{prefix}.{key}" if prefix else key
            result.update(_flatten_validation_errors(value, prefix=full_key))
    elif isinstance(detail, list):
        messages = []
        for item in detail:
            if isinstance(item, str):
                messages.append(item)
            elif hasattr(item, "string"):
                messages.append(str(item))
            else:
                result.update(_flatten_validation_errors(item, prefix=prefix))
        if messages:
            result[prefix or "non_field_errors"] = messages
    else:
        result[prefix or "non_field_errors"] = [str(detail)]
    return result
