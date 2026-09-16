from __future__ import annotations

from django.urls import path

from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("request-metadata/", views.request_metadata, name="request_metadata"),
    path(
        "request-metadata/sync/",
        views.request_metadata_sync,
        name="request_metadata_sync",
    ),
    path(
        "request-metadata/async/",
        views.request_metadata_async,
        name="request_metadata_async",
    ),
    path("csrf/", views.csrf_demo, name="csrf_demo"),
    path("csrf/submit/", views.csrf_submit, name="csrf_submit"),
]
