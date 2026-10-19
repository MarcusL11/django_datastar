django-datastar example application
===================================

This small Django project shows request metadata, the CSRF bridge, and staff-only
signal diagnostics. It uses a local SQLite database for staff login. From the
repository root, run:

.. code-block:: console

   uv run python example/manage.py migrate
   uv run python example/manage.py createsuperuser
   uv run python example/manage.py runserver

Open ``http://127.0.0.1:8000/`` and select Staff sign in. Use the local staff
account. Do not use the example secret key on a public server.

The home page links to these surfaces:

* ``/`` explains the example.
* ``/request-metadata/`` calls sync and async views with Datastar ``@get``
  actions. Each returns ordinary ``text/html`` whose stable element ID is
  morphed into the page.
* ``/csrf/`` sends a real Datastar ``@post`` protected by Django's normal
  ``CsrfViewMiddleware``. In the Network panel, inspect the exact
  ``Datastar-Request: true`` marker and the masked ``X-CSRFToken`` header.
* ``/signals/`` shows the floating signal view to active staff. Sign in, select
  Signal diagnostics in the navigation bar, then select the icon at the bottom
  right. Select Add one or Change enabled to change the signal values. Search
  for count or enabled in the panel. Keep secrets out of browser signals.

Request marker classification
------------------------------

Only the exact, lowercase marker value ``true`` classifies a request as
Datastar. The marker is client-controlled metadata, not authentication,
authorization, or evidence of CSRF protection. Compare responses while the
server is running:

.. code-block:: console

   curl -i http://127.0.0.1:8000/request-metadata/sync/
   curl -i -H 'Datastar-Request: true' http://127.0.0.1:8000/request-metadata/sync/
   curl -i -H 'Datastar-Request: True' http://127.0.0.1:8000/request-metadata/sync/
   curl -i -H 'Datastar-Request: false' http://127.0.0.1:8000/request-metadata/async/
   curl -i -H 'Datastar-Request: truex' http://127.0.0.1:8000/request-metadata/async/

Only the second request is classified as Datastar. Classification compares the
normalized header value Django receives. Every response displays that raw value,
the method, classification, and sync/async view type.

CSRF and browser-module ordering
--------------------------------

``DatastarMiddleware`` is intentionally before ``CsrfViewMiddleware``. It adds
descriptive request metadata; Django's CSRF middleware remains authoritative.

The base template renders ``{% datastar_csrf %}`` before the exactly pinned
Datastar v1.0.4 module. The tag emits a masked DOM token and the same-origin
fetch bridge. For an unsafe, same-origin request with the exact marker, the
bridge supplies ``X-CSRFToken``. The template does not use ``csrf_exempt``, a
manual token header, SSE, or ``datastar-py``.

The pinned CDN URL is
``https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.4/bundles/datastar.js``.
A pin avoids version drift but the CDN remains a code-execution trust boundary.
For production, download, review, and self-host that bundle, keeping
``{% datastar_csrf %}`` before the self-hosted module. Do not mark either module
script ``async``: their source order is required.
