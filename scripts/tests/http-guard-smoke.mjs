// Local Next.js route integration smoke; never targets production.
import assert from "node:assert/strict";

const base = "http://127.0.0.1:3100";
let ready = false;
for (let i = 0; i < 40; i++) {
  try {
    const r = await fetch(base + "/", { signal: AbortSignal.timeout(1500) });
    if (r.status < 500) { ready = true; break; }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500));
}
assert.ok(ready, "Next.js local server did not start");

const oversized = await fetch(base + "/api/pokoj/ABCD", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ action: "join", name: "a".repeat(20000) }),
  signal: AbortSignal.timeout(6000),
});
assert.equal(oversized.status, 413, "oversized room request should be HTTP 413");
const payload = await oversized.json();
assert.match(payload.error ?? "", /za duże/i);

const ordinary = await fetch(base + "/api/pokoj/ABCD", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ action: "unknown" }),
  signal: AbortSignal.timeout(6000),
});
assert.equal(ordinary.status, 400, "ordinary valid JSON should retain unknown-action response");

console.log("LOCAL HTTP GUARD: PASS, oversized=413; ordinary=400");
