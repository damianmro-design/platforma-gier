import { NextResponse } from "next/server";
import {
  getPartyPlayRankingIdentitySourceFromAccessToken,
  getPartyPlayUserFromAccessToken,
} from "@/lib/partyplay-auth";
import { getPartyPlayRankingAggregates } from "@/lib/platform-db";
import { calculatePartyPlayProgress } from "@/lib/partyplay-progress";

function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

type RankingDraft = {
  userId: string;
  displayName: string;
  avatar: string;
  xp: number;
  level: number;
  levelTitle: string;
  totalGames: number;
  totalWins: number;
  distinctGamesPlayed: number;
  totalBadges: number;
};

export async function GET(request: Request) {
  const accessToken = bearerToken(request);
  const currentUser = await getPartyPlayUserFromAccessToken(accessToken);

  if (!accessToken || !currentUser) {
    return NextResponse.json(
      { error: "Nie jesteś zalogowany." },
      { status: 401 },
    );
  }

  try {
    const [identities, aggregates] = await Promise.all([
      getPartyPlayRankingIdentitySourceFromAccessToken(accessToken),
      getPartyPlayRankingAggregates(accessToken),
    ]);

    const aggregateByUser = new Map(
      aggregates.map((item) => [item.userId, item]),
    );

    const ranking: RankingDraft[] = identities
      .map((identity) => {
        const aggregate = aggregateByUser.get(identity.auth_user_id);
        const platformGames = aggregate?.games ?? [];

        const progression = calculatePartyPlayProgress({
          polowanieGames: identity.polowanie_games,
          polowanieWins: identity.polowanie_wins,
          polowanieBadges: identity.polowanie_badges,
          platformGames: platformGames.map((game) => ({
            gameSlug: game.gameSlug,
            gamesCompleted: game.gamesCompleted,
            wins: game.wins,
          })),
        });

        const identityName = identity.display_name.trim();
        const aggregateName = aggregate?.displayName.trim() ?? "";
        const displayName =
          identityName && identityName !== "Gracz"
            ? identityName
            : aggregateName || identityName || "Gracz";

        const avatar = identity.profile_avatar_set
          ? identity.avatar
          : aggregate?.avatar || identity.avatar || "lion";

        return {
          userId: identity.auth_user_id,
          displayName,
          avatar,
          xp: progression.xp,
          level: progression.level.level,
          levelTitle: progression.level.title,
          totalGames: progression.totalGames,
          totalWins: progression.totalWins,
          distinctGamesPlayed: progression.distinctGamesPlayed,
          totalBadges:
            progression.polowanieBadges +
            progression.partyPlayBadgesEarned,
        };
      })
      .filter((item) => item.totalGames > 0)
      .sort((a, b) => {
        if (b.xp !== a.xp) return b.xp - a.xp;
        if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
        if (b.distinctGamesPlayed !== a.distinctGamesPlayed) {
          return b.distinctGamesPlayed - a.distinctGamesPlayed;
        }
        if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames;
        return a.displayName.localeCompare(b.displayName, "pl");
      });

    const ranked = ranking.map((item, index) => ({
      rankPosition: index + 1,
      displayName: item.displayName,
      avatar: item.avatar,
      xp: item.xp,
      level: item.level,
      levelTitle: item.levelTitle,
      gamesCompleted: item.totalGames,
      wins: item.totalWins,
      distinctGamesPlayed: item.distinctGamesPlayed,
      badges: item.totalBadges,
      isCurrentUser: item.userId === currentUser.id,
    }));

    const top = ranked.slice(0, 50);
    const current = ranked.find((item) => item.isCurrentUser) ?? null;
    const currentOutsideTop =
      current && current.rankPosition > 50 ? current : null;

    return NextResponse.json({
      entries: top,
      currentOutsideTop,
      totalRanked: ranked.length,
      tieBreakers: [
        "XP",
        "zwycięstwa",
        "liczba różnych gier",
        "ukończone gry",
      ],
    });
  } catch {
    return NextResponse.json(
      { error: "Nie udało się pobrać rankingu PartyPlay." },
      { status: 500 },
    );
  }
}
