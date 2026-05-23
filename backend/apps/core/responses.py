from rest_framework.response import Response


def success(data=None, status=200, meta=None):
    payload = {"success": True, "data": data, "error": None}
    if meta:
        payload["meta"] = meta
    return Response(payload, status=status)


def error(message, code=None, fields=None, status=400):
    payload = {
        "success": False,
        "data": None,
        "error": {
            "code": code or "ERROR",
            "message": message,
        },
    }
    if fields:
        payload["error"]["fields"] = fields
    return Response(payload, status=status)
