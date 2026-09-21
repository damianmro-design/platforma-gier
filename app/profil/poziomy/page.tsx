"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";
import {
  fetchPartyPlayStats,
  type PartyPlayStatsResponse,
} from "@/lib/partyplay-profile-client";
import {
  PARTYPLAY_LEVELS,
  PARTYPLAY_XP_RULES,
} from "@/lib/partyplay-progress";

export default function PartyPlayLevelsPage() {
  const router = useRouter();
  const [data, setData] = useState<PartyPlayStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createPartyPlayAuthClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session || session.user.is_anonymous === true) {
        router.replace("/login?next=/profil/poziomy");
        return;
      }

      try {
        const next = await fetchPartyPlayStats(session.access_token, {
          limit: 1,
        });
        if (!cancelled) setData(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const currentXp = data?.progression.xp ?? 0;
  const currentLevel = data?.progression.level.level ?? 1;

  return (
    <main className="min-h-screen bg-[#050713] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,.18),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,.10),transparent_28%)]" />

      <section className="relative z-10 mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/profil"
            className="text-xs font-black text-zinc-500 transition hover:text-white"
          >
            ← Profil PartyPlay
          </Link>
          <span className="text-[9px] font-black uppercase tracking-[.2em] text-violet-300">
            PROGRES
          </span>
        </div>

        <header className="mt-8 rounded-[2rem] border border-white/10 bg-[#0a0d1c]/92 p-6 shadow-2xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.24em] text-violet-300">
            XP I POZIOMY
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-5xl">
            Jak rośnie profil?
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            XP jest wspólne dla całego PartyPlay. Nie porównujemy surowych punktów
            z różnych gier, bo każda ma inną skalę wyniku.
          </p>

          {!loading && data?.progression && (
            <div className="mt-6 rounded-3xl border border-violet-300/18 bg-violet-300/[.055] p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <small className="text-[8px] font-black uppercase tracking-[.16em] text-zinc-600">
                    TWÓJ POZIOM
                  </small>
                  <strong className="mt-1 block text-3xl font-black">
                    {data.progression.level.level}. {data.progression.level.title}
                  </strong>
                </div>
                <div className="text-right">
                  <strong className="block text-2xl font-black text-violet-100">
                    {data.progression.xp} XP
                  </strong>
                  <span className="text-[10px] text-zinc-600">
                    {data.progression.xpToNextLevel > 0
                      ? `${data.progression.xpToNextLevel} XP do następnego poziomu`
                      : "Maksymalny poziom"}
                  </span>
                </div>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/35">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400"
                  style={{ width: `${data.progression.levelProgress}%` }}
                />
              </div>
            </div>
          )}
        </header>

        <section className="mt-5 rounded-3xl border border-white/8 bg-white/[.025] p-5 sm:p-6">
          <span className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">
            ZA CO DOSTAJESZ XP
          </span>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
              <span className="text-2xl">🎮</span>
              <strong className="ml-3 text-xl font-black">
                +{PARTYPLAY_XP_RULES.gameCompleted} XP
              </strong>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Za każdą ukończoną grę przypisaną do stałego konta.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
              <span className="text-2xl">🏆</span>
              <strong className="ml-3 text-xl font-black">
                +{PARTYPLAY_XP_RULES.win} XP
              </strong>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Dodatkowo za zwycięstwo, niezależnie od skali punktów danej gry.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
              <span className="text-2xl">🌟</span>
              <strong className="ml-3 text-xl font-black">
                +{PARTYPLAY_XP_RULES.partyPlayBadge} XP
              </strong>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Za każdą zdobytą odznakę PartyPlay, również osiągnięcia przypisane
                do konkretnych gier.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
              <span className="text-2xl">💰</span>
              <strong className="ml-3 text-xl font-black">
                +{PARTYPLAY_XP_RULES.polowanieBadge} XP
              </strong>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Za każdą odznakę zdobytą w Polowaniu na Milionera.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-300/12 bg-cyan-300/[.035] p-4 text-xs leading-5 text-zinc-500">
            Wynik 3000 pkt w jednej grze i 1000 pkt w drugiej nie są porównywane.
            Dzięki temu żadna gra nie daje sztucznej przewagi tylko dlatego, że ma
            większe liczby na tablicy wyników.
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/8 bg-white/[.025] p-5 sm:p-6">
          <span className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">
            DRABINKA POZIOMÓW
          </span>
          <div className="mt-4 space-y-2">
            {PARTYPLAY_LEVELS.map((level, index) => {
              const next = PARTYPLAY_LEVELS[index + 1];
              const reached = currentXp >= level.minXp;
              const active = currentLevel === level.level;

              return (
                <div
                  key={level.level}
                  className={`flex items-center gap-4 rounded-2xl border p-4 ${
                    active
                      ? "border-violet-300/30 bg-violet-300/[.08]"
                      : reached
                        ? "border-emerald-300/12 bg-emerald-300/[.03]"
                        : "border-white/8 bg-black/15"
                  }`}
                >
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-black ${
                      active
                        ? "bg-violet-300 text-[#090b18]"
                        : reached
                          ? "bg-emerald-300/10 text-emerald-300"
                          : "bg-white/[.035] text-zinc-600"
                    }`}
                  >
                    {level.level}
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm font-black">
                      {level.title}
                    </strong>
                    <span className="mt-1 block text-[10px] text-zinc-600">
                      od {level.minXp} XP
                      {next ? ` · kolejny próg: ${next.minXp} XP` : " · najwyższy poziom"}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-[.12em] ${
                      active
                        ? "text-violet-200"
                        : reached
                          ? "text-emerald-300"
                          : "text-zinc-700"
                    }`}
                  >
                    {active ? "TERAZ" : reached ? "ZDOBYTY" : "ZABLOKOWANY"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
