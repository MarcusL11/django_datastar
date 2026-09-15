from __future__ import annotations

import asyncio
from collections.abc import Awaitable
from typing import cast
from unittest.mock import patch

import pytest
from asgiref.sync import iscoroutinefunction
from django.conf import settings
from django.http import HttpRequest
from django.http import HttpResponse
from django.http.response import HttpResponseBase
from django.test import RequestFactory

from django_datastar import DatastarDetails
from django_datastar import DatastarHttpRequest
from django_datastar import DatastarMiddleware
from django_datastar import is_datastar


@pytest.mark.parametrize(
    ("header_value", "expected"),
    [
        (None, False),
        ("true", True),
        ("false", False),
        ("True", False),
        (" true ", False),
    ],
)
def test_is_datastar_requires_canonical_header_value(
    header_value: str | None,
    *,
    expected: bool,
) -> None:
    headers = {} if header_value is None else {"Datastar-Request": header_value}
    request = RequestFactory().get("/", headers=headers)

    assert is_datastar(request) is expected


def test_datastar_details_delegates_detection_to_public_helper() -> None:
    request = RequestFactory().get("/")
    details = DatastarDetails(request)

    with patch(
        "django_datastar.middleware.is_datastar",
        autospec=True,
        return_value=True,
    ) as predicate:
        assert bool(details) is True

    predicate.assert_called_once_with(request)


def test_sync_middleware_attaches_details_and_preserves_response() -> None:
    request = cast(
        "DatastarHttpRequest",
        RequestFactory().get("/", headers={"Datastar-Request": "true"}),
    )
    expected_response = HttpResponse("unchanged", headers={"X-Test": "original"})

    def get_response(received_request: HttpRequest) -> HttpResponseBase:
        assert received_request is request
        assert isinstance(request.datastar, DatastarDetails)
        assert bool(request.datastar) is True
        return expected_response

    middleware = DatastarMiddleware(get_response)
    response = middleware(request)

    assert iscoroutinefunction(middleware) is False
    assert response is expected_response
    assert expected_response.content == b"unchanged"
    assert expected_response.headers["X-Test"] == "original"


def test_async_middleware_attaches_details_and_preserves_response() -> None:
    request = cast(
        "DatastarHttpRequest",
        RequestFactory().get("/", headers={"Datastar-Request": "false"}),
    )
    expected_response = HttpResponse("unchanged", headers={"X-Test": "original"})

    async def get_response(received_request: HttpRequest) -> HttpResponseBase:
        assert received_request is request
        assert isinstance(request.datastar, DatastarDetails)
        assert bool(request.datastar) is False
        return expected_response

    middleware = DatastarMiddleware(get_response)
    result = middleware(request)

    assert iscoroutinefunction(middleware) is True
    response = asyncio.run(cast("Awaitable[HttpResponseBase]", result))
    assert response is expected_response
    assert expected_response.content == b"unchanged"
    assert expected_response.headers["X-Test"] == "original"


def test_datastar_middleware_is_registered_before_csrf_middleware() -> None:
    middleware = list(settings.MIDDLEWARE)

    assert middleware.index("django_datastar.middleware.DatastarMiddleware") < (
        middleware.index("django.middleware.csrf.CsrfViewMiddleware")
    )
