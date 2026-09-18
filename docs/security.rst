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

If a cached view returns different content for Datastar and ordinary requests,
vary the response on the ``Datastar-Request`` header. Otherwise, a cached
Datastar partial could be served as a full page, or a cached full page could be
returned to a Datastar request.

For a per-view cached response that both changes according to
``request.datastar`` and renders ``{% datastar_csrf %}``, place both response
decorators inside ``cache_page``:

.. code-block:: python

   from django.shortcuts import render
   from django.views.decorators.cache import cache_page
   from django.views.decorators.csrf import csrf_protect
   from django.views.decorators.vary import vary_on_headers

   @cache_page(60 * 5)
   @vary_on_headers("Datastar-Request")
   @csrf_protect
   def page(request):
       if request.datastar:
           return render(request, "partial.html")
       return render(request, "full_page.html")

``cache_page`` must be outermost so it evaluates the response after the inner
decorators. ``vary_on_headers`` adds ``Vary: Datastar-Request`` so Django and
compatible intermediary caches keep the response variants separate.
``csrf_protect`` ensures that CSRF processing occurs before ``cache_page``
evaluates the response, as required by Django for per-view cached responses
that insert a CSRF token. The relative order of the two inner decorators is not
significant here.

With Django's default cookie-based CSRF configuration, the per-view cache will
not store a response that both sets the CSRF cookie and varies on ``Cookie``.
This is expected safety behavior rather than a caching failure. See :doc:`csrf`
for more information about caching responses that contain the token.

These decorators address independent concerns. A view whose response does not
depend on ``request.datastar`` does not need ``vary_on_headers``. A response
that does not render the CSRF token does not need ``csrf_protect`` specifically
for caching. Neither cache-specific measure is needed when the view is not
cached.
