import { NextResponse } from "next/server";
import {
  getPartyPlayUserFromAccessToken,
  getPolowanieBadgesFromAccessToken,
  getPolowanieCareerFromAccessToken,
} from "@/lib/partyplay-auth";
import { calculatePartyPlayProgress } from "@/lib/partyplay-progress";
import { getMyPartyPlayPlatformStats } from "@/lib/platform-db";

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

export async function GET(request: Request) {
  const accessToken = bearerToken(request);
  const user = await getPartyPlayUserFromAccessToken(accessToken);

  const url = new URL(request.url);
  const historyLimit = Math.min(
    Math.max(Number(url.searchParams.get("limit") ?? "10") || 10, 1),
    50,
  );
  const historyOffset = Math.max(
    Number(url.searchParams.get("offset") ?? "0") || 0,
    0,
  );
  const gameSlug = url.searchParams.get("game")?.trim() || null;

  if (!user) {
    return NextResponse.json({ error: "Nie jesteś zalogowany." }, { status: 401 });
  }

  try {
    const [platformStats, polowanie, polowanieBadges] = await Promise.all([
      getMyPartyPlayPlatformStats(accessToken!, {
        historyLimit,
        historyOffset,
        gameSlug,
      }),
      getPolowanieCareerFromAccessToken(accessToken!),
      getPolowanieBadgesFromAccessToken(accessToken!),
    ]);

    const progression = calculatePartyPlayProgress({
      polowanieGames: polowanie?.games_completed ?? 0,
      polowanieWins: polowanie?.wins ?? 0,
      polowanieBadges: polowanie?.badges_count ?? 0,
      platformGames: platformStats.summary.games.map((game) => ({
        gameSlug: game.gameSlug,
        gamesCompleted: Number(game.gamesCompleted ?? 0),
        wins: Number(game.wins ?? 0),
      })),
    });

    return NextResponse.json({
      summary: platformStats.summary,
      history: platformStats.history,
      historyTotal: platformStats.historyTotal,
      historyOffset: platformStats.historyOffset,
      historyLimit: platformStats.historyLimit,
      historyHasMore: platformStats.historyHasMore,
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
