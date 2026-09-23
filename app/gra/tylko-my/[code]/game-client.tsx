"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PartyPlayAvatar } from "@/components/partyplay-avatar";

type Person = {
  id: string;
  name: string;
  avatar: string;
};

type Option = {
  value: string;
  label: string;
};

type Question = {
  id: string;
  round: number;
  roundLabel: string;
  eyebrow: string;
  type: "sync" | "predict" | "who" | "final";
  prompt: string;
  points: number;
  subject: Person | null;
  options: Option[];
};

type Result = {
  matched: boolean;
  points: number;
  answerA: string | null;
  answerB: string | null;
} | null;

type FinalResult = {
  score: number;
  maxScore: number;
  percent: number;
  title: string;
  copy: string;
} | null;

type Game = {
  questionIndex: number;
  questionCount: number;
  score: number;
  projectedScore: number;
  finished: boolean;
  playerA: Person;
  playerB: Person;
  viewerPlayerId: string | null;
  viewerAnswer: string | null;
  answerCount: number;
  submittedPlayerIds: string[];
  revealed: boolean;
  question: Question | null;
  result: Result;
  final: FinalResult;
};

type Player = {
  id: string;
  display_name: string;
  avatar: string;
};

type GameState = {
  role: "host" | "player";
  room: {
    code: string;
    status: string;
    phase: string | null;
  };
  player?: Player;
  canAdvance: boolean;
  game: Game;
};

const roundStyles: Record<number, { label: string; glow: string; line: string }> = {
  1: {
    label: "text-pink-200",
    glow: "from-pink-500/18 via-fuchsia-500/8 to-transparent",
    line: "from-pink-400 via-fuchsia-400 to-violet-400",
  },
  2: {
    label: "text-cyan-200",
    glow: "from-cyan-500/16 via-violet-500/8 to-transparent",
    line: "from-cyan-300 via-violet-400 to-pink-400",
  },
  3: {
    label: "text-violet-200",
    glow: "from-violet-500/18 via-pink-500/8 to-transparent",
    line: "from-violet-400 via-pink-400 to-cyan-300",
  },
  4: {
    label: "text-fuchsia-200",
    glow: "from-fuchsia-500/20 via-cyan-500/8 to-transparent",
    line: "from-fuchsia-400 via-pink-300 to-cyan-300",
  },
};

const ROUND_STARTS = new Set([0, 5, 11, 16]);

const ROUND_INTROS: Record<number, { title: string; copy: string; tip: string }> = {
  1: {
    title: "NA TEJ SAMEJ FALI",
    copy: "Oboje dostajecie to samo pytanie i odpowiadacie niezależnie. Taki sam wybór daje Wam 1 punkt.",
    tip: "Nie pokazujcie sobie ekranów przed odkryciem odpowiedzi.",
  },
  2: {
    title: "CZYTAM CI W MYŚLACH",
    copy: "Jedna osoba odpowiada o sobie, druga próbuje przewidzieć jej wybór. Pytania naprzemiennie dotyczą Was obojga.",
    tip: "Trafne przewidywanie jest warte 2 punkty.",
  },
  3: {
    title: "KTO Z NAS?",
    copy: "Oboje wskazujecie osobę, która lepiej pasuje do pytania, albo wybieracie „Oboje tak samo”.",
    tip: "Jeśli wskażecie to samo, zdobywacie 1 punkt.",
  },
  4: {
    title: "TELEPATIA",
    copy: "Ostatnie 4 pytania. Zasada jest prosta: wybieracie niezależnie i polujecie na ten sam wybór.",
    tip: "Każda zgodność w finale jest warta aż 3 punkty.",
  },
};

function scoreLabel(question: Question) {
  if (question.type === "predict") return `trafienie +${question.points} pkt`;
  if (question.type === "final") return `telepatia +${question.points} pkt`;
  return `zgodność +${question.points} pkt`;
}

