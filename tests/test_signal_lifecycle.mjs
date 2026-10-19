import assert from "node:assert/strict";
import { test } from "node:test";

import { createSignalCollector } from "../src/django_datastar/static/django_datastar/signal-collector.js";

function dom() {
  const observers = [];
  const body = {
    children: [],
    append(node) {
      this.children.push(node);
      node.isConnected = true;
      notify(this);
    },
    removeChild(node) {
      this.children.splice(this.children.indexOf(node), 1);
      node.isConnected = false;
      notify(this);
    },
    contains(node) {
      return this.children.includes(node);
    },
    replaceChildren(...nodes) {
      for (const child of this.children) child.isConnected = false;
      this.children = nodes;
      for (const node of nodes) node.isConnected = true;
      notify(this);
    },
  };
  function notify(target) {
    for (const observer of observers) {
      if (observer.target === target) observer.callback();
    }
  }
  globalThis.MutationObserver = class {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe(target) {
      this.target = target;
    }
    disconnect() {
      this.target = undefined;
    }
  };
  globalThis.document = {
    body,
    createElement(name) {
      assert.equal(name, "pre");
      return {
        isConnected: false,
        textContent: "",
        setAttribute() {},
        remove() { body.removeChild(this); },
      };
    },
  };
  return {
    body,
    projection() { return body.children.find((node) => node.textContent !== undefined); },
    project(node, value) {
      node.textContent = value;
      notify(node);
    },
  };
}

test("a collector installed before the bundle reads its later projection", () => {
  const page = dom();
  const states = [];
  const stop = createSignalCollector((state) => states.push(state));
  assert.deepEqual(states, [{ status: "unavailable" }]);

  page.project(page.projection(), '{"late":"current-value"}');
  assert.deepEqual(states.at(-1), {
    status: "ready", value: { late: "current-value" },
  });
  stop();
});

test("a removed collector clears old values and recovers after a new projection", () => {
  const page = dom();
  const states = [];
  const stop = createSignalCollector((state) => states.push(state));
  const collector = page.projection();

  page.project(collector, '{"count":2,"secret":"old-value"}');
  assert.deepEqual(states.at(-1), {
    status: "ready", value: { count: 2, secret: "old-value" },
  });

  page.body.removeChild(collector);
  assert.deepEqual(states.at(-1), { status: "unavailable" });
  assert.equal(JSON.stringify(states.at(-1)).includes("old-value"), false);

  const current = page.projection() ?? collector;
  if (!current.isConnected) page.body.append(current);
  page.project(current, '{"count":2,"secret":"old-value"}');
  assert.deepEqual(states.at(-1), { status: "unavailable" });
  page.project(collector, '{"count":99,"secret":"detached-value"}');
  assert.deepEqual(states.at(-1), { status: "unavailable" });
  page.project(current, '{"count":4,"secret":"new-value"}');
  assert.deepEqual(states.at(-1), {
    status: "ready", value: { count: 4, secret: "new-value" },
  });
  stop();
});

test("a page morph clears old data and reads a new collector", () => {
  const page = dom();
  const states = [];
  const stop = createSignalCollector((state) => states.push(state));
  const original = page.projection();

  page.project(original, '{"page":"first-value"}');
  assert.deepEqual(states.at(-1), {
    status: "ready", value: { page: "first-value" },
  });

  page.body.replaceChildren({ isConnected: false, textContent: undefined });
  assert.deepEqual(states.at(-1), { status: "unavailable" });
  assert.equal(JSON.stringify(states.at(-1)).includes("first-value"), false);

  const next = page.projection();
  assert.ok(next?.isConnected, "The morphed page needs a collector.");
  page.project(next, '{"page":"second-value"}');
  assert.deepEqual(states.at(-1), {
    status: "ready", value: { page: "second-value" },
  });
  stop();
});
