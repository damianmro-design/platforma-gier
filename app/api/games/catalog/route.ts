import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PARTYPLAY_AUTH_KEY, PARTYPLAY_AUTH_URL } from "@/lib/partyplay-auth";

export const dynamic = "force-dynamic";

// Public data contains published card fields only. Drafts and staff data are not exposed.
export async function GET() {
  const client = createClient(PARTYPLAY_AUTH_URL, PARTYPLAY_AUTH_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.rpc("zagraj_catalog_public");
  if (error || !Array.isArray(data)) {
    return NextResponse.json({ error: "Katalog jest chwilowo niedostępny." }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
