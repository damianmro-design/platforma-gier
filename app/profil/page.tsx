"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";
import {
  PARTYPLAY_AVATARS,
  PartyPlayAvatar,
  PartyPlayAvatarLock,
  isPartyPlayAvatarUnlocked,
  normalizePartyPlayAvatar,
} from "@/components/partyplay-avatar";


const GAME_LABELS: Record<string, string> = {
  "co-ludzie-powiedza": "Co ludzie powiedzą",
  "zakrecone-haslo": "Zakręcone Hasło",
  "floor-party": "Floor Party",
  "polowanie-na-milionera": "Polowanie na Milionera",
  "pod-przykrywka": "Pod Przykrywką",
};

type Profile = {
  display_name: string | null;
  avatar: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PolowanieCareer = {
  display_name: string;
  games_completed: number;
  wins: number;
  hunter_points: number;
  correct_millionaire_votes: number;
  finals_reached: number;
  badges_count: number;
};

type GameSummary = {
  gameSlug: string;
  gamesCompleted: number;
  wins: number;
  totalScore: number;
  bestPlacement: number | null;
};

type PlatformSummary = {
  games_completed: number;
  wins: number;
  total_score: number;
  best_placement: number | null;
  last_played_at: string | null;
  games: GameSummary[];
};

type HistoryItem = {
  game_slug: string;
  display_name: string;
  avatar: string;
  team: "A" | "B" | null;
  final_score: number | null;
  placement: number | null;
  won: boolean;
  completed_at: string;
};

type GlobalBadge = {
  code: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  progressCurrent: number;
  progressTarget: number;
};

type PartyPlayProgression = {
  xp: number;
  xpBreakdown: {
    games: number;
    wins: number;
    polowanieBadges: number;
    partyPlayBadges: number;
  };
  xpRules: {
    gameCompleted: number;
    win: number;
    polowanieBadge: number;
    partyPlayBadge: number;
  };
  level: {
    level: number;
    title: string;
    minXp: number;
    nextMinXp: number | null;
  };
  levelProgress: number;
  xpToNextLevel: number;
  totalGames: number;
  totalWins: number;
  distinctGamesPlayed: number;
  distinctGamesWon: number;
  polowanieBadges: number;
  partyPlayBadgesEarned: number;
  globalBadgesEarned: number;
  badges: GlobalBadge[];
};

type PodPrzykrywkaStats = {
  gamesCompleted: number;
  wins: number;
  agentGames: number;
  agentWins: number;
  oszustGames: number;
  oszustWins: number;
  correctFinalVotes: number;
  perfectCoverWins: number;
  innocentFinalDefenderWins: number;
  interrogatedWins: number;
  hotSeatAppearances: number;
};

type PlatformStatsResponse = {
  summary: PlatformSummary;
  history: HistoryItem[];
  polowanie: PolowanieCareer | null;
  polowanieBadges: Array<{
    badgeCode: string;
    title: string;
    description: string;
    icon: string;
    earned: boolean;
    earnedAt: string | null;
    progressCurrent: number;
    progressTarget: number;
  }>;
  progression: PartyPlayProgression;
  podPrzykrywka: PodPrzykrywkaStats;
};

function gameLabel(slug: string) {
  return GAME_LABELS[slug] ?? slug;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState("avatar-01");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [polowanie, setPolowanie] = useState<PolowanieCareer | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStatsResponse | null>(null);


  const totalGames =
    Number(polowanie?.games_completed ?? 0) +
    Number(platformStats?.summary.games_completed ?? 0);

  const totalWins =
    Number(polowanie?.wins ?? 0) +
    Number(platformStats?.summary.wins ?? 0);

  const currentLevel = platformStats?.progression.level.level ?? 1;

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

      const [
        { data: profileData, error: profileError },
        { data: careerData },
        { data: sessionData },
      ] = await Promise.all([
        supabase.rpc("get_my_partyplay_profile"),
        supabase.rpc("get_my_career_summary"),
        supabase.auth.getSession(),
      ]);

      if (!mounted) return;

      if (profileError) {
        setError("Nie udało się pobrać profilu PartyPlay.");
        setLoading(false);
        return;
      }

      const row = (
        Array.isArray(profileData) ? profileData[0] : profileData
      ) as Profile | undefined;

      setDisplayName(
        row?.display_name?.trim() ||
          String(userData.user.user_metadata?.full_name ?? "").trim() ||
          userData.user.email?.split("@")[0] ||
          "Gracz",
      );
      setAvatar(normalizePartyPlayAvatar(row?.avatar));

      const career = (
        Array.isArray(careerData) ? careerData[0] : careerData
      ) as PolowanieCareer | undefined;

      if (career) {
        setPolowanie({
          ...career,
          games_completed: Number(career.games_completed ?? 0),
          wins: Number(career.wins ?? 0),
          hunter_points: Number(career.hunter_points ?? 0),
          correct_millionaire_votes: Number(career.correct_millionaire_votes ?? 0),
          finals_reached: Number(career.finals_reached ?? 0),
          badges_count: Number(career.badges_count ?? 0),
        });
      }

      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        try {
          const response = await fetch("/api/account/stats", {
            cache: "no-store",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            const stats = (await response.json()) as PlatformStatsResponse;
            if (mounted) {
              setPlatformStats(stats);
              if (stats.polowanie) setPolowanie(stats.polowanie);
              setAvatar((currentAvatar) =>
                isPartyPlayAvatarUnlocked(
                  currentAvatar,
                  stats.progression.level.level,
                )
                  ? currentAvatar
                  : "avatar-01",
              );
            }
          }
        } catch {
          // Profil nadal działa nawet bez statystyk platformy.
        }
      }

      if (mounted) setLoading(false);
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

    if (!isPartyPlayAvatarUnlocked(avatar, currentLevel)) {
      setError("Ten avatar odblokuje się na wyższym poziomie.");
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

  async function openPolowanieProfile() {
    const supabase = createPartyPlayAuthClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) {
      router.replace("/login?next=/profil");
      return;
    }

    const targetBase =
      process.env.NEXT_PUBLIC_POLOWANIE_URL ??
      "https://polowanienamilionera.pl";

    const hash = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      next: "/profile",
    });

    window.location.replace(
      `${targetBase.replace(/\/$/, "")}/auth/import#${hash.toString()}`,
    );
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
        <p className="text-sm font-black text-violet-200">
          Ładujemy profil PartyPlay…
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050713] px-5 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(124,58,237,.22),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,.13),transparent_28%)]" />

      <section className="relative z-10 mx-auto max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-xs font-black text-zinc-500 transition hover:text-white"
          >
            ← PartyPlay
          </Link>
          <button
            onClick={() => void logout()}
            className="rounded-xl border border-white/10 bg-white/[.035] px-4 py-2.5 text-xs font-black text-zinc-400"
          >
            Wyloguj
          </button>
        </div>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#0a0d1c]/92 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[1.7rem] border border-violet-300/20 bg-violet-400/10 p-1 shadow-[0_0_40px_rgba(139,92,246,.14)]">
              <PartyPlayAvatar id={avatar} size={86} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-[.24em] text-violet-300">
                KONTO PARTYPLAY
              </span>
              <h1 className="mt-2 truncate text-4xl font-black tracking-[-.055em]">
                {displayName || "Twój profil"}
              </h1>
              <p className="mt-2 truncate text-sm text-zinc-500">{email}</p>
            </div>
          </div>

          {platformStats?.progression && (
            <div className="mt-7 rounded-3xl border border-violet-300/18 bg-gradient-to-br from-violet-400/[.08] via-fuchsia-400/[.04] to-cyan-300/[.05] p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">
                    POZIOM PARTYPLAY
                  </span>
                  <div className="mt-2 flex items-baseline gap-3">
                    <strong className="text-4xl font-black tracking-[-.05em]">
                      {platformStats.progression.level.level}
                    </strong>
                    <span className="text-lg font-black text-violet-200">
                      {platformStats.progression.level.title}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <strong className="block text-2xl font-black">
                    {platformStats.progression.xp} XP
                  </strong>
                  <span className="text-[10px] text-zinc-500">
                    {platformStats.progression.xpToNextLevel > 0
                      ? `${platformStats.progression.xpToNextLevel} XP do kolejnego poziomu`
                      : "Maksymalny poziom"}
                  </span>
                </div>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/35">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 transition-all"
                  style={{ width: `${platformStats.progression.levelProgress}%` }}
                />
              </div>

              <p className="mt-3 text-[10px] leading-5 text-zinc-500">
                XP zdobywasz za ukończone gry, zwycięstwa i odznaki. Wynik punktowy
                konkretnej gry nie wpływa bezpośrednio na poziom.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-white/8 bg-black/15 p-3">
                  <small className="text-[8px] font-black text-zinc-600">XP ZA GRY</small>
                  <strong className="mt-1 block text-lg font-black">{platformStats.progression.xpBreakdown.games}</strong>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/15 p-3">
                  <small className="text-[8px] font-black text-zinc-600">XP ZA WYGRANE</small>
                  <strong className="mt-1 block text-lg font-black">{platformStats.progression.xpBreakdown.wins}</strong>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/15 p-3">
                  <small className="text-[8px] font-black text-zinc-600">ODZNAKI PARTYPLAY</small>
                  <strong className="mt-1 block text-lg font-black">{platformStats.progression.xpBreakdown.partyPlayBadges}</strong>
                </div>
                <div className="rounded-xl border border-white/8 bg-black/15 p-3">
                  <small className="text-[8px] font-black text-zinc-600">ODZNAKI POLOWANIA</small>
                  <strong className="mt-1 block text-lg font-black">{platformStats.progression.xpBreakdown.polowanieBadges}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
              <span className="text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">
                ROZEGRANE GRY
              </span>
              <strong className="mt-2 block text-3xl font-black">{totalGames}</strong>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
              <span className="text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">
                ZWYCIĘSTWA
              </span>
              <strong className="mt-2 block text-3xl font-black">{totalWins}</strong>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
              <span className="text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">
                ODZNAKI
              </span>
              <strong className="mt-2 block text-3xl font-black">
                {(polowanie?.badges_count ?? 0) +
                  (platformStats?.progression.globalBadgesEarned ?? 0)}
              </strong>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
              <span className="text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">
                RÓŻNE GRY
              </span>
              <strong className="mt-2 block text-3xl font-black">
                {platformStats?.progression.distinctGamesPlayed ??
                  ((polowanie?.games_completed ?? 0) > 0 ? 1 : 0)}
              </strong>
            </div>
          </div>

          <form onSubmit={save} className="mt-8 border-t border-white/8 pt-7">
            <label
              htmlFor="displayName"
              className="text-[9px] font-black uppercase tracking-[.16em] text-zinc-500"
            >
              Nazwa gracza
            </label>
            <input
              id="displayName"
              value={displayName}
              maxLength={80}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base font-bold outline-none focus:border-violet-300/50"
            />

            <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.16em] text-zinc-500">
                  Avatar
                </p>
                <p className="mt-1 text-[10px] text-zinc-600">
                  6 dostępnych od startu, kolejne odblokowują się wraz z poziomem.
                </p>
              </div>
              <span className="rounded-full border border-violet-300/15 bg-violet-300/[.05] px-3 py-1.5 text-[9px] font-black text-violet-200">
                POZIOM {currentLevel}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {PARTYPLAY_AVATARS.map((item, index) => {
                const unlocked = isPartyPlayAvatarUnlocked(item.id, currentLevel);
                const selected = avatar === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => unlocked && setAvatar(item.id)}
                    aria-label={
                      unlocked
                        ? `Wybierz avatar ${item.name}`
                        : `Avatar ${item.name}, odblokuje się na poziomie ${item.unlockLevel}`
                    }
                    className={`group relative overflow-hidden rounded-2xl border p-2.5 text-left transition ${
                      selected
                        ? "border-cyan-300/70 bg-violet-400/15 shadow-[0_0_30px_rgba(34,211,238,.10)]"
                        : unlocked
                          ? "border-white/10 bg-white/[.025] hover:border-violet-300/30 hover:bg-white/[.05]"
                          : "cursor-not-allowed border-white/[.055] bg-black/20"
                    }`}
                  >
                    <div className="mx-auto flex justify-center">
                      <PartyPlayAvatar
                        id={item.id}
                        size={82}
                        locked={!unlocked}
                      />
                    </div>

                    <div className="mt-2 flex min-h-7 items-center justify-between gap-2">
                      <span className={`truncate text-[9px] font-black uppercase tracking-[.1em] ${
                        unlocked ? "text-zinc-400" : "text-zinc-700"
                      }`}>
                        {index < 6 ? "START" : `LVL ${item.unlockLevel}`}
                      </span>
                      {!unlocked && (
                        <span className="text-zinc-700">
                          <PartyPlayAvatarLock />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs font-bold text-red-200">
                {error}
              </div>
            )}
            {message && (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs font-bold text-emerald-200">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-6 min-h-14 w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-5 text-sm font-black disabled:opacity-50"
            >
              {saving ? "Zapisywanie…" : "Zapisz profil"}
            </button>
          </form>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section className="rounded-3xl border border-amber-300/15 bg-amber-300/[.04] p-5">
            <span className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300">
              POLOWANIE NA MILIONERA
            </span>
            <button
              type="button"
              onClick={() => void openPolowanieProfile()}
              className="mt-4 w-full rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-xs font-black text-amber-200 transition hover:bg-amber-300/15"
            >
              Otwórz pełny profil Polowania
            </button>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
                <small className="text-[8px] font-black text-zinc-600">GRY</small>
                <strong className="mt-1 block text-2xl font-black">
                  {polowanie?.games_completed ?? 0}
                </strong>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
                <small className="text-[8px] font-black text-zinc-600">WYGRANE</small>
                <strong className="mt-1 block text-2xl font-black">
                  {polowanie?.wins ?? 0}
                </strong>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
                <small className="text-[8px] font-black text-zinc-600">FINAŁY</small>
                <strong className="mt-1 block text-2xl font-black">
                  {polowanie?.finals_reached ?? 0}
                </strong>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
                <small className="text-[8px] font-black text-zinc-600">
                  TRAFNE GŁOSY
                </small>
                <strong className="mt-1 block text-2xl font-black">
                  {polowanie?.correct_millionaire_votes ?? 0}
                </strong>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
                <small className="text-[8px] font-black text-zinc-600">PUNKTY ŁOWCY</small>
                <strong className="mt-1 block text-2xl font-black">
                  {polowanie?.hunter_points ?? 0}
                </strong>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
                <small className="text-[8px] font-black text-zinc-600">ODZNAKI</small>
                <strong className="mt-1 block text-2xl font-black">
                  {polowanie?.badges_count ?? 0}
                </strong>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-violet-300/15 bg-violet-300/[.04] p-5">
            <span className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">
              POZOSTAŁE GRY PARTYPLAY
            </span>
            <div className="mt-4 space-y-2">
              {(platformStats?.summary.games ?? []).length ? (
                platformStats!.summary.games.map((game) => (
                  <div
                    key={game.gameSlug}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/15 p-3"
                  >
                    <div>
                      <strong className="block text-sm font-black">
                        {gameLabel(game.gameSlug)}
                      </strong>
                      <span className="mt-1 block text-[10px] text-zinc-500">
                        {game.gamesCompleted} gier · {game.wins} zwycięstw
                      </span>
                    </div>
                    <div className="text-right">
                      <small className="block text-[8px] font-black text-zinc-600">
                        NAJLEPSZE MIEJSCE
                      </small>
                      <strong className="text-xl font-black text-violet-200">
                        {game.bestPlacement ? `#${game.bestPlacement}` : "—"}
                      </strong>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-white/8 bg-black/15 p-4 text-xs leading-5 text-zinc-500">
                  Tu pojawią się wyniki z Co ludzie powiedzą, Zakręconego Hasła
                  i kolejnych gier po rozegraniu ich na zalogowanym koncie.
                </p>
              )}
            </div>
          </section>
        </div>

        {platformStats?.podPrzykrywka && platformStats.podPrzykrywka.gamesCompleted > 0 && (
          <section className="mt-5 rounded-3xl border border-cyan-300/15 bg-cyan-300/[.035] p-5">
            <span className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">
              STATYSTYKI POD PRZYKRYWKĄ
            </span>
            <h2 className="mt-1 text-xl font-black">Twoja kartoteka</h2>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["GRY", platformStats.podPrzykrywka.gamesCompleted],
                ["WYGRANE", platformStats.podPrzykrywka.wins],
                ["JAKO OSZUST", platformStats.podPrzykrywka.oszustWins],
                ["JAKO AGENT", platformStats.podPrzykrywka.agentWins],
                ["TRAFNE FINAŁY", platformStats.podPrzykrywka.correctFinalVotes],
                ["GORĄCE KRZESŁO", platformStats.podPrzykrywka.hotSeatAppearances],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl border border-white/8 bg-black/15 p-3">
                  <small className="text-[8px] font-black text-zinc-600">{label}</small>
                  <strong className="mt-1 block text-2xl font-black">{value}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {platformStats?.progression && (
          <section className="mt-5 rounded-3xl border border-white/8 bg-white/[.025] p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">
                  ODZNAKI PARTYPLAY
                </span>
                <h2 className="mt-1 text-xl font-black">
                  {platformStats.progression.partyPlayBadgesEarned}/{platformStats.progression.badges.length} zdobytych
                </h2>
              </div>
              <Link
                href="/profil/odznaki"
                className="rounded-xl border border-violet-300/20 bg-violet-300/[.06] px-3 py-2 text-[10px] font-black text-violet-200 transition hover:bg-violet-300/[.10]"
              >
                Wszystkie odznaki →
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...platformStats.progression.badges]
                .sort((a, b) => Number(b.earned) - Number(a.earned))
                .slice(0, 6)
                .map((badge) => {
                  const percent = Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round((badge.progressCurrent / Math.max(1, badge.progressTarget)) * 100),
                    ),
                  );

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
                        <span className={`text-3xl ${badge.earned ? "" : "grayscale opacity-35"}`}>
                          {badge.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block text-sm font-black">{badge.title}</strong>
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
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        )}

        <section className="mt-5 rounded-3xl border border-white/8 bg-white/[.025] p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">
                OSTATNIE ROZGRYWKI
              </span>
              <h2 className="mt-1 text-xl font-black">
                Historia PartyPlay
              </h2>
            </div>
            <Link
              href="/profil/historia"
              className="rounded-xl border border-violet-300/20 bg-violet-300/[.06] px-3 py-2 text-[10px] font-black text-violet-200 transition hover:bg-violet-300/[.10]"
            >
              Pełna historia →
            </Link>
          </div>

          <div className="mt-4 space-y-2">
            {(platformStats?.history ?? []).length ? (
              platformStats!.history.slice(0, 5).map((item, index) => (
                <div
                  key={`${item.game_slug}-${item.completed_at}-${index}`}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-black/15 p-3"
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/8 bg-black/15">
                    <PartyPlayAvatar id={item.avatar} size={38} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-black">
                      {gameLabel(item.game_slug)}
                    </strong>
                    <span className="text-[10px] text-zinc-600">
                      {formatDate(item.completed_at)}
                      {item.team ? ` · drużyna ${item.team}` : ""}
                    </span>
                  </div>
                  <div className="text-right">
                    <strong
                      className={`block text-sm font-black ${
                        item.won ? "text-emerald-300" : "text-zinc-300"
                      }`}
                    >
                      {item.won ? "ZWYCIĘSTWO" : item.placement ? `#${item.placement}` : "UKOŃCZONO"}
                    </strong>
                    {item.final_score != null && (
                      <span className="text-[10px] text-zinc-600">
                        {item.final_score} {item.game_slug === "polowanie-na-milionera" ? "Punktów Łowcy" : "pkt"}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-white/8 bg-black/15 p-4 text-xs leading-5 text-zinc-500">
                Historia zacznie zapełniać się po zakończonych rozgrywkach na zalogowanym koncie.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
