Installation
============

Requirements
------------

``django-datastar`` requires:

* Python 3.12 or newer. Python 3.12, 3.13, and 3.14 are tested.
* Django 5.2 or 6.0. The installed dependency constraint is
  ``Django>=5.2,<6.1``.

A consuming application supplies its own `Datastar
<https://data-star.dev/>`_ JavaScript bundle. ``django-datastar`` does not
install or pin that bundle. The example application pins Datastar v1.0.3 for
reproducibility; check :doc:`compatibility` when choosing or upgrading the
bundle.

`datastar-py <https://pypi.org/project/datastar-py/>`_ is recommended for constructing Datastar
responses and SSE events.

Install the package
-------------------

Install the package from PyPI:

.. code-block:: console

   python -m pip install django-datastar

To install a development checkout instead, run ``python -m pip install .`` from
the repository root.

Request metadata
----------------

Add the middleware before Django's CSRF middleware:

.. code-block:: python

   MIDDLEWARE = [
       # ...
       "django_datastar.middleware.DatastarMiddleware",
       "django.middleware.csrf.CsrfViewMiddleware",
       # ...
   ]

Every request that reaches the rest of the middleware chain then has a
``datastar`` details object. Its truth value is true only when the
``Datastar-Request`` header value is exactly ``true``.

For a typed view annotation:

.. code-block:: python

   from django.http import HttpResponse
   from django_datastar import DatastarHttpRequest

   def update(request: DatastarHttpRequest) -> HttpResponse:
       if request.datastar:
           return HttpResponse("Datastar request")
       return HttpResponse("ordinary request")

``DatastarHttpRequest`` describes the middleware-added attribute for type
checkers. Django continues to construct its normal request object; do not use
the annotation class as a runtime ``isinstance`` test.

Projects that already define a custom request type can declare the middleware
attribute on that type instead:

.. code-block:: python

   from django.http import HttpRequest as DjangoHttpRequest
   from django_datastar import DatastarDetails

   class HttpRequest(DjangoHttpRequest):
       datastar: DatastarDetails

Views can then annotate their request with the project's ``HttpRequest`` class.
This follows the custom-request pattern recommended by ``django-stubs`` and
avoids replacing an existing project-wide request annotation.

Direct request classification
-----------------------------

Use ``is_datastar`` when middleware-backed request details are not needed:

.. code-block:: python

   from django.http import HttpRequest
   from django.http import HttpResponse
   from django_datastar import is_datastar

   def update(request: HttpRequest) -> HttpResponse:
       if is_datastar(request):
           return HttpResponse("Datastar request")
       return HttpResponse("ordinary request")

The helper and ``request.datastar`` use the same exact, case-sensitive header
check. The header remains client-controlled metadata and must not authorize a
request or bypass CSRF protection.

Automatic CSRF bridge
---------------------

To enable the opt-in CSRF bridge, add the app:

.. code-block:: python

   INSTALLED_APPS = [
       # ...
       "django_datastar",
   ]

In a request-aware template, load the package tag and render it before the
Datastar module. Choose either a CDN-hosted or self-hosted Datastar bundle.

For a CDN-hosted bundle:

.. code-block:: django

   {% load django_datastar %}
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1">
       <title>My application</title>
       {% datastar_csrf %}
       <script
         type="module"
         src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.3/bundles/datastar.js"
       ></script>
     </head>
     <body>
       <main>
         {% block content %}{% endblock %}
       </main>
     </body>
   </html>

The URL above pins the same Datastar version as the example application. Review
and choose the version appropriate for your application.

For a self-hosted bundle:

.. code-block:: django

   {% load django_datastar static %}
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="utf-8">
       <meta name="viewport" content="width=device-width, initial-scale=1">
       <title>My application</title>
       {% datastar_csrf %}
       <script type="module" src="{% static 'js/datastar.js' %}"></script>
     </head>
     <body>
       <main>
         {% block content %}{% endblock %}
       </main>
     </body>
   </html>

The self-hosted example assumes that the application provides the chosen
Datastar bundle at ``js/datastar.js``; it is not included with
``django-datastar``.

In both cases, the order is required because the bridge wraps ``window.fetch``
before Datastar initializes. For a nonce-based Content Security Policy, pass
the nonce to the tag:

.. code-block:: django

   {% datastar_csrf nonce=request.csp_nonce %}

Django's ``CsrfViewMiddleware`` remains responsible for validating the token.
See :doc:`csrf` for the bridge's token handling, Content Security Policy
behavior, and exact header-injection rules.
