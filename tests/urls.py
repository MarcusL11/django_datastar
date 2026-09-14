from __future__ import annotations

from django.http import HttpRequest
from django.http import HttpResponse
from django.shortcuts import render
from django.urls import path


def csrf_bootstrap(request: HttpRequest) -> HttpResponse:
    return render(request, "bootstrap.html")


def csrf_protected(request: HttpRequest) -> HttpResponse:
    return HttpResponse("accepted")


urlpatterns = [
    path("bootstrap/", csrf_bootstrap, name="csrf_bootstrap"),
    path("protected/", csrf_protected, name="csrf_protected"),
]
