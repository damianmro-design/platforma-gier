import "server-only";

import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { PARTYPLAY_AUTH_KEY, PARTYPLAY_AUTH_URL } from "@/lib/partyplay-auth";
import type { CatalogGame } from "@/lib/zagraj-catalog-defaults";

// React request-local cache shares a fresh published RPC call across the hero
// and optional CMS sections. It is not a persistent content cache.
const getPublishedCatalog = cache(async (): Promise<CatalogGame[]> => {
  const client = createClient(PARTYPLAY_AUTH_URL, PARTYPLAY_AUTH_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  const { data, error } = await client.rpc("zagraj_catalog_public");
  if (error || !Array.isArray(data)) return [];
  return data as CatalogGame[];
});

export async function getPublishedGameCard(slug: string): Promise<CatalogGame | null> {
  try {
    const games = await getPublishedCatalog();
    return games.find((game) => game.slug === slug) ?? null;
  } catch {
    return null;
  }
}
