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
