"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";
import { PartyPlayAvatar } from "@/components/partyplay-avatar";
import {
  fetchPartyPlayStats,
  type PartyPlayStatsResponse,
} from "@/lib/partyplay-profile-client";
import {
  PARTYPLAY_GAMES,
  getPartyPlayGameMeta,
} from "@/lib/partyplay-games";

const PAGE_SIZE = 12;


function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function PartyPlayHistoryPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [data, setData] = useState<PartyPlayStatsResponse | null>(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSession = async () => {
      const supabase = createPartyPlayAuthClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session || session.user.is_anonymous === true) {
        router.replace("/login?next=/profil/historia");
        return;
      }

      setToken(session.access_token);
    };

    void loadSession();
  }, [router]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const next = await fetchPartyPlayStats(token, {
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          game: filter === "all" ? null : filter,
        });

        if (!cancelled) setData(next);
      } catch {
        if (!cancelled) setError("Nie udało się pobrać historii rozgrywek.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, page, filter]);

  const filters = useMemo(
    () => [
      { slug: "all", label: "Wszystkie", icon: "🎮" },
      ...PARTYPLAY_GAMES.filter((game) => game.connectedToProgress).map(
        (game) => ({
          slug: game.slug,
          label: game.shortLabel,
          icon: game.icon,
        }),
      ),
    ],
    [],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(Number(data?.historyTotal ?? 0) / PAGE_SIZE),
  );

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
            HISTORIA
          </span>
        </div>

        <header className="mt-8 rounded-[2rem] border border-white/10 bg-[#0a0d1c]/92 p-6 shadow-2xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.24em] text-violet-300">
            TWOJE ROZGRYWKI
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-5xl">
            Historia PartyPlay
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            W jednym miejscu widzisz zakończone gry z PartyPlay oraz rankingowe
            rozgrywki Polowania na Milionera przypisane do tego samego konta.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => {
                  setFilter(item.slug);
                  setPage(0);
                }}
                className={`rounded-full border px-3 py-2 text-[10px] font-black transition ${
                  filter === item.slug
                    ? "border-violet-300/35 bg-violet-300/10 text-violet-100"
                    : "border-white/8 bg-white/[.025] text-zinc-500 hover:text-white"
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>
        </header>

        <section className="mt-5 rounded-3xl border border-white/8 bg-white/[.025] p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">
                WYNIKI
              </span>
              <h2 className="mt-1 text-xl font-black">
                {data?.historyTotal ?? 0} rozgrywek
              </h2>
            </div>
            <span className="text-[10px] text-zinc-600">
              Strona {Math.min(page + 1, totalPages)} z {totalPages}
            </span>
          </div>

          {loading ? (
            <p className="mt-6 text-sm font-bold text-violet-200">
              Ładujemy historię…
            </p>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-200">
              {error}
            </div>
          ) : data?.history.length ? (
            <div className="mt-5 space-y-3">
              {data.history.map((item, index) => {
                const meta = getPartyPlayGameMeta(item.game_slug);
                const isPolowanie = item.game_slug === "polowanie-na-milionera";

                return (
                  <article
                    key={`${item.game_slug}-${item.completed_at}-${index}`}
                    className="rounded-2xl border border-white/8 bg-black/15 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/8 bg-white/[.035]">
                        {item.avatar.startsWith("avatar-") ? (
                          <PartyPlayAvatar id={item.avatar} size={42} />
                        ) : (
                          <span className="text-xl">{meta.icon}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <strong className="block text-sm font-black">
                              {meta.label}
                            </strong>
                            <span className="mt-1 block text-[10px] text-zinc-600">
                              {formatDate(item.completed_at)}
                              {item.team ? ` · drużyna ${item.team}` : ""}
                            </span>
                          </div>

                          <div className="text-right">
                            <strong
                              className={`block text-sm font-black ${
                                item.won
                                  ? "text-emerald-300"
                                  : "text-zinc-300"
                              }`}
                            >
                              {item.won
                                ? "ZWYCIĘSTWO"
                                : item.placement
                                  ? `#${item.placement}`
                                  : "UKOŃCZONO"}
                            </strong>
                            {item.final_score != null && (
                              <span className="text-[10px] text-zinc-600">
                                {item.final_score}{" "}
                                {isPolowanie ? "Punktów Łowcy" : "pkt"}
                              </span>
                            )}
                          </div>
                        </div>

                        {isPolowanie && item.result_data && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Boolean(item.result_data.reachedFinal) && (
                              <span className="rounded-full border border-amber-300/15 bg-amber-300/[.05] px-2.5 py-1 text-[9px] font-black text-amber-200">
                                FINAŁ
                              </span>
                            )}
                            {Number(item.result_data.correctMillionaireVotes ?? 0) > 0 && (
                              <span className="rounded-full border border-white/8 bg-white/[.025] px-2.5 py-1 text-[9px] font-black text-zinc-400">
                                🎯 {Number(item.result_data.correctMillionaireVotes)} trafnych głosów
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-white/8 bg-black/15 p-5 text-sm leading-6 text-zinc-500">
              Nie masz jeszcze zakończonych rozgrywek w tym widoku.
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={loading || page === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              className="rounded-xl border border-white/10 bg-white/[.035] px-4 py-3 text-xs font-black text-zinc-300 disabled:opacity-30"
            >
              ← Nowsze
            </button>
            <button
              type="button"
              disabled={loading || !data?.historyHasMore}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-xl border border-violet-300/20 bg-violet-300/[.07] px-4 py-3 text-xs font-black text-violet-100 disabled:opacity-30"
            >
              Starsze →
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
