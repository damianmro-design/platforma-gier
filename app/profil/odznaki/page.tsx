"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";
import {
  fetchPartyPlayStats,
  type PartyPlayStatsResponse,
  type PartyPlayBadge,
} from "@/lib/partyplay-profile-client";
import {
  PARTYPLAY_GAMES,
  getPartyPlayGameMeta,
} from "@/lib/partyplay-games";

function badgeProgress(badge: PartyPlayBadge) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (badge.progressCurrent / Math.max(1, badge.progressTarget)) * 100,
      ),
    ),
  );
}

export default function PartyPlayBadgesPage() {
  const router = useRouter();
  const [data, setData] = useState<PartyPlayStatsResponse | null>(null);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const supabase = createPartyPlayAuthClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session || session.user.is_anonymous === true) {
        router.replace("/login?next=/profil/odznaki");
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

  const filters = useMemo(
    () => [
      { slug: "all", label: "Wszystkie" },
      { slug: "global", label: "Ogólne zaGRAj" },
      ...PARTYPLAY_GAMES.filter((game) => game.connectedToProgress).map(
        (game) => ({
          slug: game.slug,
          label: game.shortLabel,
        }),
      ),
    ],
    [],
  );

  const partyPlayBadges = useMemo(() => {
    const badges = data?.progression.badges ?? [];

    if (filter === "all") return badges;
    if (filter === "global") {
      return badges.filter((badge) => badge.scope === "global");
    }

    return badges.filter((badge) => badge.gameSlug === filter);
  }, [data, filter]);

  const showPolowanieOwnBadges =
    filter === "all" || filter === "polowanie-na-milionera";

  return (
    <main className="min-h-screen bg-[#050713] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,.18),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(236,72,153,.10),transparent_28%)]" />

      <section className="relative z-10 mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/profil"
            className="text-xs font-black text-zinc-500 transition hover:text-white"
          >
            ← Profil zaGRAj
          </Link>
          <span className="text-[9px] font-black uppercase tracking-[.2em] text-violet-300">
            OSIĄGNIĘCIA
          </span>
        </div>

        <header className="mt-8 rounded-[2rem] border border-white/10 bg-[#0a0d1c]/92 p-6 shadow-2xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.24em] text-violet-300">
            KOLEKCJA
          </span>
          <h1 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-5xl">
            Odznaki
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
            zaGRAj ma własne osiągnięcia między grami, a odznaki Polowania
            na Milionera nadal pozostają osobną kolekcją tej gry.
          </p>

          {data?.progression && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                <small className="text-[8px] font-black uppercase tracking-[.14em] text-zinc-600">
                  PARTYPLAY
                </small>
                <strong className="mt-1 block text-2xl font-black">
                  {data.progression.partyPlayBadgesEarned}/{data.progression.badges.length}
                </strong>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                <small className="text-[8px] font-black uppercase tracking-[.14em] text-zinc-600">
                  POLOWANIE
                </small>
                <strong className="mt-1 block text-2xl font-black">
                  {data.polowanie?.badges_count ?? 0}
                </strong>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                <small className="text-[8px] font-black uppercase tracking-[.14em] text-zinc-600">
                  XP Z ODZNAK PP
                </small>
                <strong className="mt-1 block text-2xl font-black">
                  {data.progression.xpBreakdown.partyPlayBadges}
                </strong>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                <small className="text-[8px] font-black uppercase tracking-[.14em] text-zinc-600">
                  XP Z ODZNAK POL.
                </small>
                <strong className="mt-1 block text-2xl font-black">
                  {data.progression.xpBreakdown.polowanieBadges}
                </strong>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => setFilter(item.slug)}
                className={`rounded-full border px-3 py-2 text-[10px] font-black transition ${
                  filter === item.slug
                    ? "border-violet-300/35 bg-violet-300/10 text-violet-100"
                    : "border-white/8 bg-white/[.025] text-zinc-500 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <p className="mt-6 text-sm font-black text-violet-200">
            Ładujemy osiągnięcia…
          </p>
        ) : (
          <>
            <section className="mt-5 rounded-3xl border border-white/8 bg-white/[.025] p-5 sm:p-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">
                    ODZNAKI zaGRAj
                  </span>
                  <h2 className="mt-1 text-xl font-black">
                    {partyPlayBadges.filter((badge) => badge.earned).length}/{partyPlayBadges.length} w tym widoku
                  </h2>
                </div>
                <span className="text-[10px] text-zinc-600">
                  +{data?.progression.xpRules.partyPlayBadge ?? 25} XP za zdobytą
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {partyPlayBadges.map((badge) => {
                  const meta = badge.gameSlug
                    ? getPartyPlayGameMeta(badge.gameSlug)
                    : null;

                  return (
                    <article
                      key={badge.code}
                      className={`rounded-2xl border p-4 ${
                        badge.earned
                          ? "border-emerald-300/20 bg-emerald-300/[.05]"
                          : "border-white/8 bg-black/15"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`text-3xl ${
                            badge.earned ? "" : "grayscale opacity-35"
                          }`}
                        >
                          {badge.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          {meta && (
                            <span className="mb-1 block text-[8px] font-black uppercase tracking-[.14em] text-violet-300/60">
                              {meta.shortLabel}
                            </span>
                          )}
                          <strong className="block text-sm font-black">
                            {badge.title}
                          </strong>
                          <p className="mt-1 text-[10px] leading-4 text-zinc-500">
                            {badge.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/35">
                        <div
                          className={`h-full rounded-full ${
                            badge.earned
                              ? "bg-emerald-300"
                              : "bg-gradient-to-r from-violet-500 to-cyan-400"
                          }`}
                          style={{ width: `${badgeProgress(badge)}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[.12em]">
                        <span
                          className={
                            badge.earned ? "text-emerald-300" : "text-zinc-600"
                          }
                        >
                          {badge.earned ? "ZDOBYTA" : "POSTĘP"}
                        </span>
                        <span className="text-zinc-600">
                          {badge.progressCurrent}/{badge.progressTarget}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {showPolowanieOwnBadges && (
              <section className="mt-5 rounded-3xl border border-amber-300/15 bg-amber-300/[.035] p-5 sm:p-6">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">
                    POLOWANIE NA MILIONERA
                  </span>
                  <h2 className="mt-1 text-xl font-black">
                    Odznaki tej gry
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    To osobna kolekcja Polowania. Nie zastępują jej ogólne
                    odznaki zaGRAj.
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(data?.polowanieBadges ?? []).map((badge) => {
                    const target = Math.max(1, badge.progressTarget);
                    const percent = Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round((badge.progressCurrent / target) * 100),
                      ),
                    );

                    return (
                      <article
                        key={badge.badgeCode}
                        className={`rounded-2xl border p-4 ${
                          badge.earned
                            ? "border-amber-300/20 bg-amber-300/[.05]"
                            : "border-white/8 bg-black/15"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`text-3xl ${
                              badge.earned ? "" : "grayscale opacity-35"
                            }`}
                          >
                            {badge.icon || "🏅"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <strong className="block text-sm font-black">
                              {badge.title}
                            </strong>
                            <p className="mt-1 text-[10px] leading-4 text-zinc-500">
                              {badge.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/35">
                          <div
                            className={`h-full rounded-full ${
                              badge.earned ? "bg-amber-300" : "bg-zinc-700"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[.12em]">
                          <span className={badge.earned ? "text-amber-300" : "text-zinc-600"}>
                            {badge.earned ? "ZDOBYTA" : "POSTĘP"}
                          </span>
                          <span className="text-zinc-600">
                            {badge.progressCurrent}/{badge.progressTarget}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
