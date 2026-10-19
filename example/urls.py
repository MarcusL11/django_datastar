from __future__ import annotations

import views
from django.contrib.auth import views as auth_views
from django.urls import path

urlpatterns = [
    path("", views.home, name="home"),
    path(
        "staff/login/",
        auth_views.LoginView.as_view(template_name="login.html"),
        name="login",
    ),
    path("staff/logout/", auth_views.LogoutView.as_view(), name="logout"),
    path("signals/", views.signal_diagnostics, name="signal_diagnostics"),
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
