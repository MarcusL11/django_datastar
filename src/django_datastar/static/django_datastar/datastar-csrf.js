const CSRF_HEADER = "X-CSRFToken";
const CSRF_META_SELECTOR = 'meta[name="datastar-csrf-token"]';
const DATASTAR_REQUEST_HEADER = "Datastar-Request";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);
const REQUEST_URL_GETTER = Object.getOwnPropertyDescriptor(
  Request.prototype,
  "url",
).get;

function isRequest(input) {
  try {
    REQUEST_URL_GETTER.call(input);
    return true;
  } catch {
    return false;
  }
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

function csrfToken() {
  return document.querySelector(CSRF_META_SELECTOR)?.getAttribute("content") || "";
}

function csrfRequestInit(init, headers, token) {
  headers.set(CSRF_HEADER, token);
  const csrfInit = Object.create(init ?? null);
  Object.defineProperties(csrfInit, {
    headers: { enumerable: true, value: headers },
    mode: { enumerable: true, value: "same-origin" },
  });
  return csrfInit;
}

function csrfDetails(input, init) {
  if (hasAccessorRequestInitMember(init)) {
    return null;
  }

  const headers = effectiveHeaders(input, init);
  const method = effectiveMethod(input, init);
  const url = effectiveUrl(input);

  if (
    headers.get(DATASTAR_REQUEST_HEADER) !== "true" ||
    headers.has(CSRF_HEADER) ||
    SAFE_METHODS.has(method) ||
    url.origin !== window.location.origin ||
    !hasCompatibleMode(input, init)
  ) {
    return null;
  }

  const token = csrfToken();
  return token ? { headers, token } : null;
}

function installDatastarCsrf() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (...args) => {
    const [input, init] = args;
    let details;
    let csrfInit;

    try {
      details = csrfDetails(input, init);
      if (details) {
        csrfInit = csrfRequestInit(init, details.headers, details.token);
      }
    } catch {
      return originalFetch(...args);
    }

    return details ? originalFetch(input, csrfInit) : originalFetch(...args);
  };
}

installDatastarCsrf();
