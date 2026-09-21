import { NextResponse } from "next/server";
import {
  getPartyPlayUserFromAccessToken,
  getPolowanieBadgesFromAccessToken,
  getPolowanieCareerFromAccessToken,
} from "@/lib/partyplay-auth";
import { calculatePartyPlayProgress } from "@/lib/partyplay-progress";
import {
  getPartyPlayAccountHistory,
  getPartyPlayAccountSummary,
} from "@/lib/platform-db";

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

export async function GET(request: Request) {
  const accessToken = bearerToken(request);
  const user = await getPartyPlayUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json({ error: "Nie jesteś zalogowany." }, { status: 401 });
  }

  try {
    const [summary, history, polowanie, polowanieBadges] = await Promise.all([
      getPartyPlayAccountSummary(user.id),
      getPartyPlayAccountHistory(user.id, 20),
      getPolowanieCareerFromAccessToken(accessToken!),
      getPolowanieBadgesFromAccessToken(accessToken!),
    ]);

    const progression = calculatePartyPlayProgress({
      polowanieGames: polowanie?.games_completed ?? 0,
      polowanieWins: polowanie?.wins ?? 0,
      polowanieBadges: polowanie?.badges_count ?? 0,
      platformGames: summary.games.map((game) => ({
        gameSlug: game.gameSlug,
        gamesCompleted: Number(game.gamesCompleted ?? 0),
        wins: Number(game.wins ?? 0),
      })),
    });

    return NextResponse.json({
      summary,
      history,
      polowanie,
      polowanieBadges,
      progression,
    });
  } catch {
    return NextResponse.json(
      { error: "Nie udało się pobrać statystyk PartyPlay." },
      { status: 500 },
    );
  }
}
