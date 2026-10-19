from __future__ import annotations

from django import template
from django.http import HttpRequest
from django.middleware.csrf import get_token
from django.templatetags.static import static
from django.utils.html import escape
from django.utils.html import format_html
from django.utils.safestring import SafeString

register = template.Library()


@register.simple_tag(takes_context=True)
def datastar_csrf(
    context: template.Context,
    nonce: object | None = None,
) -> SafeString:
    """Render the masked CSRF token and Datastar fetch bridge module."""
    request = getattr(context, "request", None)
    if not isinstance(request, HttpRequest):
        raise template.TemplateSyntaxError(
            "{% datastar_csrf %} requires a request-aware template context."
        )

    token = get_token(request)
    meta = format_html(
        '<meta name="datastar-csrf-token" content="{}" />',
        token,
    )
    script_url = static("django_datastar/datastar-csrf.js")
    script = _script_element(script_url, nonce)
    return format_html("{}\n{}", meta, script)


@register.simple_tag(takes_context=True)
def datastar_signals(
    context: template.Context,
    nonce: object | None = None,
) -> SafeString:
    """Show the signal view assets to active, authenticated staff."""
    request = getattr(context, "request", None)
    if not isinstance(request, HttpRequest):
        raise template.TemplateSyntaxError(
            "{% datastar_signals %} requires a request-aware template context."
        )

    user = getattr(request, "user", None)
    if not (
        getattr(user, "is_authenticated", False)
        and getattr(user, "is_active", False)
        and getattr(user, "is_staff", False)
    ):
        return SafeString("")

    stylesheet = format_html(
        '<link rel="stylesheet" href="{}">',
        static("django_datastar/signal-view.css"),
    )
    script = _script_element(static("django_datastar/signal-view.js"), nonce)
    return format_html("{}\n{}", stylesheet, script)


def _script_element(script_url: str, nonce: object | None) -> SafeString:
    if nonce is None:
        return format_html('<script type="module" src="{}"></script>', script_url)

    return format_html(
        '<script type="module" src="{}" nonce="{}"></script>',
        script_url,
        escape(nonce),
    )
