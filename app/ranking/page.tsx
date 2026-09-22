"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";
import { PartyPlayAvatar } from "@/components/partyplay-avatar";

type RankingEntry = {
  rankPosition: number;
  displayName: string;
  avatar: string;
  xp: number;
  level: number;
  levelTitle: string;
  gamesCompleted: number;
  wins: number;
  distinctGamesPlayed: number;
  badges: number;
  isCurrentUser: boolean;
};

type RankingResponse = {
  entries: RankingEntry[];
  currentOutsideTop: RankingEntry | null;
  totalRanked: number;
  tieBreakers: string[];
};


function medal(position: number) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return null;
}

export default function ZagrajRankingPage() {
  const router = useRouter();
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createPartyPlayAuthClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session || session.user.is_anonymous === true) {
        router.replace("/login?next=/ranking");
        return;
      }

      try {
        const response = await fetch("/api/account/ranking", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) throw new Error("ranking");

        const ranking = (await response.json()) as RankingResponse;
        if (!cancelled) setData(ranking);
      } catch {
        if (!cancelled) setError("Nie udało się pobrać rankingu zaGRAj.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const topThree = useMemo(
    () => (data?.entries ?? []).filter((entry) => entry.rankPosition <= 3),
    [data],
  );

  const rest = useMemo(
    () => (data?.entries ?? []).filter((entry) => entry.rankPosition > 3),
    [data],
  );

  return (
    <main className="min-h-screen bg-[#050713] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,.20),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(245,158,11,.10),transparent_28%)]" />

      <section className="relative z-10 mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="text-xs font-black text-zinc-500 transition hover:text-white">
            ← zaGRAj
          </Link>
          <Link
            href="/profil"
            className="rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-[10px] font-black text-zinc-300 transition hover:text-white"
          >
            Mój profil
          </Link>
        </div>

        <header className="mt-8 rounded-[2rem] border border-white/10 bg-[#0a0d1c]/92 p-6 shadow-2xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.24em] text-amber-300">
            GLOBALNY RANKING
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-6xl">
            zaGRAj
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            Ranking obejmuje wszystkie podłączone gry i korzysta ze wspólnego XP.
            Punkty z konkretnych gier nie są porównywane bezpośrednio między tytułami.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[.13em] text-zinc-500">
            <span className="rounded-full border border-white/8 bg-white/[.025] px-3 py-2">
              {data?.totalRanked ?? 0} sklasyfikowanych
            </span>
            <span className="rounded-full border border-white/8 bg-white/[.025] px-3 py-2">
              Remis: XP → wygrane → różne gry → ukończone gry
            </span>
          </div>
        </header>

        {loading ? (
          <div className="mt-6 rounded-3xl border border-white/8 bg-white/[.025] p-6 text-sm font-black text-violet-200">
            Ładujemy ranking…
          </div>
        ) : error ? (
          <div className="mt-6 rounded-3xl border border-red-400/20 bg-red-400/10 p-6 text-sm font-black text-red-200">
            {error}
          </div>
        ) : !data?.entries.length ? (
          <div className="mt-6 rounded-3xl border border-white/8 bg-white/[.025] p-6 text-sm leading-6 text-zinc-500">
            Ranking pojawi się po zakończeniu pierwszych gier na zalogowanych kontach.
          </div>
        ) : (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-3">
              {topThree.map((entry) => (
                <article
                  key={entry.rankPosition}
                  className={`relative overflow-hidden rounded-[1.8rem] border p-5 ${
                    entry.isCurrentUser
                      ? "border-violet-300/35 bg-violet-300/[.08]"
                      : "border-amber-300/15 bg-amber-300/[.035]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-4xl">{medal(entry.rankPosition)}</span>
                    {entry.isCurrentUser && (
                      <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] text-violet-200">
                        TY
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/8 bg-black/20 text-3xl">
                      <PartyPlayAvatar id={entry.avatar} size={52} />
                    </div>
                    <div className="min-w-0">
                      <strong className="block truncate text-lg font-black">
                        {entry.displayName}
                      </strong>
                      <span className="text-[10px] font-black text-zinc-500">
                        Poziom {entry.level} · {entry.levelTitle}
                      </span>
                    </div>
                  </div>

                  <strong className="mt-5 block text-3xl font-black tracking-[-.04em] text-amber-200">
                    {entry.xp} XP
                  </strong>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-white/8 bg-black/15 p-2 text-center">
                      <small className="block text-[7px] font-black text-zinc-600">GRY</small>
                      <strong className="text-sm font-black">{entry.gamesCompleted}</strong>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/15 p-2 text-center">
                      <small className="block text-[7px] font-black text-zinc-600">WYGRANE</small>
                      <strong className="text-sm font-black">{entry.wins}</strong>
                    </div>
                    <div className="rounded-xl border border-white/8 bg-black/15 p-2 text-center">
                      <small className="block text-[7px] font-black text-zinc-600">ODZNAKI</small>
                      <strong className="text-sm font-black">{entry.badges}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            {rest.length > 0 && (
              <section className="mt-5 overflow-hidden rounded-3xl border border-white/8 bg-white/[.025]">
                <div className="border-b border-white/8 p-5">
                  <span className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">
                    MIEJSCA 4–50
                  </span>
                </div>

                <div>
                  {rest.map((entry) => (
                  <div
                    key={entry.rankPosition}
                    className={`grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-white/[.055] px-4 py-4 last:border-b-0 sm:grid-cols-[52px_1fr_90px_90px_110px] ${
                      entry.isCurrentUser ? "bg-violet-300/[.07]" : ""
                    }`}
                  >
                    <strong
                      className={`text-center text-lg font-black ${
                        entry.isCurrentUser ? "text-violet-200" : "text-zinc-500"
                      }`}
                    >
                      {entry.rankPosition}
                    </strong>

                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-black/15 text-xl">
                        <PartyPlayAvatar id={entry.avatar} size={52} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="truncate text-sm font-black">
                            {entry.displayName}
                          </strong>
                          {entry.isCurrentUser && (
                            <span className="text-[8px] font-black uppercase tracking-[.12em] text-violet-300">
                              TY
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-zinc-600">
                          Poziom {entry.level} · {entry.levelTitle}
                        </span>
                      </div>
                    </div>

                    <strong className="text-right text-sm font-black text-violet-100 sm:text-center">
                      {entry.xp} XP
                    </strong>

                    <div className="hidden text-center sm:block">
                      <small className="block text-[7px] font-black text-zinc-700">WYGRANE</small>
                      <strong className="text-xs font-black text-zinc-400">{entry.wins}</strong>
                    </div>

                    <div className="hidden text-center sm:block">
                      <small className="block text-[7px] font-black text-zinc-700">RÓŻNE GRY</small>
                      <strong className="text-xs font-black text-zinc-400">
                        {entry.distinctGamesPlayed}
                      </strong>
                    </div>
                  </div>
                  ))}
                </div>
              </section>
            )}

            {data.currentOutsideTop && (
              <section className="mt-5 rounded-3xl border border-violet-300/25 bg-violet-300/[.07] p-5">
                <span className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">
                  TWOJA POZYCJA
                </span>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <strong className="text-3xl font-black">
                    #{data.currentOutsideTop.rankPosition}
                  </strong>
                  <span className="text-3xl">
                    <PartyPlayAvatar id={data.currentOutsideTop.avatar} size={48} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-lg font-black">
                      {data.currentOutsideTop.displayName}
                    </strong>
                    <span className="text-xs text-zinc-500">
                      {data.currentOutsideTop.xp} XP · {data.currentOutsideTop.wins} zwycięstw
                    </span>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        <section className="mt-5 rounded-3xl border border-cyan-300/10 bg-cyan-300/[.025] p-5 text-xs leading-5 text-zinc-500">
          Ranking zaGRAj jest osobny od rankingu Łowców w Polowaniu na Milionera.
          Ranking Polowania nadal działa według Punktów Łowcy i jego własnych zasad.
        </section>
      </section>
    </main>
  );
}
