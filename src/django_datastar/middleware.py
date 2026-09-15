from __future__ import annotations

from collections.abc import Awaitable
from collections.abc import Callable
from typing import cast

from asgiref.sync import iscoroutinefunction
from asgiref.sync import markcoroutinefunction
from django.http import HttpRequest
from django.http.response import HttpResponseBase

_SyncGetResponse = Callable[[HttpRequest], HttpResponseBase]
_AsyncGetResponse = Callable[[HttpRequest], Awaitable[HttpResponseBase]]
_GetResponse = _SyncGetResponse | _AsyncGetResponse


def is_datastar(request: HttpRequest) -> bool:
    """Return whether a request has Datastar's canonical marker header.

    The marker is client-controlled and must not authorize a request or bypass
    CSRF. Cacheable views that vary by this result should use
    ``@vary_on_headers("Datastar-Request")``.
    """
    return request.headers.get("Datastar-Request") == "true"


class DatastarDetails:
    """Datastar metadata attached to a Django request."""

    def __init__(self, request: HttpRequest) -> None:
        self.request = request

    def __bool__(self) -> bool:
        return is_datastar(self.request)


class DatastarHttpRequest(HttpRequest):
    """Typing contract for a request processed by :class:`DatastarMiddleware`.

    Django continues to create the request object. Use this class as a view
    annotation when the middleware is installed; do not use it for runtime
    ``isinstance`` checks.
    """

    datastar: DatastarDetails


class DatastarMiddleware:
    """Attach Datastar request metadata in sync and async middleware chains."""

    sync_capable = True
    async_capable = True

    def __init__(self, get_response: _GetResponse) -> None:
        self.get_response = get_response
        self._async_mode = iscoroutinefunction(get_response)

        if self._async_mode:
            markcoroutinefunction(self)

    def __call__(
        self,
        request: HttpRequest,
    ) -> HttpResponseBase | Awaitable[HttpResponseBase]:
        if self._async_mode:
            return self.__acall__(request)

        self._attach_details(request)
        get_response = cast("_SyncGetResponse", self.get_response)
        return get_response(request)

    async def __acall__(self, request: HttpRequest) -> HttpResponseBase:
        self._attach_details(request)
        get_response = cast("_AsyncGetResponse", self.get_response)
        return await get_response(request)

    @staticmethod
    def _attach_details(request: HttpRequest) -> None:
        typed_request = cast("DatastarHttpRequest", request)
        typed_request.datastar = DatastarDetails(request)
