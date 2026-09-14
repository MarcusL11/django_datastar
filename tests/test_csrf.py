from __future__ import annotations

import re
from http import HTTPStatus

import pytest
from django.template import Context
from django.template import RequestContext
from django.template import Template
from django.template import TemplateSyntaxError
from django.test import Client
from django.test import RequestFactory
from django.utils.safestring import mark_safe

CSRF_META_PATTERN = re.compile(
    rb'<meta name="datastar-csrf-token" content="(?P<token>[A-Za-z0-9]{64})"\s*/>'
)


def _masked_token(response) -> str:
    match = CSRF_META_PATTERN.search(response.content)
    assert match is not None
    return match.group("token").decode()


def test_template_tag_bootstraps_masked_csrf_token() -> None:
    response = Client().get("/bootstrap/")

    token = _masked_token(response)

    assert len(token) == 64
    assert response.cookies["csrftoken"]["httponly"] is True
    assert "Cookie" in response.headers["Vary"].split(", ")
    meta_index = response.content.index(b'meta name="datastar-csrf-token"')
    bridge_index = response.content.index(b"django_datastar/datastar-csrf.js")
    datastar_index = response.content.index(b"datastar.js")
    assert meta_index < bridge_index < datastar_index


def test_template_tag_escapes_an_optional_script_nonce() -> None:
    request = RequestFactory().get("/")
    template = Template("{% load django_datastar %}{% datastar_csrf nonce=nonce %}")

    rendered = template.render(RequestContext(request, {"nonce": '"<nonce>'}))

    assert 'nonce="&quot;&lt;nonce&gt;"' in rendered


def test_template_tag_escapes_a_nonce_marked_safe_by_the_caller() -> None:
    request = RequestFactory().get("/")
    template = Template("{% load django_datastar %}{% datastar_csrf nonce=nonce %}")
    payload = mark_safe('"><img src=x onerror=alert(1)>')

    rendered = template.render(RequestContext(request, {"nonce": payload}))

    assert "<img src=x onerror=alert(1)>" not in rendered
    assert 'nonce="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"' in rendered


def test_template_tag_requires_a_request_aware_context() -> None:
    template = Template("{% load django_datastar %}{% datastar_csrf %}")

    with pytest.raises(
        TemplateSyntaxError,
        match="requires a request-aware template context",
    ):
        template.render(Context())


def test_csrf_middleware_enforces_rendered_token_for_unsafe_datastar_request() -> None:
    client = Client(enforce_csrf_checks=True)
    token = _masked_token(client.get("/bootstrap/"))
    datastar_headers = {"Datastar-Request": "true"}

    missing = client.post("/protected/", headers=datastar_headers)
    invalid = client.post(
        "/protected/",
        headers={**datastar_headers, "X-CSRFToken": "invalid"},
    )
    accepted = client.post(
        "/protected/",
        headers={**datastar_headers, "X-CSRFToken": token},
    )

    assert missing.status_code == HTTPStatus.FORBIDDEN
    assert invalid.status_code == HTTPStatus.FORBIDDEN
    assert accepted.status_code == HTTPStatus.OK
    assert accepted.content == b"accepted"
