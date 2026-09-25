import { createClient } from "@supabase/supabase-js";
import { getPartyPlayUserFromAccessToken, PARTYPLAY_AUTH_KEY, PARTYPLAY_AUTH_URL } from "@/lib/partyplay-auth";

export type AdminAccess = {
  authorized: boolean;
  userId?: string;
  role?: string;
  permissions?: string[];
  gameSlugs?: string[];
};

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
}

export async function getAdminContext(request: Request) {
  const token = getBearerToken(request);
  if (!token) return null;
  const user = await getPartyPlayUserFromAccessToken(token);
  if (!user) return null;
  const client = createClient(PARTYPLAY_AUTH_URL, PARTYPLAY_AUTH_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.rpc("zagraj_admin_my_access");
  if (error || !data?.authorized || data.userId !== user.id) return null;
  return { user, client, access: data as AdminAccess };
}
