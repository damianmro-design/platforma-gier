import { NextResponse } from "next/server";
import {
  getPartyPlayUserFromAccessToken,
  getPolowanieBadgesFromAccessToken,
  getPolowanieCareerFromAccessToken,
  getPolowanieHistoryCountFromAccessToken,
  getPolowanieHistoryFromAccessToken,
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
    const fetchWindow = Math.min(historyOffset + historyLimit, 200);
    const isPolowanieFilter = gameSlug === "polowanie-na-milionera";
    const isPlatformGameFilter = Boolean(gameSlug && !isPolowanieFilter);

    const [platformStats, polowanie, polowanieBadges, polowanieHistory, polowanieHistoryTotal] =
      await Promise.all([
        getMyPartyPlayPlatformStats(accessToken!, {
          historyLimit: isPlatformGameFilter
            ? historyLimit
            : gameSlug
              ? 1
              : fetchWindow,
          historyOffset: isPlatformGameFilter ? historyOffset : 0,
          gameSlug: isPlatformGameFilter ? gameSlug : null,
        }),
        getPolowanieCareerFromAccessToken(accessToken!),
        getPolowanieBadgesFromAccessToken(accessToken!),
        isPlatformGameFilter
          ? Promise.resolve([])
          : getPolowanieHistoryFromAccessToken(
              accessToken!,
              isPolowanieFilter ? historyLimit : fetchWindow,
              isPolowanieFilter ? historyOffset : 0,
            ),
        isPlatformGameFilter
          ? Promise.resolve(0)
          : getPolowanieHistoryCountFromAccessToken(accessToken!),
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
      podPrzykrywka: platformStats.podPrzykrywka,
    });

    let history = platformStats.history;
    let historyTotal = platformStats.historyTotal;
    let historyHasMore = platformStats.historyHasMore;

    if (isPolowanieFilter) {
      history = polowanieHistory;
      historyTotal = polowanieHistoryTotal;
      historyHasMore = historyOffset + historyLimit < historyTotal;
    } else if (!gameSlug) {
      history = [...platformStats.history, ...polowanieHistory]
        .sort(
          (a, b) =>
            new Date(b.completed_at).getTime() -
            new Date(a.completed_at).getTime(),
        )
        .slice(historyOffset, historyOffset + historyLimit);

      historyTotal = platformStats.historyTotal + polowanieHistoryTotal;
      historyHasMore = historyOffset + historyLimit < historyTotal;
    }

    return NextResponse.json({
      summary: platformStats.summary,
      history,
      historyTotal,
      historyOffset,
      historyLimit,
      historyHasMore,
      polowanie,
      polowanieBadges,
      progression,
      podPrzykrywka: platformStats.podPrzykrywka,
    });
  } catch {
    return NextResponse.json(
      { error: "Nie udało się pobrać statystyk zaGRAj." },
      { status: 500 },
    );
  }
}
