from __future__ import annotations

from importlib.metadata import version as package_version

project = "django-datastar"
author = "Marcus A. Lee"
release = package_version("django-datastar")
version = release

extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.intersphinx",
]

intersphinx_mapping = {
    "django": ("https://docs.djangoproject.com/en/stable/", None),
    "python": ("https://docs.python.org/3/", None),
}

templates_path = ["_templates"]
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]
html_theme = "furo"
html_static_path = ["_static"]
html_favicon = "_static/django-datastar-icon.svg"
html_theme_options = {
    "light_logo": "django-datastar-logo.svg",
    "dark_logo": "django-datastar-logo-dark.svg",
    "sidebar_hide_name": True,
}
