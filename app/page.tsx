"use client";

import Link from "next/link";
import { useState } from "react";
import { joinRoom } from "./room-actions";
import AccountMenu from "./account-menu";
import FloorOwnerTestButton from "@/components/floor-owner-test-button";
import PolowanieOwnerTestButton from "@/components/polowanie-owner-test-button";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

type Accent = "gold" | "pink" | "yellow" | "cyan" | "red" | "violet";
type Art = "millionaire" | "floor" | "people" | "agent" | "crime" | "word" | "duo" | "cipher" | "auction";
type CategoryFilter = "all" | "funny" | "strategic" | "team" | "long";
type MoodFilter = "laugh" | "think" | "compete" | "cooperate";
type GameFilterState = {
  category: CategoryFilter;
  playerCount: number | null;
  maxTime: number | null;
  mood: MoodFilter | null;
};

type GameCardProps = {
  title: string;
  eyebrow: string;
  description: string;
  players: string;
  time: string;
  tags: string[];
  accent: Accent;
  art: Art;
  href?: string;
  external?: boolean;
  status: "hit" | "new" | "soon";
  authHandoff?: "polowanie";
  minPlayers: number;
  maxPlayers: number;
  minTime: number;
  maxTime: number;
  categories: Array<Exclude<CategoryFilter, "all" | "long">>;
  moods: MoodFilter[];
};

