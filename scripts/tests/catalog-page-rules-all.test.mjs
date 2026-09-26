import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path,"utf8");
const registry = read("lib/zagraj-game-page-rules.ts");
const renderer = read("lib/zagraj-public-page-rules.ts");
const sql = read("supabase/zagraj-catalog-page-rules-all.sql");
const cms = read("app/admin/gry/page.tsx");
const cases = [
  ["akta-nocy",4, "Każdy ma telefon", "Oskarżacie prywatnie", "introRules.map"],
  ["co-ludzie-powiedza",9, "Poznajmy tłum", "Finał", "rounds.map"],
  ["pod-przykrywka",6, "Tajne role", "Obrona i finał", "flow.map"],
  ["szyfr",3, "Własny telefon", "Wspólna odpowiedź", "howRules.map"],
  ["tylko-my",4, "Na tej samej fali", "Telepatia", "rounds.map"],
  ["va-banque",6, "Poznaj kategorię", "Zagraj finał", "rules.map"],
  ["zakrecone-haslo",4, "Zakręć kołem", "Rozwiąż hasło", "rules.map"],
];

test("all seven game pages retain the original locked steps and read approved descriptions", () => {
  for(const [slug,n,first,last,map] of cases) {
    const page=read(`app/gry/${slug}/page.tsx`);
    const block=registry.match(new RegExp(`"${slug}": \\[([\\s\\S]*?)\\n\\s*\\],`));
    assert.ok(block,`missing canonical defaults for ${slug}`);
    assert.equal([...block[1].matchAll(/^\s*\["?[^\n]+/gm)].length,n,`number of fixed cards for ${slug}`);
    assert.ok(block[1].includes(first) && block[1].includes(last),`original titles for ${slug}`);
    assert.ok(page.includes(`getPublishedPageRules("${slug}")`),`public CMS adapter for ${slug}`);
    assert.ok(page.includes(map),`original rule layout for ${slug}`);
    assert.match(page, /<GamePageCmsIntro/);
    assert.match(page, /<GamePageCmsSections/);
  }
  assert.match(read("app/gry/tylko-my/page.tsx"), /roundAccents\[index\]/);
  assert.match(read("app/gry/akta-nocy/page.tsx"), /AKTA_NOCY_PHASES\.map/);
  assert.match(read("app/gry/akta-nocy/page.tsx"), /OSTATNI_KURS_PHASES\.map/);
  assert.match(read("app/gry/szyfr/page.tsx"), /missions\.map/);
});

test("database restricts each list size, technical fields, URL/HTML and other catalog games", () => {
  for(const [slug,n] of cases) {
    assert.ok(sql.includes(`'${slug}'`),`allowlist ${slug}`);
    assert.match(sql, new RegExp(`when '${slug}' then ${n}`));
  }
  assert.match(sql, /if jsonb_typeof\(page_rules\) is distinct from 'null'/);
  assert.match(sql, /jsonb_typeof\(page_rules->'schema'\) is distinct from 'number'/);
  assert.match(sql, /key not in \('schema','items'\)/);
  assert.match(sql, /jsonb_array_length\(rule_items\)<>expected_rule_count/);
  assert.match(sql, /INVALID_PAGE_RULES_COPY/);
  assert.match(sql, /'pageRules', coalesce\(h.payload->'pageRules','null'::jsonb\)/);
  assert.match(sql, /GAME_EDIT_FORBIDDEN/);
  assert.match(sql, /CATALOG_REVISION_CONFLICT/);
  assert.match(sql, /catalog\.draft\.save/);
  assert.match(cms, /ruleDefaults\.map/);
  assert.match(cms, /Przywróć wszystkie oryginalne opisy/);
  assert.match(renderer, /getPublishedGameCard\(slug\)/);
  assert.match(renderer, /fallback\.map\(\(\[no, title, original\]/);
});
