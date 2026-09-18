Automatic CSRF bridge
=====================

Complete the bridge setup in :doc:`installation`.

Django's ``CsrfViewMiddleware`` remains authoritative. This bridge does not
validate tokens, exempt views, or bypass Django's protection. It only supplies
a masked token to a narrow class of requests.

How the bridge works
--------------------

The template tag calls Django's ``get_token(request)`` and renders:

* ``<meta name="datastar-csrf-token" ...>`` containing the escaped masked token;
* the namespaced ``django_datastar/datastar-csrf.js`` external module.

Calling Django's token machinery maintains the CSRF cookie and ``Vary: Cookie``
response behavior. Because JavaScript reads the masked DOM token rather than the
cookie, ``CSRF_COOKIE_HTTPONLY=True`` is supported.

The bridge wraps ``window.fetch``, so the setup order is required: it must
execute before Datastar's module initializes.

CSRF tokens and response caching
--------------------------------

The ``{% datastar_csrf %}`` tag calls Django's ``get_token(request)``.
Pages containing the tag have the same caching requirements as
pages containing Django's ``{% csrf_token %}`` tag.

Django's site-wide cache middleware works correctly when configured in the
documented order. When caching an individual view with ``@cache_page()``,
however, apply ``@csrf_protect`` inside the cache decorator:

.. code-block:: python

   from django.views.decorators.cache import cache_page
   from django.views.decorators.csrf import csrf_protect

   @cache_page(60 * 15)
   @csrf_protect
   def my_view(request):
       ...

The decorator order is important. It ensures that CSRF processing occurs
before ``cache_page`` evaluates the response. The cache can then account for
``Vary: Cookie`` or decline to store a response that sets the CSRF cookie.
Without this ordering, ``cache_page`` may store the response before Django's
global CSRF middleware adds the cookie and ``Vary`` header. That cached response
may contain a token that does not correspond to the visitor's CSRF cookie,
causing unsafe requests to be rejected.

See `Django's guidance on using CSRF protection with caching
<https://docs.djangoproject.com/en/stable/howto/csrf/#using-csrf-protection-with-caching>`_
for the complete caching requirements.

Content Security Policy
-----------------------

A conventional ``script-src 'self'`` policy can permit the packaged same-origin
external module.

For a nonce-based Content Security Policy, pass the nonce to the tag:

.. code-block:: htmldjango

   {% datastar_csrf nonce=request.csp_nonce %}

The nonce value is escaped as an HTML attribute. The package emits no inline
JavaScript. Applications remain responsible for their complete CSP and for
configuring their static asset origin.

CSRF injection rules
--------------------

The bridge adds ``X-CSRFToken`` only when the effective request:

* uses an unsafe method;
* has ``Datastar-Request`` with the exact value ``true``;
* targets ``window.location.origin``;
* has a request mode compatible with ``same-origin``;
* has no explicit case-insensitive CSRF header; and
* has a current DOM token.

It resolves URL, method, headers, and mode from both ``Request`` input and
``fetch`` init overrides. Token-bearing requests use or preserve
``mode: "same-origin"``. Accessor-backed ``RequestInit`` members are left to
native ``fetch`` unchanged rather than being read or rebound by the bridge. If
the request cannot be safely inspected or transformed, ordinary ``fetch``
behavior is used without modifying the input.

For a missing ``X-CSRFToken``, a 403, or bridge ordering failure, see
:doc:`troubleshooting`.
