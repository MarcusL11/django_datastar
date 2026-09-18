from __future__ import annotations

import re

from django.http import HttpResponse
from django.test import Client
from django.test import SimpleTestCase
from django.urls import reverse

PINNED_DATASTAR_URL = (
    "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.3/bundles/datastar.js"
)
TOKEN_PATTERN = re.compile(
    r'<meta name="datastar-csrf-token" content="([A-Za-z0-9]{64})"\s*/?>'
)


class PageTests(SimpleTestCase):
    def test_named_pages_render(self) -> None:
        for name in ("home", "request_metadata", "csrf_demo"):
            with self.subTest(name=name):
                response = self.client.get(reverse(name))
                self.assertEqual(response.status_code, 200)
                self.assertTrue(response["Content-Type"].startswith("text/html"))

    def test_shared_layout_uses_brand_assets(self) -> None:
        response = self.client.get(reverse("home"))

        self.assertContains(
            response,
            'href="/static/example/django-datastar-icon.svg"',
        )
        self.assertContains(
            response,
            'src="/static/example/django-datastar-logo.svg"',
        )

    def test_metadata_page_uses_datastar_get_actions(self) -> None:
        response = self.client.get(reverse("request_metadata"))
        content = response.content.decode()

        self.assertIn(
            f"@get('{reverse('request_metadata_sync')}')",
            content,
        )
        self.assertIn(
            f"@get('{reverse('request_metadata_async')}')",
            content,
        )
        self.assertContains(response, 'id="request-metadata-result"')

    def test_csrf_page_uses_datastar_post_action(self) -> None:
        response = self.client.get(reverse("csrf_demo"))

        self.assertContains(
            response,
            f"@post('{reverse('csrf_submit')}', {{contentType: 'form'}})",
        )
        self.assertContains(response, 'id="csrf-result"')


class SyncRequestMetadataTests(SimpleTestCase):
    def test_exact_marker_classification(self) -> None:
        url = reverse("request_metadata_sync")
        cases = (
            (None, "(missing)", False),
            ("true", "true", True),
            ("false", "false", False),
            ("True", "True", False),
            ("truex", "truex", False),
        )

        for marker, visible_marker, is_datastar in cases:
            with self.subTest(marker=marker):
                headers = {} if marker is None else {"HTTP_DATASTAR_REQUEST": marker}
                response = self.client.get(url, **headers)

                self._assert_metadata_response(
                    response,
                    visible_marker=visible_marker,
                    is_datastar=is_datastar,
                    view_type="sync",
                )

    def _assert_metadata_response(
        self,
        response: HttpResponse,
        *,
        visible_marker: str,
        is_datastar: bool,
        view_type: str,
    ) -> None:
        status_code = response.status_code
        content_type = response["Content-Type"]
        content = response.content.decode()
        self.assertEqual(status_code, 200)
        self.assertTrue(content_type.startswith("text/html"))
        self.assertEqual(content.count('id="request-metadata-result"'), 1)
        self.assertIn("<dd>GET</dd>", content)
        self.assertIn(visible_marker, content)
        self.assertIn(f"<dd>{is_datastar}</dd>", content)
        self.assertIn(f"<dd>{view_type}</dd>", content)


class AsyncRequestMetadataTests(SimpleTestCase):
    async def test_async_client_uses_exact_marker_classification(self) -> None:
        url = reverse("request_metadata_async")

        for marker, is_datastar in (("true", True), ("True", False)):
            with self.subTest(marker=marker):
                response = await self.async_client.get(
                    url,
                    headers={"Datastar-Request": marker},
                )
                content = response.content.decode()

                self.assertEqual(response.status_code, 200)
                self.assertTrue(response["Content-Type"].startswith("text/html"))
                self.assertEqual(content.count('id="request-metadata-result"'), 1)
                self.assertIn(f"<code>{marker}</code>", content)
                self.assertIn(f"<dd>{is_datastar}</dd>", content)
                self.assertIn("<dd>async</dd>", content)


class CsrfExampleTests(SimpleTestCase):
    def setUp(self) -> None:
        self.client = Client(enforce_csrf_checks=True)
        self.url = reverse("csrf_submit")

    def test_bootstrap_sets_httponly_cookie_and_orders_modules(self) -> None:
        response = self.client.get(reverse("csrf_demo"))
        content = response.content.decode()
        token = self._token_from(content)

        self.assertEqual(len(token), 64)
        self.assertIn("csrftoken", self.client.cookies)
        self.assertTrue(self.client.cookies["csrftoken"]["httponly"])
        self.assertLess(
            content.index('name="datastar-csrf-token"'),
            content.index("django_datastar/datastar-csrf.js"),
        )
        self.assertLess(
            content.index("django_datastar/datastar-csrf.js"),
            content.index(PINNED_DATASTAR_URL),
        )

    def test_post_without_csrf_header_is_rejected(self) -> None:
        self.client.get(reverse("csrf_demo"))

        response = self.client.post(
            self.url,
            {"message": "Rejected"},
            HTTP_DATASTAR_REQUEST="true",
        )

        self.assertEqual(response.status_code, 403)

    def test_post_with_masked_token_is_accepted_and_morphs_html(self) -> None:
        bootstrap = self.client.get(reverse("csrf_demo"))
        token = self._token_from(bootstrap.content.decode())
        message = "<strong>Protected</strong>"

        response = self.client.post(
            self.url,
            {"message": message},
            HTTP_DATASTAR_REQUEST="true",
            HTTP_X_CSRFTOKEN=token,
        )
        content = response.content.decode()

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response["Content-Type"].startswith("text/html"))
        self.assertEqual(content.count('id="csrf-result"'), 1)
        self.assertIn("Django accepted the protected POST", content)
        self.assertIn("&lt;strong&gt;Protected&lt;/strong&gt;", content)
        self.assertNotIn(message, content)
        self.assertIn("bool(request.datastar): True", content)

    def _token_from(self, content: str) -> str:
        match = TOKEN_PATTERN.search(content)
        self.assertIsNotNone(match)
        return match.group(1)