const accentMap: Record<Accent, {
  border: string;
  glow: string;
  button: string;
  label: string;
}> = {
  gold: {
    border: "border-amber-300/30 hover:border-amber-300/70",
    glow: "from-amber-300/20 via-amber-400/5 to-transparent",
    button: "from-amber-300 to-yellow-500 text-zinc-950",
    label: "text-amber-200",
  },
  pink: {
    border: "border-fuchsia-400/30 hover:border-fuchsia-300/70",
    glow: "from-fuchsia-400/20 via-pink-500/8 to-transparent",
    button: "from-fuchsia-400 via-pink-500 to-cyan-400 text-white",
    label: "text-fuchsia-200",
  },
  yellow: {
    border: "border-yellow-300/35 hover:border-yellow-200/75",
    glow: "from-yellow-300/25 via-orange-400/8 to-transparent",
    button: "from-yellow-300 to-orange-400 text-zinc-950",
    label: "text-yellow-200",
  },
  cyan: {
    border: "border-cyan-400/30 hover:border-cyan-300/70",
    glow: "from-cyan-300/20 via-sky-500/8 to-transparent",
    button: "from-cyan-300 to-blue-500 text-zinc-950",
    label: "text-cyan-200",
  },
  red: {
    border: "border-red-400/30 hover:border-red-300/70",
    glow: "from-red-400/20 via-orange-500/8 to-transparent",
    button: "from-red-400 to-orange-500 text-white",
    label: "text-red-200",
  },
  violet: {
    border: "border-violet-400/30 hover:border-violet-300/70",
    glow: "from-violet-400/20 via-indigo-500/8 to-transparent",
    button: "from-violet-400 to-indigo-500 text-white",
    label: "text-violet-200",
  },
};

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M5 12h13m-5-5 5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M16 19v-1.7a3.3 3.3 0 0 0-3.3-3.3H7.3A3.3 3.3 0 0 0 4 17.3V19m15-5.2a3 3 0 0 1 2 2.8V19m-11-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6-1a2.5 2.5 0 1 0 0-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function GameArt({ type }: { type: Art }) {
  if (type === "millionaire") {
    return (
      <div className="relative h-56 overflow-hidden bg-[#05060b]">
        <img
          src="https://polowanienamilionera.pl/media/images/logo-game.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center opacity-95 transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090b13] via-[#090b13]/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(circle_at_50%_100%,rgba(251,191,36,.16),transparent_65%)]" />
      </div>
    );
  }

  if (type === "floor") {
    return (
      <div className="relative flex h-56 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_24%,rgba(244,114,182,.48),transparent_30%),linear-gradient(135deg,#37105f,#8b1678_47%,#075985)]">
        <div className="absolute -left-10 top-4 h-40 w-40 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="absolute -right-8 bottom-0 h-44 w-44 rounded-full bg-pink-300/30 blur-3xl" />
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:34px_34px]" />
        <img
          src="https://floor-party.vercel.app/assets/logo.png"
          alt=""
          className="relative z-10 max-h-[78%] max-w-[78%] object-contain drop-shadow-[0_18px_32px_rgba(0,0,0,.5)] transition duration-500 group-hover:scale-[1.04]"
        />
      </div>
    );
  }

  if (type === "people") {
    return (
      <div className="relative flex h-56 items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#ffe22e,#ff9f0a)] p-6 text-zinc-950">
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full border-[26px] border-white/25" />
        <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-pink-500/90" />
        <div className="absolute left-8 top-7 rotate-[-10deg] rounded-full border-4 border-zinc-950 bg-cyan-300 px-3 py-2 text-sm font-black shadow-[4px_4px_0_#18181b]">42%</div>
        <div className="relative rotate-[-2deg] rounded-[2rem] border-4 border-zinc-950 bg-white px-6 py-5 shadow-[9px_9px_0_#18181b] transition duration-300 group-hover:rotate-0">
          <p className="text-center text-3xl font-black uppercase leading-[.88] tracking-[-.07em]">
            Co ludzie<br />powiedzą
          </p>
          <span className="absolute -right-5 -top-5 grid h-12 w-12 place-items-center rounded-full border-4 border-zinc-950 bg-pink-500 text-xl font-black text-white">?!</span>
        </div>
      </div>
    );
  }

  if (type === "agent") {
    return (
      <div className="relative flex h-56 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(34,211,238,.36),transparent_29%),linear-gradient(145deg,#06151e,#063852_58%,#030712)]">
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(90deg,transparent,rgba(34,211,238,.25),transparent)] blur-2xl" />
        <div className="relative">
          <div className="mx-auto h-16 w-24 rounded-t-full bg-black/80 shadow-[0_0_48px_rgba(34,211,238,.38)]" />
          <div className="-mt-1 h-24 w-28 rounded-[50%_50%_18%_18%] bg-black/90" />
          <div className="absolute left-1/2 top-[70px] h-2 w-14 -translate-x-1/2 rounded-full bg-cyan-300/70 blur-[1px]" />
          <span className="absolute -right-8 top-12 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/40 bg-cyan-400/15 text-2xl font-black text-cyan-100">?</span>
        </div>
      </div>
    );
  }

  if (type === "crime") {
    return (
      <div className="relative flex h-56 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_70%_20%,rgba(251,146,60,.3),transparent_24%),linear-gradient(145deg,#170706,#4a130f_58%,#090404)]">
        <div className="absolute left-[15%] top-[28%] h-2 w-44 rotate-[-8deg] bg-orange-300/70 shadow-[0_0_25px_rgba(253,186,116,.4)]" />
        <div className="rounded-2xl border border-orange-200/20 bg-black/55 px-7 py-5 text-center shadow-2xl backdrop-blur-sm">
          <p className="text-[10px] font-black uppercase tracking-[.32em] text-orange-200/70">ściśle tajne</p>
          <p className="mt-2 font-serif text-4xl font-black text-orange-100">AKTA NOCY</p>
          <p className="mt-2 text-xs text-orange-100/55">sprawa #001</p>
        </div>
      </div>
    );
  }

  if (type === "word") {
    return (
      <div className="relative flex h-56 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(167,139,250,.4),transparent_32%),linear-gradient(145deg,#190b35,#43157a_58%,#111827)]">
        <div className="absolute left-8 top-10 rotate-[-12deg] rounded-xl bg-white px-4 py-2 font-black text-violet-800 shadow-xl">PIZZA</div>
        <div className="absolute right-8 top-14 rotate-[9deg] rounded-xl bg-white px-4 py-2 font-black text-violet-800 shadow-xl">FILM</div>
        <div className="absolute bottom-9 left-1/2 -translate-x-1/2 rotate-[2deg] rounded-xl bg-white px-4 py-2 font-black text-violet-800 shadow-xl">?</div>
        <p className="text-center text-4xl font-black tracking-[-.06em] text-white drop-shadow-xl">
          ZAKRĘCONE<br /><span className="text-violet-200">HASŁO</span>
        </p>
      </div>
    );
  }

  if (type === "duo") {
    return (
      <div className="relative flex h-56 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_25%_30%,rgba(244,114,182,.34),transparent_28%),radial-gradient(circle_at_75%_65%,rgba(34,211,238,.28),transparent_30%),linear-gradient(145deg,#250b2f,#4c155b_48%,#083344)]">
        <div className="absolute left-[16%] top-[24%] h-24 w-24 rounded-full border-2 border-pink-200/40 bg-pink-400/10 blur-[.2px]" />
        <div className="absolute right-[15%] bottom-[20%] h-24 w-24 rounded-full border-2 border-cyan-200/40 bg-cyan-400/10 blur-[.2px]" />
        <div className="absolute left-1/2 top-1/2 h-20 w-[2px] -translate-x-1/2 -translate-y-1/2 rotate-[32deg] bg-gradient-to-b from-pink-300 via-white to-cyan-300 opacity-70" />
        <div className="relative z-10 text-center">
          <p className="text-[10px] font-black uppercase tracking-[.34em] text-pink-200/70">DLA DWOJGA</p>
          <p className="mt-2 text-5xl font-black tracking-[-.08em] text-white">TYLKO</p>
          <p className="-mt-2 text-5xl font-black tracking-[-.08em] text-cyan-200">MY</p>
          <div className="mt-4 flex justify-center gap-2 text-[10px] font-black">
            <span className="rounded-full border border-pink-200/20 bg-pink-300/10 px-3 py-1 text-pink-100">JA</span>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white">?</span>
            <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">TY</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === "cipher") {
    return (
      <div className="relative flex h-56 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,rgba(34,211,238,.30),transparent_28%),linear-gradient(145deg,#04111a,#071f2c_55%,#111827)]">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(103,232,249,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.18)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="absolute left-8 top-8 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 font-mono text-xs font-black tracking-[.25em] text-cyan-200">7 4 ? 2</div>
        <div className="absolute right-7 bottom-8 rotate-[6deg] rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 font-mono text-[10px] font-black text-emerald-200">ACCESS?</div>
        <div className="relative z-10 rounded-[1.8rem] border border-cyan-300/20 bg-black/40 px-8 py-6 text-center shadow-[0_0_55px_rgba(34,211,238,.12)] backdrop-blur-sm">
          <p className="font-mono text-[10px] font-black uppercase tracking-[.35em] text-cyan-300/70">MISSION CODE</p>
          <p className="mt-2 text-5xl font-black tracking-[.12em] text-white">SZYFR</p>
          <p className="mt-3 font-mono text-xs font-bold tracking-[.28em] text-cyan-100/70">••• 4 8 2 •••</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-56 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_18%,rgba(251,191,36,.30),transparent_24%),linear-gradient(145deg,#241506,#5a2c08_52%,#28130b)]">
      <div className="absolute left-5 top-8 rotate-[-8deg] rounded-xl border border-amber-200/25 bg-amber-300/10 px-4 py-2 text-xs font-black text-amber-100">1 000</div>
      <div className="absolute right-6 top-10 rotate-[7deg] rounded-xl border border-orange-200/25 bg-orange-300/10 px-4 py-2 text-xs font-black text-orange-100">5 000</div>
      <div className="absolute bottom-7 left-8 rounded-full border border-red-300/25 bg-red-400/15 px-4 py-2 text-[10px] font-black text-red-100">ALL IN</div>
      <div className="relative z-10 text-center">
        <p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-200/70">LICYTACJA</p>
        <p className="mt-2 text-5xl font-black tracking-[-.07em] text-white">VA</p>
        <p className="-mt-2 text-5xl font-black tracking-[-.07em] text-amber-300">BANQUE</p>
        <div className="mx-auto mt-4 h-1.5 w-28 rounded-full bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 shadow-[0_0_20px_rgba(251,146,60,.5)]" />
      </div>
    </div>
  );
}

async function openPolowanieWithAccount(href: string) {
  const supabase = createPartyPlayAuthClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session) {
    window.location.assign(href);
    return;
  }

  const hash = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    next: "/",
  });

  window.location.assign(
    `${href.replace(/\/$/, "")}/auth/import#${hash.toString()}`,
  );
}

