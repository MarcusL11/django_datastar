Security
========

Untrusted marker
----------------

The ``Datastar-Request`` header can be sent by any client. Its exact ``true``
value identifies the request format; it does not prove that Datastar, this
package, or a trusted browser originated the request.

Never use the marker or ``request.datastar`` to:

* authenticate a user;
* grant a permission;
* authorize an operation;
* skip CSRF checks; or
* weaken any other security control.

Normal Django authentication, authorization, method, origin, and CSRF controls
must still run.

CSRF authority
--------------

``CsrfViewMiddleware`` performs all server-side CSRF validation. A missing,
invalid, or inapplicable token is rejected exactly as it would be without this
package. Do not decorate Datastar endpoints with ``csrf_exempt`` merely because
the bridge is installed.

Header disclosure boundary
--------------------------

The browser bridge limits token injection to same-origin effective targets and
sets ``mode: "same-origin"``. Cross-origin, explicitly incompatible-mode, safe,
unmarked, and uninspectable requests pass through unchanged. Explicit CSRF
headers always win and are not validated or replaced by the bridge.

Caching
-------

If a cacheable response changes according to ``request.datastar``, include the
marker in the cache key, for example with Django's
``vary_on_headers("Datastar-Request")`` decorator.
