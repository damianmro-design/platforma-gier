import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://glcjetxskjnlbeegirln.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Zv_I8mghmQSYPzdit-lzvA_TrUcdkZ8";

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  return { url, key };
}

function getClient() {
  const { url, key } = getConfig();

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

export async function createPlatformRoom(gameSlug: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("create_platform_room", {
    p_game_slug: gameSlug,
  });

  if (error) {
    throw new Error(error.message);
  }

  const room = Array.isArray(data) ? data[0] : data;

  if (!room?.code) {
    throw new Error("Nie udało się utworzyć pokoju.");
  }

  return room as PlatformRoom;
}

export async function lookupPlatformRoom(code: string) {
  const supabase = getClient();
  const { data, error } = await supabase.rpc("lookup_platform_room", {
    p_code: code,
  });

  if (error) {
    throw new Error(error.message);
  }

  const room = Array.isArray(data) ? data[0] : data;
  return (room ?? null) as PlatformRoom | null;
}
