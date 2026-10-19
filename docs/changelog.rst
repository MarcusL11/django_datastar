Changelog
=========

Unreleased
----------

0.2.0 (2026-10-19)
------------------

* Add a staff-only browser signal view for selected pages, including when ``DEBUG=False``.
* Show raw values and live name or path search. Clear old results when the projection fails.
* Keep the view current after late bundle loads, body changes, collector removal, and recovery.
* Add a staff-only example page with controls for two signals. Pin the example to Datastar 1.0.4.
* Document the access boundary, raw-value exposure, browser support, CSP assumptions, and projection limits.

0.1.2 (2026-09-18)
------------------

* Flatten the example application's directory structure.
* Add unofficial-project and AI-assisted-development disclosures.
* Add uv installation and live documentation commands.
* Document CSRF and Datastar response caching requirements.
* Refine installation, compatibility, security, and troubleshooting guidance.

0.1.1 (2026-09-16)
------------------

* Add an example Django application.
* Document custom project request types for static type checking.
* Expand installation and automatic CSRF bridge guidance.
* Add troubleshooting documentation.
* Add project branding to the documentation and example application.

0.1.0 (2026-09-15)
------------------

* Add exact Datastar request classification.
* Add synchronous and asynchronous middleware-backed request metadata.
* Add typed request annotations.
* Add an opt-in automatic CSRF bridge.
* Support Python 3.12 through 3.14 and Django 5.2 and 6.0.
