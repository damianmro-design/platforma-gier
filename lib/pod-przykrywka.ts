export type PpPhase =
  | "briefing"
  | "mission"
  | "evidence"
  | "spotlight"
  | "suspicion"
  | "suspicion_result"
  | "checkpoint"
  | "interrogation"
  | "last_word"
  | "final_defense_intro"
  | "final_defense_one"
  | "final_defense_two"
  | "final_vote"
  | "final_locked"
  | "final_accused"
  | "result";

export type PpRole = "agent" | "saboteur";

export type PpPlayer = {
  id: string;
  displayName: string;
  avatar: string;
  submitted: boolean;
  voted: boolean;
  online: boolean;
  lastSeenAt: string;
  skipped: boolean;
};

export type PpMission = {
  category: string;
  title: string;
  briefing: string;
  prompt: string;
  placeholder: string;
  responseMode: "text" | "choice";
  options: string[];
  discussionPrompts: string[];
  modifier: "normal" | "anonymous" | "silent" | "hot_seat";
};

export type PpSubmission = {
  playerId: string;
  displayName: string;
  avatar: string;
  answer: string;
};

export type PpVoteCount = {
  player_id?: string;
  playerId?: string;
  display_name?: string;
  displayName?: string;
  avatar: string;
  votes: number;
};

export type PpCurrentPlayer = {
  id: string;
  displayName: string;
  avatar: string;
  role: PpRole;
  answer: string | null;
  voteTargetId: string | null;
};

export type PpTwist = {
  interrogationPlayerId: string | null;
  interrogationPlayerName: string | null;
  interrogationPlayerAvatar: string | null;
  interrogationQuestion: string | null;
  isCurrentPlayerTarget: boolean;
  spotlightPlayerId: string | null;
  spotlightPlayerName: string | null;
  spotlightPlayerAvatar: string | null;
  spotlightQuestion: string | null;
  isCurrentPlayerSpotlight: boolean;
  secretOrder: string | null;
  finalDefenderOneId: string | null;
  finalDefenderOneName: string | null;
  finalDefenderOneAvatar: string | null;
  finalDefenderTwoId: string | null;
  finalDefenderTwoName: string | null;
  finalDefenderTwoAvatar: string | null;
  activeFinalDefenderId: string | null;
  isCurrentPlayerFinalDefender: boolean;
  finalTie: boolean;
  finalAccusedPlayerId: string | null;
  finalAccusedPlayerName: string | null;
  finalAccusedPlayerAvatar: string | null;
};

export type PpResult = {
  saboteurId: string;
  saboteurName: string;
  caught: boolean;
  finalTargetPlayerId: string | null;
  finalVotes: PpVoteCount[];
  secretOrder: string | null;
};

export type PpGameState = {
  phase: PpPhase;
  phaseStartedAt: string;
  phaseTimeBonusSeconds: number;
  missionIndex: number;
  missionCount: number;
  playerCount: number;
  submittedCount: number;
  votedCount: number;
  skippedCount: number;
  players: PpPlayer[];
  mission: PpMission | null;
  currentPlayer: PpCurrentPlayer | null;
  submissions: PpSubmission[];
  suspicion: PpVoteCount[];
  cumulativeSuspicion: PpVoteCount[];
  twist: PpTwist;
  result: PpResult | null;
};
