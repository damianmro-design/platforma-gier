import "server-only";

import type { Metadata } from "next";
import { getPublishedGameCard } from "@/lib/zagraj-public-catalog-server";
import { GAME_PAGE_SEO_FALLBACK, type GamePageSeoSlug } from "@/lib/zagraj-game-page-seo";

// URL ownership is in application routing, never controlled by editorial JSON.
export async function getPublishedGamePageMetadata(slug: GamePageSeoSlug): Promise<Metadata> {
  const original = GAME_PAGE_SEO_FALLBACK[slug];
  const card = await getPublishedGameCard(slug);
  const override = card?.pageSeo;
  const valid = override && typeof override === "object" &&
    typeof override.title === "string" && typeof override.description === "string" &&
    override.title.trim().length >= 1 && override.title.length <= 70 &&
    override.description.trim().length >= 1 && override.description.length <= 180 &&
    !/[<>]/.test(override.title + override.description) &&
    !/https?:\/\/|www\./i.test(override.title + override.description);
  const title = valid ? override.title.trim() : original.title;
  const description = valid ? override.description.trim() : original.description;
  const canonical = `/gry/${slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website", locale: "pl_PL", siteName: "zaGRAj" },
    twitter: { card: "summary", title, description },
  };
}
