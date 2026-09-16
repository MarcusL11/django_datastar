Example application
===================

The `example application <https://github.com/MarcusL11/django_datastar/tree/main/example>`_
is a small, database-free Django project for inspecting django-datastar in a
browser. Its `README <https://github.com/MarcusL11/django_datastar/blob/main/example/README.rst>`_
has the complete walkthrough.

Run it from a repository checkout without migrations or database setup:

.. code-block:: console

   uv run python example/manage.py runserver

Then open ``http://127.0.0.1:8000/``. The home page links to the request
metadata demonstration and the CSRF demonstration. The metadata page sends
Datastar GETs to both sync and async views; inspect the browser Network panel
for ``Datastar-Request: true``. Both responses are ordinary ``text/html``
morphs matched by stable element IDs, not SSE responses.

Request classification is exact and the header is client-controlled metadata:

.. code-block:: console

   curl -i http://127.0.0.1:8000/request-metadata/sync/
   curl -i -H 'Datastar-Request: true' http://127.0.0.1:8000/request-metadata/sync/
   curl -i -H 'Datastar-Request: True' http://127.0.0.1:8000/request-metadata/sync/
   curl -i -H 'Datastar-Request: false' http://127.0.0.1:8000/request-metadata/async/
   curl -i -H 'Datastar-Request: truex' http://127.0.0.1:8000/request-metadata/async/

Only the second request classifies as Datastar. Classification compares the
normalized header value Django receives. The marker must never be used for
authentication, authorization, permissions, or a CSRF bypass.

The CSRF page makes a real protected Datastar POST. In the Network panel,
confirm that it has both ``Datastar-Request: true`` and ``X-CSRFToken``. Django's
``CsrfViewMiddleware`` remains responsible for accepting or rejecting that
request. Keep ``DatastarMiddleware`` before ``CsrfViewMiddleware`` and render
``{% datastar_csrf %}`` before the Datastar module: the template tag installs
the packaged fetch bridge before Datastar sends requests.

The example pins Datastar to
``https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.3/bundles/datastar.js``.
A pinned CDN URL prevents accidental version drift, but it is still a
third-party code-execution trust boundary. In production, download, review,
and serve that bundle from your own static origin while preserving the script
ordering.

For Network-panel diagnosis of failed actions, see :doc:`troubleshooting`.
