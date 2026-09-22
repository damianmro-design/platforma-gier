"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

export default function RegistrationPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function register(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!accepted) {
      setError("Zaakceptuj Regulamin i potwierdź zapoznanie się z Polityką prywatności.");
      return;
    }

    if (password.length < 8) {
      setError("Hasło powinno mieć co najmniej 8 znaków.");
      return;
    }

    if (password !== passwordConfirm) {
      setError("Hasła nie są takie same.");
      return;
    }

    setBusy(true);

    const supabase = createPartyPlayAuthClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/finish?next=%2Fprofil`,
      },
    });

    if (signUpError) {
      const message = signUpError.message.toLowerCase();
      setError(
        message.includes("already") || message.includes("registered")
          ? "Konto z tym adresem e-mail już istnieje. Zaloguj się."
          : "Nie udało się utworzyć konta. Spróbuj ponownie.",
      );
      setBusy(false);
      return;
    }

    if (data.session) {
      router.replace("/profil");
      router.refresh();
      return;
    }

    setSuccess(
      "Konto zostało utworzone. Sprawdź skrzynkę e-mail i potwierdź adres, a potem zaloguj się do PartyPlay.",
    );
    setPassword("");
    setPasswordConfirm("");
    setBusy(false);
  }

  return (
    <main className="min-h-screen bg-[#050713] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,.22),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,.14),transparent_28%)]" />

      <section className="relative z-10 mx-auto max-w-md">
        <Link href="/" className="text-xs font-black text-zinc-500 transition hover:text-white">
          ← Wróć do PartyPlay
        </Link>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#0a0d1c]/92 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.24em] text-violet-300">
            KONTO PARTYPLAY
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-[-.06em]">Utwórz konto</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            Jedno konto będzie działało w Polowaniu na Milionera i grach PartyPlay.
          </p>

          <form onSubmit={register} className="mt-6 space-y-3">
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
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold outline-none focus:border-violet-300/50"
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
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold outline-none focus:border-violet-300/50"
              />
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="mb-2 block text-[9px] font-black uppercase tracking-[.16em] text-zinc-500">
                Powtórz hasło
              </label>
              <input
                id="passwordConfirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-sm font-bold outline-none focus:border-violet-300/50"
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-3 text-xs leading-5 text-zinc-500">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-1"
              />
              <span>
                Akceptuję{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  className="font-black text-violet-300"
                >
                  Regulamin
                </Link>{" "}
                i potwierdzam zapoznanie się z{" "}
                <Link
                  href="/privacy"
                  target="_blank"
                  className="font-black text-violet-300"
                >
                  Polityką prywatności
                </Link>.
              </span>
            </label>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs font-bold text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs font-bold leading-5 text-emerald-200">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-4 text-sm font-black disabled:opacity-50"
            >
              {busy ? "Tworzenie konta…" : "Utwórz konto"}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-zinc-600">
            Masz już konto?{" "}
            <Link href="/login" className="font-black text-violet-300">
              Zaloguj się
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
