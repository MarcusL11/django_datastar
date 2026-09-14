import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { pathToFileURL } from "node:url";

const TOKEN_A = "a".repeat(64);
const TOKEN_B = "b".repeat(64);
const RESPONSE = { ok: true };
const calls = [];
let token = TOKEN_A;

const originalFetch = async (...args) => {
  calls.push(args);
  return RESPONSE;
};

globalThis.window = {
  fetch: originalFetch,
  location: { origin: "https://example.test" },
};
globalThis.document = {
  baseURI: "https://example.test/base/",
  querySelector: () =>
    token === null
      ? null
      : {
          getAttribute: (name) => (name === "content" ? token : null),
        },
};

const bridgeModule = process.env.DATASTAR_CSRF_MODULE
  ? pathToFileURL(process.env.DATASTAR_CSRF_MODULE).href
  : new URL(
      "../src/django_datastar/static/django_datastar/datastar-csrf.js",
      import.meta.url,
    ).href;
await import(bridgeModule);

beforeEach(() => {
  calls.length = 0;
  token = TOKEN_A;
});

async function capturedRequest(input, init) {
  const response = await window.fetch(input, init);

  assert.equal(response, RESPONSE);
  assert.equal(calls.length, 1);
  return calls[0];
}

function datastarHeaders(headers = {}) {
  return { "Datastar-Request": "true", ...headers };
}

test("injects the current token into same-origin unsafe Datastar requests", async () => {
  const input = "/update";
  const init = {
    body: "payload",
    credentials: "include",
    headers: datastarHeaders({ "X-Feature": "kept" }),
    method: "POST",
  };

  const [capturedInput, capturedInit] = await capturedRequest(input, init);
  const headers = new Headers(capturedInit.headers);

  assert.equal(capturedInput, input);
  assert.equal(capturedInit.body, "payload");
  assert.equal(capturedInit.credentials, "include");
  assert.equal(capturedInit.method, "POST");
  assert.equal(capturedInit.mode, "same-origin");
  assert.equal(headers.get("Datastar-Request"), "true");
  assert.equal(headers.get("X-Feature"), "kept");
  assert.equal(headers.get("X-CSRFToken"), TOKEN_A);
  assert.equal(new Headers(init.headers).has("X-CSRFToken"), false);
});

test("preserves inherited and non-enumerable RequestInit members", async () => {
  const prototype = {};
  Object.defineProperties(prototype, {
    body: { value: "payload" },
    credentials: { value: "include" },
    headers: {
      value: datastarHeaders({ "X-Feature": "kept" }),
    },
    method: { value: "POST" },
    redirect: { value: "error" },
  });
  const init = Object.create(prototype);

  const [capturedInput, capturedInit] = await capturedRequest("/update", init);
  const request = new Request(
    new URL(capturedInput, document.baseURI),
    capturedInit,
  );

  assert.equal(request.method, "POST");
  assert.equal(await request.text(), "payload");
  assert.equal(request.credentials, "include");
  assert.equal(request.redirect, "error");
  assert.equal(request.mode, "same-origin");
  assert.equal(request.headers.get("X-Feature"), "kept");
  assert.equal(request.headers.get("X-CSRFToken"), TOKEN_A);
  assert.equal(new Headers(init.headers).has("X-CSRFToken"), false);
});

test("leaves accessor-backed RequestInit members to native fetch", async () => {
  let methodReads = 0;
  const init = {
    headers: datastarHeaders(),
    get method() {
      assert.equal(this, init);
      methodReads += 1;
      return methodReads === 1 ? "POST" : "GET";
    },
  };

  const captured = await capturedRequest("/update", init);

  assert.equal(captured[1], init);
  assert.equal(methodReads, 0);
  const request = new Request("https://example.test/update", init);
  assert.equal(request.method, "POST");
  assert.equal(methodReads, 1);
  assert.equal(request.headers.has("X-CSRFToken"), false);
});

test("leaves unknown accessor-backed init members to native fetch", async () => {
  let reads = 0;
  const init = {
    headers: datastarHeaders(),
    method: "POST",
    get targetAddressSpace() {
      reads += 1;
      return undefined;
    },
  };

  const captured = await capturedRequest("/update", init);

  assert.equal(captured[1], init);
  assert.equal(reads, 0);
});

test("treats an explicit null method as an unsafe custom method", async () => {
  const init = {
    headers: datastarHeaders(),
    method: null,
  };

  const [, capturedInit] = await capturedRequest("/update", init);

  assert.equal(capturedInit.method, null);
  assert.equal(capturedInit.mode, "same-origin");
  assert.equal(new Headers(capturedInit.headers).get("X-CSRFToken"), TOKEN_A);
});

test("reads a replaced DOM token for a later request", async () => {
  await capturedRequest("/first", {
    headers: datastarHeaders(),
    method: "POST",
  });
  calls.length = 0;
  token = TOKEN_B;

  const [, capturedInit] = await capturedRequest("/second", {
    headers: datastarHeaders(),
    method: "DELETE",
  });

  assert.equal(new Headers(capturedInit.headers).get("X-CSRFToken"), TOKEN_B);
});

