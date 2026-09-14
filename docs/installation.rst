Installation
============

The distribution is not published yet. Install a local checkout or built wheel
during development.

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
