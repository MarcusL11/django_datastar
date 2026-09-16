Troubleshooting
===============

Start with the browser Network and Console panels. Determine whether an action
made no request, received an HTTP failure, received a response that was not
applied, or opened a stream that later stopped. This package owns request
metadata, middleware, typing, and the opt-in CSRF bridge; Datastar owns actions
and response handling, and ``datastar-py`` owns Python response and SSE helpers.

Quick DevTools triage
---------------------

#. Open **Network**, enable **Preserve log**, trigger one action, and select its
   request.
#. In **Headers**, check the effective URL and redirect chain, method, status,
   request and response ``Content-Type``, and relevant request markers. Do not
   copy cookies, CSRF tokens, authorization headers, or private payloads.
#. In **Response** or **Preview**, identify HTML, JSON, JavaScript, or SSE; for
   SSE, check whether the stream ends unexpectedly.
#. In **Timing**, compare time to first byte with total download duration. A
   fast completed 4xx differs from a stream that opens and later disconnects.
#. In **Initiator**, identify the action and Datastar bundle that made the
   request.
#. If there is no request, confirm the DOM event and action expression ran, then
   check that the Datastar module and any bridge module loaded. Check the
   Console for CSP, module, and JavaScript errors.
#. If the request redirects, becomes cross-origin, or is blocked, inspect the
   redirect chain, effective URL, and CORS or CSP message. Do not weaken the
   bridge's same-origin rules; see :doc:`csrf` and :doc:`security`.
#. For a suspected CSRF 403, inspect Django's CSRF rejection reason, then verify
   that the bridge loaded before Datastar and that a qualifying unsafe
   same-origin request has ``Datastar-Request: true`` and ``X-CSRFToken``. A
   403 may instead be application authorization or another policy failure. See
   :doc:`csrf` for bridge rules and :doc:`security` for security boundaries.

A completed 4xx or 5xx
----------------------

With the Datastar **v1.0.3** bundle pinned by the :doc:`example`, a completed
4xx or 5xx response is not patched into the page. When the page appears
unchanged, inspect the request's status and **Response** in DevTools. With
Django ``DEBUG=True``, a completed HTML 500 response may contain Django's
technical error page. Treat it as sensitive: do not paste or attach settings,
request data, paths, frame locals, tokens, or other secrets from it.

This is a verified v1.0.3 observation, not a guarantee for every Datastar
release. The current `response-handling documentation
<https://data-star.dev/reference/actions#response-handling>`_ documents response
content types, but does not specify this exact non-200 policy. A connection
failure need not have a response, and a stream that ends later has only the
bytes already received.

Temporary lifecycle diagnostics
-------------------------------

For temporary development visibility, an application can use Datastar's
documented declarative lifecycle hook:

.. code-block:: html

   <div data-on:datastar-fetch="
     evt.detail.type === 'error' && console.error('Datastar request failed')
   "></div>

The documented lifecycle names are ``started``, ``finished``, ``error``,
``retrying``, and ``retries-failed``. Use only ``evt.detail.type`` as the
portable diagnostic surface, remove the hook after diagnosis, and do not log
request secrets or response payloads. See `Actions events
<https://data-star.dev/reference/actions#events>`_.

Retries and repeated mutations
------------------------------

Retries can send a mutation more than once: the server may have completed work
before the browser lost the usable response. Make retryable mutations idempotent,
for example with an application-level idempotency key or server-side
deduplication. A retry option and an ``error`` lifecycle event are not
exactly-once or no-side-effect guarantees.

Use repeated Network entries and the ``retrying`` and ``retries-failed``
lifecycle events as evidence of retries, and correlate attempts with an
application request ID. An aborted attempt is not proof that the server failed
or that a mutation did not complete.

Current, unversioned Datastar documentation says ``auto`` retries network
errors only, ``error`` retries 4xx and 5xx responses, ``always`` retries all
non-204 responses except redirects, and ``never`` disables retries. Verify retry
behavior against the bundle actually loaded, especially when upgrading.

SSE: before or after the stream starts
--------------------------------------

Before the server sends the SSE response status and headers, an exception may
still produce an ordinary error response for Network inspection. Once those
status and headers are sent, the response is committed and cannot be replaced
with a new HTML 500 page, even if no event bytes have arrived. A non-2xx status,
connection failure, or unexpected content type is pre-stream evidence; a 200
stream that later stops is mid-stream evidence. Compare time to first byte with
total duration, then check server and proxy logs for application exceptions,
cancellation, buffering, timeouts, or upstream resets. Received updates may
already have been applied. ``finished`` is not proof of server success.

The `backend-request guide <https://data-star.dev/guide/backend_requests>`_ and
`SSE event reference <https://data-star.dev/reference/sse_events>`_ describe the
Datastar transport and event format. For Python response and SSE construction,
use the separately installed ``datastar-py`` package; see :doc:`compatibility`.

Production monitoring and redaction
-----------------------------------

Keep ``DEBUG=False`` in production. Use server and proxy logging, error
monitoring, and HTTP/stream metrics with a correlation ID, route, method,
status, content type, time to first byte, stream duration, and bytes or event
counts. Track HTTP failures, completed streams, mid-stream disconnects, and
upstream resets there. Retry exhaustion is a client lifecycle condition; record
it only through optional, approved, redacted browser telemetry. Redact cookies,
CSRF and authorization headers, form data, signal values, HTML fragments, and
response bodies.

The Datastar `error reference <https://data-star.dev/errors>`_ helps identify
named client runtime errors. The commercial `Datastar Inspector
<https://data-star.dev/pro#datastar-inspector>`_ shows signals, signal patches,
persisted signals, and received SSE events in real time; it is not documented as
a renderer for Django error responses or server tracebacks.

Current documentation and the pinned example
---------------------------------------------

The example pins Datastar v1.0.3 for reproducibility, while the upstream links
on this page are current, unversioned documentation. This package does not pin
the Datastar bundle. Check the script URL and Network initiator actually loaded,
and repeat the real-browser checks in :doc:`compatibility` when changing it.
Treat the v1.0.3 completed-error observation above as version-specific.

Why no runtime debug helper ships
---------------------------------

``django-datastar`` does not ship a runtime debug helper. The documented
lifecycle surface does not expose a failed response body; displaying one would
require an invasive global ``window.fetch`` wrapper. A package helper would also
duplicate Datastar's version-dependent action and response lifecycle and could
expose sensitive request or response data. Browser DevTools, temporary
application-owned lifecycle diagnostics, and redacted server observability keep
that control with the application without expanding this package beyond its
request-metadata and opt-in-CSRF boundary.
