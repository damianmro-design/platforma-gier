import { createClient } from "@supabase/supabase-js";
import type { ZhGameState } from "@/lib/zakrecone-haslo";

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

export type PlatformRoom = {
  id: string;
  code: string;
  game_slug: string;
  status: "lobby" | "active" | "finished";
  game_phase?: string | null;
  created_at?: string;
  expires_at?: string;
};

export type CreatedPlatformRoom = PlatformRoom & {
  host_token: string;
};

export type LobbyPlayer = {
  id: string;
  display_name: string;
  avatar: string;
  team: "A" | "B" | null;
  ready: boolean;
  joined_at?: string;
};

export type JoinedPlayer = Omit<LobbyPlayer, "joined_at"> & {
  player_token: string;
};

export async function createPlatformRoom(gameSlug: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("create_platform_room", {
    p_game_slug: gameSlug,
  });

  if (error) throw new Error(error.message);
  const room = Array.isArray(data) ? data[0] : data;
  if (!room?.code || !room?.host_token) throw new Error("Nie udało się utworzyć pokoju.");
  return room as CreatedPlatformRoom;
}

export async function lookupPlatformRoom(code: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("lookup_platform_room", {
    p_code: code,
  });

  if (error) throw new Error(error.message);
  const room = Array.isArray(data) ? data[0] : data;
  return (room ?? null) as PlatformRoom | null;
}

export async function joinPlatformRoom(code: string, displayName: string, avatar: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("join_platform_room", {
    p_code: code,
    p_display_name: displayName,
    p_avatar: avatar,
  });

  if (error) throw new Error(error.message);
  const player = Array.isArray(data) ? data[0] : data;
  if (!player?.player_token) throw new Error("Nie udało się dołączyć do pokoju.");
  return player as JoinedPlayer;
}

