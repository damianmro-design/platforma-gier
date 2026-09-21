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


export type PolowanieCareerSummary = {
  display_name: string;
  games_completed: number;
  wins: number;
  hunter_points: number;
  correct_millionaire_votes: number;
  finals_reached: number;
  badges_count: number;
};

function createPartyPlayAuthorizedClient(accessToken: string) {
  return createClient(PARTYPLAY_AUTH_URL, PARTYPLAY_AUTH_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function getPolowanieCareerFromAccessToken(
  accessToken: string,
): Promise<PolowanieCareerSummary | null> {
  const supabase = createPartyPlayAuthorizedClient(accessToken);
  const { data, error } = await supabase.rpc("get_my_career_summary");

  if (error) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    display_name: String(row.display_name ?? ""),
    games_completed: Number(row.games_completed ?? 0),
    wins: Number(row.wins ?? 0),
    hunter_points: Number(row.hunter_points ?? 0),
    correct_millionaire_votes: Number(row.correct_millionaire_votes ?? 0),
    finals_reached: Number(row.finals_reached ?? 0),
    badges_count: Number(row.badges_count ?? 0),
  };
}

export async function getPolowanieBadgesFromAccessToken(accessToken: string) {
  const supabase = createPartyPlayAuthorizedClient(accessToken);
  const { data, error } = await supabase.rpc("get_my_badges");

  if (error) return [];
  return (data ?? []).map((row: Record<string, unknown>) => ({
    badgeCode: String(row.badge_code ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    icon: String(row.icon ?? "🏅"),
    earned: Boolean(row.earned),
    earnedAt: row.earned_at ? String(row.earned_at) : null,
    progressCurrent: Number(row.progress_current ?? 0),
    progressTarget: Number(row.progress_target ?? 1),
  }));
}
