from __future__ import annotations

from importlib.resources import files

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


if __name__ == "__main__":
    main()