export async function joinPlatformRoomAccount(
  code: string,
  displayName: string,
  avatar: string,
  partyPlayAccessToken: string,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  const supabase = createClient(url, key, {
    global: {
      headers: {
        "x-partyplay-auth": partyPlayAccessToken,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.rpc("join_platform_room_account", {
    p_code: code,
    p_display_name: displayName,
    p_avatar: avatar,
  });

  if (error) throw new Error(error.message);
  const player = Array.isArray(data) ? data[0] : data;
  if (!player?.player_token) throw new Error("Nie udało się dołączyć do pokoju.");
  return player as JoinedPlayer;
}

export async function listPlatformLobby(code: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("list_platform_lobby", {
    p_code: code,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as LobbyPlayer[];
}

export async function getPlatformPlayer(code: string, playerToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_platform_player", {
    p_code: code,
    p_player_token: playerToken,
  });

  if (error) throw new Error(error.message);
  const player = Array.isArray(data) ? data[0] : data;
  return (player ?? null) as LobbyPlayer | null;
}

export async function getPlatformRecoveryCode(code: string, playerToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_platform_recovery_code", {
    p_code: code,
    p_player_token: playerToken,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as string | null;
}

export async function recoverPlatformPlayer(
  code: string,
  displayName: string,
  recoveryCode: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("recover_platform_player", {
    p_code: code,
    p_display_name: displayName,
    p_recovery_code: recoveryCode,
  });

  if (error) throw new Error(error.message);
  const player = Array.isArray(data) ? data[0] : data;
  return (player ?? null) as JoinedPlayer | null;
}

export async function setPlatformPlayerReady(code: string, playerToken: string, ready: boolean) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("set_player_ready", {
    p_code: code,
    p_player_token: playerToken,
    p_ready: ready,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function assignPlatformTeams(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("assign_platform_teams", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function startPlatformRoom(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("start_platform_room", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}


export type ClpAnswer = {
  question_key: string;
  answer_value: string;
};

export type ClpHostProgress = {
  player_id: string;
  display_name: string;
  avatar: string;
  answer_count: number;
};

export async function submitClpAnswer(
  code: string,
  playerToken: string,
  questionKey: string,
  answerValue: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_clp_answer", {
    p_code: code,
    p_player_token: playerToken,
    p_question_key: questionKey,
    p_answer_value: answerValue,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function getClpPlayerAnswers(code: string, playerToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_clp_player_answers", {
    p_code: code,
    p_player_token: playerToken,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as ClpAnswer[];
}

export async function getClpHostProgress(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_clp_host_progress", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<
    Omit<ClpHostProgress, "answer_count"> & { answer_count: number | string | null }
  >;

  return rows.map((item) => ({
    ...item,
    answer_count: Number(item.answer_count ?? 0),
  }));
}

export async function advanceClpPhase(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("advance_clp_phase", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return data as string | null;
}


export type ClpRound1BoardItem = {
  key: string;
  label: string | null;
  points: number | null;
  revealed: boolean;
  position: number;
};

export type ClpRound1Player = {
  id: string;
  display_name: string;
  avatar: string;
  team: "A" | "B";
};

export type ClpRound1State = {
  questionIndex: number;
  questionCount: number;
  questionKey: string;
  prompt: string;
  board: ClpRound1BoardItem[];
  activeTeam: "A" | "B";
  mode: "play" | "steal" | "between";
  strikes: number;
  scoreA: number;
  scoreB: number;
  questionBank: number;
  answerer: ClpRound1Player | null;
  players: ClpRound1Player[];
  lastEvent: {
    type?: string;
    team?: "A" | "B";
    playerId?: string;
    playerName?: string;
    guess?: string;
    answerKey?: string;
    answerLabel?: string;
    points?: number;
    bonus?: number;
  } | null;
};

export async function getClpRound1State(code: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_clp_round1_state", {
    p_code: code,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as ClpRound1State | null;
}

export async function submitClpRound1Guess(
  code: string,
  playerToken: string,
  guess: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_clp_round1_guess", {
    p_code: code,
    p_player_token: playerToken,
    p_guess: guess,
  });

  if (error) throw new Error(error.message);
  return data as ClpRound1State["lastEvent"];
}

export async function nextClpRound1Question(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("next_clp_round1_question", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return data as string | null;
}


export type ClpRound2DistributionItem = {
  label: string;
  count: number | null;
  rank: number | null;
  position: number;
};

export type ClpRound2Prediction = {
  answer: string | null;
  locked: boolean;
  playerId: string;
} | null;

export type ClpRound2State = {
  questionIndex: number;
  questionCount: number;
  questionKey: string;
  prompt: string;
  options: string[];
  distribution: ClpRound2DistributionItem[];
  mode: "predict" | "reveal";
  scoreA: number;
  scoreB: number;
  predictorA: ClpRound1Player | null;
  predictorB: ClpRound1Player | null;
  predictionA: ClpRound2Prediction;
  predictionB: ClpRound2Prediction;
  lastEvent: {
    type?: string;
    scoreGainA?: number;
    scoreGainB?: number;
  } | null;
};

export async function getClpRound2State(code: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_clp_round2_state", {
    p_code: code,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as ClpRound2State | null;
}

export async function submitClpRound2Prediction(
  code: string,
  playerToken: string,
  answerValue: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_clp_round2_prediction", {
    p_code: code,
    p_player_token: playerToken,
    p_answer_value: answerValue,
  });

  if (error) throw new Error(error.message);
  return data as ClpRound2State["lastEvent"];
}

export async function nextClpRound2Question(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("next_clp_round2_question", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return data as string | null;
}


export type ClpRound3Ranking = {
  ranking: string[] | null;
  locked: boolean;
  playerId: string;
} | null;

export type ClpRound3State = {
  questionIndex: number;
  questionCount: number;
  questionKey: string;
  prompt: string;
  options: string[];
  correctOrder: string[] | null;
  mode: "rank" | "reveal";
  scoreA: number;
  scoreB: number;
  predictorA: ClpRound1Player | null;
  predictorB: ClpRound1Player | null;
  rankingA: ClpRound3Ranking;
  rankingB: ClpRound3Ranking;
  lastEvent: {
    type?: string;
    exactA?: number;
    exactB?: number;
    scoreGainA?: number;
    scoreGainB?: number;
  } | null;
};

export async function getClpRound3State(code: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_clp_round3_state", {
    p_code: code,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as ClpRound3State | null;
}

export async function submitClpRound3Ranking(
  code: string,
  playerToken: string,
  ranking: string[],
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_clp_round3_ranking", {
    p_code: code,
    p_player_token: playerToken,
    p_ranking: ranking,
  });

  if (error) throw new Error(error.message);
  return data as ClpRound3State["lastEvent"];
}

export async function nextClpRound3Question(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("next_clp_round3_question", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return data as string | null;
}


export type ClpRound4BoardItem = {
  label: string;
  percent: number | null;
  position: number;
};

export type ClpRound4Prediction = {
  answer: string | null;
  locked: boolean;
  playerId: string;
} | null;

export type ClpRound4State = {
  questionIndex: number;
  questionCount: number;
  questionKey: string;
  prompt: string;
  options: string[];
  board: ClpRound4BoardItem[];
  mode: "pick" | "reveal";
  scoreA: number;
  scoreB: number;
  predictorA: ClpRound1Player | null;
  predictorB: ClpRound1Player | null;
  predictionA: ClpRound4Prediction;
  predictionB: ClpRound4Prediction;
  lastEvent: {
    type?: string;
    leastAnswer?: string;
    secondLeastAnswer?: string;
    scoreGainA?: number;
    scoreGainB?: number;
  } | null;
};

export async function getClpRound4State(code: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_clp_round4_state", {
    p_code: code,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as ClpRound4State | null;
}

export async function submitClpRound4Prediction(
  code: string,
  playerToken: string,
  answerValue: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_clp_round4_prediction", {
    p_code: code,
    p_player_token: playerToken,
    p_answer_value: answerValue,
  });

  if (error) throw new Error(error.message);
  return data as ClpRound4State["lastEvent"];
}

export async function nextClpRound4Question(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("next_clp_round4_question", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return data as string | null;
}


export type ClpRound5DistributionItem = {
  id: string;
  display_name: string;
  avatar: string;
  team: "A" | "B";
  count: number;
  rank: number;
};

export type ClpRound5Prediction = {
  targetPlayerId: string | null;
  locked: boolean;
  playerId: string;
} | null;

export type ClpRound5State = {
  questionIndex: number;
  questionCount: number;
  questionKey: string;
  prompt: string;
  mode: "vote" | "predict" | "reveal";
  scoreA: number;
  scoreB: number;
  players: ClpRound1Player[];
  playerCount: number;
  votesSubmitted: number;
  viewerHasVoted: boolean;
  predictorA: ClpRound1Player | null;
  predictorB: ClpRound1Player | null;
  predictionA: ClpRound5Prediction;
  predictionB: ClpRound5Prediction;
  distribution: ClpRound5DistributionItem[];
  lastEvent: {
    type?: string;
    rankA?: number;
    rankB?: number;
    scoreGainA?: number;
    scoreGainB?: number;
    topTieCount?: number;
    allTied?: boolean;
  } | null;
};

export async function getClpRound5State(code: string, playerToken?: string | null) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_clp_round5_state", {
    p_code: code,
    p_player_token: playerToken ?? null,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as ClpRound5State | null;
}

export async function submitClpRound5Vote(
  code: string,
  playerToken: string,
  targetPlayerId: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_clp_round5_vote", {
    p_code: code,
    p_player_token: playerToken,
    p_target_player_id: targetPlayerId,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function submitClpRound5Prediction(
  code: string,
  playerToken: string,
  targetPlayerId: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_clp_round5_prediction", {
    p_code: code,
    p_player_token: playerToken,
    p_target_player_id: targetPlayerId,
  });

  if (error) throw new Error(error.message);
  return data as ClpRound5State["lastEvent"];
}

export async function nextClpRound5Question(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("next_clp_round5_question", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return data as string | null;
}


export type ClpRound6Prediction = {
  count: number | null;
  locked: boolean;
  playerId: string;
} | null;

export type ClpRound6State = {
  questionIndex: number;
  questionCount: number;
  questionKey: string;
  prompt: string;
  mode: "predict" | "reveal";
  scoreA: number;
  scoreB: number;
  playerCount: number;
  correctCount: number | null;
  predictorA: ClpRound1Player | null;
  predictorB: ClpRound1Player | null;
  predictionA: ClpRound6Prediction;
  predictionB: ClpRound6Prediction;
  lastEvent: {
    type?: string;
    correctCount?: number;
    differenceA?: number;
    differenceB?: number;
    scoreGainA?: number;
    scoreGainB?: number;
  } | null;
};

export async function getClpRound6State(code: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_clp_round6_state", {
    p_code: code,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as ClpRound6State | null;
}

export async function submitClpRound6Prediction(
  code: string,
  playerToken: string,
  predictedCount: number,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_clp_round6_prediction", {
    p_code: code,
    p_player_token: playerToken,
    p_predicted_count: predictedCount,
  });

  if (error) throw new Error(error.message);
  return data as ClpRound6State["lastEvent"];
}

export async function nextClpRound6Question(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("next_clp_round6_question", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return data as string | null;
}


export type ClpRound7Prediction = {
  answer: string | null;
  locked: boolean;
  playerId: string;
} | null;

export type ClpRound7State = {
  questionIndex: number;
  questionCount: number;
  questionKey: string;
  prompt: string;
  optionA: string;
  optionB: string;
  percentA: number | null;
  percentB: number | null;
  correctAnswer: string | null;
  mode: "predict" | "reveal";
  scoreA: number;
  scoreB: number;
  predictorA: ClpRound1Player | null;
  predictorB: ClpRound1Player | null;
  predictionA: ClpRound7Prediction;
  predictionB: ClpRound7Prediction;
  lastEvent: {
    type?: string;
    correctAnswer?: string;
    scoreGainA?: number;
    scoreGainB?: number;
  } | null;
};

export async function getClpRound7State(code: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_clp_round7_state", {
    p_code: code,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as ClpRound7State | null;
}

export async function submitClpRound7Prediction(
  code: string,
  playerToken: string,
  answerValue: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_clp_round7_prediction", {
    p_code: code,
    p_player_token: playerToken,
    p_answer_value: answerValue,
  });

  if (error) throw new Error(error.message);
  return data as ClpRound7State["lastEvent"];
}

export async function nextClpRound7Question(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("next_clp_round7_question", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return data as string | null;
}


export type ClpFinalBoardItem = {
  label: string;
  percent: number | null;
  rank: number | null;
};

export type ClpFinalPrediction = {
  answer: string | null;
  locked: boolean;
  playerId: string;
} | null;

export type ClpFinalTiebreak = {
  count: number | null;
  locked: boolean;
  playerId: string;
} | null;

export type ClpFinalState = {
  questionIndex: number;
  questionCount: number;
  questionKey: string;
  prompt: string;
  options: string[];
  board: ClpFinalBoardItem[];
  multiplier: 1 | 3;
  mode: "predict" | "reveal" | "tiebreak" | "finished";
  scoreA: number;
  scoreB: number;
  startScoreA: number;
  startScoreB: number;
  winner: "A" | "B" | null;
  predictorA: ClpRound1Player | null;
  predictorB: ClpRound1Player | null;
  predictionA: ClpFinalPrediction;
  predictionB: ClpFinalPrediction;
  tiebreakA: ClpFinalTiebreak;
  tiebreakB: ClpFinalTiebreak;
  tiebreakPrompt: string;
  tiebreakCorrectPercent: number | null;
  lastEvent: {
    type?: string;
    rankA?: number;
    rankB?: number;
    scoreGainA?: number;
    scoreGainB?: number;
    multiplier?: number;
    correctPercent?: number;
    differenceA?: number;
    differenceB?: number;
    winner?: "A" | "B";
  } | null;
};

export async function getClpFinalState(code: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_clp_final_state", {
    p_code: code,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as ClpFinalState | null;
}

export async function submitClpFinalPrediction(
  code: string,
  playerToken: string,
  answerValue: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_clp_final_prediction", {
    p_code: code,
    p_player_token: playerToken,
    p_answer_value: answerValue,
  });

  if (error) throw new Error(error.message);
  return data as ClpFinalState["lastEvent"];
}

export async function nextClpFinalQuestion(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("next_clp_final_question", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return data as string | null;
}

export async function submitClpFinalTiebreak(
  code: string,
  playerToken: string,
  predictedPercent: number,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_clp_final_tiebreak", {
    p_code: code,
    p_player_token: playerToken,
    p_predicted_percent: predictedPercent,
  });

  if (error) throw new Error(error.message);
  return data as ClpFinalState["lastEvent"];
}


export type PartyPlayGameSummary = {
  gameSlug: string;
  gamesCompleted: number;
  wins: number;
  totalScore: number;
  bestPlacement: number | null;
};

export type PartyPlayAccountSummary = {
  games_completed: number;
  wins: number;
  total_score: number;
  best_placement: number | null;
  last_played_at: string | null;
  games: PartyPlayGameSummary[];
};

export type PartyPlayAccountHistoryItem = {
  game_slug: string;
  display_name: string;
  avatar: string;
  team: "A" | "B" | null;
  final_score: number | null;
  placement: number | null;
  won: boolean;
  completed_at: string;
};

export async function getPartyPlayAccountSummary(partyPlayUserId: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_partyplay_account_summary", {
    p_partyplay_user_id: partyPlayUserId,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      games_completed: 0,
      wins: 0,
      total_score: 0,
      best_placement: null,
      last_played_at: null,
      games: [],
    } as PartyPlayAccountSummary;
  }

  return {
    ...row,
    games_completed: Number(row.games_completed ?? 0),
    wins: Number(row.wins ?? 0),
    total_score: Number(row.total_score ?? 0),
    best_placement:
      row.best_placement == null ? null : Number(row.best_placement),
    games: Array.isArray(row.games) ? row.games : [],
  } as PartyPlayAccountSummary;
}

