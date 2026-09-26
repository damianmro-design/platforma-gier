import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/zh-immutable-content-revisions.sql","utf8");
const sqlTest = readFileSync("supabase/tests/zh-immutable-content-revisions.sql","utf8");
const roadmap = readFileSync("docs/ZAGRAJ-ADMIN-ROADMAP.md","utf8");
const docs = readFileSync("docs/admin/ZH-IMMUTABLE-CONTENT-III2A.md","utf8");

const funcs = ["initialize_zh_game_internal","get_zh_state_internal",
  "submit_zh_letter_internal","submit_zh_vowel_internal","submit_zh_solve_internal"];

test("pilot locks complete puzzle rows behind explicit immutable version and no public table privileges", () => {
  for (const table of ["zh_content_versions","zh_content_puzzles","zh_content_active"]) {
    assert.ok(migration.includes("create table app_private."+table+" ("),table);
    assert.ok(migration.includes("alter table app_private."+table+" enable row level security"),table);
  }
  assert.match(migration,/revoke all on app_private\.zh_content_versions, app_private\.zh_content_puzzles,/);
  assert.match(migration,/from public,anon,authenticated/);
  assert.match(migration,/zh_versions_immutable before update or delete/);
  assert.match(migration,/zh_puzzles_immutable before update or delete/);
  assert.match(migration,/zh_versions_no_truncate before truncate/);
  assert.match(migration,/zh_puzzles_no_truncate before truncate/);
  assert.match(migration,/zh_validate_active_content/);
  assert.match(migration,/ZH_CONTENT_INCOMPLETE/);
});

test("five existing engine functions select exclusively pinned puzzles, keeping legacy bank unchanged", () => {
  assert.match(migration,/insert into app_private\.zh_content_puzzles\(version_id,puzzle_key,category,phrase,difficulty\)/);
  assert.match(migration,/from app_private\.zh_puzzles;/);
  assert.match(migration,/alter table app_private\.zh_game_state alter column content_version_id set not null;/);
  assert.match(migration,/ZH_ROOM_CONTENT_VERSION_LOCKED/);
  assert.match(migration,/ZH_ROOM_PUZZLES_INVALID/);
  for (const fn of funcs) {
    const chunks=migration.split("CREATE OR REPLACE FUNCTION app_private."+fn+"(");
    assert.equal(chunks.length,2,fn);
    const body=chunks[1].split("$function$;")[0];
    assert.ok(body.includes("app_private.zh_content_puzzles"),fn+" pinned source");
    assert.ok(body.includes("content_version_id")||body.includes("chosen_version"),fn+" version");
    assert.doesNotMatch(body,/from app_private\.zh_puzzles\b/,fn+" old mutable read");
  }
  for (const fn of funcs.slice(1)) {
    const body=migration.split("CREATE OR REPLACE FUNCTION app_private."+fn+"(")[1].split("$function$;")[0];
    assert.match(body,/ZH_PINNED_PUZZLE_MISSING/);
  }
  assert.match(migration,/where singleton=true for share/);
  assert.match(migration,/where version_id=chosen_version/);
  assert.match(migration,/chosen_version/);
});

test("transaction covers immutable old and edited new rooms, scoring and rollback", () => {
  assert.match(sqlTest,/^begin;/m);
  assert.match(sqlTest,/rollback;\s*$/);
  assert.match(sqlTest,/is_test/);
  assert.match(sqlTest,/ZH_OLD_ROOM_CHANGED_AFTER_HEAD_SWITCH/);
  assert.match(sqlTest,/ZH_OLD_ROOM_SOLVE_CHANGED_WITH_NEW_HEAD/);
  assert.match(sqlTest,/ZH_NEW_ROOM_SOLVE_WRONG_VERSION/);
  assert.match(sqlTest,/ZH_INCOMPLETE_REVISION_ACTIVATED/);
  assert.match(sqlTest,/ZH_PINNED_ROOM_SWITCH_ACCEPTED/);
  assert.match(sqlTest,/ZH_CONTENT_DIRECT_ACCESS_EXPOSED/);
  assert.match(roadmap,/III\.2 \[~\]/);
  assert.match(docs,/bez edytora pytań/i);
});