function GameCard(props: GameCardProps) {
  const accent = accentMap[props.accent];
  const statusLabel =
    props.status === "hit" ? "Dostępna" : props.status === "new" ? "Nowość" : "Wkrótce";

  const content = (
    <>
      <div className="relative">
        <GameArt type={props.art} />
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${accent.glow}`} />
        <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-white backdrop-blur-md">
          {statusLabel}
        </span>
      </div>

      <div className="p-5">
        <p className={`text-[10px] font-black uppercase tracking-[.24em] ${accent.label}`}>{props.eyebrow}</p>
        <h3 className="mt-2 text-2xl font-black tracking-[-.04em] text-white">{props.title}</h3>
        <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">{props.description}</p>

        <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-zinc-300">
          <span className="inline-flex items-center gap-1.5"><UsersIcon />{props.players}</span>
          <span className="inline-flex items-center gap-1.5"><ClockIcon />{props.time}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {props.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1 text-[10px] font-bold text-zinc-400">
              {tag}
            </span>
          ))}
        </div>

        {props.href ? (
          <span className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-3 text-sm font-black transition group-hover:brightness-110 ${accent.button}`}>
            {props.external ? "Uruchom grę" : "Zobacz grę"} <Arrow />
          </span>
        ) : (
          <span className="mt-5 flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm font-black text-zinc-500">
            Wkrótce na platformie
          </span>
        )}
      </div>
    </>
  );

  const className = `group block overflow-hidden rounded-[1.75rem] border bg-[#0b0d17] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_80px_rgba(0,0,0,.45)] ${accent.border}`;

  if (!props.href) {
    return <article className={className}>{content}</article>;
  }

  if (props.external) {
    return (
      <a
        href={props.href}
        className={className}
        onClick={
          props.authHandoff === "polowanie"
            ? (event) => {
                event.preventDefault();
                void openPolowanieWithAccount(props.href!);
              }
            : undefined
        }
      >
        {content}
      </a>
    );
  }

  return <Link href={props.href} className={className}>{content}</Link>;
}

