import test from "node:test";
import assert from "node:assert/strict";
import { readJsonObjectLimited } from "../../lib/request-guards.mjs";

function post(value, headers = {}) {
  return new Request("https://example.org/api/pokoj/ABCD", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: value,
  });
}

test("ordinary room action is unchanged", async () => {
  const result = await readJsonObjectLimited(post(JSON.stringify({
    action: "join", name: "Gracz", avatar: "avatar-01",
  })));
  assert.equal(result.ok, true);
  assert.equal(result.body.action, "join");
});

test("oversized Content-Length is rejected before parsing", async () => {
  const result = await readJsonObjectLimited(
    post('{"action":"join"}', { "content-length": "200000" }),
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
});

test("streamed body without declared length is bounded", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(9000)));
      controller.enqueue(new TextEncoder().encode("x".repeat(9000)));
      controller.close();
    },
  });
  const request = new Request("https://example.org/api/test-room", {
    method: "POST",
    body,
    duplex: "half",
  });
  const result = await readJsonObjectLimited(request);
  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
});

test("malformed JSON retains empty-object fallback", async () => {
  const result = await readJsonObjectLimited(post("{"));
  assert.deepEqual(result, { ok: true, body: {} });
});

test("JSON arrays do not become action objects", async () => {
  const result = await readJsonObjectLimited(post("[1,2,3]"));
  assert.deepEqual(result, { ok: true, body: {} });
});
