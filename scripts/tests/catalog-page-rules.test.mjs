import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file,"utf8");
const rules = read("lib/zagraj-game-page-rules.ts");
const renderer = read("lib/zagraj-public-page-rules.ts");
const editor = read("app/admin/gry/page.tsx");
const migration = read("supabase/zagraj-catalog-page-rules.sql");
const catalog = read("lib/zagraj-catalog-defaults.ts");

test("two existing rule lists retain fixed titles, numbering and unchanged layout", () => {
  assert.match(rules, /PAGE_RULE_COPY_SCHEMA = 1/);
  for(const slug of ["va-banque","zakrecone-haslo"]) {
    const page=read(`app/gry/${slug}/page.tsx`);
    assert.match(page, new RegExp(`getPublishedPageRules\\("${slug}"\\)`));
    assert.match(page, /rules\.map\(\(\[no, title, copy\]\)/);
    assert.match(page, /<GamePageCmsIntro/);
    assert.match(page, /<GamePageCmsSections/);
    assert.doesNotMatch(page, /const rules = \[/);
  }
  assert.match(rules, /"01", "Poznaj kategorię"/);
  assert.match(rules, /"06", "Zagraj finał"/);
  assert.match(rules, /"01", "Zakręć kołem"/);
  assert.match(rules, /"04", "Rozwiąż hasło"/);
});

test("public renderer reads only published overrides and preserves canonical numbers and titles", () => {
  assert.match(catalog, /pageRules\?: CatalogPageRules \| null/);
  assert.match(renderer, /getPublishedGameCard\(slug\)/);
  assert.match(renderer, /data\?\.schema === PAGE_RULE_COPY_SCHEMA/);
  assert.match(renderer, /data\.items\.length === fallback\.length/);
  assert.match(renderer, /fallback\.map\(\(\[no, title, original\]/);
  assert.match(renderer, /\[no, title, valid \? data!\.items\[i\] : original\]/);
  assert.doesNotMatch(renderer, /dangerouslySetInnerHTML|innerHTML/);
});

test("editor exposes explanatory copy but locks mechanics and saves only via existing owner workflow", () => {
  assert.match(editor, /getPageRuleDefaults/);
  assert.match(editor, /setRuleCopy\(/);
  assert.match(editor, /maxLength=\{360\}/);
  assert.match(editor, /Numeracja, nazwy kroków, kolejność oraz parametry rozgrywki są zablokowane/);
  assert.match(editor, /Przywróć wszystkie oryginalne opisy/);
  assert.match(editor, /if \(kind === "publish"\) announceCatalogPublication/);
  assert.match(migration, /GAME_EDIT_FORBIDDEN/);
  assert.match(migration, /CATALOG_REVISION_CONFLICT/);
  assert.match(migration, /INVALID_PAGE_RULES_SCHEMA/);
  assert.match(migration, /INVALID_PAGE_RULES_COPY/);
  assert.match(migration, /p_slug not in \('va-banque','zakrecone-haslo'\)/);
  assert.match(migration, /expected_rule_count:=case p_slug when 'va-banque' then 6 else 4 end/);
  assert.match(migration, /'pageRules',page_rules/);
  assert.match(migration, /'pageRules', coalesce\(h.payload->'pageRules','null'::jsonb\)/);
  assert.match(migration, /catalog\.draft\.save/);
  assert.match(migration, /grant execute on function public\.zagraj_catalog_save_draft.*authenticated/);
});
