import assert from "node:assert/strict";
import { test } from "node:test";
import { findSignalMatches } from "../src/django_datastar/static/django_datastar/signal-filter.js";

const signals = {
  count: 2,
  user: { name: "Ada", email: "ada@example.test" },
  items: [{ name: "First" }, { name: "Second" }],
  secret: "browser-secret",
};

test("matches signal names and full paths without case sensitivity", () => {
  assert.deepEqual(findSignalMatches(signals, " EMAIL "), [
    { path: "user.email", value: "ada@example.test" },
  ]);
  assert.deepEqual(findSignalMatches(signals, "user.na"), [
    { path: "user.name", value: "Ada" },
  ]);
});

test("a parent match shows its full group without duplicate children", () => {
  assert.deepEqual(findSignalMatches(signals, "USER"), [
    { path: "user", value: signals.user },
  ]);
});

test("array matches keep their original indexes", () => {
  assert.deepEqual(findSignalMatches(signals, "items[1].name"), [
    { path: "items[1].name", value: "Second" },
  ]);
  assert.deepEqual(findSignalMatches(signals, "name"), [
    { path: "user.name", value: "Ada" },
    { path: "items[0].name", value: "First" },
    { path: "items[1].name", value: "Second" },
  ]);
});

test("does not match values or change the signal object", () => {
  const before = JSON.stringify(signals);
  assert.deepEqual(findSignalMatches(signals, "browser-secret"), []);
  assert.deepEqual(findSignalMatches(signals, "second"), []);
  assert.deepEqual(findSignalMatches(signals, "  "), []);
  assert.equal(JSON.stringify(signals), before);
});
