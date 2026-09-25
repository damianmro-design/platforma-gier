import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const src = (path) => readFileSync(path, "utf8");
const home = src("app/page.tsx");
const admin = src("app/admin/gry/page.tsx");
const publicApi = src("app/api/games/catalog/route.ts");
const sections = src("components/game-page-cms-sections.tsx");
const catalogServer = src("lib/zagraj-public-catalog-server.ts");
const sectionRefresh = src("components/game-page-catalog-refresh.tsx");
const events = src("lib/zagraj-catalog-refresh.ts");
const config = src("next.config.ts");

test("published catalogue is the only source for homepage and is never HTTP cached", () => {
  assert.match(publicApi, /export const dynamic = "force-dynamic"/);
  assert.match(publicApi, /rpc\("zagraj_catalog_public"\)/);
  assert.match(publicApi, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(publicApi, /zagraj_catalog_my_games|\.draft\b/);
  assert.match(config, /source: "\/api\/:path\*".*headers: noStore/);
  assert.match(home, /fetch\("\/api\/games\/catalog", \{ signal: controller\.signal, cache: "no-store" \}/);
});

test("open homepage responds to tab focus, BFCache, visibility and a successful publication", () => {
  assert.match(events, /addEventListener\("focus"/);
  assert.match(events, /addEventListener\("pageshow"/);
  assert.match(events, /event\.persisted/);
  assert.match(events, /addEventListener\("visibilitychange"/);
  assert.match(events, /addEventListener\("storage"/);
  assert.match(events, /CATALOG_PUBLICATION_STORAGE_KEY/);
  assert.match(home, /subscribeToCatalogRefresh\(/);
  assert.match(home, /reason === "published"/);
  assert.match(home, /current\?\.abort\(\)/);
  assert.match(home, /controller\.signal\.aborted/);
  assert.match(admin, /await adminApi\("\/api\/admin\/catalog"[\s\S]*?if \(kind === "publish"\) announceCatalogPublication\(\)/);
  assert.doesNotMatch(admin, /if \(kind === "save"\) announceCatalogPublication/);
});

test("seven internal game pages have live published CMS blocks, even with no initial sections", () => {
  assert.match(catalogServer, /fetch\(input, \{ \.\.\.init, cache: "no-store" \}\)/);
  assert.match(catalogServer, /rpc\("zagraj_catalog_public"\)/);
  assert.match(sections, /<GamePageCatalogRefresh \/>/);
  assert.match(sections, /sections\.length > 0 && <section/);
  assert.match(sectionRefresh, /subscribeToCatalogRefresh/);
  assert.match(sectionRefresh, /router\.refresh\(\)/);

  const defaults = src("lib/zagraj-catalog-defaults.ts");
  const start = defaults.indexOf("export const DEFAULT_GAME_CARDS: CatalogGame[] = ");
  assert.ok(start >= 0);
  const jsonStart = defaults.indexOf("[", start + "export const DEFAULT_GAME_CARDS: CatalogGame[] = ".length);
  const jsonEnd = defaults.lastIndexOf("];");
  const cards = JSON.parse(defaults.slice(jsonStart, jsonEnd + 1));

  const slugs = new Set();
  for (const card of cards) {
    assert.ok(!slugs.has(card.slug), `Duplicate card: ${card.slug}`);
    slugs.add(card.slug);
    assert.ok(card.minPlayers >= 1 && card.maxPlayers >= card.minPlayers);
    assert.ok(card.minTime > 0 && card.maxTime >= card.minTime);
    if (card.external) continue;
    assert.equal(card.href, `/gry/${card.slug}`);
    const pagePath = `app/gry/${card.slug}/page.tsx`;
    assert.ok(existsSync(pagePath), `Missing informational route: ${pagePath}`);
    assert.ok(src(pagePath).includes(`<GamePageCmsSections slug="${card.slug}" />`),
      `Missing live published section renderer: ${card.slug}`);
  }
  assert.equal(cards.filter((card) => !card.external).length, 7);
});
