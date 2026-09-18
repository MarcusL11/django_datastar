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
     - tested
     - tested
   * - 3.13
     - tested
     - tested
   * - 3.14
     - tested
     - tested

All six combinations pass locally and in CI against the built wheel. The
runtime dependency is ``Django>=5.2,<6.1``. Node 20 and 22 test the JavaScript
extracted from the wheel in CI; consuming Django projects do not need Node.

Datastar and global fetch
-------------------------

The CSRF bridge wraps ``window.fetch`` before the consumer's Datastar module
loads. Compatibility therefore assumes that the Datastar bundle resolves the
global fetch function when it sends a request rather than capturing an earlier
reference or using another transport.

Keep the bridge script before Datastar. When upgrading Datastar, repeat a
real-browser Network-panel check and confirm that a qualifying unsafe
same-origin backend action contains both ``Datastar-Request: true`` and
``X-CSRFToken`` and is accepted by Django.

Companion Python package
------------------------

``datastar-py`` supplies response and SSE helpers and can be installed
separately. This package neither imports nor pins it.
