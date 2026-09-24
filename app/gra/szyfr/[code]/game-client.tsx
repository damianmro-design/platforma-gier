"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PartyPlayAvatar } from "@/components/partyplay-avatar";
import type { SzyfrState } from "@/lib/szyfr-db";

type ApiState = {
  room: { code: string; status: string; phase: string | null };
  game: SzyfrState;
};

const fragmentLabels = ["TRANSMISJA", "BAZA", "KONTAKTY", "KLUCZ"];

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function resultTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes} min ${rest} s` : `${rest} s`;
}

function eventMessage(type: string) {
  if (type === "wrong_answer") return "To nie jest właściwy kod. −20 sekund.";
  if (type === "hint_used") return "Podpowiedź odszyfrowana. −30 sekund.";
  if (type === "stage_complete") return "Etap rozwiązany. Dane zapisane.";
  if (type === "mission_complete") return "Misja zakończona. Odzyskaliście fragment klucza.";
  if (type === "tutorial_complete") {
    return "Właśnie tak działa SZYFR. Każdy z Was wie coś innego. Rozmawiajcie — drobna informacja może być brakującym elementem wskazówki innego gracza.";
  }
  if (type === "time_expired") return "Czas operacji minął.";
  return "";
}

export default function GameClient({ code }: { code: string }) {
  const [data, setData] = useState<ApiState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [answer, setAnswer] = useState("");
  const [order, setOrder] = useState<string[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [banner, setBanner] = useState("");
  const clockOffset = useRef(0);
  const lastStep = useRef("");
  const lastEventId = useRef("");
  const lastWarnSecond = useRef<number | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/gra/szyfr/${code}`, { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          window.location.assign(`/pokoj/${code}`);
          return;
        }
        throw new Error(result.error ?? "Nie udało się odświeżyć gry.");
      }

      const next = (await response.json()) as ApiState;
      clockOffset.current = new Date(next.game.serverNow).getTime() - Date.now();
      setData(next);
      setConnectionIssue(false);
    } catch {
      setConnectionIssue(true);
    }
  }, [code]);

  useEffect(() => {
    const saved = window.localStorage.getItem("szyfr_sound");
    if (saved === "off") setSoundOn(false);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 850);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!data?.game.endsAt || data.game.phase === "tutorial") {
        setSecondsLeft(0);
        return;
      }
      const now = Date.now() + clockOffset.current;
      const remaining = Math.max(0, new Date(data.game.endsAt).getTime() - now);
      setSecondsLeft(Math.ceil(remaining / 1000));
    }, 150);
    return () => window.clearInterval(timer);
  }, [data?.game.endsAt, data?.game.phase]);

  useEffect(() => {
    const stepKey = data?.game.puzzle.stepKey ?? "";
    if (stepKey && stepKey !== lastStep.current) {
      lastStep.current = stepKey;
      setAnswer("");
      setOrder([]);
      setError("");
    }
  }, [data?.game.puzzle.stepKey]);

  const tone = useCallback(
    (frequency: number, duration = 0.08, gain = 0.045) => {
      if (!soundOn) return;
      try {
        const Ctx = window.AudioContext;
        const ctx = audioContext.current ?? new Ctx();
        audioContext.current = ctx;
        const oscillator = ctx.createOscillator();
        const volume = ctx.createGain();
        oscillator.frequency.value = frequency;
        oscillator.type = "sine";
        volume.gain.value = gain;
        oscillator.connect(volume);
        volume.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + duration);
      } catch {
        // Dźwięk jest dodatkiem. Gra działa także bez Web Audio.
      }
    },
    [soundOn],
  );

  useEffect(() => {
    const eventId = String(data?.game.lastEvent?.eventId ?? "");
    const type = String(data?.game.lastEvent?.type ?? "");
    if (!eventId || eventId === lastEventId.current) return;
    lastEventId.current = eventId;

    const message = eventMessage(type);
    if (message) {
      setBanner(message);
      window.setTimeout(() => setBanner(""), type === "tutorial_complete" ? 6500 : 2600);
    }

    if (type === "wrong_answer") tone(170, 0.13, 0.055);
    if (type === "stage_complete" || type === "mission_complete" || type === "tutorial_complete") {
      tone(620, 0.09);
      window.setTimeout(() => tone(830, 0.11), 100);
    }
    if (type === "game_complete") {
      tone(520, 0.1);
      window.setTimeout(() => tone(720, 0.1), 120);
      window.setTimeout(() => tone(930, 0.18), 240);
    }
  }, [data?.game.lastEvent, tone]);

  useEffect(() => {
    if (!data || !soundOn || !["playing", "final"].includes(data.game.phase)) return;
    if (secondsLeft === 60 && lastWarnSecond.current !== 60) {
      lastWarnSecond.current = 60;
      tone(430, 0.18, 0.04);
      return;
    }
    if (secondsLeft <= 10 && secondsLeft > 0 && lastWarnSecond.current !== secondsLeft) {
      lastWarnSecond.current = secondsLeft;
      tone(secondsLeft <= 3 ? 720 : 520, 0.06, 0.035);
    }
    if (secondsLeft > 60) lastWarnSecond.current = null;
  }, [data, secondsLeft, soundOn, tone]);

  async function send(body: Record<string, unknown>) {
    if (busy) return null;
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/gra/szyfr/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "Nie udało się wykonać tej akcji.");
        await load();
        return null;
      }
      if (navigator.vibrate) navigator.vibrate(20);
      await load();
      return result;
    } catch {
      setError("Połączenie zostało przerwane. Spróbuj ponownie.");
      setConnectionIssue(true);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const puzzle = data?.game.puzzle;
    if (!puzzle || !data?.game.viewer) return;

    const value = puzzle.answerType === "order" ? order.join("") : answer.trim();
    if (!value) {
      setError("Najpierw podajcie wspólną odpowiedź.");
      return;
    }

    await send({ action: "answer", stepKey: puzzle.stepKey, answer: value });
  }

  async function requestHint() {
    const puzzle = data?.game.puzzle;
    if (!puzzle || !data.game.viewer) return;
    const confirmed = window.confirm("Użycie podpowiedzi kosztuje 30 sekund. Użyć?");
    if (!confirmed) return;
    await send({ action: "hint", stepKey: puzzle.stepKey });
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    window.localStorage.setItem("szyfr_sound", next ? "on" : "off");
    if (next) tone(560, 0.07);
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#041113] px-5 text-white">
        <div className="w-full max-w-sm rounded-[2rem] border border-teal-300/15 bg-[#07191d] p-7 text-center shadow-2xl">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full border-2 border-teal-300/30 border-t-teal-200" />
          <h1 className="mt-5 text-xl font-black">Odzyskujemy stan operacji…</h1>
          <p className="mt-2 text-sm leading-6 text-cyan-100/55">
            Synchronizujemy etap, prywatne wskazówki i serwerowy zegar.
          </p>
        </div>
      </main>
    );
  }

  const game = data.game;
  const puzzle = game.puzzle;
  const eventType = String(game.lastEvent?.type ?? "");
  const progress = Math.max(0, Math.min(100, ((game.stepIndex - 1) / (game.stepCount - 1)) * 100));
  const isUrgent = secondsLeft > 0 && secondsLeft <= 60;
  const answerReady =
    puzzle.answerType === "order"
      ? order.length === puzzle.options.length
      : Boolean(answer.trim());
  const missionStage =
    puzzle.missionIndex === 0
      ? "TRENING"
      : puzzle.missionIndex === 5
        ? "FINAŁ"
        : `MISJA ${puzzle.missionIndex} · ETAP ${puzzle.stageIndex}/2`;

  if (game.phase === "finished" || game.phase === "failed") {
    const success = game.phase === "finished";
    return (
      <main className="min-h-screen overflow-hidden bg-[#041113] text-white">
        <Backdrop />
        <Header
          code={code}
          label={success ? "OPERACJA ZAKOŃCZONA" : "SYSTEM ZAMKNIĘTY"}
          soundOn={soundOn}
          toggleSound={toggleSound}
        />
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-58px)] max-w-2xl items-center px-4 py-10">
          <div className="w-full rounded-[2rem] border border-cyan-200/12 bg-[#07191d]/94 p-6 text-center shadow-[0_35px_100px_rgba(0,0,0,.5)] sm:p-9">
            <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl border text-3xl ${success ? "border-teal-300/25 bg-teal-300/[.08] text-teal-200" : "border-red-300/20 bg-red-300/[.07] text-red-200"}`}>
              {success ? "✓" : "×"}
            </div>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[.28em] text-cyan-300/60">
              {success ? "STATUS: ODEBRANO" : "STATUS: WYMAZANO"}
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-.055em] sm:text-5xl">
              {success ? "TRANSMISJA ODSZYFROWANA" : "DANE ZOSTAŁY USUNIĘTE"}
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-cyan-50/55">
              {success
                ? "Klucz został odtworzony, a przechwycona wiadomość zabezpieczona."
                : "Zegar bezpieczeństwa doszedł do zera. Możecie spróbować ponownie z tym samym zestawem albo uruchomić nową operację."}
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="CZAS" value={game.mainStartedAt ? resultTime(game.elapsedSeconds) : "—"} />
              <Stat label="BŁĘDY" value={String(game.wrongAttempts)} />
              <Stat label="PODPOWIEDZI" value={String(game.hintsUsed)} />
              <Stat label="WYNIK" value={success ? String(game.score ?? 0) : "—"} />
            </div>

            {game.isHost ? (
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ action: "retry" })}
                  className="rounded-2xl border border-cyan-200/14 bg-cyan-200/[.06] px-5 py-4 text-sm font-black text-cyan-50 transition hover:bg-cyan-200/[.1] disabled:opacity-50"
                >
                  Spróbuj ponownie
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send({ action: "rematch" })}
                  className="rounded-2xl bg-gradient-to-r from-teal-300 via-cyan-300 to-sky-400 px-5 py-4 text-sm font-black text-[#032024] transition hover:brightness-110 disabled:opacity-50"
                >
                  Nowa misja
                </button>
              </div>
            ) : (
              <p className="mt-7 rounded-2xl border border-cyan-200/8 bg-black/20 p-4 text-xs font-bold text-cyan-50/45">
                Host może uruchomić ponowną próbę lub nowy zestaw misji.
              </p>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link href="/gry/szyfr" className="rounded-xl border border-white/8 bg-white/[.03] px-4 py-3 text-xs font-black text-white/60">
                Wróć do SZYFR
              </Link>
              <Link href="/" className="rounded-xl border border-white/8 bg-white/[.03] px-4 py-3 text-xs font-black text-white/60">
                Strona główna zaGRAj
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#041113] text-white">
      <Backdrop />
      <Header code={code} label={missionStage} soundOn={soundOn} toggleSound={toggleSound} />

      {connectionIssue && (
        <div className="relative z-30 border-b border-orange-300/15 bg-orange-400/10 px-4 py-2 text-center text-[11px] font-bold text-orange-100">
          Słabsze połączenie. Zostajesz w operacji, próbujemy ponownie zsynchronizować stan…
        </div>
      )}

      {banner && (
        <div className="fixed left-1/2 top-20 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-teal-200/20 bg-[#082126]/96 p-4 text-center text-xs font-black leading-5 text-teal-50 shadow-2xl backdrop-blur-xl">
          {banner}
        </div>
      )}

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:px-6">
        <section className="overflow-hidden rounded-2xl border border-cyan-200/9 bg-[#061519]/75">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-[9px] font-black uppercase tracking-[.2em] text-teal-300/60">
                {puzzle.missionName}
              </p>
              <p className="mt-0.5 truncate text-xs font-black text-cyan-50/80">{puzzle.title}</p>
            </div>
            {game.phase === "tutorial" ? (
              <span className="rounded-xl border border-teal-300/12 bg-teal-300/[.06] px-3 py-2 text-[10px] font-black text-teal-100">
                BEZ CZASU
              </span>
            ) : (
              <div className={`rounded-xl border px-3 py-2 text-right ${isUrgent ? "border-red-300/25 bg-red-300/[.08]" : "border-cyan-200/10 bg-cyan-200/[.045]"}`}>
                <span className="block text-[7px] font-black uppercase tracking-[.16em] text-cyan-100/40">POZOSTAŁO</span>
                <strong className={`font-mono text-sm ${isUrgent ? "text-red-200" : "text-cyan-100"}`}>{formatTime(secondsLeft)}</strong>
              </div>
            )}
          </div>
          <div className="h-1 bg-white/[.03]">
            <div className="h-full bg-gradient-to-r from-teal-300 to-cyan-400 transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {fragmentLabels.map((label, index) => (
            <div key={label} className="rounded-xl border border-cyan-200/8 bg-[#061519]/65 px-2 py-2.5 text-center">
              <span className="block truncate text-[7px] font-black uppercase tracking-[.08em] text-cyan-100/30">{label}</span>
              <strong className={`mt-1 block text-lg ${game.fragments[index] == null ? "text-cyan-100/12" : "text-teal-200"}`}>
                {game.fragments[index] ?? "•"}
              </strong>
            </div>
          ))}
        </div>

        <section data-step-key={puzzle.stepKey} className="mt-3 overflow-hidden rounded-[1.8rem] border border-cyan-200/12 bg-[#07191d]/94 shadow-[0_28px_90px_rgba(0,0,0,.42)]">
          <div className="border-b border-cyan-200/8 bg-gradient-to-r from-teal-300/[.06] via-cyan-300/[.025] to-transparent p-5">
            <p className="text-[9px] font-black uppercase tracking-[.22em] text-teal-300/60">
              CEL ETAPU
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-[-.035em]">{puzzle.prompt}</h1>
            <p className="mt-2 text-xs font-bold text-cyan-50/42">{puzzle.answerFormat}</p>
          </div>

          <div className="p-5 sm:p-7">
            {game.viewer ? (
              <>
                <div className="rounded-2xl border border-teal-300/16 bg-teal-300/[.055] p-4">
                  <div className="flex items-center gap-3">
                    <PartyPlayAvatar id={game.viewer.avatar} size={42} />
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[.18em] text-teal-300/55">PRYWATNE DANE · {game.viewer.name}</p>
                      <p className="mt-0.5 text-xs font-bold text-teal-50/55">
                        Masz {puzzle.viewerClues} z {puzzle.totalClues} fragmentów zespołu.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {puzzle.privateClues.map((clue, index) => (
                      <div key={`${clue}-${index}`} className="rounded-xl border border-teal-200/10 bg-black/25 p-4 font-mono text-sm font-bold leading-6 text-teal-100">
                        <span className="mr-2 text-teal-300/45">0{index + 1}</span>
                        {clue}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-orange-200/12 bg-orange-300/[.045] px-4 py-3 text-xs font-black leading-5 text-orange-100/75">
                  Nie pokazuj ekranu innym. Opisz im to, co widzisz.
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-cyan-200/10 bg-cyan-200/[.035] p-5 text-center">
                <p className="text-sm font-black">Tryb obserwatora hosta</p>
                <p className="mt-2 text-xs leading-6 text-cyan-50/45">
                  Prywatne wskazówki widzą wyłącznie gracze, którzy dołączyli do pokoju.
                </p>
              </div>
            )}

            {game.hints.length > 0 && (
              <div className="mt-4 space-y-2">
                {game.hints.map((hint, index) => (
                  <div key={hint} className="rounded-xl border border-violet-300/15 bg-violet-300/[.055] p-4 text-sm font-bold leading-6 text-violet-100">
                    <span className="mr-2 text-[9px] font-black uppercase tracking-[.15em] text-violet-300">PODPOWIEDŹ {index + 1}</span>
                    {hint}
                  </div>
                ))}
              </div>
            )}

            {game.viewer && (
              <form onSubmit={submit} className="mt-5">
                <AnswerPanel
                  game={game}
                  answer={answer}
                  setAnswer={setAnswer}
                  order={order}
                  setOrder={setOrder}
                />
                <button
                  type="submit"
                  disabled={busy || !answerReady}
                  className="mt-3 w-full rounded-2xl bg-gradient-to-r from-teal-300 via-cyan-300 to-sky-400 px-5 py-4 text-sm font-black text-[#032024] shadow-[0_16px_50px_rgba(45,212,191,.13)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {busy ? "Weryfikacja…" : "Sprawdź wspólną odpowiedź →"}
                </button>
              </form>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-300/15 bg-red-400/[.06] px-4 py-3 text-xs font-bold leading-5 text-red-200">
                {error}
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowRules(true)}
                className="rounded-xl border border-cyan-200/9 bg-white/[.025] px-3 py-3 text-[10px] font-black text-cyan-50/55"
              >
                Instrukcja
              </button>
              <button
                type="button"
                disabled={!game.viewer || game.phase === "tutorial" || game.hintLevel >= 2 || busy}
                onClick={() => void requestHint()}
                className="rounded-xl border border-violet-300/12 bg-violet-300/[.04] px-3 py-3 text-[10px] font-black text-violet-100/65 disabled:opacity-30"
              >
                {game.hintLevel >= 2 ? "Brak podpowiedzi" : "Podpowiedź · −30 s"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="BŁĘDY" value={String(game.wrongAttempts)} compact />
          <Stat label="PODPOWIEDZI" value={String(game.hintsUsed)} compact />
          <Stat label="POSTĘP" value={`${Math.max(0, game.stepIndex - 1)}/${game.stepCount - 1}`} compact />
        </section>

        {eventType === "wrong_answer" && (
          <p className="sr-only" role="status">To nie jest właściwy kod.</p>
        )}
      </div>

      {showRules && (
        <RulesModal
          onClose={() => setShowRules(false)}
          tutorial={game.phase === "tutorial"}
        />
      )}
    </main>
  );
}

function AnswerPanel({
  game,
  answer,
  setAnswer,
  order,
  setOrder,
}: {
  game: SzyfrState;
  answer: string;
  setAnswer: (value: string) => void;
  order: string[];
  setOrder: (value: string[]) => void;
}) {
  const puzzle = game.puzzle;

  if (puzzle.answerType === "choice") {
    return (
      <div>
        <p className="mb-2 text-[9px] font-black uppercase tracking-[.18em] text-cyan-100/38">{puzzle.answerFormat}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {puzzle.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setAnswer(option)}
              className={`rounded-xl border px-4 py-3.5 text-sm font-black transition ${answer === option ? "border-teal-200/45 bg-teal-300 text-[#032024]" : "border-cyan-200/10 bg-black/20 text-cyan-50/75"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (puzzle.answerType === "order") {
    const remaining = puzzle.options.filter((item) => !order.includes(item));
    return (
      <div>
        <p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-100/38">{puzzle.answerFormat}</p>
        <div className="mt-2 min-h-16 rounded-xl border border-cyan-200/10 bg-black/20 p-3">
          {order.length === 0 ? (
            <p className="py-2 text-center text-xs font-bold text-cyan-50/25">Dotykaj kryptonimów w ustalonej kolejności.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {order.map((item, index) => (
                <span key={item} className="rounded-lg border border-teal-200/15 bg-teal-300/[.08] px-3 py-2 text-xs font-black text-teal-100">
                  {index + 1}. {item}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {remaining.map((item) => (
            <button key={item} type="button" onClick={() => setOrder([...order, item])} className="rounded-xl border border-cyan-200/10 bg-cyan-200/[.04] px-3 py-3 text-xs font-black text-cyan-50/75">
              + {item}
            </button>
          ))}
          {order.length > 0 && (
            <button type="button" onClick={() => setOrder(order.slice(0, -1))} className="rounded-xl border border-red-200/10 bg-red-200/[.035] px-3 py-3 text-xs font-black text-red-100/65">
              Cofnij
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="szyfr-answer" className="mb-2 block text-[9px] font-black uppercase tracking-[.18em] text-cyan-100/38">
        {puzzle.answerFormat}
      </label>
      <input
        id="szyfr-answer"
        value={answer}
        onChange={(event) => {
          const next =
            puzzle.answerType === "number"
              ? event.target.value.replace(/\D/g, "").slice(0, 8)
              : event.target.value.slice(0, 40);
          setAnswer(next);
        }}
        inputMode={puzzle.answerType === "number" ? "numeric" : "text"}
        autoComplete="off"
        spellCheck={false}
        placeholder={puzzle.answerType === "number" ? "••••" : "Wpisz hasło"}
        className="w-full rounded-2xl border border-cyan-200/12 bg-black/25 px-5 py-4 text-center font-mono text-2xl font-black uppercase tracking-[.18em] text-white outline-none placeholder:text-cyan-100/12 focus:border-teal-300/45 focus:ring-4 focus:ring-teal-300/10"
      />
    </div>
  );
}

function Header({
  code,
  label,
  soundOn,
  toggleSound,
}: {
  code: string;
  label: string;
  soundOn: boolean;
  toggleSound: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-cyan-200/9 bg-[#031014]/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-14 max-w-3xl items-center justify-between gap-2 px-4 py-2">
        <Link href="/gry/szyfr" className="shrink-0" aria-label="Wróć do SZYFR">
          <img src="/zagraj-logo.webp" alt="zaGRAj" className="h-7 w-auto" />
        </Link>
        <div className="min-w-0 text-center">
          <p className="truncate text-[8px] font-black uppercase tracking-[.18em] text-teal-300/60">SZYFR</p>
          <p className="mt-0.5 truncate text-[10px] font-black text-cyan-50/75">{label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={toggleSound} aria-label={soundOn ? "Wyłącz dźwięk" : "Włącz dźwięk"} className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-200/9 bg-cyan-200/[.04] text-sm">
            {soundOn ? "♪" : "×"}
          </button>
          <div className="rounded-xl border border-cyan-200/9 bg-cyan-200/[.04] px-2.5 py-1.5 text-right">
            <span className="block text-[7px] font-black uppercase tracking-[.14em] text-cyan-100/35">KOD</span>
            <strong className="block text-xs tracking-[.12em] text-cyan-100">{code}</strong>
          </div>
        </div>
      </div>
    </header>
  );
}

function Backdrop() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(45,212,191,.18),transparent_34%),radial-gradient(circle_at_100%_70%,rgba(14,165,233,.10),transparent_28%),linear-gradient(180deg,#041113,#02090c_60%,#020608)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[.1] [background-image:linear-gradient(rgba(94,234,212,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(94,234,212,.12)_1px,transparent_1px)] [background-size:34px_34px]" />
    </>
  );
}

function Stat({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-cyan-200/8 bg-[#061519]/70 ${compact ? "px-2 py-3" : "p-4"}`}>
      <span className="block text-[7px] font-black uppercase tracking-[.15em] text-cyan-100/30">{label}</span>
      <strong className={`mt-1 block font-black text-cyan-50 ${compact ? "text-sm" : "text-lg"}`}>{value}</strong>
    </div>
  );
}

function RulesModal({
  onClose,
  tutorial,
}: {
  onClose: () => void;
  tutorial: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-[1.8rem] border border-cyan-200/12 bg-[#07191d] p-5 shadow-2xl sm:p-7">
        <p className="text-[9px] font-black uppercase tracking-[.22em] text-teal-300">ZASADY SZYFRU</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-.035em]">
          {tutorial ? "Najpierw krótki trening." : "Rozmawiajcie, nie pokazujcie ekranów."}
        </h2>
        <div className="mt-5 space-y-3 text-sm leading-6 text-cyan-50/60">
          <p>Każdy gracz widzi inne fragmenty informacji. Wszystkie potrzebne wskazówki są rozdzielone między telefony.</p>
          <p>Możecie czytać i opisywać sobie wszystko, co widzicie. Nie pokazujcie jednak ekranów — komunikacja jest częścią zagadki.</p>
          <p>Gdy zespół ustali odpowiedź, dowolny gracz może ją wysłać. Jedna błędna próba nie kończy gry.</p>
          {!tutorial && <p>Błędna odpowiedź kosztuje 20 sekund. Każdy etap ma 2 podpowiedzi, każda kosztuje 30 sekund.</p>}
          <p>Odświeżenie strony lub chwilowa utrata internetu nie resetuje gry ani czasu. Stan przechowuje serwer.</p>
        </div>
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl bg-gradient-to-r from-teal-300 to-cyan-300 px-5 py-3.5 text-sm font-black text-[#032024]">
          Wracam do operacji
        </button>
      </div>
    </div>
  );
}
