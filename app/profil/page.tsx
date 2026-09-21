"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

const AVATARS = [
  ["lion", "🦁"],
  ["fox", "🦊"],
  ["panda", "🐼"],
  ["tiger", "🐯"],
  ["koala", "🐨"],
  ["owl", "🦉"],
  ["frog", "🐸"],
  ["penguin", "🐧"],
  ["bear", "🐻"],
  ["rabbit", "🐰"],
  ["monkey", "🐵"],
  ["cat", "🐱"],
] as const;

type Profile = {
  display_name: string | null;
  avatar: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("lion");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const avatarEmoji = useMemo(
    () => AVATARS.find(([id]) => id === avatar)?.[1] ?? "🎮",
    [avatar],
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const supabase = createPartyPlayAuthClient();
      const { data: userData } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!userData.user || userData.user.is_anonymous === true) {
        router.replace("/login?next=/profil");
        return;
      }

      setEmail(userData.user.email ?? "");

      const { data, error: profileError } = await supabase.rpc(
        "get_my_partyplay_profile",
      );

      if (!mounted) return;

      if (profileError) {
        setError("Nie udało się pobrać profilu PartyPlay.");
        setLoading(false);
        return;
      }

      const row = (Array.isArray(data) ? data[0] : data) as Profile | undefined;
      setDisplayName(
        row?.display_name?.trim() ||
          String(userData.user.user_metadata?.full_name ?? "").trim() ||
          userData.user.email?.split("@")[0] ||
          "Gracz",
      );
      setAvatar(row?.avatar || "lion");
      setLoading(false);
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const clean = displayName.trim();

    if (!clean) {
      setError("Wpisz nazwę gracza.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const supabase = createPartyPlayAuthClient();
    const { error: saveError } = await supabase.rpc("save_my_partyplay_profile", {
      p_display_name: clean,
      p_avatar: avatar,
    });

    if (saveError) {
      setError("Nie udało się zapisać profilu.");
      setSaving(false);
      return;
    }

    setMessage("Profil PartyPlay został zapisany.");
    setSaving(false);
  }

  async function logout() {
    const supabase = createPartyPlayAuthClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050713] text-white">
        <p className="text-sm font-black text-violet-200">Ładujemy profil PartyPlay…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050713] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,.22),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,.13),transparent_28%)]" />

      <section className="relative z-10 mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-xs font-black text-zinc-500 transition hover:text-white">
            ← PartyPlay
          </Link>
          <button onClick={() => void logout()} className="rounded-xl border border-white/10 bg-white/[.035] px-4 py-2.5 text-xs font-black text-zinc-400">
            Wyloguj
          </button>
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#0a0d1c]/92 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-[1.7rem] border border-violet-300/20 bg-violet-400/10 text-5xl">
              {avatarEmoji}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-[.24em] text-violet-300">
                KONTO PARTYPLAY
              </span>
              <h1 className="mt-2 text-4xl font-black tracking-[-.055em]">
                {displayName || "Twój profil"}
              </h1>
              <p className="mt-2 text-sm text-zinc-500">{email}</p>
            </div>
          </div>

          <form onSubmit={save} className="mt-8">
            <label htmlFor="displayName" className="text-[9px] font-black uppercase tracking-[.16em] text-zinc-500">
              Nazwa gracza
            </label>
            <input
              id="displayName"
              value={displayName}
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base font-bold outline-none focus:border-violet-300/50"
            />

            <p className="mt-6 text-[9px] font-black uppercase tracking-[.16em] text-zinc-500">
              Avatar
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {AVATARS.map(([id, emoji]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatar(id)}
                  className={`grid min-h-16 place-items-center rounded-2xl border text-2xl transition ${
                    avatar === id
                      ? "border-violet-300/55 bg-violet-400/15"
                      : "border-white/8 bg-white/[.025] hover:bg-white/[.05]"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs font-bold text-red-200">{error}</div>}
            {message && <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs font-bold text-emerald-200">{message}</div>}

            <button
              type="submit"
              disabled={saving}
              className="mt-6 min-h-14 w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-5 text-sm font-black disabled:opacity-50"
            >
              {saving ? "Zapisywanie…" : "Zapisz profil"}
            </button>
          </form>
        </div>

        <div className="mt-5 rounded-3xl border border-white/8 bg-white/[.025] p-5">
          <span className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">
            WSPÓLNE KONTO
          </span>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            To samo konto będzie używane w Polowaniu na Milionera, Co ludzie powiedzą,
            Zakręconym Haśle i kolejnych grach PartyPlay. Statystyki między grami dołączymy
            w następnym etapie.
          </p>
        </div>
      </section>
    </main>
  );
}
