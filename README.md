# django-datastar

`django-datastar` provides small, focused integration points between Django and
[Datastar](https://data-star.dev/):

- exact request classification through `Datastar-Request: true`;
- sync/async middleware-backed `request.datastar` metadata; and
- an opt-in bridge that supplies Django CSRF tokens to qualifying Datastar
  backend-action requests.

It does not provide Datastar response or SSE APIs. Use
[`datastar-py`](https://github.com/starfederation/datastar/tree/main/sdk/python)
as a companion when those APIs are needed.

> The `Datastar-Request` header is client-controlled metadata. Never use it for
> authentication, authorization, permissions, or a CSRF bypass.

## Installation

The distribution has not yet been published. From a source checkout, install it
with:

```console
python -m pip install .
```

Add the middleware before Django's CSRF middleware:

```python
MIDDLEWARE = [
    # ...
    "django_datastar.middleware.DatastarMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    # ...
]
```

Use either the helper or the attached details in a view:

```python
from django.http import HttpResponse
from django_datastar import DatastarHttpRequest


def update(request: DatastarHttpRequest) -> HttpResponse:
    if request.datastar:
        return HttpResponse("Datastar request")
    return HttpResponse("ordinary request")
```

`DatastarHttpRequest` is an annotation for requests processed by the middleware;
Django still creates the actual request object.

## Automatic CSRF headers

The bridge is optional. Add the app when you want its template tag and static
module:

```python
INSTALLED_APPS = [
    # ...
    "django_datastar",
]
```

Load the tag before your chosen Datastar bundle:

```django
{% load django_datastar static %}

{% datastar_csrf %}
<script type="module" src="{% static 'js/datastar.js' %}"></script>
```

For nonce-based Content Security Policies:

```django
{% datastar_csrf nonce=request.csp_nonce %}
```

The tag calls Django's CSRF token machinery and emits a masked token in the DOM,
so it works with `CSRF_COOKIE_HTTPONLY=True`. The external module reads that token
at request time and injects `X-CSRFToken` only when all of these conditions hold:

- the effective method is unsafe;
- `Datastar-Request` is exactly `true`;
- the effective target is same-origin;
- the request mode is compatible with `same-origin`;
- no CSRF header was supplied explicitly; and
- a DOM token is present.

Django's `CsrfViewMiddleware` remains solely responsible for validation. The
bridge assumes Datastar resolves `window.fetch` at request time; see the
[compatibility documentation](https://django-datastar.readthedocs.io/en/latest/compatibility.html)
before upgrading Datastar.

## Documentation

Build the documentation locally with:

```console
python -m pip install ".[docs]"
sphinx-build -W --keep-going -b html docs docs/_build/html
```

## Development

```console
uv sync --group dev
uv run pytest
node --test tests/test_datastar_csrf.mjs
uv run ruff check .
uv run ruff format --check .
uv run mypy
```

Node is contributor and CI tooling only. It is not a runtime dependency for
Django applications.

## License

MIT
