"use client";

import { useEffect, useState } from "react";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

const TESTER_EMAIL = "damian.mro@wp.pl";

export default function TestGameButton({
  gameSlug,
  className = "",
}: {
  gameSlug: string;
  className?: string;
}) {
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const supabase = createPartyPlayAuthClient();

    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setAllowed(data.user?.email?.toLowerCase() === TESTER_EMAIL);
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!allowed) return null;

  async function createTestGame() {
    setBusy(true);
    setError("");

    try {
      const supabase = createPartyPlayAuthClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setError("Zaloguj się ponownie.");
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

      window.location.assign(`/pokoj/${result.code}`);
    } catch {
      setError("Nie udało się połączyć z trybem testowym.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void createTestGame()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-300/[.07] px-6 py-4 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/[.12] disabled:opacity-50 sm:w-auto"
      >
        🧪 {busy ? "Tworzę test…" : "Uruchom grę testową"}
      </button>
      {error && <p className="mt-2 text-xs font-bold text-red-300">{error}</p>}
    </div>
  );
}
