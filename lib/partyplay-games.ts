export type PartyPlayGameMeta = {
  slug: string;
  label: string;
  shortLabel: string;
  icon: string;
  connectedToProgress: boolean;
};

export const PARTYPLAY_GAMES: PartyPlayGameMeta[] = [
  {
    slug: "polowanie-na-milionera",
    label: "Polowanie na Milionera",
    shortLabel: "Polowanie",
    icon: "💰",
    connectedToProgress: true,
  },
  {
    slug: "co-ludzie-powiedza",
    label: "Co ludzie powiedzą",
    shortLabel: "Co ludzie powiedzą",
    icon: "👥",
    connectedToProgress: true,
  },
  {
    slug: "zakrecone-haslo",
    label: "Zakręcone Hasło",
    shortLabel: "Zakręcone Hasło",
    icon: "🎡",
    connectedToProgress: true,
  },
  {
    slug: "pod-przykrywka",
    label: "Pod Przykrywką",
    shortLabel: "Pod Przykrywką",
    icon: "🕵️",
    connectedToProgress: true,
  },
  {
    slug: "floor-party",
    label: "Floor Party",
    shortLabel: "Floor Party",
    icon: "⚡",
    connectedToProgress: false,
  },
] as const;

export function getPartyPlayGameMeta(slug: string) {
  return PARTYPLAY_GAMES.find((game) => game.slug === slug) ?? {
    slug,
    label: slug,
    shortLabel: slug,
    icon: "🎮",
    connectedToProgress: false,
  };
}

export function partyPlayGameLabel(slug: string) {
  return getPartyPlayGameMeta(slug).label;
}
