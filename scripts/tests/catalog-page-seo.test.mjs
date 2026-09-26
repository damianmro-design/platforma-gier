import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const defaults = read("lib/zagraj-game-page-seo.ts");
const reader = read("lib/zagraj-public-page-seo.ts");
const editor = read("app/admin/gry/page.tsx");
const type = read("lib/zagraj-catalog-defaults.ts");
const migration = read("supabase/zagraj-catalog-page-seo.sql");
const sitemap = read("app/sitemap.ts");
const robots = read("app/robots.ts");
const slugs = ["akta-nocy","co-ludzie-powiedza","pod-przykrywka","szyfr",
  "tylko-my","va-banque","zakrecone-haslo"];

test("seven original SEO titles and descriptions remain available as fallback", () => {
  for (const slug of slugs) {
    const page = read(`app/gry/${slug}/page.tsx`);
    assert.ok(defaults.includes(`"${slug}": {`), slug);
    assert.ok(page.includes(`getPublishedGamePageMetadata("${slug}")`), slug);
    assert.match(page, /export async function generateMetadata\(\): Promise<Metadata>/);
    assert.doesNotMatch(page, /export const metadata:/);
    assert.match(page, /export default/);
    assert.match(page, /<GamePageCmsIntro/);
    assert.match(page, /<GamePageCmsSections/);
  }
  assert.match(reader, /getPublishedGameCard\(slug\)/);
  assert.match(reader, /GAME_PAGE_SEO_FALLBACK\[slug\]/);
  assert.match(reader, /alternates: \{ canonical \}/);
  assert.match(reader, /openGraph: \{ title, description, url: canonical/);
  assert.match(reader, /twitter: \{ card: "summary", title, description \}/);
  assert.doesNotMatch(reader, /dangerouslySetInnerHTML|innerHTML/);
});

test("SEO editor accepts only copy, with original reset and fixed canonical URL", () => {
  assert.match(type, /pageSeo\?: CatalogPageSeo \| null/);
  assert.match(editor, /setSeoField\(key:/);
  assert.match(editor, /maxLength=\{70\}/);
  assert.match(editor, /maxLength=\{180\}/);
  assert.match(editor, /Wczytaj oryginalne SEO do edycji/);
  assert.match(editor, /Przywróć oryginalne SEO/);
  assert.match(editor, /https:\/\/zagraj\.fun\/gry\/\{chosen\.slug\}/);
  assert.match(editor, /if \(kind === "publish"\) announceCatalogPublication/);
  assert.match(migration, /INVALID_PAGE_SEO_GAME/);
  assert.match(migration, /INVALID_PAGE_SEO_SCHEMA/);
  assert.match(migration, /INVALID_PAGE_SEO_COPY/);
  assert.match(migration, /jsonb_object_keys\(page_seo\)\)<>2/);
  assert.match(migration, /'pageSeo',page_seo/);
  assert.match(migration, /'pageSeo', coalesce\(h.payload->'pageSeo','null'::jsonb\)/);
  assert.match(migration, /GAME_EDIT_FORBIDDEN/);
  assert.match(migration, /CATALOG_REVISION_CONFLICT/);
  assert.match(migration, /catalog\.draft\.save/);
});

test("sitemap is restricted to the live visible catalog and robots references it", () => {
  assert.match(sitemap, /getPublishedGameCard\(slug\)/);
  assert.match(sitemap, /cards\.filter\(\(\{ card \}\) => Boolean\(card\)\)/);
  assert.match(sitemap, /export const dynamic = "force-dynamic"/);
  assert.doesNotMatch(sitemap, /DEFAULT_GAME_CARDS/);
  assert.match(robots, /sitemap: "https:\/\/zagraj\.fun\/sitemap\.xml"/);
  assert.match(robots, /disallow: \["\/api\/", "\/pokoj\/", "\/gra\/"\]/);
});
