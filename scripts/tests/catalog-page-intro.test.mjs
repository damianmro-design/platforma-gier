import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const intros = read("lib/zagraj-game-page-intros.ts");
const editor = read("app/admin/gry/page.tsx");
const introRenderer = read("components/game-page-cms-intro.tsx");
const sharedCatalog = read("lib/zagraj-public-catalog-server.ts");
const migration = read("supabase/zagraj-catalog-page-intro.sql");
const types = read("lib/zagraj-catalog-defaults.ts");
const slugs = ["akta-nocy", "co-ludzie-powiedza", "pod-przykrywka",
  "szyfr", "tylko-my", "va-banque", "zakrecone-haslo"];

test("all seven existing hero descriptions use owner-approved copy with original fallback", () => {
  for (const slug of slugs) {
    const page = read(`app/gry/${slug}/page.tsx`);
    assert.match(page, /import GamePageCmsIntro from/);
    assert.ok(page.includes(`<GamePageCmsIntro slug="${slug}" />`), slug);
    assert.ok(intros.includes(`"${slug}": "`), slug);
  }
  assert.match(introRenderer, /getPublishedGameCard\(slug\)/);
  assert.match(introRenderer, /GAME_PAGE_INTRO_FALLBACK\[slug\]/);
  assert.match(introRenderer, /return <>\{override \|\| GAME_PAGE_INTRO_FALLBACK/);
  assert.match(sharedCatalog, /cache\(async/);
  assert.match(sharedCatalog, /cache: "no-store"/);
  assert.match(sharedCatalog, /rpc\("zagraj_catalog_public"\)/);
  assert.doesNotMatch(sharedCatalog, /catalog_my_games|\.draft\b/);
});

test("editor exposes only plain text and retains existing publish workflow", () => {
  assert.match(types, /pageIntro\?: string/);
  assert.match(editor, /maxLength=\{600\}/);
  assert.match(editor, /Wczytaj oryginalny tekst do edycji/);
  assert.match(editor, /Przywróć oryginalny opis/);
  assert.match(editor, /if \(kind === "publish"\) announceCatalogPublication/);
  assert.match(migration, /INVALID_PAGE_INTRO_TYPE/);
  assert.match(migration, /INVALID_PAGE_INTRO_LENGTH/);
  assert.match(migration, /'pageIntro',page_intro/);
  assert.match(migration, /'pageIntro', coalesce\(h.payload->>'pageIntro',''\)/);
  assert.match(migration, /GAME_EDIT_FORBIDDEN/);
  assert.match(migration, /CATALOG_REVISION_CONFLICT/);
  assert.match(migration, /INVALID_SECTION_MEDIA/);
  assert.match(migration, /catalog\.draft\.save/);
  assert.doesNotMatch(introRenderer, /dangerouslySetInnerHTML|innerHTML/);
});
