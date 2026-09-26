import type { MetadataRoute } from "next";
import { GAME_PAGE_SEO_FALLBACK, type GamePageSeoSlug } from "@/lib/zagraj-game-page-seo";
import { getPublishedGameCard } from "@/lib/zagraj-public-catalog-server";

export const dynamic = "force-dynamic";

const SITE_URL = "https://zagraj.fun";

// Only owner-published, visible internal game pages belong in the sitemap.
// An outage cannot accidentally expose a draft or a hidden game via defaults.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = Object.keys(GAME_PAGE_SEO_FALLBACK) as GamePageSeoSlug[];
  const cards = await Promise.all(slugs.map(async (slug) => ({
    slug,
    card: await getPublishedGameCard(slug),
  })));
  return [
    { url: SITE_URL + "/" },
    ...cards.filter(({ card }) => Boolean(card)).map(({ slug }) => ({
      url: SITE_URL + "/gry/" + slug,
    })),
  ];
}
