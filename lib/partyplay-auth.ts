import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export const PARTYPLAY_AUTH_URL = "https://ggxfccvrswbnxfuavnht.supabase.co";
export const PARTYPLAY_AUTH_KEY = "sb_publishable_VYFJaikKR2Jnb9x8MghtOw_kZ0BuN3R";

let browserClient: SupabaseClient | null = null;

export function createPartyPlayAuthClient() {
  if (typeof window === "undefined") {
    return createClient(PARTYPLAY_AUTH_URL, PARTYPLAY_AUTH_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  if (!browserClient) {
    browserClient = createClient(PARTYPLAY_AUTH_URL, PARTYPLAY_AUTH_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "implicit",
      },
    });
  }

  return browserClient;
}

export async function getPartyPlayUserFromAccessToken(
  accessToken: string | null | undefined,
): Promise<User | null> {
  if (!accessToken) return null;

  const supabase = createClient(PARTYPLAY_AUTH_URL, PARTYPLAY_AUTH_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user || data.user.is_anonymous === true) return null;
  return data.user;
}
