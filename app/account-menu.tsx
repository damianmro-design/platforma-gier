"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

export default function AccountMenu() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createPartyPlayAuthClient();
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setSignedIn(Boolean(data.user && data.user.is_anonymous !== true));
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSignedIn(Boolean(session?.user && session.user.is_anonymous !== true));
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <span className="rounded-xl border border-white/10 bg-white/[.035] px-4 py-2.5 text-xs font-black text-zinc-600">
        Konto…
      </span>
    );
  }

  if (signedIn) {
    return (
      <Link
        href="/profil"
        className="rounded-xl border border-violet-300/25 bg-violet-400/10 px-4 py-2.5 text-xs font-black text-violet-100 transition hover:bg-violet-400/15"
      >
        Mój profil
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-xl border border-white/12 bg-white/[.04] px-4 py-2.5 text-xs font-black text-zinc-200 transition hover:bg-white/[.08]"
    >
      Zaloguj się
    </Link>
  );
}
