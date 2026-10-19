from __future__ import annotations

from importlib.resources import files
from types import SimpleNamespace

import django
from django.conf import settings
from django.contrib.staticfiles import finders
from django.template import engines
from django.test import RequestFactory

import django_datastar


def main() -> None:
    settings.configure(
        SECRET_KEY="installed-package-check",
        INSTALLED_APPS=["django.contrib.staticfiles", "django_datastar"],
        STATIC_URL="/static/",
        TEMPLATES=[
            {
                "BACKEND": "django.template.backends.django.DjangoTemplates",
                "APP_DIRS": True,
            }
        ],
    )
    django.setup()

    package_files = files("django_datastar")
    assert package_files.joinpath("py.typed").is_file()
    assert finders.find("django_datastar/datastar-csrf.js") is not None

    request = RequestFactory().get("/")
    template = engines["django"].from_string(
        "{% load django_datastar %}{% datastar_csrf %}"
    )
    rendered = template.render({}, request)
    assert 'meta name="datastar-csrf-token"' in rendered
    assert "django_datastar/datastar-csrf.js" in rendered
    assert django_datastar.DatastarMiddleware is not None

    assets = (
        "signal-view.js",
        "signal-collector.js",
        "signal-filter.js",
        "signal-view.css",
        "img/django-datastar-icon.svg",
    )
    for asset in assets:
        path = f"django_datastar/{asset}"
        assert package_files.joinpath("static", path).is_file(), path
        assert finders.find(path) is not None, path

    signals = engines["django"].from_string(
        "{% load django_datastar %}{% datastar_signals %}"
    )
    request.user = SimpleNamespace(is_authenticated=True, is_active=True, is_staff=True)
    staff_markup = signals.render({}, request)
    assert 'src="/static/django_datastar/signal-view.js"' in staff_markup
    assert 'href="/static/django_datastar/signal-view.css"' in staff_markup

    request.user = SimpleNamespace(
        is_authenticated=True, is_active=True, is_staff=False
    )
    assert signals.render({}, request) == ""


if __name__ == "__main__":
    main()
