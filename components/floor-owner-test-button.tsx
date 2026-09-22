"use client";

import { useEffect, useRef, useState } from "react";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

const OWNER_EMAIL = "damian.mro@wp.pl";
const FLOOR_ORIGIN = "https://floor-party.vercel.app";

export default function FloorOwnerTestButton() {
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const popupRef = useRef<Window | null>(null);
  const tokenRef = useRef("");

  useEffect(() => {
    const supabase = createPartyPlayAuthClient();
    void supabase.auth.getUser().then(({ data }) => {
      setAllowed(data.user?.email?.trim().toLowerCase() === OWNER_EMAIL);
    });

    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== FLOOR_ORIGIN ||
        event.data?.type !== "FLOOR_TEST_READY" ||
        !popupRef.current ||
        !tokenRef.current
      ) {
        return;
      }

      popupRef.current.postMessage(
        {
          type: "ZAGRAJ_OWNER_TEST",
          accessToken: tokenRef.current,
        },
        FLOOR_ORIGIN,
      );
      setMessage("Tryb testowy Floor Party został odblokowany.");
      setBusy(false);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!allowed) return null;

  async function openFloorTest() {
    setBusy(true);
    setMessage("");

    const supabase = createPartyPlayAuthClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setMessage("Zaloguj się ponownie do zaGRAj.");
      setBusy(false);
      return;
    }

    tokenRef.current = token;
    const popup = window.open(
      FLOOR_ORIGIN + "/?ownerTest=1",
      "zagraj-floor-owner-test",
    );

    if (!popup) {
      setMessage("Przeglądarka zablokowała nowe okno. Zezwól na wyskakujące okna.");
      setBusy(false);
      return;
    }

    popupRef.current = popup;
  }

  return (
    <div className="mx-auto mt-4 flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-300/[.045] px-5 py-3 text-white sm:px-8">
      <div>
        <span className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">
          NARZĘDZIA WŁAŚCICIELA
        </span>
        <p className="mt-1 text-xs text-zinc-500">
          Test Floor Party bez innych uczestników, dostępny tylko na Twoim koncie.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {message && <span className="max-w-xs text-[10px] font-bold text-cyan-200">{message}</span>}
        <button
          type="button"
          disabled={busy}
          onClick={() => void openFloorTest()}
          className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2.5 text-xs font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:opacity-50"
        >
          {busy ? "Łączenie…" : "🧪 Test Floor Party"}
        </button>
      </div>
    </div>
  );
}
