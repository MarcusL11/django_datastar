from __future__ import annotations

from typing import assert_type

from django.http import HttpRequest as DjangoHttpRequest
from django.http import HttpResponse

from django_datastar import DatastarDetails
from django_datastar import DatastarHttpRequest


class ProjectHttpRequest(DjangoHttpRequest):
    datastar: DatastarDetails


def typed_view(request: DatastarHttpRequest) -> HttpResponse:
    assert_type(request.datastar, DatastarDetails)
    return HttpResponse("datastar" if request.datastar else "ordinary")


def project_typed_view(request: ProjectHttpRequest) -> HttpResponse:
    assert_type(request.datastar, DatastarDetails)
    return HttpResponse("datastar" if request.datastar else "ordinary")
