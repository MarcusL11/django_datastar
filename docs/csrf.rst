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

Content Security Policy
-----------------------

A conventional ``script-src 'self'`` policy can permit the packaged same-origin
external module. The installation guide shows how to pass a nonce for a
nonce-based policy. The nonce value is escaped as an HTML attribute. The
package emits no inline JavaScript. Applications remain responsible for their
complete CSP and for configuring their static asset origin.

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

For a missing ``X-CSRFToken``, a 403, or bridge ordering failure, see
:doc:`troubleshooting`.
