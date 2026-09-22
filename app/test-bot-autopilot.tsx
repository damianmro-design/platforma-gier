"use client";

import { useEffect } from "react";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

export function useTestBotAutopilot(enabled: boolean, code: string) {
  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let busy = false;
    const supabase = createPartyPlayAuthClient();

    const tick = async () => {
      if (stopped || busy) return;
      busy = true;

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;

        await fetch(`/api/test-room/${code}/tick`, {
          method: "POST",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Test autopilot is best-effort. Normal games never enable it.
      } finally {
        busy = false;
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 1200);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [enabled, code]);
}

export default function TestBotAutopilot({ code }: { code: string }) {
  useTestBotAutopilot(true, code);
  return null;
}
