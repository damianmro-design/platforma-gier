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

export type TmDbAnswer = {
  player_id: string;
  answer_value: string;
};

export type TmDbState = {
  question_index: number;
  score: number;
  finished: boolean;
  player_a_id: string;
  player_a_name: string;
  player_a_avatar: string;
  player_b_id: string;
  player_b_name: string;
  player_b_avatar: string;
  viewer_player_id: string | null;
  viewer_answer: string | null;
  answer_count: number;
  submitted_player_ids: string[];
  revealed: boolean;
  answers: TmDbAnswer[];
};

export async function getTmState(
  code: string,
  playerToken?: string | null,
  hostToken?: string | null,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_tm_state", {
    p_code: code,
    p_player_token: playerToken ?? null,
    p_host_token: hostToken ?? null,
  });

  if (error) throw new Error(error.message);
  const state = Array.isArray(data) ? data[0] : data;
  if (!state) return null;

  return {
    ...state,
    question_index: Number(state.question_index ?? 0),
    score: Number(state.score ?? 0),
    answer_count: Number(state.answer_count ?? 0),
    submitted_player_ids: Array.isArray(state.submitted_player_ids)
      ? state.submitted_player_ids.map(String)
      : [],
    answers: Array.isArray(state.answers) ? state.answers : [],
    finished: Boolean(state.finished),
    revealed: Boolean(state.revealed),
  } as TmDbState;
}

export async function submitTmAnswer(
  code: string,
  playerToken: string,
  questionIndex: number,
  answerValue: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_tm_answer", {
    p_code: code,
    p_player_token: playerToken,
    p_question_index: questionIndex,
    p_answer_value: answerValue,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function advanceTmQuestion(
  code: string,
  hostToken: string,
  expectedQuestionIndex: number,
  scoreDelta: number,
  totalQuestions: number,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("advance_tm_question", {
    p_code: code,
    p_host_token: hostToken,
    p_expected_question_index: expectedQuestionIndex,
    p_score_delta: scoreDelta,
    p_total_questions: totalQuestions,
  });

  if (error) throw new Error(error.message);
  return Number(data);
}
