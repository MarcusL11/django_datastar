django-datastar
===============

``django-datastar`` provides request metadata and an opt-in automatic CSRF
bridge for Django applications using Datastar.

It deliberately does not duplicate Datastar response or SSE APIs. The
``datastar-py`` project can be used alongside it when those APIs are needed.

.. warning::

   ``Datastar-Request: true`` is client-controlled metadata. It is never an
   authentication, authorization, permission, or CSRF boundary.

.. toctree::
   :maxdepth: 2
   :caption: Contents

   installation
   csrf
   security
   compatibility
   api
