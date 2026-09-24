import test from "node:test";
import assert from "node:assert/strict";
import { validateReleaseEnv } from "../check-free-beta-readiness.mjs";

const valid = {
  NEXT_PUBLIC_LEGAL_OPERATOR_NAME: "Przykładowy Operator",
  NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS: "Przykładowa 1, 00-001 Miasto",
  NEXT_PUBLIC_LEGAL_OPERATOR_COUNTRY: "Polska",
  NEXT_PUBLIC_CONTACT_EMAIL: "support@example.org",
  NEXT_PUBLIC_PLATFORM_URL: "https://example.org",
  BETA_OPERATOR_BASIS: "active-business",
  BETA_LEGAL_REVIEW_CONFIRMED: "true",
};

test("complete release config passes structural check", () => {
  assert.deepEqual(validateReleaseEnv(valid), []);
});

test("unknown operator is a launch blocker", () => {
  assert.ok(validateReleaseEnv({
    ...valid,
    NEXT_PUBLIC_LEGAL_OPERATOR_NAME: "[UZUPEŁNIJ: dane]",
  }).some((s) => s.includes("NEXT_PUBLIC_LEGAL_OPERATOR_NAME")));
});

test("missing address is a launch blocker", () => {
  assert.ok(validateReleaseEnv({
    ...valid,
    NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS: "",
  }).some((s) => s.includes("NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS")));
});

test("invalid email and insecure site URL are blocked", () => {
  const result = validateReleaseEnv({
    ...valid,
    NEXT_PUBLIC_CONTACT_EMAIL: "bad-mail",
    NEXT_PUBLIC_PLATFORM_URL: "http://example.org",
  });
  assert.ok(result.some((s) => s.includes("CONTACT_EMAIL")));
  assert.ok(result.some((s) => s.includes("PLATFORM_URL")));
});

test("suspended business cannot silently pass a launch gate", () => {
  const errors = validateReleaseEnv({
    ...valid,
    BETA_OPERATOR_BASIS: "suspended-business",
  });
  assert.ok(errors.some((error) => error.includes("BETA_OPERATOR_BASIS")));
});

test("independent noncommercial route needs explicit legal review", () => {
  const errors = validateReleaseEnv({
    ...valid,
    BETA_OPERATOR_BASIS: "independent-noncommercial-reviewed",
    BETA_LEGAL_REVIEW_CONFIRMED: "false",
  });
  assert.ok(errors.some((error) => error.includes("BETA_LEGAL_REVIEW_CONFIRMED")));
});

test("reviewed independent route passes the structural gate", () => {
  assert.deepEqual(validateReleaseEnv({
    ...valid,
    BETA_OPERATOR_BASIS: "independent-noncommercial-reviewed",
  }), []);
});

test("missing config does not pass silently", () => {
  assert.ok(validateReleaseEnv({}).length >= 5);
});