test("preserves an explicit case-insensitive CSRF header", async () => {
  const input = "/update";
  const init = {
    headers: datastarHeaders({ "x-csrftoken": "caller-token" }),
    method: "POST",
  };

  const captured = await capturedRequest(input, init);

  assert.equal(captured[0], input);
  assert.equal(captured[1], init);
});

for (const method of ["GET", "HEAD", "OPTIONS", "TRACE"]) {
  test(`does not inject into ${method} requests`, async () => {
    const input = "/safe";
    const init = { headers: datastarHeaders(), method };

    const captured = await capturedRequest(input, init);

    assert.equal(captured[0], input);
    assert.equal(captured[1], init);
  });
}

test("does not inject into cross-origin requests", async () => {
  const input = "https://other.test/update";
  const init = { headers: datastarHeaders(), method: "POST" };

  const captured = await capturedRequest(input, init);

  assert.equal(captured[0], input);
  assert.equal(captured[1], init);
});

test("does not inject into unmarked or noncanonical-marker requests", async () => {
  const requests = [
    { headers: {}, method: "POST" },
    { headers: { "Datastar-Request": "false" }, method: "POST" },
    { headers: { "Datastar-Request": "True" }, method: "POST" },
  ];

  for (const init of requests) {
    const captured = await capturedRequest("/update", init);
    assert.equal(captured[1], init);
    calls.length = 0;
  }
});

test("does not inject when the DOM token is missing or empty", async () => {
  for (const missingToken of [null, ""]) {
    token = missingToken;
    const init = { headers: datastarHeaders(), method: "POST" };
    const captured = await capturedRequest("/update", init);

    assert.equal(captured[1], init);
    calls.length = 0;
  }
});

test("does not inject when the caller requests an incompatible mode", async () => {
  for (const mode of ["cors", "no-cors", "navigate"]) {
    const init = { headers: datastarHeaders(), method: "POST", mode };
    const captured = await capturedRequest("/update", init);

    assert.equal(captured[1], init);
    calls.length = 0;
  }
});

test("preserves a same-origin Request and resolves its method and headers", async () => {
  const input = new Request("https://example.test/update", {
    body: "payload",
    headers: datastarHeaders({ "X-Feature": "kept" }),
    method: "PATCH",
    mode: "same-origin",
  });

  const [capturedInput, capturedInit] = await capturedRequest(input);
  const headers = new Headers(capturedInit.headers);

  assert.equal(capturedInput, input);
  assert.equal(capturedInit.mode, "same-origin");
  assert.equal(headers.get("X-Feature"), "kept");
  assert.equal(headers.get("X-CSRFToken"), TOKEN_A);
});

test("uses init overrides as the effective Request method and headers", async () => {
  const input = new Request("https://example.test/update", {
    headers: datastarHeaders(),
    method: "POST",
    mode: "same-origin",
  });
  const safeInit = { headers: datastarHeaders(), method: "GET" };

  let captured = await capturedRequest(input, safeInit);

  assert.equal(captured[0], input);
  assert.equal(captured[1], safeInit);

  calls.length = 0;
  const unmarkedInit = { headers: { "X-Feature": "kept" }, method: "POST" };
  captured = await capturedRequest(input, unmarkedInit);

  assert.equal(captured[0], input);
  assert.equal(captured[1], unmarkedInit);
});

test("an unsafe marked init can opt a default-cors Request into same-origin mode", async () => {
  const input = new Request("https://example.test/update", { method: "POST" });
  const init = {
    headers: datastarHeaders({ "X-Feature": "kept" }),
    mode: "same-origin",
  };

  const [, capturedInit] = await capturedRequest(input, init);
  const headers = new Headers(capturedInit.headers);

  assert.equal(capturedInit.mode, "same-origin");
  assert.equal(headers.get("X-Feature"), "kept");
  assert.equal(headers.get("X-CSRFToken"), TOKEN_A);
});

test("leaves a cross-origin Request untouched", async () => {
  const input = new Request("https://other.test/update", {
    headers: datastarHeaders(),
    method: "POST",
    mode: "same-origin",
  });

  const captured = await capturedRequest(input);

  assert.equal(captured[0], input);
  assert.equal(captured[1], undefined);
});

test("leaves a default-cors Request untouched", async () => {
  const input = new Request("https://example.test/update", {
    headers: datastarHeaders(),
    method: "POST",
  });

  const captured = await capturedRequest(input);

  assert.equal(captured.length, 2);
  assert.equal(captured[0], input);
  assert.equal(captured[1], undefined);
});

test("falls back when the DOM token cannot become a header value", async () => {
  token = "invalid\nheader";
  const input = "/update";
  const init = { headers: datastarHeaders(), method: "POST" };

  const captured = await capturedRequest(input, init);

  assert.equal(captured[0], input);
  assert.equal(captured[1], init);
});

test("falls back to the original fetch when request inspection fails", async () => {
  const input = Symbol("uninspectable URL");
  const init = { headers: datastarHeaders(), method: "POST" };

  const captured = await capturedRequest(input, init);

  assert.equal(captured[0], input);
  assert.equal(captured[1], init);
});
