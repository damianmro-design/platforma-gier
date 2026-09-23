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

export type SzyfrPhase = "tutorial" | "playing" | "final" | "finished" | "failed";

export type SzyfrPuzzle = {
  stepKey: string;
  missionIndex: number;
  missionName: string;
  stageIndex: number;
  title: string;
  prompt: string;
  answerType: "number" | "text" | "choice" | "order";
  answerFormat: string;
  options: string[];
  privateClues: string[];
  totalClues: number;
  viewerClues: number;
  finalReady: boolean;
};

export type SzyfrViewer = {
  id: string;
  name: string;
  avatar: string;
};

export type SzyfrState = {
  serverNow: string;
  phase: SzyfrPhase;
  endsAt: string | null;
  mainStartedAt: string | null;
  finishedAt: string | null;
  stepIndex: number;
  stepCount: number;
  wrongAttempts: number;
  hintsUsed: number;
  hintLevel: number;
  hints: string[];
  fragments: number[];
  scenarioSignature: string;
  score: number | null;
  elapsedSeconds: number;
  lastEvent: Record<string, unknown>;
  isHost: boolean;
  viewer: SzyfrViewer | null;
  puzzle: SzyfrPuzzle;
};

function normalizeState(data: unknown): SzyfrState | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const puzzle = (row.puzzle ?? {}) as Record<string, unknown>;
  const viewer = row.viewer as Record<string, unknown> | null;

  return {
    ...(row as unknown as SzyfrState),
    stepIndex: Number(row.stepIndex ?? 1),
    stepCount: Number(row.stepCount ?? 10),
    wrongAttempts: Number(row.wrongAttempts ?? 0),
    hintsUsed: Number(row.hintsUsed ?? 0),
    hintLevel: Number(row.hintLevel ?? 0),
    fragments: Array.isArray(row.fragments) ? row.fragments.map(Number) : [],
    hints: Array.isArray(row.hints) ? row.hints.map(String) : [],
    score: row.score == null ? null : Number(row.score),
    elapsedSeconds: Number(row.elapsedSeconds ?? 0),
    lastEvent:
      row.lastEvent && typeof row.lastEvent === "object"
        ? (row.lastEvent as Record<string, unknown>)
        : {},
    isHost: Boolean(row.isHost),
    viewer:
      viewer && typeof viewer === "object"
        ? {
            id: String(viewer.id ?? ""),
            name: String(viewer.name ?? ""),
            avatar: String(viewer.avatar ?? ""),
          }
        : null,
    puzzle: {
      stepKey: String(puzzle.stepKey ?? ""),
      missionIndex: Number(puzzle.missionIndex ?? 0),
      missionName: String(puzzle.missionName ?? ""),
      stageIndex: Number(puzzle.stageIndex ?? 1),
      title: String(puzzle.title ?? ""),
      prompt: String(puzzle.prompt ?? ""),
      answerType: String(puzzle.answerType ?? "text") as SzyfrPuzzle["answerType"],
      answerFormat: String(puzzle.answerFormat ?? ""),
      options: Array.isArray(puzzle.options) ? puzzle.options.map(String) : [],
      privateClues: Array.isArray(puzzle.privateClues)
        ? puzzle.privateClues.map(String)
        : [],
      totalClues: Number(puzzle.totalClues ?? 6),
      viewerClues: Number(puzzle.viewerClues ?? 0),
      finalReady: Boolean(puzzle.finalReady ?? true),
    },
  };
}

async function rpc<T>(name: string, params: Record<string, unknown>) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function getSzyfrState(
  code: string,
  playerToken?: string | null,
  hostToken?: string | null,
) {
  const data = await rpc<unknown>("get_szyfr_state", {
    p_code: code,
    p_player_token: playerToken ?? null,
    p_host_token: hostToken ?? null,
  });
  return normalizeState(data);
}

export function submitSzyfrAnswer(
  code: string,
  playerToken: string,
  stepKey: string,
  answer: string,
) {
  return rpc<Record<string, unknown>>("submit_szyfr_answer", {
    p_code: code,
    p_player_token: playerToken,
    p_step_key: stepKey,
    p_answer: answer,
  });
}

export function useSzyfrHint(
  code: string,
  playerToken: string,
  stepKey: string,
) {
  return rpc<Record<string, unknown>>("use_szyfr_hint", {
    p_code: code,
    p_player_token: playerToken,
    p_step_key: stepKey,
  });
}

export async function retrySzyfr(code: string, hostToken: string) {
  return Boolean(
    await rpc("retry_szyfr", { p_code: code, p_host_token: hostToken }),
  );
}

export async function rematchSzyfr(code: string, hostToken: string) {
  return Boolean(
    await rpc("rematch_szyfr", { p_code: code, p_host_token: hostToken }),
  );
}
