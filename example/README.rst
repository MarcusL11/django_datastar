django-datastar example application
===================================

This small, database-free Django project demonstrates django-datastar request
metadata and its opt-in CSRF bridge in a browser. From the repository root, run:

.. code-block:: console

   uv run python example/manage.py runserver

Then open http://127.0.0.1:8000/. No migration or database setup is required.

The home page links to three surfaces:

* ``/`` explains the example.
* ``/request-metadata/`` calls sync and async views with Datastar ``@get``
  actions. Each returns ordinary ``text/html`` whose stable element ID is
  morphed into the page.
* ``/csrf/`` sends a real Datastar ``@post`` protected by Django's normal
  ``CsrfViewMiddleware``. In the Network panel, inspect the exact
  ``Datastar-Request: true`` marker and the masked ``X-CSRFToken`` header.

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
Datastar v1.0.3 module. The tag emits a masked DOM token and the same-origin
fetch bridge. For an unsafe, same-origin request with the exact marker, the
bridge supplies ``X-CSRFToken``. The template does not use ``csrf_exempt``, a
manual token header, SSE, or ``datastar-py``.

The pinned CDN URL is
``https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.3/bundles/datastar.js``.
A pin avoids version drift but the CDN remains a code-execution trust boundary.
For production, download, review, and self-host that bundle, keeping
``{% datastar_csrf %}`` before the self-hosted module. Do not mark either module
script ``async``: their source order is required.
