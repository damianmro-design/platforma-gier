import "server-only";

import { getPublishedGameCard } from "@/lib/zagraj-public-catalog-server";
import { getPageRuleDefaults, PAGE_RULE_COPY_SCHEMA, type PageRuleGameSlug } from "@/lib/zagraj-game-page-rules";

// A CMS override affects presentation only. The numbered slots and their titles
// are always taken from the versioned application; the game engine is untouched.
export async function getPublishedPageRules(slug: PageRuleGameSlug): Promise<Array<[string, string, string]>> {
  const fallback = getPageRuleDefaults(slug);
  if (!fallback) return [];
  const card = await getPublishedGameCard(slug);
  const data = card?.pageRules;
  const valid = data?.schema === PAGE_RULE_COPY_SCHEMA &&
    Array.isArray(data.items) && data.items.length === fallback.length &&
    data.items.every((text) => typeof text === "string" && text.trim().length > 0 && text.length <= 360);
  return fallback.map(([no, title, original], i) =>
    [no, title, valid ? data!.items[i] : original]);
}
