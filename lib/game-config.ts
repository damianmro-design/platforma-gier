export type PlatformGameSlug =
  | "co-ludzie-powiedza"
  | "zakrecone-haslo"
  | "pod-przykrywka"
  | "akta-nocy";

export type PlatformGameConfig = {
  slug: PlatformGameSlug;
  label: string;
  minPlayers: number;
  maxPlayers: number;
  requiresHost: boolean;
};

export const PLATFORM_GAME_CONFIG: Record<PlatformGameSlug, PlatformGameConfig> = {
  "co-ludzie-powiedza": {
    slug: "co-ludzie-powiedza",
    label: "CO LUDZIE POWIEDZĄ",
    minPlayers: 4,
    maxPlayers: 14,
    requiresHost: true,
  },
  "zakrecone-haslo": {
    slug: "zakrecone-haslo",
    label: "ZAKRĘCONE HASŁO",
    minPlayers: 3,
    maxPlayers: 12,
    requiresHost: false,
  },
  "pod-przykrywka": {
    slug: "pod-przykrywka",
    label: "POD PRZYKRYWKĄ",
    minPlayers: 6,
    maxPlayers: 14,
    requiresHost: true,
  },
  "akta-nocy": {
    slug: "akta-nocy",
    label: "AKTA NOCY",
    minPlayers: 5,
    maxPlayers: 12,
    requiresHost: true,
  },
};

export function getPlatformGameConfig(slug: string) {
  return PLATFORM_GAME_CONFIG[slug as PlatformGameSlug] ?? null;
}