export async function getPartyPlayAccountHistory(
  partyPlayUserId: string,
  limit = 20,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_partyplay_account_history", {
    p_partyplay_user_id: partyPlayUserId,
    p_limit: limit,
  });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    final_score: row.final_score == null ? null : Number(row.final_score),
    placement: row.placement == null ? null : Number(row.placement),
    won: Boolean(row.won),
  })) as PartyPlayAccountHistoryItem[];
}


export type MyPartyPlayPlatformStats = {
  summary: PartyPlayAccountSummary;
  history: PartyPlayAccountHistoryItem[];
  historyTotal: number;
  historyOffset: number;
  historyLimit: number;
  historyHasMore: boolean;
};

export async function getMyPartyPlayPlatformStats(
  accessToken: string,
  options?: {
    historyLimit?: number;
    historyOffset?: number;
    gameSlug?: string | null;
  },
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  const supabase = createClient(url, key, {
    global: {
      headers: {
        "x-partyplay-auth": accessToken,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.rpc("get_my_partyplay_platform_stats", {
    p_history_limit: Math.min(Math.max(options?.historyLimit ?? 10, 1), 200),
    p_history_offset: Math.max(options?.historyOffset ?? 0, 0),
    p_game_slug: options?.gameSlug?.trim() || null,
  });

  if (error) throw new Error(error.message);

  const payload = (data ?? {}) as {
    summary?: Record<string, unknown>;
    history?: Array<Record<string, unknown>>;
    historyTotal?: number | string;
    historyOffset?: number | string;
    historyLimit?: number | string;
    historyHasMore?: boolean;
  };

  const rawSummary = payload.summary ?? {};
  const rawGames = Array.isArray(rawSummary.games) ? rawSummary.games : [];

  const summary: PartyPlayAccountSummary = {
    games_completed: Number(rawSummary.games_completed ?? 0),
    wins: Number(rawSummary.wins ?? 0),
    total_score: Number(rawSummary.total_score ?? 0),
    best_placement:
      rawSummary.best_placement == null ? null : Number(rawSummary.best_placement),
    last_played_at:
      rawSummary.last_played_at == null ? null : String(rawSummary.last_played_at),
    games: rawGames.map((game) => {
      const item = game as Record<string, unknown>;
      return {
        gameSlug: String(item.gameSlug ?? ""),
        gamesCompleted: Number(item.gamesCompleted ?? 0),
        wins: Number(item.wins ?? 0),
        totalScore: Number(item.totalScore ?? 0),
        bestPlacement:
          item.bestPlacement == null ? null : Number(item.bestPlacement),
      };
    }),
  };

  const history: PartyPlayAccountHistoryItem[] = (
    Array.isArray(payload.history) ? payload.history : []
  ).map((row) => ({
    game_slug: String(row.game_slug ?? ""),
    display_name: String(row.display_name ?? ""),
    avatar: String(row.avatar ?? ""),
    team:
      row.team === "A" || row.team === "B"
        ? row.team
        : null,
    final_score:
      row.final_score == null ? null : Number(row.final_score),
    placement:
      row.placement == null ? null : Number(row.placement),
    won: Boolean(row.won),
    completed_at: String(row.completed_at ?? ""),
  }));

  return {
    summary,
    history,
    historyTotal: Number(payload.historyTotal ?? history.length),
    historyOffset: Number(payload.historyOffset ?? 0),
    historyLimit: Number(payload.historyLimit ?? history.length),
    historyHasMore: Boolean(payload.historyHasMore),
  } as MyPartyPlayPlatformStats;
}


export async function getZhState(code: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_zh_state", {
    p_code: code,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as ZhGameState | null;
}

export async function spinZh(code: string, playerToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("spin_zh", {
    p_code: code,
    p_player_token: playerToken,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function submitZhLetter(
  code: string,
  playerToken: string,
  letter: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_zh_letter", {
    p_code: code,
    p_player_token: playerToken,
    p_letter: letter,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function submitZhVowel(
  code: string,
  playerToken: string,
  letter: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_zh_vowel", {
    p_code: code,
    p_player_token: playerToken,
    p_letter: letter,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function submitZhSolve(
  code: string,
  playerToken: string,
  guess: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_zh_solve", {
    p_code: code,
    p_player_token: playerToken,
    p_guess: guess,
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function nextZhRound(code: string, hostToken: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("next_zh_round", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return data as "playing" | "game_over" | null;
}


export type PartyPlayRankingAggregate = {
  rankingKey: string;
  displayName: string;
  avatar: string;
  games: PartyPlayGameSummary[];
};

export async function getPartyPlayRankingAggregates(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  const supabase = createClient(url, key, {
    global: {
      headers: {
        "x-partyplay-auth": accessToken,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.rpc(
    "get_partyplay_ranking_aggregates",
  );

  if (error) throw new Error(error.message);

  return (Array.isArray(data) ? data : []).map(
    (row: Record<string, unknown>) => ({
      rankingKey: String(row.rankingKey ?? ""),
      displayName: String(row.displayName ?? "Gracz"),
      avatar: String(row.avatar ?? "avatar-01"),
      games: (Array.isArray(row.games) ? row.games : []).map(
        (game: Record<string, unknown>) => ({
          gameSlug: String(game.gameSlug ?? ""),
          gamesCompleted: Number(game.gamesCompleted ?? 0),
          wins: Number(game.wins ?? 0),
          totalScore: Number(game.totalScore ?? 0),
          bestPlacement:
            game.bestPlacement == null ? null : Number(game.bestPlacement),
        }),
      ),
    }),
  ) as PartyPlayRankingAggregate[];
}


export type AktaNocyAssignment = {
  player_id: string;
  display_name: string;
  avatar: string;
  role_key: string;
  dossier_opened: boolean;
};

export type AktaNocyHostProgress = {
  player_id: string;
  display_name: string;
  avatar: string;
  dossier_opened: boolean;
};

export async function getAktaNocyPlayerAssignment(
  code: string,
  playerToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_akta_nocy_player_assignment", {
    p_code: code,
    p_player_token: playerToken,
  });

  if (error) throw new Error(error.message);
  const assignment = Array.isArray(data) ? data[0] : data;
  return (assignment ?? null) as AktaNocyAssignment | null;
}

export async function getAktaNocyHostProgress(
  code: string,
  hostToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_akta_nocy_host_progress", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as AktaNocyHostProgress[];
}

export async function openAktaNocyDossier(
  code: string,
  playerToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("open_akta_nocy_dossier", {
    p_code: code,
    p_player_token: playerToken,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function advanceAktaNocyPhase(
  code: string,
  hostToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("advance_akta_nocy_phase", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as string | null;
}

export type AktaNocyHostInterrogationRow = {
  player_id: string;
  display_name: string;
  avatar: string;
  role_key: string;
};

export async function revealAktaNocyEvidenceA(
  code: string,
  hostToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("reveal_akta_nocy_evidence_a", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as string | null;
}

export async function getAktaNocyHostInterrogations(
  code: string,
  hostToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_akta_nocy_host_interrogations", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as AktaNocyHostInterrogationRow[];
}

export async function revealAktaNocyEvidenceB(
  code: string,
  hostToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("reveal_akta_nocy_evidence_b", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return (data ?? null) as string | null;
}

export type AktaNocyPublicCastRow = {
  player_id: string;
  display_name: string;
  avatar: string;
  role_key: string;
};

export type AktaNocyReconstructionPlayerState = {
  submitted: boolean;
  event_order: string[];
  suspect_player_id: string;
  motive_key: string;
  coverup_key: string;
};

export type AktaNocyReconstructionHostRow = {
  player_id: string;
  display_name: string;
  avatar: string;
  submitted: boolean;
  event_order: string[] | null;
  suspect_player_id: string | null;
  motive_key: string | null;
  coverup_key: string | null;
};

export async function getAktaNocyPublicCast(
  code: string,
  sessionToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_akta_nocy_public_cast", {
    p_code: code,
    p_session_token: sessionToken,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as AktaNocyPublicCastRow[];
}

export async function getAktaNocyReconstructionPlayer(
  code: string,
  playerToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_akta_nocy_reconstruction_player", {
    p_code: code,
    p_player_token: playerToken,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as AktaNocyReconstructionPlayerState | null;
}

export async function getAktaNocyReconstructionHost(
  code: string,
  hostToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_akta_nocy_reconstruction_host", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as AktaNocyReconstructionHostRow[];
}

export async function submitAktaNocyReconstruction(
  code: string,
  playerToken: string,
  eventOrder: string[],
  suspectPlayerId: string,
  motiveKey: string,
  coverupKey: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_akta_nocy_reconstruction", {
    p_code: code,
    p_player_token: playerToken,
    p_event_order: eventOrder,
    p_suspect_player_id: suspectPlayerId,
    p_motive_key: motiveKey,
    p_coverup_key: coverupKey,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}


export type AktaNocyAccusationPlayerState = {
  submitted: boolean;
  suspect_player_id: string;
  motive_key: string;
  evidence_id: string;
};

export type AktaNocyAccusationProgressRow = {
  player_id: string;
  display_name: string;
  avatar: string;
  submitted: boolean;
};

export type AktaNocyAccusationResultRow = {
  player_id: string;
  display_name: string;
  avatar: string;
  suspect_player_id: string;
  motive_key: string;
  evidence_id: string;
};

export async function submitAktaNocyAccusation(
  code: string,
  playerToken: string,
  suspectPlayerId: string,
  motiveKey: string,
  evidenceId: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("submit_akta_nocy_accusation", {
    p_code: code,
    p_player_token: playerToken,
    p_suspect_player_id: suspectPlayerId,
    p_motive_key: motiveKey,
    p_evidence_id: evidenceId,
  });

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function getAktaNocyAccusationPlayer(
  code: string,
  playerToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_akta_nocy_accusation_player", {
    p_code: code,
    p_player_token: playerToken,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as AktaNocyAccusationPlayerState | null;
}

export async function getAktaNocyAccusationProgress(
  code: string,
  hostToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_akta_nocy_accusation_progress", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as AktaNocyAccusationProgressRow[];
}

export async function getAktaNocyAccusationResults(
  code: string,
  hostToken: string,
) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("get_akta_nocy_accusation_results", {
    p_code: code,
    p_host_token: hostToken,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as AktaNocyAccusationResultRow[];
}
