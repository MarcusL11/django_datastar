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
  page.project(current, '{"count":4,"secret":"new-value"}');
  assert.deepEqual(states.at(-1), {
    status: "ready", value: { count: 4, secret: "new-value" },
  });
  stop();
});
