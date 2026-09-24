import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  createPlatformRoom as createPublicPlatformRoom,
  type CreatedPlatformRoom,
} from "@/lib/platform-db";

/**
 * Two-phase rollout: keep the existing public RPC until the secret and
 * database grants have BOTH been configured and verified.
 *
 * Never expose SUPABASE_ROOM_CREATE_SECRET_KEY as NEXT_PUBLIC_, in a response,
 * a client component or a log. It must remain a Vercel server environment value.
 */
export async function createPlatformRoomServer(gameSlug: string): Promise<CreatedPlatformRoom> {
  const mode = process.env.ZAGRAJ_ROOM_CREATION_MODE ?? "public";

  if (mode === "public") {
    return createPublicPlatformRoom(gameSlug);
  }

  if (mode !== "server-only") {
    throw new Error("Unknown room creation security mode.");
  }

  const key = process.env.SUPABASE_ROOM_CREATE_SECRET_KEY;
  if (!key || key.startsWith("sb_publishable_") || key.length < 30) {
    throw new Error("Secure room creation is not configured.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "https://glcjetxskjnlbeegirln.supabase.co";
  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await client.rpc("create_platform_room", {
    p_game_slug: gameSlug,
  });

  if (error) throw new Error("Could not create a room.");
  const room = Array.isArray(data) ? data[0] : data;
  if (!room?.code || !room?.host_token) {
    throw new Error("Nie udało się utworzyć pokoju.");
  }
  return room as CreatedPlatformRoom;
}
