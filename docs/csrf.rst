Automatic CSRF bridge
=====================

Django's ``CsrfViewMiddleware`` remains authoritative. This bridge does not
validate tokens, exempt views, or bypass Django's protection. It only supplies
a masked token to a narrow class of requests.

Template setup
--------------

Load the package tag and render it before the consumer's Datastar module:

.. code-block:: django

   {% load django_datastar static %}

   {% datastar_csrf %}
   <script type="module" src="{% static 'js/datastar.js' %}"></script>

The tag requires a request-aware template context. It calls Django's
``get_token(request)`` and renders:

* ``<meta name="datastar-csrf-token" ...>`` containing the escaped masked token;
* the namespaced ``django_datastar/datastar-csrf.js`` external module.

Calling Django's token machinery maintains the CSRF cookie and ``Vary: Cookie``
response behavior. Because JavaScript reads the masked DOM token rather than the
cookie, ``CSRF_COOKIE_HTTPONLY=True`` is supported.

The order is required: the bridge wraps ``window.fetch``, so it must execute
before Datastar's module initializes.

Content Security Policy
-----------------------

A conventional ``script-src 'self'`` policy can permit the packaged same-origin
external module. For a nonce-based policy, pass the nonce explicitly:

.. code-block:: django

   {% datastar_csrf nonce=request.csp_nonce %}

The nonce value is escaped as an HTML attribute. The package emits no inline
JavaScript. Applications remain responsible for their complete CSP and for
configuring their static asset origin.

Injection rules
---------------

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
