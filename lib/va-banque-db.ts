import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://glcjetxskjnlbeegirln.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Zv_I8mghmQSYPzdit-lzvA_TrUcdkZ8";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export type VaBanquePhase =
  | "intro"
  | "category"
  | "bidding"
  | "bid_reveal"
  | "tie_bid"
  | "tie_reveal"
  | "question"
  | "main_result"
  | "takeover_open"
  | "takeover_question"
  | "takeover_result"
  | "round_result"
  | "final_category"
  | "final_bidding"
  | "final_question"
  | "final_reveal"
  | "finished";

export type VaBanquePlayer = {
  id: string;
  name: string;
  avatar: string;
  points: number;
  isConnected: boolean;
};

export type VaBanqueViewer = {
  id: string;
  name: string;
  avatar: string;
  points: number;
  bid: number | null;
  bidLocked: boolean;
  tieBid: number | null;
  tieLocked: boolean;
  answerIndex: number | null;
  answerLocked: boolean;
  finalBid: number | null;
  finalBidLocked: boolean;
  finalAnswerIndex: number | null;
  finalAnswerLocked: boolean;
};

export type VaBanqueBidReveal = {
  playerId: string;
  bid: number | null;
  tieBid: number | null;
};

export type VaBanqueFinalAnswer = {
  playerId: string;
  bid: number;
  answerIndex: number | null;
  correct: boolean;
};

export type VaBanqueState = {
  serverNow: string;
  phase: VaBanquePhase;
  deadline: string;
  roundIndex: number;
  regularRounds: number;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  question: string | null;
  options: string[];
  correctIndex: number | null;
  explanation: string | null;
  players: VaBanquePlayer[];
  bids: VaBanqueBidReveal[];
  winningPlayerId: string | null;
  winningBid: number | null;
  tiePlayerIds: string[];
  takeoverPlayerId: string | null;
  takeoverRisk: number | null;
  lastEvent: Record<string, unknown>;
  finalAnswers: VaBanqueFinalAnswer[];
  isHost: boolean;
  viewer: VaBanqueViewer | null;
};

function normalizeState(data: unknown): VaBanqueState | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;

  return {
    ...(row as unknown as VaBanqueState),
    roundIndex: Number(row.roundIndex ?? 1),
    regularRounds: Number(row.regularRounds ?? 8),
    winningBid: row.winningBid == null ? null : Number(row.winningBid),
    takeoverRisk: row.takeoverRisk == null ? null : Number(row.takeoverRisk),
    correctIndex: row.correctIndex == null ? null : Number(row.correctIndex),
    players: Array.isArray(row.players)
      ? row.players.map((player) => {
          const p = player as Record<string, unknown>;
          return {
            id: String(p.id),
            name: String(p.name),
            avatar: String(p.avatar),
            points: Number(p.points ?? 0),
            isConnected: Boolean(p.isConnected),
          };
        })
      : [],
    bids: Array.isArray(row.bids)
      ? row.bids.map((bid) => {
          const b = bid as Record<string, unknown>;
          return {
            playerId: String(b.playerId),
            bid: b.bid == null ? null : Number(b.bid),
            tieBid: b.tieBid == null ? null : Number(b.tieBid),
          };
        })
      : [],
    tiePlayerIds: Array.isArray(row.tiePlayerIds) ? row.tiePlayerIds.map(String) : [],
    finalAnswers: Array.isArray(row.finalAnswers)
      ? row.finalAnswers.map((answer) => {
          const a = answer as Record<string, unknown>;
          return {
            playerId: String(a.playerId),
            bid: Number(a.bid ?? 0),
            answerIndex: a.answerIndex == null ? null : Number(a.answerIndex),
            correct: Boolean(a.correct),
          };
        })
      : [],
    options: Array.isArray(row.options) ? row.options.map(String) : [],
    viewer:
      row.viewer && typeof row.viewer === "object"
        ? ({
            ...(row.viewer as VaBanqueViewer),
            points: Number((row.viewer as VaBanqueViewer).points ?? 0),
          } as VaBanqueViewer)
        : null,
    lastEvent:
      row.lastEvent && typeof row.lastEvent === "object"
        ? (row.lastEvent as Record<string, unknown>)
        : {},
  };
}

async function rpc<T>(name: string, params: Record<string, unknown>) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function getVaBanqueState(
  code: string,
  playerToken?: string | null,
  hostToken?: string | null,
) {
  const data = await rpc<unknown>("get_va_banque_state", {
    p_code: code,
    p_player_token: playerToken ?? null,
    p_host_token: hostToken ?? null,
  });
  return normalizeState(data);
}

export async function submitVaBanqueBid(
  code: string,
  playerToken: string,
  bid: number,
) {
  return Boolean(
    await rpc("submit_va_banque_bid", {
      p_code: code,
      p_player_token: playerToken,
      p_bid: bid,
    }),
  );
}

export async function submitVaBanqueTieBid(
  code: string,
  playerToken: string,
  bid: number,
) {
  return Boolean(
    await rpc("submit_va_banque_tie_bid", {
      p_code: code,
      p_player_token: playerToken,
      p_bid: bid,
    }),
  );
}

export async function submitVaBanqueAnswer(
  code: string,
  playerToken: string,
  answerIndex: number,
) {
  return Boolean(
    await rpc("submit_va_banque_answer", {
      p_code: code,
      p_player_token: playerToken,
      p_answer_index: answerIndex,
    }),
  );
}

export async function claimVaBanqueTakeover(code: string, playerToken: string) {
  return rpc<{ won: boolean; risk?: number }>("claim_va_banque_takeover", {
    p_code: code,
    p_player_token: playerToken,
  });
}

export async function submitVaBanqueFinalBid(
  code: string,
  playerToken: string,
  bid: number,
) {
  return Boolean(
    await rpc("submit_va_banque_final_bid", {
      p_code: code,
      p_player_token: playerToken,
      p_bid: bid,
    }),
  );
}

export async function submitVaBanqueFinalAnswer(
  code: string,
  playerToken: string,
  answerIndex: number,
) {
  return Boolean(
    await rpc("submit_va_banque_final_answer", {
      p_code: code,
      p_player_token: playerToken,
      p_answer_index: answerIndex,
    }),
  );
}

export async function rematchVaBanque(code: string, hostToken: string) {
  return Boolean(
    await rpc("rematch_va_banque", {
      p_code: code,
      p_host_token: hostToken,
    }),
  );
}
