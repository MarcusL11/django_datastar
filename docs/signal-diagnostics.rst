Signal diagnostics
==================

Select a page
-------------

Add ``django_datastar`` to ``INSTALLED_APPS`` and make Django static files available.
Load the tag in a request-aware template on each selected page:

.. code-block:: htmldjango

   {% load django_datastar %}
   {% datastar_signals %}

The tag emits a stylesheet and an external module for authenticated, active staff only.
It emits no markup for other visitors, and it works with ``DEBUG=False``.
The tag needs a request-aware template context and raises a template error without one.
Select pages explicitly. The package does not add the view to every page.
The :doc:`example` shows this tag on a staff-only page with Datastar 1.0.4.

The module adds an icon button at the bottom right of the page. Select it to open or close the floating view.
The view reads Datastar's JSON signal projection from a hidden element on the current page.
It shows the current raw JSON values as text, including nested values, with no redaction.
Keep secrets out of browser signals if staff must not see them.

Do not serve staff pages with this tag from a public shared cache.
This feature does not collect request data or signal history, and it does not use Django Debug Toolbar.

Search signals
--------------

The open panel has a search field for signal names and paths.
The filter updates as you type and ignores letter case. It does not search values.
For example, ``name`` finds ``user.name`` and shows its current value with the full path.
A parent match shows the full group. Array paths keep their original indexes.

Clear the search to show the full JSON projection again.
The filter stays active when signal values change.
No matching path shows ``No matching signals.``

An unavailable projection shows ``Signals unavailable.`` instead of old results, even with an active search.
Search runs in the browser. It sends no request and does not change Datastar signals.

The demo has ``count`` and ``enabled`` signals. Each signal has a page button that changes its value.
Search for either name in the panel while you use its button.

Tested bundle
-------------

Real-browser tests cover only the full Datastar 1.0.4 bundle with ``data-json-signals__terse``.
This test covers live values, late bundle load, collector removal, recovery, and body content replacement.
Other versions and the core bundle have no tested support claim.
This package does not install a Datastar bundle. Load a tested bundle on each selected page.

A full page navigation needs the tag in the destination template. Full navigation has no lifecycle test.

Content Security Policy
-----------------------

The tag emits no inline script. Its module imports a second packaged module from the same static origin.
Allow the module origin with ``script-src``, the stylesheet origin with ``style-src``, and the icon origin with ``img-src``.
For a nonce-based script policy, pass the page nonce to the tag:

.. code-block:: htmldjango

   {% datastar_signals nonce=request.csp_nonce %}

The nonce applies to the script tag, not to the stylesheet or its icon.
Allow the Datastar bundle origin under the application policy too.
Real-browser signal tests do not use a restrictive CSP. Check your complete policy in your browser before use.

Limits and unavailable state
----------------------------

The collector parses the complete projection, and the view displays full or filtered data in a scrollable panel.
The package sets no byte or signal count limit. No maximum projection size has a browser test.
Large values can slow the browser or use much memory. Do not use this view for large signal trees.

Before a projection exists, the view shows ``Signals unavailable.`` instead of old values.
It also shows this status for empty, invalid, or non-object JSON and after collector removal.
The collector adds a new projection element after removal and resumes when Datastar supplies new values.
If the bundle cannot produce this projection, the view stays unavailable.
The status does not give a reason for a failed projection.
