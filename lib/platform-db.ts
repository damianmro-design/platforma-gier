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

export type PlatformRoom = {
  id: string;
  code: string;
  game_slug: string;
  status: "lobby" | "active" | "finished";
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
