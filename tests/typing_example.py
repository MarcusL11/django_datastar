from __future__ import annotations

from typing import assert_type

from django.http import HttpResponse

from django_datastar import DatastarDetails
from django_datastar import DatastarHttpRequest


def typed_view(request: DatastarHttpRequest) -> HttpResponse:
    assert_type(request.datastar, DatastarDetails)
    return HttpResponse("datastar" if request.datastar else "ordinary")
