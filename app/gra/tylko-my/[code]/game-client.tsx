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
        <h3 className="mt-3 text-2xl font-black tracking-[-.04em]">
          {result.matched ? "TEN SAM SYGNAŁ!" : "Tym razem inaczej"}
        </h3>
        <p className="mt-2 text-sm text-zinc-400">
          {result.matched
            ? `Wspólny wybór daje Wam +${result.points} pkt.`
            : "Bez punktu, ale za to macie temat do krótkiej dyskusji."}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-pink-200/15 bg-pink-300/[.045] p-4">
          <div className="flex items-center gap-3">
            <PartyPlayAvatar id={game.playerA.avatar} size={44} />
            <div>
              <span className="text-[9px] font-black uppercase tracking-[.15em] text-pink-200">
                {game.playerA.name}
              </span>
              <strong className="mt-1 block text-sm font-black text-white">{answerA}</strong>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-cyan-200/15 bg-cyan-300/[.045] p-4">
          <div className="flex items-center gap-3">
            <PartyPlayAvatar id={game.playerB.avatar} size={44} />
            <div>
              <span className="text-[9px] font-black uppercase tracking-[.15em] text-cyan-200">
                {game.playerB.name}
              </span>
              <strong className="mt-1 block text-sm font-black text-white">{answerB}</strong>
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
    <div className="mx-auto max-w-3xl py-10 text-center">
      <span className="inline-flex rounded-full border border-pink-300/20 bg-pink-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-pink-100">
        KONIEC GRY
      </span>

      <div className="relative mx-auto mt-8 grid h-40 w-40 place-items-center">
        <svg viewBox="0 0 128 128" className="absolute inset-0 h-full w-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="54"
            fill="none"
            stroke="rgba(255,255,255,.08)"
            strokeWidth="8"
          />
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
          <span className="block text-[10px] font-black uppercase tracking-[.15em] text-zinc-500">
            WSPÓLNY WYNIK
          </span>
          <strong className="mt-1 block text-4xl font-black">{final.score}</strong>
          <small className="text-xs font-bold text-zinc-500">z {final.maxScore} pkt</small>
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

export default function GameClient({ code }: { code: string }) {
  const [data, setData] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 1000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send(body: Record<string, unknown>) {
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
  }

  const game = data?.game;
  const question = game?.question ?? null;
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
        return `TYM RAZEM ODPOWIEDŹ DOTYCZY: ${question.subject.name}`;
      }
      return question.eyebrow.toUpperCase();
    }

    if (!mePerson) return question.eyebrow.toUpperCase();

    if (question.type === "predict" && question.subject) {
      return question.subject.id === mePerson.id
        ? "ODPOWIEDZ O SOBIE"
        : `JAK ODPOWIE ${question.subject.name.toUpperCase()}?`;
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

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
        {game.finished ? (
          <FinalScreen game={game} />
        ) : question ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
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

            <section
              className={
                "relative mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-[#100b1b]/88 p-5 shadow-[0_28px_90px_rgba(0,0,0,.36)] backdrop-blur-xl sm:p-8"
              }
            >
              <div
                className={
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 " + style.glow
                }
              />
              <div className="pointer-events-none absolute left-[8%] top-[18%] h-32 w-32 rounded-full border border-pink-200/10" />
              <div className="pointer-events-none absolute bottom-[12%] right-[7%] h-36 w-36 rounded-full border border-cyan-200/10" />

              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span
                      className={
                        "text-[9px] font-black uppercase tracking-[.22em] " + style.label
                      }
                    >
                      RUNDA {question.round} · {question.roundLabel}
                    </span>
                    <p className="mt-1 text-[10px] font-bold text-zinc-600">
                      pytanie {game.questionIndex + 1} z {game.questionCount}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[9px] font-black uppercase tracking-[.13em] text-zinc-400">
                    zgodność +{question.points} {question.points === 1 ? "pkt" : "pkt"}
                  </span>
                </div>

                <div className="mx-auto mt-9 max-w-3xl text-center">
                  <p className={"text-[10px] font-black uppercase tracking-[.25em] " + style.label}>
                    {instruction}
                  </p>
                  <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-.045em] sm:text-4xl">
                    {question.prompt}
                  </h1>
                  {question.type === "predict" && question.subject && (
                    <div className="mx-auto mt-5 inline-flex items-center gap-3 rounded-2xl border border-white/9 bg-black/20 px-4 py-3">
                      <PartyPlayAvatar id={question.subject.avatar} size={40} />
                      <div className="text-left">
                        <span className="block text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">
                          PYTANIE DOTYCZY
                        </span>
                        <strong className="mt-0.5 block text-sm font-black">
                          {question.subject.name}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {!game.revealed && data.role === "player" ? (
                  <>
                    <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
                      {question.options.map((option, index) => {
                        const selected = game.viewerAnswer === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            disabled={busy || Boolean(game.viewerAnswer)}
                            onClick={() =>
                              void send({
                                action: "answer",
                                questionIndex: game.questionIndex,
                                answer: option.value,
                              })
                            }
                            className={
                              "group flex min-h-[78px] items-center rounded-2xl border px-4 py-4 text-left transition " +
                              (selected
                                ? "border-cyan-200/50 bg-cyan-300/[.12] text-white shadow-[0_0_34px_rgba(34,211,238,.10)]"
                                : game.viewerAnswer
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

                    {game.viewerAnswer && (
                      <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-emerald-300/15 bg-emerald-300/[.045] p-4 text-center">
                        <strong className="text-sm font-black text-emerald-200">
                          ✓ Odpowiedź zapisana
                        </strong>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                          {game.answerCount < 2
                            ? `Czekamy jeszcze na ${otherPerson?.name ?? "drugą osobę"}. Niczego nie podglądamy.`
                            : "Obie odpowiedzi są gotowe. Za chwilę je odkrywamy."}
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
                  <div className="mx-auto mt-8 max-w-3xl">
                    <ResultPanel game={game} />

                    {data.canAdvance ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void send({ action: "next" })}
                        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 px-6 py-4 text-sm font-black text-white shadow-[0_18px_45px_rgba(236,72,153,.18)] transition hover:brightness-110 disabled:opacity-50"
                      >
                        {game.questionIndex + 1 >= game.questionCount
                          ? "Pokaż wynik końcowy →"
                          : "Następne pytanie →"}
                      </button>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.025] px-4 py-4 text-center text-xs font-bold text-zinc-500">
                        Odpowiedzi odkryte. Za chwilę przechodzicie dalej.
                      </div>
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

            <p className="mt-5 text-center text-[10px] font-bold leading-5 text-zinc-700">
              Odpowiadajcie osobno. Rozbieżność nie jest porażką, tylko częścią zabawy.
            </p>
          </>
        ) : (
          <div className="py-20 text-center text-zinc-500">Przygotowujemy wynik…</div>
        )}
      </div>
    </main>
  );
}
