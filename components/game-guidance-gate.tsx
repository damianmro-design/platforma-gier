"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import LiveGameGuidance from "@/components/live-game-guidance";

type RoomMetadata = {
  room?: {
    gameSlug?: string;
    aktaCase?: "apartament-214" | "ostatni-kurs" | null;
  };
};

export default function GameGuidanceGate() {
  const pathname = usePathname();
  const route = useMemo(() => {
    const match = pathname.match(/^\/gra\/([^/]+)\/([A-Z0-9]{4,6})\/?$/i);
    if (!match) return null;
    return { slug: match[1], code: match[2].toUpperCase() };
  }, [pathname]);

  const [allowGuidance, setAllowGuidance] = useState<boolean | null>(null);

  useEffect(() => {
    if (!route) {
      setAllowGuidance(false);
      return;
    }

    if (route.slug !== "akta-nocy") {
      setAllowGuidance(true);
      return;
    }

    let cancelled = false;
    setAllowGuidance(null);

    void (async () => {
      try {
        const response = await fetch(`/api/pokoj/${route.code}`, { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) setAllowGuidance(false);
          return;
        }
        const data = (await response.json()) as RoomMetadata;
        if (!cancelled) {
          setAllowGuidance(data.room?.aktaCase !== "ostatni-kurs");
        }
      } catch {
        if (!cancelled) setAllowGuidance(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [route]);

  return allowGuidance ? <LiveGameGuidance /> : null;
}
