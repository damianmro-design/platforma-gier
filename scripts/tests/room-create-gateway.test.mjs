import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gateway = readFileSync("lib/platform-room-create.ts", "utf8");
const migration = readFileSync(
  "supabase/staged-restrict-room-creation-to-server.sql", "utf8",
);

test("creation gateway is explicitly server-only and opt-in", () => {
  assert.match(gateway, /import ["']server-only["'];/);
  assert.match(gateway, /ZAGRAJ_ROOM_CREATION_MODE \?\? "public"/);
  assert.match(gateway, /mode !== "server-only"/);
  assert.match(gateway, /SUPABASE_ROOM_CREATE_SECRET_KEY/);
  assert.doesNotMatch(gateway, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
});

test("both public creator entrypoints call the server gateway", () => {
  for (const path of ["app/room-actions.ts", "app/api/test-room/route.ts"]) {
    const content = readFileSync(path, "utf8");
    assert.match(content, /createPlatformRoomServer\(/, path);
    assert.doesNotMatch(content, /await createPlatformRoom\(/, path);
  }
});

test("migration cannot accidentally enable secret gating before operator rollout", () => {
  assert.match(migration, /STAGED ONLY/);
  assert.match(migration, /GRANT USAGE ON SCHEMA app_private TO service_role/);
  assert.match(migration, /TO service_role/);
  assert.match(migration, /REVOKE EXECUTE ON FUNCTION public\.create_platform_room\(text\)/);
  assert.match(migration, /FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(migration, /REVOKE .*join_platform_room/i);
});

test("public beta preflight checks the secret-only deployment mode", () => {
  const content = readFileSync("scripts/check-free-beta-readiness.mjs", "utf8");
  assert.match(content, /ZAGRAJ_ROOM_CREATION_MODE/);
  assert.match(content, /SUPABASE_ROOM_CREATE_SECRET_KEY/);
});
