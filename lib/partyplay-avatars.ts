export type PartyPlayAvatarDefinition = {
  id: string;
  name: string;
  unlockLevel: number;
};

export const PARTYPLAY_AVATARS: PartyPlayAvatarDefinition[] = [
  { id: "avatar-01", name: "Orbita", unlockLevel: 1 },
  { id: "avatar-02", name: "Pryzmat", unlockLevel: 1 },
  { id: "avatar-03", name: "Saturn", unlockLevel: 1 },
  { id: "avatar-04", name: "Pulse", unlockLevel: 1 },
  { id: "avatar-05", name: "Kryształ", unlockLevel: 1 },
  { id: "avatar-06", name: "Luna", unlockLevel: 1 },
  { id: "avatar-07", name: "Nova", unlockLevel: 2 },
  { id: "avatar-08", name: "Przecięcie", unlockLevel: 3 },
  { id: "avatar-09", name: "Warstwy", unlockLevel: 4 },
  { id: "avatar-10", name: "Wir", unlockLevel: 5 },
  { id: "avatar-11", name: "Gwiazda", unlockLevel: 6 },
  { id: "avatar-12", name: "Odłamki", unlockLevel: 7 },
  { id: "avatar-13", name: "Sześcian", unlockLevel: 8 },
  { id: "avatar-14", name: "Satelita", unlockLevel: 9 },
  { id: "avatar-15", name: "Korona", unlockLevel: 10 },
  { id: "avatar-16", name: "Splot", unlockLevel: 11 },
  { id: "avatar-17", name: "Piramida", unlockLevel: 12 },
  { id: "avatar-18", name: "Spirala", unlockLevel: 13 },
  { id: "avatar-19", name: "Portal", unlockLevel: 14 },
  { id: "avatar-20", name: "Piksele", unlockLevel: 15 },
];

export const PARTYPLAY_STARTER_AVATARS = PARTYPLAY_AVATARS.slice(0, 6);

export function getPartyPlayAvatar(id: string | null | undefined) {
  return PARTYPLAY_AVATARS.find((avatar) => avatar.id === id) ?? PARTYPLAY_AVATARS[0];
}

export function normalizePartyPlayAvatar(id: string | null | undefined) {
  return getPartyPlayAvatar(id).id;
}

export function isPartyPlayAvatarUnlocked(
  id: string | null | undefined,
  level: number,
) {
  return getPartyPlayAvatar(id).unlockLevel <= Math.max(1, Number(level) || 1);
}
