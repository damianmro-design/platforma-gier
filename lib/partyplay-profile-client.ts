export type PartyPlayGameSummary = {
  gameSlug: string;
  gamesCompleted: number;
  wins: number;
  totalScore: number;
  bestPlacement: number | null;
};

export type PartyPlayHistoryItem = {
  game_slug: string;
  display_name: string;
  avatar: string;
  team: "A" | "B" | null;
  final_score: number | null;
  placement: number | null;
  won: boolean;
  completed_at: string;
  result_data?: Record<string, unknown>;
};

export type PartyPlayBadge = {
  code: string;
  title: string;
  description: string;
  icon: string;
  scope: "global" | "game";
  gameSlug: string | null;
  earned: boolean;
  progressCurrent: number;
  progressTarget: number;
  xpReward: number;
};

export type PartyPlayProgression = {
  xp: number;
  xpBreakdown: {
    games: number;
    wins: number;
    polowanieBadges: number;
    partyPlayBadges: number;
  };
  xpRules: {
    gameCompleted: number;
    win: number;
    polowanieBadge: number;
    partyPlayBadge: number;
  };
  level: {
    level: number;
    title: string;
    minXp: number;
    nextMinXp: number | null;
  };
  levelProgress: number;
  xpToNextLevel: number;
  totalGames: number;
  totalWins: number;
  distinctGamesPlayed: number;
  distinctGamesWon: number;
  polowanieBadges: number;
  partyPlayBadgesEarned: number;
  globalBadgesEarned: number;
  badges: PartyPlayBadge[];
};

export type PolowanieCareer = {
  display_name: string;
  games_completed: number;
  wins: number;
  hunter_points: number;
  correct_millionaire_votes: number;
  finals_reached: number;
  badges_count: number;
};

export type PolowanieBadge = {
  badgeCode: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
  progressCurrent: number;
  progressTarget: number;
};

export type PartyPlayStatsResponse = {
  summary: {
    games_completed: number;
    wins: number;
    total_score: number;
    best_placement: number | null;
    last_played_at: string | null;
    games: PartyPlayGameSummary[];
  };
  history: PartyPlayHistoryItem[];
  historyTotal: number;
  historyOffset: number;
  historyLimit: number;
  historyHasMore: boolean;
  polowanie: PolowanieCareer | null;
  polowanieBadges: PolowanieBadge[];
  progression: PartyPlayProgression;
};

export async function fetchPartyPlayStats(
  accessToken: string,
  options?: {
    limit?: number;
    offset?: number;
    game?: string | null;
  },
) {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.offset != null) params.set("offset", String(options.offset));
  if (options?.game) params.set("game", options.game);

  const response = await fetch(
    `/api/account/stats${params.size ? `?${params.toString()}` : ""}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Nie udało się pobrać danych profilu zaGRAj.");
  }

  return (await response.json()) as PartyPlayStatsResponse;
}
