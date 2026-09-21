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

const HISTORY_BATCH_SIZE = 200;

async function getPlatformHistoryPrefix(
  accessToken: string,
  targetCount: number,
) {
  const first = await getMyPartyPlayPlatformStats(accessToken, {
    historyLimit: Math.min(Math.max(targetCount, 1), HISTORY_BATCH_SIZE),
    historyOffset: 0,
  });

  const history = [...first.history];
  let offset = history.length;

  while (history.length < targetCount && offset < first.historyTotal) {
    const batch = await getMyPartyPlayPlatformStats(accessToken, {
      historyLimit: Math.min(
        HISTORY_BATCH_SIZE,
        targetCount - history.length,
      ),
      historyOffset: offset,
    });

    if (!batch.history.length) break;

    history.push(...batch.history);
    offset += batch.history.length;
  }

  return { stats: first, history };
}

async function getPolowanieHistoryPrefix(
  accessToken: string,
  targetCount: number,
) {
  const history: Awaited<
    ReturnType<typeof getPolowanieHistoryFromAccessToken>
  > = [];
  let offset = 0;

  while (history.length < targetCount) {
    const batch = await getPolowanieHistoryFromAccessToken(
      accessToken,
      Math.min(HISTORY_BATCH_SIZE, targetCount - history.length),
      offset,
    );

    if (!batch.length) break;

    history.push(...batch);
    offset += batch.length;

    if (batch.length < HISTORY_BATCH_SIZE) break;
  }

  return history;
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

  if (!user || !accessToken) {
    return NextResponse.json({ error: "Nie jesteś zalogowany." }, { status: 401 });
  }

  try {
    const isPolowanieFilter = gameSlug === "polowanie-na-milionera";
    const isPlatformGameFilter = Boolean(gameSlug && !isPolowanieFilter);
    const prefixTarget = historyOffset + historyLimit;

    const platformPrefixPromise =
      !gameSlug
        ? getPlatformHistoryPrefix(accessToken, prefixTarget)
        : Promise.resolve(null);

    const platformStatsPromise = isPlatformGameFilter
      ? getMyPartyPlayPlatformStats(accessToken, {
          historyLimit,
          historyOffset,
          gameSlug,
        })
      : isPolowanieFilter
        ? getMyPartyPlayPlatformStats(accessToken, {
            historyLimit: 1,
            historyOffset: 0,
          })
        : platformPrefixPromise.then((result) => {
            if (!result) {
              throw new Error("Missing platform history prefix");
            }
            return result.stats;
          });

    const polowaniePrefixPromise =
      !gameSlug
        ? getPolowanieHistoryPrefix(accessToken, prefixTarget)
        : isPolowanieFilter
          ? getPolowanieHistoryFromAccessToken(
              accessToken,
              historyLimit,
              historyOffset,
            )
          : Promise.resolve([]);

    const [
      platformStats,
      platformPrefix,
      polowanie,
      polowanieBadges,
      polowanieHistory,
      polowanieHistoryTotal,
    ] = await Promise.all([
      platformStatsPromise,
      platformPrefixPromise,
      getPolowanieCareerFromAccessToken(accessToken),
      getPolowanieBadgesFromAccessToken(accessToken),
      polowaniePrefixPromise,
      isPlatformGameFilter
        ? Promise.resolve(0)
        : getPolowanieHistoryCountFromAccessToken(accessToken),
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

    let history = platformStats.history;
    let historyTotal = platformStats.historyTotal;
    let historyHasMore = platformStats.historyHasMore;

    if (isPolowanieFilter) {
      history = polowanieHistory;
      historyTotal = polowanieHistoryTotal;
      historyHasMore = historyOffset + historyLimit < historyTotal;
    } else if (!gameSlug) {
      const platformHistory = platformPrefix?.history ?? [];

      history = [...platformHistory, ...polowanieHistory]
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
    });
  } catch {
    return NextResponse.json(
      { error: "Nie udało się pobrać statystyk PartyPlay." },
      { status: 500 },
    );
  }
}
