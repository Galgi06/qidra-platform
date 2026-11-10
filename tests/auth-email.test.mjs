import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAuthEmail } from "../lib/auth-email.js";

test("normalizes email before validation and lookup", () => {
  assert.equal(normalizeAuthEmail("  User@Example.COM  "), "user@example.com");
  assert.equal(normalizeAuthEmail("user＠example.com"), "user@example.com");
});

test("rejects extra separators and control characters", () => {
  assert.equal(normalizeAuthEmail("user@example.com@attacker.test"), "");
  assert.equal(normalizeAuthEmail("user\n@example.com"), "");
});
