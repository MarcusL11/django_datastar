Installation
============

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

Optional CSRF bridge
--------------------

To use the template tag and packaged static module, add the app:

.. code-block:: python

   INSTALLED_APPS = [
       # ...
       "django_datastar",
   ]

Django's ``staticfiles`` app and a normal staticfiles deployment are required.
Continue with :doc:`csrf` for template setup.
