from __future__ import annotations

from django.http import HttpResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET
from django.views.decorators.http import require_POST

from django_datastar import DatastarHttpRequest


@require_GET
def home(request: DatastarHttpRequest) -> HttpResponse:
    """Render the example overview."""
    return render(request, "home.html")


@require_GET
def request_metadata(request: DatastarHttpRequest) -> HttpResponse:
    """Render the request metadata demonstration."""
    return render(request, "request_metadata.html")


@require_GET
def request_metadata_sync(request: DatastarHttpRequest) -> HttpResponse:
    """Render a sync request metadata morph."""
    return render(
        request,
        "request_metadata_result.html",
        _metadata_context(request, view_type="sync"),
    )


@require_GET
async def request_metadata_async(request: DatastarHttpRequest) -> HttpResponse:
    """Render an async request metadata morph."""
    return render(
        request,
        "request_metadata_result.html",
        _metadata_context(request, view_type="async"),
    )


@require_GET
def csrf_demo(request: DatastarHttpRequest) -> HttpResponse:
    """Render the CSRF-protected POST demonstration."""
    return render(request, "csrf_demo.html")


@require_POST
def csrf_submit(request: DatastarHttpRequest) -> HttpResponse:
    """Render an accepted, CSRF-protected Datastar POST morph."""
    context = {
        "message": request.POST.get("message", ""),
        "is_datastar": bool(request.datastar),
    }
    return render(request, "csrf_result.html", context)


def _metadata_context(
    request: DatastarHttpRequest,
    *,
    view_type: str,
) -> dict[str, object]:
    return {
        "method": request.method,
        "raw_marker": request.headers.get("Datastar-Request"),
        "is_datastar": bool(request.datastar),
        "view_type": view_type,
    }