function MiniPerson({
  person,
  active = false,
  answered = false,
}: {
  person: Person;
  active?: boolean;
  answered?: boolean;
}) {
  return (
    <div
      className={
        "flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-2.5 " +
        (active
          ? "border-cyan-200/30 bg-cyan-300/[.07]"
          : "border-white/8 bg-white/[.025]")
      }
    >
      <PartyPlayAvatar id={person.avatar} size={42} />
      <div className="min-w-0">
        <strong className="block truncate text-sm font-black text-white">{person.name}</strong>
        <span
          className={
            "mt-0.5 block text-[9px] font-black uppercase tracking-[.12em] " +
            (answered ? "text-emerald-300" : "text-zinc-600")
          }
        >
          {answered ? "✓ odpowiedź gotowa" : "myśli…"}
        </span>
      </div>
    </div>
  );
}

function labelFor(options: Option[], value: string | null) {
  if (!value) return "—";
  return options.find((option) => option.value === value)?.label ?? value;
}

function ResultPanel({ game }: { game: Game }) {
  const question = game.question;
  const result = game.result;

  if (!question || !result) return null;

  const answerA = labelFor(question.options, result.answerA);
  const answerB = labelFor(question.options, result.answerB);

  let title = result.matched ? "TEN SAM SYGNAŁ!" : "Tym razem inaczej";
  let copy = result.matched
    ? `Wspólny wybór daje Wam +${result.points} pkt.`
    : "Bez punktu, ale za to macie temat do krótkiej dyskusji.";

  if (question.type === "predict" && question.subject) {
    const subjectIsA = question.subject.id === game.playerA.id;
    const subjectAnswer = subjectIsA ? answerA : answerB;
    const prediction = subjectIsA ? answerB : answerA;

    title = result.matched ? "TRAFIONE!" : "NIE TYM RAZEM";
    copy = result.matched
      ? `Udało się przewidzieć odpowiedź ${question.subject.name}. +${result.points} pkt.`
      : `Odpowiedź ${question.subject.name}: „${subjectAnswer}”. Przewidywanie: „${prediction}”.`;
  } else if (question.type === "who") {
    title = result.matched ? "ZGODA!" : "MACIE RÓŻNE TYPY";
    copy = result.matched
      ? `Oboje wskazaliście: „${answerA}”. +${result.points} pkt.`
      : "Każde z Was widzi tę sytuację trochę inaczej. Zobaczcie swoje wybory.";
  } else if (question.type === "final") {
    title = result.matched ? "TELEPATIA!" : "BLISKO, ALE NIE TO SAMO";
    copy = result.matched
      ? `Finałowa zgodność daje Wam +${result.points} pkt.`
      : "W finale każde z Was poszło w inną stronę.";
  }

  return (
    <section
      className={
        "overflow-hidden rounded-[2rem] border p-5 sm:p-6 " +
        (result.matched
          ? "border-emerald-300/25 bg-emerald-300/[.055]"
          : "border-white/10 bg-white/[.025]")
      }
    >
      <div className="text-center">
        <span className="text-4xl">{result.matched ? "♡" : "✦"}</span>
        <h3 className="mt-3 text-2xl font-black tracking-[-.04em]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{copy}</p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-pink-200/15 bg-pink-300/[.045] p-4">
          <div className="flex items-center gap-3">
            <PartyPlayAvatar id={game.playerA.avatar} size={44} />
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-[.15em] text-pink-200">
                {game.playerA.name}
              </span>
              <strong className="mt-1 block text-sm font-black leading-5 text-white">{answerA}</strong>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[.045] p-4">
          <div className="flex items-center gap-3">
            <PartyPlayAvatar id={game.playerB.avatar} size={44} />
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-[.15em] text-cyan-200">
                {game.playerB.name}
              </span>
              <strong className="mt-1 block text-sm font-black leading-5 text-white">{answerB}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalScreen({ game }: { game: Game }) {
  const final = game.final;
  if (!final) return null;

  const circumference = 2 * Math.PI * 54;
  const dash = Math.max(0, Math.min(circumference, (final.percent / 100) * circumference));

  return (
    <div className="mx-auto max-w-3xl py-8 text-center sm:py-10">
      <span className="inline-flex rounded-full border border-pink-300/20 bg-pink-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-pink-100">
        KONIEC GRY
      </span>

      <div className="relative mx-auto mt-8 grid h-40 w-40 place-items-center">
        <svg viewBox="0 0 128 128" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="64" cy="64" r="54" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
          <circle
            cx="64"
            cy="64"
            r="54"
            fill="none"
            stroke="url(#tmFinalGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - dash}
          />
          <defs>
            <linearGradient id="tmFinalGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="55%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#67e8f9" />
            </linearGradient>
          </defs>
        </svg>
        <div>
          <span className="block text-[9px] font-black uppercase tracking-[.15em] text-zinc-500">
            SYNCHRONIZACJA
          </span>
          <strong className="mt-1 block text-4xl font-black">{final.percent}%</strong>
          <small className="text-xs font-bold text-zinc-500">
            {final.score}/{final.maxScore} pkt
          </small>
        </div>
      </div>

      <h1 className="mt-7 bg-gradient-to-r from-pink-300 via-violet-200 to-cyan-200 bg-clip-text text-4xl font-black tracking-[-.055em] text-transparent sm:text-5xl">
        {final.title}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-zinc-400">{final.copy}</p>

      <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-3 rounded-3xl border border-white/10 bg-white/[.025] p-4">
        <PartyPlayAvatar id={game.playerA.avatar} size={52} />
        <div className="text-2xl text-pink-200">♡</div>
        <PartyPlayAvatar id={game.playerB.avatar} size={52} />
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <a
          href="/gry/tylko-my"
          className="rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 px-6 py-4 text-sm font-black text-white transition hover:brightness-110"
        >
          Zagrajcie jeszcze raz
        </a>
        <a
          href="/"
          className="rounded-2xl border border-white/12 bg-white/[.04] px-6 py-4 text-sm font-black text-zinc-300 transition hover:bg-white/[.08]"
        >
          Wróć do zaGRAj
        </a>
      </div>
    </div>
  );
}

function RoundIntro({
  round,
  onClose,
}: {
  round: number;
  onClose: () => void;
}) {
  const intro = ROUND_INTROS[round] ?? ROUND_INTROS[1];

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#07040d]/92 px-4 backdrop-blur-xl">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/12 bg-[#120b1d] p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,.6)] sm:p-8">
        <span className="text-[10px] font-black uppercase tracking-[.24em] text-pink-200">
          RUNDA {round}
        </span>
        <h2 className="mt-3 bg-gradient-to-r from-pink-300 via-violet-200 to-cyan-200 bg-clip-text text-3xl font-black tracking-[-.05em] text-transparent">
          {intro.title}
        </h2>
        <p className="mt-5 text-sm leading-7 text-zinc-300">{intro.copy}</p>
        <div className="mt-5 rounded-2xl border border-cyan-300/12 bg-cyan-300/[.045] px-4 py-3 text-xs font-bold leading-5 text-cyan-100">
          {intro.tip}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 px-6 py-4 text-sm font-black text-white"
        >
          {round === 1 ? "Zaczynamy →" : "Dalej →"}
        </button>
      </div>
    </div>
  );
}

export default function GameClient({ code }: { code: string }) {
  const [data, setData] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [revealCountdown, setRevealCountdown] = useState<number | null>(null);
  const [introRound, setIntroRound] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/gra/tylko-my/${code}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as GameState;
      setData(next);
    } catch {
      // Następne odświeżenie spróbuje ponownie.
    }
  }, [code]);

  const send = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      setError("");

      try {
        const response = await fetch(`/api/gra/tylko-my/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await response.json();

        if (!response.ok) {
          setError(result.error ?? "Coś poszło nie tak.");
          return false;
        }

        await load();
        return true;
      } catch {
        setError("Nie udało się połączyć z grą.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [code, load],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 1000);
    return () => window.clearInterval(timer);
  }, [load]);

  const game = data?.game;
  const question = game?.question ?? null;

  useEffect(() => {
    setSelectedAnswer(null);
  }, [game?.questionIndex]);

  useEffect(() => {
    if (!question || game?.finished) {
      setIntroRound(null);
      return;
    }

    if (game && ROUND_STARTS.has(game.questionIndex)) {
      setIntroRound(question.round);
    }
  }, [game?.finished, game?.questionIndex, question?.round]);

  useEffect(() => {
    if (!game?.revealed || game.finished) {
      setRevealCountdown(null);
      return;
    }

    setRevealCountdown(6);
    const interval = window.setInterval(() => {
      setRevealCountdown((value) => (value == null ? null : Math.max(0, value - 1)));
    }, 1000);

    const timer = data?.canAdvance
      ? window.setTimeout(() => {
          void send({ action: "next" });
        }, 6000)
      : null;

    return () => {
      window.clearInterval(interval);
      if (timer != null) window.clearTimeout(timer);
    };
  }, [data?.canAdvance, game?.finished, game?.questionIndex, game?.revealed, send]);

  const me = data?.role === "player" ? data.player ?? null : null;
  const mePerson =
    game && me
      ? me.id === game.playerA.id
        ? game.playerA
        : game.playerB
      : null;

  const otherPerson =
    game && mePerson
      ? mePerson.id === game.playerA.id
        ? game.playerB
        : game.playerA
      : null;

  const instruction = useMemo(() => {
    if (!question) return "";

    if (data?.role === "host") {
      if (question.type === "predict" && question.subject) {
        return `TYM RAZEM PYTANIE DOTYCZY: ${question.subject.name}`;
      }
      return question.eyebrow.toUpperCase();
    }

    if (!mePerson) return question.eyebrow.toUpperCase();

    if (question.type === "predict" && question.subject) {
      return question.subject.id === mePerson.id
        ? "ODPOWIEDZ O SOBIE"
        : `PRZEWIDŹ ODPOWIEDŹ: ${question.subject.name.toUpperCase()}`;
    }

    if (question.type === "who") return "KTO NAJBARDZIEJ PASUJE?";

    return "WYBIERZ SWOJĄ ODPOWIEDŹ";
  }, [data?.role, mePerson, question]);

  if (!data || !game) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#090611] text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-pink-300" />
          <p className="mt-4 text-sm font-bold text-zinc-500">Łączenie z grą…</p>
        </div>
      </main>
    );
  }

  const style = roundStyles[question?.round ?? 4] ?? roundStyles[4];
  const answeredA = game.submittedPlayerIds.includes(game.playerA.id);
  const answeredB = game.submittedPlayerIds.includes(game.playerB.id);
  const progress =
    game.finished || game.questionCount === 0
      ? 100
      : Math.round(((game.questionIndex + 1) / game.questionCount) * 100);

  return (
    <main className="min-h-screen overflow-hidden bg-[#090611] text-white">
      {introRound != null && !game.finished && (
        <RoundIntro round={introRound} onClose={() => setIntroRound(null)} />
      )}

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(244,114,182,.20),transparent_27%),radial-gradient(circle_at_88%_15%,rgba(34,211,238,.16),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(139,92,246,.14),transparent_32%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[.12] [background-image:linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] [background-size:48px_48px]" />

      <header className="relative z-10 border-b border-white/8 bg-[#090611]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="/gry/tylko-my" className="flex items-center gap-3">
            <img src="/zagraj-logo.webp" alt="zaGRAj" className="h-8 w-auto" />
            <span className="hidden h-5 w-px bg-white/10 sm:block" />
            <span className="hidden text-xs font-black tracking-[.08em] text-zinc-400 sm:block">
              TYLKO MY
            </span>
          </a>

          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-white/9 bg-white/[.035] px-3 py-2 text-right">
              <small className="block text-[7px] font-black uppercase tracking-[.16em] text-zinc-600">
                WSPÓLNY WYNIK
              </small>
              <strong className="text-sm font-black text-pink-100">♡ {game.projectedScore}</strong>
            </div>
            <div className="rounded-xl border border-white/9 bg-white/[.035] px-3 py-2 text-right">
              <small className="block text-[7px] font-black uppercase tracking-[.16em] text-zinc-600">
                KOD
              </small>
              <strong className="text-sm font-black tracking-[.16em] text-cyan-100">{code}</strong>
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-white/[.04]">
          <div
            className={"h-full bg-gradient-to-r transition-all duration-500 " + style.line}
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-9">
        {game.finished ? (
          <FinalScreen game={game} />
        ) : question ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <MiniPerson
                person={game.playerA}
                active={mePerson?.id === game.playerA.id}
                answered={answeredA}
              />
              <MiniPerson
                person={game.playerB}
                active={mePerson?.id === game.playerB.id}
                answered={answeredB}
              />
            </div>

            <section className="relative mt-4 overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#100b1b]/88 p-4 shadow-[0_28px_90px_rgba(0,0,0,.36)] backdrop-blur-xl sm:mt-5 sm:rounded-[2rem] sm:p-8">
              <div className={"pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 " + style.glow} />
              <div className="pointer-events-none absolute left-[8%] top-[18%] h-32 w-32 rounded-full border border-pink-200/10" />
              <div className="pointer-events-none absolute bottom-[12%] right-[7%] h-36 w-36 rounded-full border border-cyan-200/10" />

              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className={"text-[9px] font-black uppercase tracking-[.22em] " + style.label}>
                      RUNDA {question.round} · {question.roundLabel}
                    </span>
                    <p className="mt-1 text-[10px] font-bold text-zinc-600">
                      pytanie {game.questionIndex + 1} z {game.questionCount}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[9px] font-black uppercase tracking-[.13em] text-zinc-400">
                    {scoreLabel(question)}
                  </span>
                </div>

                <div className="mx-auto mt-7 max-w-3xl text-center sm:mt-9">
                  <p className={"text-[10px] font-black uppercase tracking-[.25em] " + style.label}>
                    {instruction}
                  </p>
                  <h1 className="mt-3 text-2xl font-black leading-tight tracking-[-.045em] sm:mt-4 sm:text-4xl">
                    {question.prompt}
                  </h1>
                  {question.type === "predict" && question.subject && (
                    <div className="mx-auto mt-5 inline-flex items-center gap-3 rounded-2xl border border-white/9 bg-black/20 px-4 py-3">
                      <PartyPlayAvatar id={question.subject.avatar} size={40} />
                      <div className="text-left">
                        <span className="block text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">
                          PYTANIE DOTYCZY
                        </span>
                        <strong className="mt-0.5 block text-sm font-black">{question.subject.name}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {!game.revealed && data.role === "player" ? (
                  <>
                    <div className="mx-auto mt-7 grid max-w-3xl gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-3">
                      {question.options.map((option, index) => {
                        const selected = selectedAnswer === option.value;
                        const locked = Boolean(game.viewerAnswer);

                        return (
                          <button
                            key={option.value}
                            type="button"
                            disabled={busy || locked}
                            onClick={() => setSelectedAnswer(option.value)}
                            className={
                              "group flex min-h-[70px] items-center rounded-2xl border px-4 py-3.5 text-left transition sm:min-h-[78px] sm:py-4 " +
                              (selected || game.viewerAnswer === option.value
                                ? "border-cyan-200/50 bg-cyan-300/[.12] text-white shadow-[0_0_34px_rgba(34,211,238,.10)]"
                                : locked
                                  ? "border-white/7 bg-white/[.018] text-zinc-600"
                                  : "border-white/10 bg-white/[.04] text-zinc-200 hover:-translate-y-0.5 hover:border-pink-200/30 hover:bg-white/[.07]")
                            }
                          >
                            <span className="mr-3 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/20 text-[10px] font-black text-white/45">
                              {index + 1}
                            </span>
                            <strong className="text-sm leading-5">{option.label}</strong>
                          </button>
                        );
                      })}
                    </div>

                    {!game.viewerAnswer && (
                      <div className="mx-auto mt-4 max-w-3xl">
                        <button
                          type="button"
                          disabled={!selectedAnswer || busy}
                          onClick={() =>
                            selectedAnswer &&
                            void send({
                              action: "answer",
                              questionIndex: game.questionIndex,
                              answer: selectedAnswer,
                            })
                          }
                          className="w-full rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 px-6 py-4 text-sm font-black text-white shadow-[0_16px_40px_rgba(236,72,153,.16)] transition disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          {busy ? "Zapisuję…" : "Zatwierdź odpowiedź"}
                        </button>
                        <p className="mt-2 text-center text-[10px] font-bold text-zinc-600">
                          Możesz zmienić wybór, dopóki go nie zatwierdzisz.
                        </p>
                      </div>
                    )}

                    {game.viewerAnswer && (
                      <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-emerald-300/15 bg-emerald-300/[.045] p-4 text-center">
                        <strong className="text-sm font-black text-emerald-200">✓ Odpowiedź zatwierdzona</strong>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          {game.answerCount < 2
                            ? `Czekamy na ${otherPerson?.name ?? "drugą osobę"}. Odpowiedzi pozostają ukryte.`
                            : "Obie odpowiedzi są gotowe. Odkrywamy wynik."}
                        </p>
                      </div>
                    )}
                  </>
                ) : !game.revealed ? (
                  <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/9 bg-black/20 p-6">
                    <div className="flex items-center justify-center gap-3">
                      {[game.playerA, game.playerB].map((person) => {
                        const done = game.submittedPlayerIds.includes(person.id);
                        return (
                          <div key={person.id} className="text-center">
                            <div
                              className={
                                "mx-auto grid h-14 w-14 place-items-center rounded-2xl border " +
                                (done
                                  ? "border-emerald-300/30 bg-emerald-300/[.08]"
                                  : "border-white/9 bg-white/[.03]")
                              }
                            >
                              {done ? (
                                <span className="text-xl text-emerald-200">✓</span>
                              ) : (
                                <span className="animate-pulse text-lg text-zinc-600">…</span>
                              )}
                            </div>
                            <span className="mt-2 block max-w-28 truncate text-[10px] font-black text-zinc-500">
                              {person.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-5 text-center text-sm font-bold text-zinc-500">
                      {game.answerCount}/2 odpowiedzi gotowych
                    </p>
                  </div>
                ) : null}

                {game.revealed && (
                  <div className="mx-auto mt-7 max-w-3xl sm:mt-8">
                    <ResultPanel game={game} />

                    <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.025] px-4 py-3 text-center">
                      <span className="text-xs font-bold text-zinc-400">
                        {game.questionIndex + 1 >= game.questionCount
                          ? `Wynik końcowy za ${revealCountdown ?? 0} s`
                          : `Następne pytanie za ${revealCountdown ?? 0} s`}
                      </span>
                    </div>

                    {data.canAdvance && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void send({ action: "next" })}
                        className="mt-2 w-full rounded-2xl border border-pink-300/18 bg-pink-300/[.06] px-6 py-3.5 text-xs font-black text-pink-100 transition hover:bg-pink-300/[.1] disabled:opacity-50"
                      >
                        {game.questionIndex + 1 >= game.questionCount
                          ? "Pokaż wynik teraz →"
                          : "Dalej teraz →"}
                      </button>
                    )}
                  </div>
                )}

                {error && (
                  <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-red-300/20 bg-red-400/[.06] px-4 py-3 text-center text-xs font-bold text-red-200">
                    {error}
                  </div>
                )}
              </div>
            </section>

            <p className="mt-4 text-center text-[10px] font-bold leading-5 text-zinc-700 sm:mt-5">
              Gracie tylko na swoich telefonach. Nie pokazujcie odpowiedzi przed ich odkryciem.
            </p>
          </>
        ) : (
          <div className="py-20 text-center text-zinc-500">Przygotowujemy wynik…</div>
        )}
      </div>
    </main>
  );
}
