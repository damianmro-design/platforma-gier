export type PpPhase =
  | "briefing"
  | "mission"
  | "evidence"
  | "suspicion"
  | "suspicion_result"
  | "final_vote"
  | "result";

export type PpRole = "agent" | "saboteur";

export type PpPlayer = {
  id: string;
  displayName: string;
  avatar: string;
  submitted: boolean;
  voted: boolean;
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

export type PpResult = {
  saboteurId: string;
  saboteurName: string;
  caught: boolean;
  finalTargetPlayerId: string | null;
  finalVotes: PpVoteCount[];
};

export type PpGameState = {
  phase: PpPhase;
  missionIndex: number;
  missionCount: number;
  playerCount: number;
  submittedCount: number;
  votedCount: number;
  players: PpPlayer[];
  mission: PpMission | null;
  currentPlayer: PpCurrentPlayer | null;
  submissions: PpSubmission[];
  suspicion: PpVoteCount[];
  result: PpResult | null;
};
