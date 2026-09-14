from __future__ import annotations

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

SECRET_KEY = "django-datastar-tests"
DEBUG = True
ALLOWED_HOSTS = ["testserver"]
ROOT_URLCONF = "tests.urls"

INSTALLED_APPS = [
    "django.contrib.staticfiles",
    "django_datastar",
]

MIDDLEWARE = [
    "django_datastar.middleware.DatastarMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {},
    }
]

STATIC_URL = "/static/"
CSRF_COOKIE_HTTPONLY = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
