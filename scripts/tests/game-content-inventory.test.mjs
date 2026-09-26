import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const inventory = JSON.parse(read("docs/admin/engine-content-inventory.json"));
const audit = read("docs/admin/ENGINE-CONTENT-AUDIT-III1.md");
const roadmap = read("docs/ZAGRAJ-ADMIN-ROADMAP.md");

test("III.1 maps exactly seven engines and both distinct Akta Nocy scenarios", () => {
  assert.equal(inventory.schemaVersion, 1);
  assert.equal(inventory.games.length, 8);
  assert.equal(new Set(inventory.games.map(({slug}) => slug)).size, 7);
  assert.deepEqual(inventory.games.filter(({slug}) => slug === "akta-nocy")
    .map(({variant}) => variant).sort(), ["apartament-214","ostatni-kurs"]);
  assert.equal(inventory.gate, "NO_ENGINE_CONTENT_EDITOR_UNTIL_ROOM_DEFINITION_PINNING");
  assert.match(roadmap, /III\\.1 \\[x\\]/);
  assert.match(audit, /Brak wersji treści pokoju jest krytycznym warunkiem/);
});

test("each content adapter has auditable sources, protected secrets and an explicit snapshot gate", () => {
  const ids = new Set();
  for (const entry of inventory.games) {
    assert.ok(entry.slug && entry.variant);
    assert.ok(!ids.has(entry.slug + "/" + entry.variant));
    ids.add(entry.slug + "/" + entry.variant);
    for (const k of ["codeSources","roomState","roomPointers","candidateContent","lockedMechanics","secretContent"]) {
      assert.ok(Array.isArray(entry[k]) && entry[k].length > 0, entry.slug + ": " + k);
    }
    assert.ok(entry.snapshotNeed.length >= 40, entry.slug);
    for (const path of entry.codeSources) assert.ok(existsSync(path), "missing " + path);
    for (const name of [...entry.databaseBanks,...entry.roomState]) {
      assert.match(name, /^[a-z][a-z0-9_]*$/);
    }
  }
  for (const s of ["co-ludzie-powiedza","pod-przykrywka","zakrecone-haslo","tylko-my","szyfr","va-banque"]) {
    assert.ok(inventory.games.some(e => e.slug === s));
  }
});

test("all seven API routes stay separate from marketing CMS", () => {
  const routes = ["akta-nocy","co-ludzie-powiedza","pod-przykrywka","szyfr","tylko-my","va-banque","zakrecone-haslo"];
  for (const slug of routes) {
    const source = read(`app/api/gra/${slug}/[code]/route.ts`);
    assert.match(source, /export async function GET/);
    assert.match(source, /export async function POST/);
    assert.doesNotMatch(source, /getPublishedGameCard|zagraj_catalog_save_draft/);
  }
  assert.ok(existsSync("app/api/gra/akta-nocy-ostatni-kurs/[code]/route.ts"));
  assert.match(read("app/api/gra/tylko-my/[code]/route.ts"), /getTylkoMyQuestionForRoom/);
  assert.match(read("lib/tylko-my.ts"), /getTylkoMySequence\(roomCode: string\)/);
  assert.match(read("lib/tylko-my.ts"), /TYLKO_MY_QUESTION_COUNT = 20/);
  assert.match(read("lib/tylko-my.ts"), /TYLKO_MY_MAX_SCORE = 34/);
  assert.match(read("app/api/gra/akta-nocy/[code]/route.ts"), /AKTA_NOCY_SOLUTION/);
  assert.match(read("app/api/gra/akta-nocy-ostatni-kurs/[code]/route.ts"), /OSTATNI_KURS_SOLUTION/);
  assert.match(read("lib/zakrecone-haslo.ts"), /ZH_WHEEL_SEGMENTS/);
  assert.match(read("lib/va-banque-db.ts"), /getVaBanqueState/);
});

test("III.1 does not grant editing or export private answers through the catalog editor", () => {
  const editor = read("app/admin/gry/page.tsx");
  assert.match(editor, /announceCatalogPublication/);
  assert.doesNotMatch(editor, /platform-db|va-banque-db|szyfr-db|tylko-my-db/);
  assert.doesNotMatch(editor, /app_private|canonical_answer|correct_index|privateSecret/);
  assert.match(audit, /nie modyfikować globalnych banków/);
  assert.match(audit, /nie mogą naliczać produkcyjnego XP/);
  assert.match(inventory.sourceOfTruth.gameplay, /app_private/);
});
