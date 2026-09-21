"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState("");
  const next = searchParams.get("next")?.startsWith("/")
    ? searchParams.get("next")!
    : "/profil";

  useEffect(() => {
    const supabase = createPartyPlayAuthClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user && data.user.is_anonymous !== true) router.replace(next);
    });
  }, [router, next]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const supabase = createPartyPlayAuthClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError("Nie udało się zalogować. Sprawdź e-mail i hasło.");
      setBusy(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  async function googleLogin() {
    setGoogleBusy(true);
    setError("");

    const supabase = createPartyPlayAuthClient();
    const redirectTo = `${window.location.origin}/auth/finish?next=${encodeURIComponent(next)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });

    if (oauthError) {
      setError("Nie udało się rozpocząć logowania przez Google.");
      setGoogleBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050713] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,.22),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(236,72,153,.14),transparent_28%)]" />

      <section className="relative z-10 mx-auto max-w-md">
        <Link href="/" className="text-xs font-black text-zinc-500 transition hover:text-white">
          ← Wróć do PartyPlay
        </Link>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#0a0d1c]/92 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.24em] text-violet-300">
            KONTO PARTYPLAY
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-[-.06em]">Zaloguj się</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Użyj tego samego konta, którego używasz w Polowaniu na Milionera.
          </p>

          <button
            type="button"
            disabled={busy || googleBusy}
            onClick={() => void googleLogin()}
            className="mt-6 min-h-14 w-full rounded-2xl border border-white/12 bg-white/[.05] px-4 text-sm font-black transition hover:bg-white/[.08] disabled:opacity-50"
          >
            {googleBusy ? "Łączenie…" : "Zaloguj przez Google"}
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.18em] text-zinc-700">
            <span className="h-px flex-1 bg-white/8" />
            albo
            <span className="h-px flex-1 bg-white/8" />
          </div>

          <form onSubmit={login} className="space-y-3">
            <div>
              <label htmlFor="email" className="mb-2 block text-[9px] font-black uppercase tracking-[.16em] text-zinc-500">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold outline-none transition focus:border-violet-300/50"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-[9px] font-black uppercase tracking-[.16em] text-zinc-500">
                Hasło
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold outline-none transition focus:border-violet-300/50"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs font-bold text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy || googleBusy}
              className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-4 text-sm font-black shadow-[0_18px_50px_rgba(139,92,246,.22)] disabled:opacity-50"
            >
              {busy ? "Logowanie…" : "Zaloguj się"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-5 text-zinc-600">
            Nie masz jeszcze konta?{" "}
            <Link href="/rejestracja" className="font-black text-violet-300">
              Utwórz konto PartyPlay
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
