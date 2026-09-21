export const ZH_ALPHABET = [
  "A","Ą","B","C","Ć","D","E","Ę","F","G","H","I","J","K","L","Ł",
  "M","N","Ń","O","Ó","P","R","S","Ś","T","U","W","Y","Z","Ź","Ż",
] as const;

export const ZH_VOWELS = new Set(["A","Ą","E","Ę","I","O","Ó","U","Y"]);

export const ZH_WHEEL_SEGMENTS = [
  "100","150","200","BANKRUT","250","300","PAS","350","400",
  "500","BANKRUT","600","700","PAS","800","1000","450","300",
] as const;

export type ZhPlayerScore = {
  id: string;
  displayName: string;
  avatar: string;
  totalScore: number;
  roundScore: number;
  displayScore: number;
};

export type ZhWheelState = {
  label: string;
  value: number | null;
  segmentIndex: number;
} | null;

export type ZhLastEvent = {
  type?: "round_start" | "spin" | "bankrupt" | "pass" | "letter" | "vowel" | "solve" | "game_over";
  playerId?: string;
  playerName?: string;
  label?: string;
  value?: number;
  segmentIndex?: number;
  letter?: string;
  count?: number;
  points?: number;
  cost?: number;
  bonus?: number;
  correct?: boolean;
  round?: number;
  at?: string;
} | null;

export type ZhGameState = {
  puzzleIndex: number;
  puzzleCount: number;
  roundNumber: number;
  difficulty: 1 | 2 | 3;
  category: string;
  phrase: string;
  usedLetters: string[];
  mode: "await_spin" | "choose_letter" | "round_over" | "game_over";
  activePlayerId: string;
  roundWinnerId: string | null;
  wheel: ZhWheelState;
  lastEvent: ZhLastEvent;
  players: ZhPlayerScore[];
};
