"use client";

import { useEffect, useState } from "react";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";
import type { PlatformGameSlug } from "@/lib/game-config";

const TEST_OWNER_EMAIL = "damian.mro@wp.pl";

export default function TestGameButton({
  gameSlug,
  className = "",
}: {
  gameSlug: PlatformGameSlug;
  className?: string;
}) {
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createPartyPlayAuthClient();

    void supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const email = data.user?.email?.trim().toLowerCase() ?? "";
      setAllowed(Boolean(data.user && data.user.is_anonymous !== true && email === TEST_OWNER_EMAIL));
    });

    return () => {
      active = false;
    };
  }, []);

  if (!allowed) return null;

  async function startTest() {
    setBusy(true);
    setError("");

    try {
      const supabase = createPartyPlayAuthClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setError("Sesja wygasła. Zaloguj się ponownie.");
        return;
      }

      const response = await fetch("/api/test-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gameSlug }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Nie udało się uruchomić testu.");
        return;
      }

      window.location.assign(String(result.url));
    } catch {
      setError("Nie udało się uruchomić gry testowej.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void startTest()}
        disabled={busy}
        className="w-full rounded-2xl border border-cyan-300/25 bg-cyan-300/[.07] px-5 py-3.5 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/[.12] disabled:opacity-50"
      >
        {busy ? "TWORZĘ TEST…" : "🧪 URUCHOM GRĘ TESTOWĄ"}
      </button>
      <p className="mt-2 text-center text-[9px] font-bold uppercase tracking-[.12em] text-cyan-300/55">
        tylko Damian · boty zastąpią pozostałych graczy
      </p>
      {error && (
        <p className="mt-2 rounded-xl border border-red-400/20 bg-red-400/10 p-2 text-center text-[10px] font-bold text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
