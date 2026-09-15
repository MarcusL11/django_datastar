const BRIDGE_INSTALLATION = Symbol.for("django-datastar.csrf-bridge");
const CSRF_HEADER = "X-CSRFToken";
const CSRF_META_SELECTOR = 'meta[name="datastar-csrf-token"]';
const DATASTAR_REQUEST_HEADER = "Datastar-Request";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);
const REQUEST_URL_GETTER = Object.getOwnPropertyDescriptor(
  Request.prototype,
  "url",
).get;

function installDatastarCsrfBridge() {
  if (window[BRIDGE_INSTALLATION]) {
    return;
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = createDatastarCsrfFetch(nativeFetch);
  Object.defineProperty(window, BRIDGE_INSTALLATION, { value: true });
}

function createDatastarCsrfFetch(nativeFetch) {
  return (...args) => {
    const [input, init] = args;
    let csrfInit;

    try {
      csrfInit = csrfRequestInitFor(input, init);
    } catch {
      return nativeFetch(...args);
    }

    if (!csrfInit) {
      return nativeFetch(...args);
    }

    return nativeFetch(input, csrfInit);
  };
}

function csrfRequestInitFor(input, init) {
  if (hasAccessorRequestInitMember(init)) {
    return null;
  }

  const request = effectiveRequest(input, init);
  if (!requiresCsrfHeader(request)) {
    return null;
  }

  const token = csrfTokenFromDom();
  return token ? withCsrfHeader(init, request.headers, token) : null;
}

function effectiveRequest(input, init) {
  return {
    input,
    init,
    headers: effectiveHeaders(input, init),
    method: effectiveMethod(input, init),
    url: effectiveUrl(input),
  };
}

function requiresCsrfHeader(request) {
  return (
    request.headers.get(DATASTAR_REQUEST_HEADER) === "true" &&
    !request.headers.has(CSRF_HEADER) &&
    !SAFE_METHODS.has(request.method) &&
    request.url.origin === window.location.origin &&
    hasCompatibleMode(request.input, request.init)
  );
}

function withCsrfHeader(init, headers, token) {
  headers.set(CSRF_HEADER, token);
  const csrfInit = Object.create(init ?? null);
  Object.defineProperties(csrfInit, {
    headers: { enumerable: true, value: headers },
    mode: { enumerable: true, value: "same-origin" },
  });
  return csrfInit;
}

function effectiveHeaders(input, init) {
  if (init?.headers !== undefined) {
    return new Headers(init.headers);
  }

  return new Headers(isRequest(input) ? input.headers : undefined);
}

function effectiveMethod(input, init) {
  const initMethod = init?.method;
  const method =
    initMethod !== undefined
      ? initMethod
      : isRequest(input)
        ? input.method
        : "GET";
  return String(method).toUpperCase();
}

function effectiveUrl(input) {
  const url = isRequest(input) ? input.url : input;
  return new URL(url, document.baseURI);
}

function hasCompatibleMode(input, init) {
  if (init?.mode !== undefined) {
    return init.mode === "same-origin";
  }

  return !isRequest(input) || input.mode === "same-origin";
}

function csrfTokenFromDom() {
  return document.querySelector(CSRF_META_SELECTOR)?.getAttribute("content") || "";
}

function hasAccessorRequestInitMember(init) {
  if (init === undefined || init === null) {
    return false;
  }

  if (typeof init !== "object" && typeof init !== "function") {
    return true;
  }

  let owner = init;
  while (owner !== null && owner !== Object.prototype) {
    const descriptors = Object.values(Object.getOwnPropertyDescriptors(owner));
    if (
      descriptors.some(
        (descriptor) =>
          descriptor.get !== undefined || descriptor.set !== undefined,
      )
    ) {
      return true;
    }
    owner = Object.getPrototypeOf(owner);
  }
  return false;
}

function isRequest(input) {
  try {
    REQUEST_URL_GETTER.call(input);
    return true;
  } catch {
    return false;
  }
}

installDatastarCsrfBridge();
