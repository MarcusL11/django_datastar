from __future__ import annotations

from types import SimpleNamespace

import pytest
from django.template import Context
from django.template import RequestContext
from django.template import Template
from django.template import TemplateSyntaxError
from django.test import RequestFactory
from django.test import override_settings
from django.utils.safestring import mark_safe

TAG = "{% load django_datastar %}{% datastar_signals %}"


def _render(user: object, source: str = TAG, **context: object) -> str:
    request = RequestFactory().get("/")
    request.user = user
    return Template(source).render(RequestContext(request, context))


def _user(*, authenticated: bool, staff: bool, active: bool) -> SimpleNamespace:
    return SimpleNamespace(
        is_authenticated=authenticated,
        is_staff=staff,
        is_active=active,
    )


@pytest.mark.parametrize(
    ("authenticated", "staff", "active"),
    [
        (False, False, False),
        (True, False, True),
        (True, True, False),
        (False, True, True),
    ],
    ids=["visitor", "nonstaff", "inactive-staff", "unauthenticated-staff"],
)
def test_tag_shows_no_diagnostic_markup_to_other_visitors(
    authenticated: bool, staff: bool, active: bool
) -> None:
    user = _user(authenticated=authenticated, staff=staff, active=active)

    assert _render(user) == ""


def test_tag_shows_diagnostic_assets_to_active_staff() -> None:
    user = _user(authenticated=True, staff=True, active=True)

    rendered = _render(user)

    assert 'src="/static/django_datastar/signal-view.js"' in rendered
    assert 'href="/static/django_datastar/signal-view.css"' in rendered


def test_tag_requires_a_request_aware_context() -> None:
    with pytest.raises(TemplateSyntaxError, match="request-aware"):
        Template(TAG).render(Context())


def test_tag_shows_no_diagnostic_markup_without_a_user() -> None:
    request = RequestFactory().get("/")

    assert Template(TAG).render(RequestContext(request)) == ""


@pytest.mark.parametrize("safe", [False, True], ids=["plain", "marked-safe"])
def test_tag_escapes_an_optional_script_nonce(safe: bool) -> None:
    user = _user(authenticated=True, staff=True, active=True)
    payload = '\"><img src=x onerror=alert(1)>'
    nonce = mark_safe(payload) if safe else payload

    rendered = _render(
        user,
        "{% load django_datastar %}{% datastar_signals nonce=nonce %}",
        nonce=nonce,
    )

    assert 'nonce="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"' in rendered
    assert payload not in rendered


@override_settings(DEBUG=False)
def test_tag_shows_staff_assets_with_debug_disabled() -> None:
    user = _user(authenticated=True, staff=True, active=True)

    rendered = _render(user)

    assert 'src="/static/django_datastar/signal-view.js"' in rendered
    assert 'href="/static/django_datastar/signal-view.css"' in rendered


@override_settings(DEBUG=False)
def test_tag_denies_visitors_with_debug_disabled() -> None:
    user = _user(authenticated=False, staff=False, active=False)

    assert _render(user) == ""
