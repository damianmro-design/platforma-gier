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
  earned: boolean;
  progressCurrent: number;
  progressTarget: number;
};

const LEVELS = [
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
] as const;

function safeNumber(value: number | null | undefined) {
  return Math.max(0, Number(value ?? 0) || 0);
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

  const platformGamesCompleted = platformGames.reduce(
    (sum, game) => sum + game.gamesCompleted,
    0,
  );
  const platformWins = platformGames.reduce((sum, game) => sum + game.wins, 0);

  const totalGames = polowanieGames + platformGamesCompleted;
  const totalWins = polowanieWins + platformWins;

  const distinctGamesPlayed =
    (polowanieGames > 0 ? 1 : 0) +
    platformGames.filter((game) => game.gamesCompleted > 0).length;

  const distinctGamesWon =
    (polowanieWins > 0 ? 1 : 0) +
    platformGames.filter((game) => game.wins > 0).length;

  const badgeDefinitions = [
    {
      code: "first_game",
      title: "Pierwszy wieczór",
      description: "Ukończ 1 grę na zalogowanym koncie.",
      icon: "🎮",
      current: totalGames,
      target: 1,
    },
    {
      code: "first_win",
      title: "Smak zwycięstwa",
      description: "Wygraj swoją pierwszą grę.",
      icon: "🏆",
      current: totalWins,
      target: 1,
    },
    {
      code: "games_5",
      title: "Stały gracz",
      description: "Ukończ 5 gier PartyPlay.",
      icon: "🔥",
      current: totalGames,
      target: 5,
    },
    {
      code: "games_10",
      title: "Weteran wieczoru",
      description: "Ukończ 10 gier PartyPlay.",
      icon: "🎲",
      current: totalGames,
      target: 10,
    },
    {
      code: "games_25",
      title: "Maratończyk",
      description: "Ukończ 25 gier PartyPlay.",
      icon: "⚡",
      current: totalGames,
      target: 25,
    },
    {
      code: "wins_3",
      title: "Łowca zwycięstw",
      description: "Wygraj 3 gry.",
      icon: "🥇",
      current: totalWins,
      target: 3,
    },
    {
      code: "wins_10",
      title: "Kolekcjoner triumfów",
      description: "Wygraj 10 gier.",
      icon: "👑",
      current: totalWins,
      target: 10,
    },
    {
      code: "games_variety_3",
      title: "Wszystkiego po trochu",
      description: "Zagraj w co najmniej 3 różne gry PartyPlay.",
      icon: "🧩",
      current: distinctGamesPlayed,
      target: 3,
    },
    {
      code: "wins_variety_3",
      title: "Uniwersalny mistrz",
      description: "Wygraj w co najmniej 3 różnych grach PartyPlay.",
      icon: "🌟",
      current: distinctGamesWon,
      target: 3,
    },
  ];

  const badges: PartyPlayBadge[] = badgeDefinitions.map((badge) => ({
    code: badge.code,
    title: badge.title,
    description: badge.description,
    icon: badge.icon,
    earned: badge.current >= badge.target,
    progressCurrent: Math.min(badge.current, badge.target),
    progressTarget: badge.target,
  }));

  const earnedGlobalBadges = badges.filter((badge) => badge.earned).length;

  const xp =
    totalGames * 100 +
    totalWins * 75 +
    polowanieBadges * 20 +
    earnedGlobalBadges * 25;

  let activeLevelIndex = 0;
  for (let index = 0; index < LEVELS.length; index += 1) {
    if (xp >= LEVELS[index].minXp) activeLevelIndex = index;
  }

  const currentLevel = LEVELS[activeLevelIndex];
  const nextLevel = LEVELS[activeLevelIndex + 1];

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
    level,
    levelProgress,
    xpToNextLevel: nextLevel == null ? 0 : Math.max(0, nextLevel.minXp - xp),
    totalGames,
    totalWins,
    distinctGamesPlayed,
    distinctGamesWon,
    polowanieBadges,
    globalBadgesEarned: earnedGlobalBadges,
    badges,
  };
}