function matchesGame(game: GameCardProps, filters: GameFilterState) {
  if (filters.playerCount != null && (filters.playerCount < game.minPlayers || filters.playerCount > game.maxPlayers)) {
    return false;
  }

  if (filters.maxTime != null && game.minTime > filters.maxTime) {
    return false;
  }

  if (filters.mood != null && !game.moods.includes(filters.mood)) {
    return false;
  }

  if (filters.category === "long") {
    return game.minTime >= 60;
  }

  if (filters.category !== "all" && !game.categories.includes(filters.category)) {
    return false;
  }

  return true;
}

function FilteredGameCard({
  filters,
  ...props
}: GameCardProps & { filters: GameFilterState }) {
  if (!matchesGame(props, filters)) return null;
  return <GameCard {...props} />;
}

export default function Home() {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [playerCount, setPlayerCount] = useState("");
  const [maxTime, setMaxTime] = useState("");
  const [mood, setMood] = useState<MoodFilter | "">("");

  const filters: GameFilterState = {
    category,
    playerCount: playerCount ? Number(playerCount) : null,
    maxTime: maxTime ? Number(maxTime) : null,
    mood: mood || null,
  };

  const goToGames = () => {
    document.getElementById("gry")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#050713] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,.22),transparent_28%),radial-gradient(circle_at_88%_15%,rgba(14,165,233,.18),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(236,72,153,.13),transparent_30%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[.16] [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-[#050713]/76 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <a href="#top" className="flex items-center" aria-label="zaGRAj">
              <img
                src="/zagraj-logo.webp"
                alt="zaGRAj"
                className="h-10 w-auto sm:h-11"
              />
            </a>

            <nav className="hidden items-center gap-7 text-sm font-bold text-zinc-400 md:flex">
              <a href="#gry" className="transition hover:text-white">Gry</a>
              <a href="#jak-to-dziala" className="transition hover:text-white">Jak to działa</a>
              <a href="#wybierz" className="transition hover:text-white">Znajdź grę</a>
            </nav>

            <div className="flex items-center gap-2">
              <a href="#dolacz" className="rounded-xl border border-white/12 bg-white/[.04] px-4 py-2.5 text-xs font-black text-zinc-200 transition hover:bg-white/[.08]">
                Mam kod
              </a>
              <AccountMenu />
            </div>
          </div>
        </header>
        <div className="space-y-3">
          <PolowanieOwnerTestButton />
          <FloorOwnerTestButton />
        </div>

        <section id="top" className="mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-14 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-20 lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/8 px-3 py-2 text-[10px] font-black uppercase tracking-[.22em] text-violet-200">
              <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_#67e8f9]" />
              Gry na wspólny wieczór
            </div>

            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[.93] tracking-[-.065em] text-white sm:text-6xl lg:text-7xl">
              Gry imprezowe, które <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">odpalasz</span> w przeglądarce.
            </h1>

            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-zinc-400 sm:text-xl">
              Jeden ekran, telefony i gotowe. Teleturnieje, blef, dedukcja, quizy i gry, które naprawdę angażują całą ekipę.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#gry" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-6 py-4 text-sm font-black shadow-[0_18px_55px_rgba(139,92,246,.28)] transition hover:brightness-110">
                Wybierz grę <Arrow />
              </a>
              <a href="#dolacz" className="inline-flex items-center justify-center rounded-2xl border border-white/14 bg-white/[.045] px-6 py-4 text-sm font-black text-zinc-200 backdrop-blur-md transition hover:bg-white/[.08]">
                Dołącz kodem
              </a>
            </div>

            <div id="jak-to-dziala" className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                ["01", "Wybierz grę", "Dopasuj ją do ekipy i czasu."],
                ["02", "Znajomi dołączają", "Telefonem, bez instalowania aplikacji."],
                ["03", "Gracie od razu", "Platforma prowadzi Was przez rozgrywkę."],
              ].map(([step, title, copy]) => (
                <div key={step} className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
                  <p className="text-[10px] font-black tracking-[.24em] text-violet-300">{step}</p>
                  <p className="mt-2 text-sm font-black text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="dolacz" className="relative">
            <div className="absolute -inset-10 rounded-full bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-cyan-400/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#0a0d1c]/92 p-5 shadow-[0_30px_100px_rgba(0,0,0,.55)] backdrop-blur-xl sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">Dołącz do ekipy</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-.05em]">Masz kod pokoju?</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">Wpisz 4 znaki, platforma sama odnajdzie właściwą grę.</p>
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-400/10 text-2xl">✦</span>
              </div>

              <form action={joinRoom} className="mt-6">
                <label htmlFor="roomCode" className="sr-only">Kod pokoju</label>
                <input
                  id="roomCode"
                  name="roomCode"
                  maxLength={4}
                  required
                  autoComplete="off"
                  placeholder="4JMG"
                  className="w-full rounded-2xl border border-white/12 bg-black/30 px-5 py-5 text-center text-3xl font-black uppercase tracking-[.38em] text-white outline-none transition placeholder:text-zinc-700 focus:border-violet-400/70 focus:ring-4 focus:ring-violet-500/10"
                />
                <button type="submit" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-4 text-sm font-black transition hover:brightness-110">
                  Dołącz do gry <Arrow />
                </button>
              </form>

              <div className="mt-6 border-t border-white/8 pt-5">
                <p className="text-xs font-bold text-zinc-500">Nie masz kodu? Wybierz grę poniżej i utwórz własny pokój.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="wybierz" className="border-y border-white/7 bg-white/[.018]">
          <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8">
            <div className="grid gap-4 lg:grid-cols-[.55fr_1fr_1fr_1.35fr_auto] lg:items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.22em] text-fuchsia-300">Nie wiesz?</p>
                <p className="mt-1 text-sm font-black">Znajdź klimat</p>
              </div>

              <select
                aria-label="Liczba graczy"
                value={playerCount}
                onChange={(event) => setPlayerCount(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#080a14] px-4 py-3 text-xs font-bold text-zinc-300 outline-none transition focus:border-violet-400/50"
              >
                <option value="">Ile Was jest?</option>
                <option value="2">2 osoby</option>
                <option value="3">3 osoby</option>
                <option value="4">4 osoby</option>
                <option value="5">5 osób</option>
                <option value="6">6 osób</option>
                <option value="7">7 osób</option>
                <option value="8">8 osób</option>
                <option value="9">9 osób</option>
                <option value="10">10 osób</option>
                <option value="11">11 osób</option>
                <option value="12">12 osób</option>
                <option value="13">13 osób</option>
                <option value="14">14 osób</option>
                <option value="15">15 osób</option>
                <option value="16">16 osób</option>
                <option value="17">17 osób</option>
                <option value="18">18 osób</option>
                <option value="19">19 osób</option>
                <option value="20">20 osób</option>
              </select>

              <select
                aria-label="Dostępny czas"
                value={maxTime}
                onChange={(event) => setMaxTime(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#080a14] px-4 py-3 text-xs font-bold text-zinc-300 outline-none transition focus:border-violet-400/50"
              >
                <option value="">Ile macie czasu?</option>
                <option value="30">Do 30 min</option>
                <option value="45">Do 45 min</option>
                <option value="60">Do 60 min</option>
                <option value="90">Do 90 min</option>
              </select>

              <select
                aria-label="Klimat gry"
                value={mood}
                onChange={(event) => setMood(event.target.value as MoodFilter | "")}
                className="rounded-xl border border-white/10 bg-[#080a14] px-4 py-3 text-xs font-bold text-zinc-300 outline-none transition focus:border-violet-400/50"
              >
                <option value="">Jaki klimat?</option>
                <option value="laugh">Chcemy się pośmiać</option>
                <option value="think">Chcemy pogłówkować</option>
                <option value="compete">Chcemy rywalizacji</option>
                <option value="cooperate">Chcemy współpracować</option>
              </select>

              <button
                type="button"
                onClick={goToGames}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 text-xs font-black transition hover:brightness-110"
              >
                Pokaż gry <Arrow />
              </button>
            </div>

            {(playerCount || maxTime || mood) && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerCount("");
                    setMaxTime("");
                    setMood("");
                  }}
                  className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-500 transition hover:text-white"
                >
                  Wyczyść dobór
                </button>
              </div>
            )}
          </div>
        </section>

        <section id="gry" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.28em] text-violet-300">Biblioteka</p>
              <h2 className="mt-2 text-4xl font-black tracking-[-.055em] sm:text-5xl">W co dzisiaj gramy?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">Każdy tytuł ma własny świat, tempo i rodzaj emocji.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-black text-zinc-400">
              {([
                ["all", "Wszystkie"],
                ["funny", "Śmieszne"],
                ["strategic", "Strategiczne"],
                ["team", "Drużynowe"],
                ["long", "60+ min"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`rounded-full border px-3 py-2 transition ${
                    category === value
                      ? "border-violet-400/35 bg-violet-400/10 text-violet-200"
                      : "border-white/10 bg-white/[.025] hover:bg-white/[.06]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <FilteredGameCard filters={filters}
              title="Polowanie na Milionera"
              minPlayers={6}
              maxPlayers={14}
              minTime={60}
              maxTime={120}
              categories={["strategic"]}
              moods={["think", "compete"]}
              eyebrow="Duża gra wieczoru"
              description="Tajne role, zadania, blef, eliminacje i milion, który może zmieniać właściciela."
              players="6–14 graczy"
              time="60–120 min"
              tags={["strategia", "reality show", "ekran lub prowadzący"]}
              accent="gold"
              art="millionaire"
              href="https://polowanienamilionera.pl"
              external
              authHandoff="polowanie"
              status="hit"
            />

            <FilteredGameCard filters={filters}
              title="Floor Party"
              minPlayers={6}
              maxPlayers={20}
              minTime={25}
              maxTime={60}
              categories={["funny", "strategic"]}
              moods={["laugh", "think", "compete"]}
              eyebrow="Obroń swoją podłogę"
              description="Zgaduj obrazy i hasła w pojedynkach, broń swojego pola i przejmuj terytorium rywali, aż cały Floor będzie należał do 1 gracza."
              players="6–20 graczy"
              time="25–60 min"
              tags={["zgadywanie", "pojedynki", "wymagany prowadzący"]}
              accent="pink"
              art="floor"
              href="https://floor-party.vercel.app"
              external
              status="hit"
            />

            <FilteredGameCard filters={filters}
              title="CO LUDZIE POWIEDZĄ"
              minPlayers={4}
              maxPlayers={14}
              minTime={45}
              maxTime={75}
              categories={["funny", "team"]}
              moods={["laugh", "compete", "cooperate"]}
              eyebrow="Grywalna beta"
              description="Przewiduj najpopularniejsze odpowiedzi i sprawdź, czy naprawdę znasz swoją ekipę. Najlepiej działa przy 6–10 osobach."
              players="4–14 graczy"
              time="45–75 min"
              tags={["ankiety", "drużynowa", "wymagany prowadzący"]}
              accent="yellow"
              art="people"
              href="/gry/co-ludzie-powiedza"
              status="new"
            />

            <FilteredGameCard filters={filters}
              title="Pod Przykrywką"
              minPlayers={6}
              maxPlayers={14}
              minTime={45}
              maxTime={75}
              categories={["strategic"]}
              moods={["think", "compete"]}
              eyebrow="Dedukcja i blef"
              description="Jedna osoba działa przeciw grupie. Obserwuj, zbieraj tropy i odkryj, kto gra podwójną grę."
              players="6–14 graczy"
              time="45–75 min"
              tags={["psychologiczna", "tajna rola", "wymagany prowadzący"]}
              accent="cyan"
              art="agent"
              href="/gry/pod-przykrywka"
              status="new"
            />

            <FilteredGameCard filters={filters}
              title="Akta Nocy"
              minPlayers={5}
              maxPlayers={12}
              minTime={75}
              maxTime={105}
              categories={["strategic", "team"]}
              moods={["think", "cooperate"]}
              eyebrow="Interaktywne śledztwo"
              description="Role, sekrety, dowody i przesłuchania. Odtwórz przebieg zbrodni i wskaż sprawcę."
              players="5–12 graczy"
              time="75–105 min"
              tags={["murder mystery", "dedukcja", "wymagany prowadzący"]}
              accent="red"
              art="crime"
              href="/gry/akta-nocy"
              status="new"
            />

            <FilteredGameCard filters={filters}
              title="Zakręcone Hasło"
              minPlayers={3}
              maxPlayers={12}
              minTime={20}
              maxTime={35}
              categories={["funny"]}
              moods={["laugh", "compete"]}
              eyebrow="Lekki teleturniej"
              description="Hasła, litery, koło ryzyka i zwroty akcji. Krótka gra, którą łatwo odpalić na każdej imprezie."
              players="3–12 graczy"
              time="20–35 min"
              tags={["słowna", "szybka", "bez prowadzącego"]}
              accent="violet"
              art="word"
              href="/gry/zakrecone-haslo"
              status="new"
            />


            <FilteredGameCard filters={filters}
              title="TYLKO MY"
              minPlayers={2}
              maxPlayers={2}
              minTime={20}
              maxTime={30}
              categories={["funny"]}
              moods={["laugh", "cooperate"]}
              eyebrow="Gra dla 2 osób"
              description="Gra dla 2 osób na 2 telefonach. Przewidujcie swoje wybory, szukajcie zgodności i sprawdzajcie momenty telepatii, bez wspólnego ekranu."
              players="2 graczy"
              time="20–30 min"
              tags={["dla dwojga", "2 telefony", "telepatia"]}
              accent="pink"
              art="duo"
              href="/gry/tylko-my"
              status="new"
            />

            <FilteredGameCard filters={filters}
              title="SZYFR"
              minPlayers={2}
              maxPlayers={6}
              minTime={30}
              maxTime={45}
              categories={["strategic", "team"]}
              moods={["think", "cooperate"]}
              eyebrow="Kooperacyjna misja"
              description="Każdy widzi inne informacje. Rozmawiajcie, łączcie tropy i rozwiązujcie kody, zanim skończy się czas."
              players="2–6 graczy"
              time="30–45 min"
              tags={["kooperacyjna", "escape room", "komunikacja"]}
              accent="cyan"
              art="cipher"
              status="soon"
            />

            <FilteredGameCard filters={filters}
              title="VA BANQUE"
              minPlayers={2}
              maxPlayers={8}
              minTime={30}
              maxTime={45}
              categories={["strategic"]}
              moods={["think", "compete"]}
              eyebrow="Licytacja i ryzyko"
              description="Licytuj kategorię, przejmuj pytania i decyduj, ile jesteś gotów postawić. Wiedza to dopiero połowa gry."
              players="2–8 graczy"
              time="30–45 min"
              tags={["licytacja", "quiz", "ryzyko"]}
              accent="gold"
              art="auction"
              href="/gry/va-banque"
              status="new"
            />

          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(110deg,rgba(124,58,237,.18),rgba(236,72,153,.12),rgba(14,165,233,.14))] p-7 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-200">Zasada platformy</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-.045em] sm:text-4xl">Mniej patrzenia w telefon. Więcej grania ze sobą.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
                  Telefon jest kontrolerem, sekretną kartą i miejscem odpowiedzi. Najważniejsze rzeczy dzieją się między ludźmi.
                </p>
              </div>
              <a href="#gry" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[.07] px-6 py-4 text-sm font-black backdrop-blur-md transition hover:bg-white/[.12]">
                Wybierz grę <Arrow />
              </a>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/7 px-5 py-8 text-center text-xs text-zinc-600">
          <p><span className="font-black text-zinc-400">zaGRAj</span> · gry imprezowe · 2026</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-bold uppercase tracking-[.12em]">
            <Link href="/privacy" className="transition hover:text-violet-300">Polityka prywatności</Link>
            <Link href="/terms" className="transition hover:text-violet-300">Regulamin</Link>
            <Link href="/contact" className="transition hover:text-violet-300">Kontakt</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
