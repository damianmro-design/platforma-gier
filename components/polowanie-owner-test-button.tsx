"use client";

import { useEffect, useState } from "react";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

const OWNER_EMAIL = "damian.mro@wp.pl";
const POLOWANIE_ORIGIN =
  process.env.NEXT_PUBLIC_POLOWANIE_URL ?? "https://polowanienamilionera.pl";

export default function PolowanieOwnerTestButton() {
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createPartyPlayAuthClient();
    void supabase.auth.getUser().then(({ data }) => {
      setAllowed(data.user?.email?.trim().toLowerCase() === OWNER_EMAIL);
    });
  }, []);

  if (!allowed) return null;

  async function openTest() {
    setBusy(true);
    setMessage("");

    const supabase = createPartyPlayAuthClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) {
      setMessage("Zaloguj się ponownie do zaGRAj.");
      setBusy(false);
      return;
    }

    const hash = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      next: "/?test=1",
    });

    window.open(
      `${POLOWANIE_ORIGIN.replace(/\/$/, "")}/auth/import#${hash.toString()}`,
      "zagraj-polowanie-owner-test",
    );

    setBusy(false);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/15 bg-amber-300/[.045] px-5 py-3 text-white sm:px-8">
      <div>
        <span className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">
          NARZĘDZIA WŁAŚCICIELA
        </span>
        <p className="mt-1 text-xs text-zinc-500">
          Test Polowania na Milionera z botami, dostępny tylko na Twoim koncie.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {message && <span className="max-w-xs text-[10px] font-bold text-amber-200">{message}</span>}
        <button
          type="button"
          disabled={busy}
          onClick={() => void openTest()}
          className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-2.5 text-xs font-black text-amber-100 transition hover:bg-amber-300/15 disabled:opacity-50"
        >
          {busy ? "Łączenie…" : "🧪 Test Polowania"}
        </button>
      </div>
    </div>
  );
}
