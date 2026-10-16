import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { createSignalCollector } from "../src/django_datastar/static/django_datastar/signal-collector.js";
import "./test_signal_lifecycle.mjs";

let collector;
let observer;

class ProjectionObserver {
  constructor(callback) {
    this.callback = callback;
    observer = this;
  }

  observe(target, options) {
    assert.equal(target, collector);
    assert.equal(options.childList, true);
    assert.equal(options.subtree, true);
    assert.equal(options.characterData, true);
  }

  disconnect() {}
}

beforeEach(() => {
  observer = undefined;
  collector = undefined;
  globalThis.MutationObserver = ProjectionObserver;
  globalThis.document = {
    createElement(name) {
      assert.equal(name, "pre");
      collector = {
        hidden: false,
        attributes: new Map(),
        textContent: "",
        setAttribute(key, value) {
          this.attributes.set(key, value);
        },
        remove() {},
      };
      return collector;
    },
    body: {
      append(node) {
        assert.equal(node, collector);
      },
    },
  };
});

function start() {
  const states = [];
  const stop = createSignalCollector((state) => states.push(state));
  assert.equal(collector.hidden, true);
  assert.equal(collector.attributes.get("data-json-signals__terse"), "");
  assert.ok(observer);
  return { states, stop };
}

function project(text) {
  collector.textContent = text;
  observer.callback();
}

test("reports raw values from a ready projection and later changes", () => {
  const { states, stop } = start();

  project('{"count":2,"user":{"name":"Ada","active":false},"items":[null,3]}');
  assert.deepEqual(states.at(-1), {
    status: "ready",
    value: {
      count: 2,
      user: { name: "Ada", active: false },
      items: [null, 3],
    },
  });

  project('{"count":3,"user":{"name":"Ada","active":false}}');
  assert.deepEqual(states.at(-1), {
    status: "ready",
    value: { count: 3, user: { name: "Ada", active: false } },
  });
  stop();
});

test("reports unavailable for empty text, including after ready data", () => {
  const { states, stop } = start();
  assert.deepEqual(states.at(-1), { status: "unavailable" });

  project('{"count":2}');
  project("");
  assert.deepEqual(states.at(-1), { status: "unavailable" });
  stop();
});

test("reports unavailable for invalid JSON and invalid signal shapes", () => {
  const { states, stop } = start();

  project('{"count":2}');
  for (const text of ['{"count":', "null", "[]", '"not a signal map"']) {
    project(text);
    assert.deepEqual(states.at(-1), { status: "unavailable" });
    project('{"count":2}');
  }
  stop();
});

test("reports unavailable when the projection read fails after ready data", () => {
  const { states, stop } = start();
  project('{"count":2}');
  Object.defineProperty(collector, "textContent", {
    get() {
      throw new Error("Projection read failed");
    },
  });

  assert.doesNotThrow(() => observer.callback());
  assert.deepEqual(states.at(-1), { status: "unavailable" });
  stop();
});
