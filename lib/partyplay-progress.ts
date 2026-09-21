import { PARTYPLAY_GAMES } from "@/lib/partyplay-games";

export const PARTYPLAY_XP_RULES = {
  gameCompleted: 100,
  win: 75,
  polowanieBadge: 20,
  partyPlayBadge: 25,
} as const;

export type PartyPlayGameProgress = {
  gameSlug: string;
  gamesCompleted: number;
  wins: number;
};

export type PartyPlayProgressInput = {
  polowanieGames: number;
  polowanieWins: number;
  polowanieBadges: number;
  platformGames: PartyPlayGameProgress[];
  podPrzykrywka?: {
    oszustWins: number;
    correctFinalVotes: number;
    perfectCoverWins: number;
    innocentFinalDefenderWins: number;
    interrogatedWins: number;
  };
};

export type PartyPlayLevel = {
  level: number;
  title: string;
  minXp: number;
  nextMinXp: number | null;
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

export const PARTYPLAY_LEVELS = [
  { level: 1, title: "Rozgrzewka", minXp: 0 },
  { level: 2, title: "Gracz", minXp: 250 },
  { level: 3, title: "Bywalec", minXp: 600 },
  { level: 4, title: "Strateg", minXp: 1100 },
  { level: 5, title: "Showman", minXp: 1800 },
  { level: 6, title: "Mistrz", minXp: 2700 },
  { level: 7, title: "Gwiazda PartyPlay", minXp: 3800 },
  { level: 8, title: "Weteran", minXp: 5200 },
  { level: 9, title: "Elita", minXp: 7000 },
  { level: 10, title: "Legenda", minXp: 9000 },
  { level: 11, title: "Ikona", minXp: 11500 },
  { level: 12, title: "Arcymistrz", minXp: 14500 },
  { level: 13, title: "Hall of Fame", minXp: 18000 },
  { level: 14, title: "Nietykalny", minXp: 22000 },
  { level: 15, title: "Legenda PartyPlay", minXp: 27000 },
] as const;

function safeNumber(value: number | null | undefined) {
  return Math.max(0, Number(value ?? 0) || 0);
}

function makeBadge({
  code,
  title,
  description,
  icon,
  scope = "global",
  gameSlug = null,
  current,
  target,
}: {
  code: string;
  title: string;
  description: string;
  icon: string;
  scope?: "global" | "game";
  gameSlug?: string | null;
  current: number;
  target: number;
}): PartyPlayBadge {
  return {
    code,
    title,
    description,
    icon,
    scope,
    gameSlug,
    earned: current >= target,
    progressCurrent: Math.min(current, target),
    progressTarget: target,
    xpReward: PARTYPLAY_XP_RULES.partyPlayBadge,
  };
}

export function calculatePartyPlayProgress(input: PartyPlayProgressInput) {
  const polowanieGames = safeNumber(input.polowanieGames);
  const polowanieWins = safeNumber(input.polowanieWins);
  const polowanieBadges = safeNumber(input.polowanieBadges);

  const platformGames = input.platformGames.map((game) => ({
    gameSlug: game.gameSlug,
    gamesCompleted: safeNumber(game.gamesCompleted),
    wins: safeNumber(game.wins),
  }));

  const gameProgress = new Map<string, PartyPlayGameProgress>();
  gameProgress.set("polowanie-na-milionera", {
    gameSlug: "polowanie-na-milionera",
    gamesCompleted: polowanieGames,
    wins: polowanieWins,
  });

  for (const game of platformGames) {
    gameProgress.set(game.gameSlug, game);
  }

  const platformGamesCompleted = platformGames.reduce(
    (sum, game) => sum + game.gamesCompleted,
    0,
  );
  const platformWins = platformGames.reduce((sum, game) => sum + game.wins, 0);

  const totalGames = polowanieGames + platformGamesCompleted;
  const totalWins = polowanieWins + platformWins;

  const distinctGamesPlayed = [...gameProgress.values()].filter(
    (game) => game.gamesCompleted > 0,
  ).length;

  const distinctGamesWon = [...gameProgress.values()].filter(
    (game) => game.wins > 0,
  ).length;

  const badges: PartyPlayBadge[] = [
    makeBadge({
      code: "global:first_game",
      title: "Pierwszy wieczór",
      description: "Ukończ 1 grę na zalogowanym koncie.",
      icon: "🎮",
      current: totalGames,
      target: 1,
    }),
    makeBadge({
      code: "global:first_win",
      title: "Smak zwycięstwa",
      description: "Wygraj swoją pierwszą grę.",
      icon: "🏆",
      current: totalWins,
      target: 1,
    }),
    makeBadge({
      code: "global:games_5",
      title: "Stały gracz",
      description: "Ukończ 5 gier PartyPlay.",
      icon: "🔥",
      current: totalGames,
      target: 5,
    }),
    makeBadge({
      code: "global:games_10",
      title: "Weteran wieczoru",
      description: "Ukończ 10 gier PartyPlay.",
      icon: "🎲",
      current: totalGames,
      target: 10,
    }),
    makeBadge({
      code: "global:games_25",
      title: "Maratończyk",
      description: "Ukończ 25 gier PartyPlay.",
      icon: "⚡",
      current: totalGames,
      target: 25,
    }),
    makeBadge({
      code: "global:games_50",
      title: "Nie gasimy światła",
      description: "Ukończ 50 gier PartyPlay.",
      icon: "🌙",
      current: totalGames,
      target: 50,
    }),
    makeBadge({
      code: "global:wins_3",
      title: "Łowca zwycięstw",
      description: "Wygraj 3 gry.",
      icon: "🥇",
      current: totalWins,
      target: 3,
    }),
    makeBadge({
      code: "global:wins_10",
      title: "Kolekcjoner triumfów",
      description: "Wygraj 10 gier.",
      icon: "👑",
      current: totalWins,
      target: 10,
    }),
    makeBadge({
      code: "global:variety_3",
      title: "Wszystkiego po trochu",
      description: "Zagraj w co najmniej 3 różne gry PartyPlay.",
      icon: "🧩",
      current: distinctGamesPlayed,
      target: 3,
    }),
    makeBadge({
      code: "global:wins_variety_3",
      title: "Uniwersalny mistrz",
      description: "Wygraj w co najmniej 3 różnych grach PartyPlay.",
      icon: "🌟",
      current: distinctGamesWon,
      target: 3,
    }),
  ];

  const pp = input.podPrzykrywka ?? {
    oszustWins: 0,
    correctFinalVotes: 0,
    perfectCoverWins: 0,
    innocentFinalDefenderWins: 0,
    interrogatedWins: 0,
  };

  badges.push(
    makeBadge({
      code: "game:pod-przykrywka:detective",
      title: "Dobry trop",
      description: "Poprawnie wskaż Oszusta w finałowym głosowaniu 3 razy.",
      icon: "🔍",
      scope: "game",
      gameSlug: "pod-przykrywka",
      current: safeNumber(pp.correctFinalVotes),
      target: 3,
    }),
    makeBadge({
      code: "game:pod-przykrywka:master_detective",
      title: "Śledczy",
      description: "Poprawnie wskaż Oszusta w finałowym głosowaniu 10 razy.",
      icon: "🕵️",
      scope: "game",
      gameSlug: "pod-przykrywka",
      current: safeNumber(pp.correctFinalVotes),
      target: 10,
    }),
    makeBadge({
      code: "game:pod-przykrywka:perfect_cover",
      title: "Idealna przykrywka",
      description: "Wygraj jako Oszust, nie otrzymując ani jednego głosu podejrzeń w całej grze.",
      icon: "🕶️",
      scope: "game",
      gameSlug: "pod-przykrywka",
      current: safeNumber(pp.perfectCoverWins),
      target: 1,
    }),
    makeBadge({
      code: "game:pod-przykrywka:oszust_3",
      title: "Nie do rozszyfrowania",
      description: "Wygraj 3 razy jako Oszust.",
      icon: "🎭",
      scope: "game",
      gameSlug: "pod-przykrywka",
      current: safeNumber(pp.oszustWins),
      target: 3,
    }),
    makeBadge({
      code: "game:pod-przykrywka:false_alarm",
      title: "Fałszywy alarm",
      description: "Jako Agent traf do finałowej dwójki podejrzanych i mimo to wygraj grę.",
      icon: "🚨",
      scope: "game",
      gameSlug: "pod-przykrywka",
      current: safeNumber(pp.innocentFinalDefenderWins),
      target: 1,
    }),
    makeBadge({
      code: "game:pod-przykrywka:under_pressure",
      title: "Pod presją",
      description: "Wygraj grę po tym, jak trafisz na przesłuchanie.",
      icon: "🎙️",
      scope: "game",
      gameSlug: "pod-przykrywka",
      current: safeNumber(pp.interrogatedWins),
      target: 1,
    }),
  );

  for (const meta of PARTYPLAY_GAMES.filter((game) => game.connectedToProgress)) {
    const game = gameProgress.get(meta.slug) ?? {
      gameSlug: meta.slug,
      gamesCompleted: 0,
      wins: 0,
    };

    badges.push(
      makeBadge({
        code: `game:${meta.slug}:first_game`,
        title: `${meta.shortLabel}: debiut`,
        description: `Ukończ pierwszą rozgrywkę w „${meta.label}”.`,
        icon: meta.icon,
        scope: "game",
        gameSlug: meta.slug,
        current: game.gamesCompleted,
        target: 1,
      }),
      makeBadge({
        code: `game:${meta.slug}:first_win`,
        title: `${meta.shortLabel}: pierwsze zwycięstwo`,
        description: `Wygraj pierwszą rozgrywkę w „${meta.label}”.`,
        icon: "🏅",
        scope: "game",
        gameSlug: meta.slug,
        current: game.wins,
        target: 1,
      }),
      makeBadge({
        code: `game:${meta.slug}:games_5`,
        title: `${meta.shortLabel}: stały bywalec`,
        description: `Ukończ 5 rozgrywek w „${meta.label}”.`,
        icon: "🎯",
        scope: "game",
        gameSlug: meta.slug,
        current: game.gamesCompleted,
        target: 5,
      }),
      makeBadge({
        code: `game:${meta.slug}:wins_3`,
        title: `${meta.shortLabel}: hat trick`,
        description: `Wygraj 3 rozgrywki w „${meta.label}”.`,
        icon: "🏆",
        scope: "game",
        gameSlug: meta.slug,
        current: game.wins,
        target: 3,
      }),
    );
  }

  const partyPlayBadgesEarned = badges.filter((badge) => badge.earned).length;

  const xpBreakdown = {
    games: totalGames * PARTYPLAY_XP_RULES.gameCompleted,
    wins: totalWins * PARTYPLAY_XP_RULES.win,
    polowanieBadges: polowanieBadges * PARTYPLAY_XP_RULES.polowanieBadge,
    partyPlayBadges:
      partyPlayBadgesEarned * PARTYPLAY_XP_RULES.partyPlayBadge,
  };

  const xp =
    xpBreakdown.games +
    xpBreakdown.wins +
    xpBreakdown.polowanieBadges +
    xpBreakdown.partyPlayBadges;

  let activeLevelIndex = 0;
  for (let index = 0; index < PARTYPLAY_LEVELS.length; index += 1) {
    if (xp >= PARTYPLAY_LEVELS[index].minXp) activeLevelIndex = index;
  }

  const currentLevel = PARTYPLAY_LEVELS[activeLevelIndex];
  const nextLevel = PARTYPLAY_LEVELS[activeLevelIndex + 1];

  const level: PartyPlayLevel = {
    level: currentLevel.level,
    title: currentLevel.title,
    minXp: currentLevel.minXp,
    nextMinXp: nextLevel?.minXp ?? null,
  };

  const xpIntoLevel = xp - currentLevel.minXp;
  const xpForLevel =
    nextLevel == null ? 0 : Math.max(1, nextLevel.minXp - currentLevel.minXp);

  const levelProgress =
    nextLevel == null
      ? 100
      : Math.max(0, Math.min(100, Math.round((xpIntoLevel / xpForLevel) * 100)));

  return {
    xp,
    xpBreakdown,
    xpRules: PARTYPLAY_XP_RULES,
    level,
    levelProgress,
    xpToNextLevel: nextLevel == null ? 0 : Math.max(0, nextLevel.minXp - xp),
    totalGames,
    totalWins,
    distinctGamesPlayed,
    distinctGamesWon,
    polowanieBadges,
    partyPlayBadgesEarned,
    globalBadgesEarned: partyPlayBadgesEarned,
    badges,
  };
}
