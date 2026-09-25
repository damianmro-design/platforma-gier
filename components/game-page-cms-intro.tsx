import { getPublishedGameCard } from "@/lib/zagraj-public-catalog-server";
import { GAME_PAGE_INTRO_FALLBACK } from "@/lib/zagraj-game-page-intros";

// Plain text only, no HTML or links. The original intro remains the fallback
// when a game has no override or Supabase temporarily cannot be reached.
export default async function GamePageCmsIntro({ slug }: { slug: string }) {
  const card = await getPublishedGameCard(slug);
  const override = typeof card?.pageIntro === "string" ? card.pageIntro.trim() : "";
  return <>{override || GAME_PAGE_INTRO_FALLBACK[slug] || ""}</>;
}
