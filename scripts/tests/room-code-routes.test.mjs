import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routes = [
  "app/api/pokoj/[code]/route.ts",
  "app/api/test-room/[code]/route.ts",
  "app/api/gra/akta-nocy/[code]/route.ts",
  "app/api/gra/akta-nocy-ostatni-kurs/[code]/route.ts",
  "app/api/gra/co-ludzie-powiedza/[code]/route.ts",
  "app/api/gra/pod-przykrywka/[code]/route.ts",
  "app/api/gra/szyfr/[code]/route.ts",
  "app/api/gra/tylko-my/[code]/route.ts",
  "app/api/gra/va-banque/[code]/route.ts",
  "app/api/gra/zakrecone-haslo/[code]/route.ts",
];

test("all room API endpoints use shared full-code validation", () => {
  for (const path of routes) {
    const code = readFileSync(path, "utf8");
    assert.match(code, /import \{ cleanRoomCode \} from ["']@\/lib\/room-code\.mjs["'];/, path);
    assert.match(code, /cleanRoomCode\(rawCode\)/, path);
    assert.doesNotMatch(code, /function cleanCode\(/, path);
  }
});

test("all join forms permit 6 characters and keep the server-side validator", () => {
  for (const path of [
    "app/page.tsx",
    "app/gry/szyfr/page.tsx",
    "app/gry/tylko-my/page.tsx",
    "app/gry/va-banque/page.tsx",
  ]) {
    assert.match(readFileSync(path, "utf8"), /maxLength=\{6\}/, path);
  }
  const action = readFileSync("app/room-actions.ts", "utf8");
  assert.match(action, /cleanRoomCode\(formData\.get\("roomCode"\)\)/);
  assert.match(action, /if \(!code\)/);
  assert.match(action, /^"use server";/);
});

test("staged database generator is not changed in existing historic schema source", () => {
  const staged = readFileSync("supabase/staged-create-six-character-room-codes.sql", "utf8");
  assert.match(staged, /generate_series\(1,6\)/);
  assert.match(staged, /STAGED ONLY/);
});


test("invalid page URLs are rejected before database access", () => {
  for (const path of [
    "app/pokoj/[code]/page.tsx",
    "app/gra/akta-nocy/[code]/page.tsx",
    "app/gra/co-ludzie-powiedza/[code]/page.tsx",
    "app/gra/pod-przykrywka/[code]/page.tsx",
    "app/gra/szyfr/[code]/page.tsx",
    "app/gra/tylko-my/[code]/page.tsx",
    "app/gra/va-banque/[code]/page.tsx",
    "app/gra/zakrecone-haslo/[code]/page.tsx",
  ]) {
    const code = readFileSync(path, "utf8");
    assert.match(code, /const code = cleanRoomCode\(rawCode\);/, path);
    assert.match(code, /if \(!code\) notFound\(\);/, path);
    assert.doesNotMatch(code, /rawCode\.trim\(\)\.toUpperCase\(\)/, path);
  }
});


test("recovery code must match exactly, not a silently truncated prefix", () => {
  const code = readFileSync("app/api/pokoj/[code]/route.ts", "utf8");
  assert.match(code, /!\s*\/\^\[A-Z0-9\]\{6\}\$\/\.test\(recoveryCode\)/);
  assert.doesNotMatch(code, /\.slice\(0,\s*6\)/);
});
