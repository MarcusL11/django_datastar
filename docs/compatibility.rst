Compatibility
=============

Supported matrix
----------------

The initial compatibility target is:

.. list-table::
   :header-rows: 1

   * - Python
     - Django 5.2
     - Django 6.0
   * - 3.12
     - local pass; CI pending
     - local pass; CI pending
   * - 3.13
     - local pass; CI pending
     - local pass; CI pending
   * - 3.14
     - local pass; CI pending
     - local pass; CI pending

All six combinations passed locally. They become supported claims only after
the corresponding jobs pass on the committed revision. The runtime dependency
is ``Django>=5.2,<6.1``. Node 20 and 22 are CI targets for browser-module tests
only; consuming Django projects do not need Node.

Datastar and global fetch
-------------------------

The CSRF bridge wraps ``window.fetch`` before the consumer's Datastar module
loads. Compatibility therefore assumes that the Datastar bundle resolves the
global fetch function when it sends a request rather than capturing an earlier
reference or using another transport.

Keep the bridge script before Datastar and repeat a real-browser Network-panel
check when upgrading Datastar. Confirm that an unsafe same-origin backend action
contains both ``Datastar-Request: true`` and ``X-CSRFToken`` and is accepted by
Django.

Companion Python package
------------------------

``datastar-py`` supplies response and SSE helpers and can be installed
separately. This package neither imports nor pins it.

Extraction acceptance
---------------------

Before the first release, build a wheel and install it into the original Django
application that proved the behavior. Replace the local middleware and static
bridge with the package, render ``{% datastar_csrf %}``, and run that
application's focused tests, Node tests, full suite, lint, formatting, Django
checks, and staticfiles collection.

Then repeat the real-browser backend-action check. Verify the exact marker and
masked CSRF header, successful Django response, truthy ``request.datastar``, and
continued rejection of missing or invalid tokens. Include a temporary
same-origin endpoint that redirects to a second local origin: the qualifying
fetch must reject in ``same-origin`` mode, and the second origin must receive
neither the redirected request nor the CSRF header. Do not remove the local
implementation until the package-backed path passes.
