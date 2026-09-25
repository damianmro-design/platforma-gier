"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscribeToCatalogRefresh } from "@/lib/zagraj-catalog-refresh";

// Refresh only the informational page shell, never the running game room.
// The server-rendered CMS block reads published data with cache: "no-store".
export default function GamePageCatalogRefresh() {
  const router = useRouter();

  useEffect(() => {
    let lastRefreshAt = Date.now();
    return subscribeToCatalogRefresh((reason) => {
      const now = Date.now();
      if (reason !== "published" && now - lastRefreshAt < 1000) return;
      lastRefreshAt = now;
      router.refresh();
    });
  }, [router]);

  return null;
}
