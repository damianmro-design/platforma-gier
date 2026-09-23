"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { PartyPlayAvatar } from "@/components/partyplay-avatar";
import {
  ZH_ALPHABET,
  ZH_VOWELS,
  ZH_WHEEL_SEGMENTS,
  type ZhGameState,
  type ZhLastEvent,
  type ZhPlayerScore,
} from "@/lib/zakrecone-haslo";

type RoomInfo = {
  code: string;
  status: string;
  phase: string | null;
};

type Player = {
  id: string;
  display_name: string;
  avatar: string;
  team: "A" | "B" | null;
  ready: boolean;
};

type HostState = {
  role: "host";
  room: RoomInfo;
  game: ZhGameState;
  canAutoAdvance?: boolean;
};

type PlayerState = {
  role: "player";
  room: RoomInfo;
  player: Player;
  game: ZhGameState;
  canAutoAdvance?: boolean;
};

type GameState = HostState | PlayerState;

const DIFFICULTY: Record<number, string> = {
  1: "ŁATWE",
  2: "ŚREDNIE",
  3: "TRUDNE",
};

const WHEEL_GRADIENT =
  "conic-gradient(from -10deg,#8b5cf6 0deg 20deg,#ec4899 20deg 40deg,#22d3ee 40deg 60deg,#f59e0b 60deg 80deg,#7c3aed 80deg 100deg,#10b981 100deg 120deg,#e11d48 120deg 140deg,#3b82f6 140deg 160deg,#a855f7 160deg 180deg,#f97316 180deg 200deg,#06b6d4 200deg 220deg,#8b5cf6 220deg 240deg,#ec4899 240deg 260deg,#22c55e 260deg 280deg,#f59e0b 280deg 300deg,#7c3aed 300deg 320deg,#ef4444 320deg 340deg,#3b82f6 340deg 360deg)";

const WHEEL_SPIN_MS = 6000;
const WHEEL_REVEAL_MS = 7000;

function wheelRotation(segmentIndex?: number | null) {
  if (segmentIndex == null || segmentIndex < 0) return 0;
  const segmentAngle = 360 / ZH_WHEEL_SEGMENTS.length;
  return -segmentIndex * segmentAngle - segmentAngle / 2;
}

function isWheelEvent(event: ZhLastEvent) {
  return event?.type === "spin" || event?.type === "bankrupt" || event?.type === "pass";
}

function useWheelSpinning(game: ZhGameState) {
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!isWheelEvent(game.lastEvent) || game.lastEvent?.segmentIndex == null) {
      setSpinning(false);
      return;
    }

    setSpinning(true);
    const timer = window.setTimeout(() => setSpinning(false), WHEEL_REVEAL_MS);
    return () => window.clearTimeout(timer);
  }, [game.lastEvent?.at, game.lastEvent?.segmentIndex, game.lastEvent?.type]);

  return spinning;
}

function hasUnusedConsonants(game: ZhGameState) {
  return ZH_ALPHABET.some((letter) => !ZH_VOWELS.has(letter) && !game.usedLetters.includes(letter));
}

function hasUnusedVowels(game: ZhGameState) {
  return [...ZH_VOWELS].some((letter) => !game.usedLetters.includes(letter));
}

function scoreFor(player: ZhPlayerScore) {
  return Number(player.displayScore ?? player.totalScore + player.roundScore);
}

function formatPhrase(phrase: string) {
  const words = phrase.split(" ");
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-3">
      {words.map((word, wordIndex) => (
        <span key={`${word}-${wordIndex}`} className="inline-flex gap-1.5">
          {[...word].map((character, index) => {
            const hidden = character === "□";
            const letter = /^[A-ZĄĆĘŁŃÓŚŹŻ]$/i.test(character);
            return letter || hidden ? (
              <span
                key={`${character}-${index}`}
                className={`grid h-12 min-w-10 place-items-center rounded-xl border text-2xl font-black uppercase sm:h-16 sm:min-w-12 sm:text-3xl ${
                  hidden
                    ? "border-violet-300/45 bg-gradient-to-b from-violet-400/20 to-fuchsia-400/10 text-transparent shadow-[inset_0_0_18px_rgba(139,92,246,.14),0_0_18px_rgba(139,92,246,.10)]"
                    : "border-cyan-200/65 bg-gradient-to-br from-violet-500/45 via-fuchsia-500/30 to-cyan-400/25 text-white shadow-[inset_0_0_20px_rgba(255,255,255,.06),0_0_26px_rgba(34,211,238,.16)]"
                }`}
              >
                {hidden ? "•" : character}
              </span>
            ) : (
              <span key={`${character}-${index}`} className="grid h-12 min-w-4 place-items-center text-2xl font-black text-zinc-400 sm:h-16">
                {character}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
}

function EventBanner({ event, compact = false }: { event: ZhLastEvent; compact?: boolean }) {
  if (!event) return null;

  let icon = "✦";
  let title = "";
  let copy = "";

  if (event.type === "spin") {
    icon = "🎡";
    title = `${event.playerName ?? "Gracz"} zakręcił kołem`;
    copy = `Wynik: ${event.label ?? event.value ?? ""}`;
  } else if (event.type === "bankrupt") {
    icon = "💥";
    title = "BANKRUT";
    copy = `${event.playerName ?? "Gracz"} traci punkty zdobyte w tej rundzie.`;
  } else if (event.type === "pass") {
    icon = "↪";
    title = "PAS";
    copy = "Kolejka przechodzi do następnej osoby.";
  } else if (event.type === "letter") {
    icon = event.correct ? "✓" : "✕";
    title = event.correct
      ? `Litera ${event.letter} występuje ${event.count ?? 0}×`
      : `Nie ma litery ${event.letter}`;
    copy = event.correct
      ? `+${event.points ?? 0} pkt dla ${event.playerName ?? "gracza"}`
      : "Kolejka przechodzi dalej.";
  } else if (event.type === "vowel") {
    icon = event.correct ? "✓" : "✕";
    title = event.correct
      ? `Samogłoska ${event.letter} występuje ${event.count ?? 0}×`
      : `Nie ma samogłoski ${event.letter}`;
    copy = "Zakup kosztował 200 pkt.";
  } else if (event.type === "solve") {
    icon = event.correct ? "🏆" : "✕";
    title = event.correct ? "HASŁO ODGADNIĘTE!" : "To nie jest poprawne hasło";
    copy = event.correct
      ? `${event.playerName ?? "Gracz"} zdobywa bonus ${event.bonus ?? 1000} pkt.`
      : "Kolej przechodzi do następnej osoby.";
  } else if (event.type === "round_start") {
    icon = "🎬";
    title = `Runda ${event.round ?? ""}`;
    copy = "Nowe hasło. Nowa szansa.";
  } else if (event.type === "game_over") {
    icon = "🏁";
    title = "Koniec gry";
    copy = "Mamy końcową klasyfikację.";
  }

  if (!title) return null;

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[.035] ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-3">
        <span className={compact ? "text-xl" : "text-2xl"}>{icon}</span>
        <div className="min-w-0">
          <strong className="block text-sm font-black text-white">{title}</strong>
          {copy && <span className="mt-0.5 block text-xs leading-5 text-zinc-400">{copy}</span>}
        </div>
      </div>
    </div>
  );
}

function PlayerAvatar({ player, small = false }: { player: { avatar: string; displayName?: string; display_name?: string }; small?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] ${small ? "h-10 w-10" : "h-12 w-12"}`}>
      <PartyPlayAvatar id={player.avatar} size={small ? 38 : 46} />
    </span>
  );
}

function ScoreList({ game }: { game: ZhGameState }) {
  const sorted = [...game.players].sort((a, b) => scoreFor(b) - scoreFor(a));

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((player) => {
        const placement = 1 + sorted.filter((item) => scoreFor(item) > scoreFor(player)).length;
        const active = player.id === game.activePlayerId && game.mode !== "round_over" && game.mode !== "game_over";
        return (
          <article
            key={player.id}
            className={`flex items-center gap-3 rounded-2xl border p-3 ${
              active
                ? "border-violet-300/45 bg-violet-400/10 shadow-[0_0_34px_rgba(139,92,246,.12)]"
                : "border-white/8 bg-white/[.025]"
            }`}
          >
            <span className="w-5 text-center text-xs font-black text-zinc-600">{placement}</span>
            <PlayerAvatar player={player} small />
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-black">{player.displayName}</strong>
              <span className="text-[10px] font-bold text-zinc-500">
                razem {player.totalScore} · runda {player.roundScore}
              </span>
            </div>
            <b className="text-lg font-black text-violet-200">{scoreFor(player)}</b>
          </article>
        );
      })}
    </div>
  );
}

function Wheel({ game, spinning = false }: { game: ZhGameState; spinning?: boolean }) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!isWheelEvent(game.lastEvent) || game.wheel?.segmentIndex == null) return;

    const target = ((wheelRotation(game.wheel.segmentIndex) % 360) + 360) % 360;
    const frame = window.requestAnimationFrame(() => {
      setRotation((previous) => {
        const current = ((previous % 360) + 360) % 360;
        const delta = (target - current + 360) % 360;
        return previous + 360 * 4 + delta;
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [game.lastEvent?.at, game.wheel?.segmentIndex]);

  const resultLabel = spinning ? null : game.wheel?.label;

  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="absolute left-1/2 top-[-10px] z-20 -translate-x-1/2 text-4xl text-white drop-shadow-lg">▼</div>
      <div
        className="relative aspect-square rounded-full border-[12px] border-white/10 shadow-[0_30px_90px_rgba(0,0,0,.42)]"
        style={{
          background: WHEEL_GRADIENT,
          transform: `rotate(${rotation}deg)`,
          transitionProperty: "transform",
          transitionDuration: `${WHEEL_SPIN_MS}ms`,
          transitionTimingFunction: "cubic-bezier(.08,.72,.08,1)",
        }}
      >
        {ZH_WHEEL_SEGMENTS.map((label, index) => {
          const angle = (360 / ZH_WHEEL_SEGMENTS.length) * index;
          const radians = (angle * Math.PI) / 180;
          const special = label === "BANKRUT" || label === "PAS";
          const radius = special ? 34 : 35;

          return (
            <span
              key={`${label}-${index}`}
              className="absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center"
              style={{
                left: `${50 + Math.sin(radians) * radius}%`,
                top: `${50 - Math.cos(radians) * radius}%`,
              }}
            >
              <span
                className={`inline-flex min-w-[30px] items-center justify-center whitespace-nowrap rounded-md bg-black/18 px-1.5 py-0.5 font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.85)] ${
                  special ? "text-[7px] sm:text-[8px]" : "text-[9px] sm:text-[10px]"
                }`}
                style={{
                  transform: `rotate(${-rotation}deg)`,
                  transitionProperty: "transform",
                  transitionDuration: `${WHEEL_SPIN_MS}ms`,
                  transitionTimingFunction: "cubic-bezier(.08,.72,.08,1)",
                }}
              >
                {label}
              </span>
            </span>
          );
        })}
        <div className="absolute left-1/2 top-1/2 grid h-[31%] w-[31%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[8px] border-white/15 bg-[#120a25] text-center shadow-2xl">
          <div
            style={{
              transform: `rotate(${-rotation}deg)`,
              transitionProperty: "transform",
              transitionDuration: `${WHEEL_SPIN_MS}ms`,
              transitionTimingFunction: "cubic-bezier(.08,.72,.08,1)",
            }}
          >
            <span className="block text-[8px] font-black uppercase tracking-[.16em] text-violet-300">
              {spinning ? "KOŁO" : game.wheel ? "WYNIK" : "KOŁO"}
            </span>
            <strong className={`mt-1 block font-black ${resultLabel === "BANKRUT" ? "text-sm sm:text-base" : "text-xl sm:text-2xl"}`}>
              {spinning ? "KRĘCIMY!" : resultLabel ?? "START"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivePlayer({ game }: { game: ZhGameState }) {
  const player = game.players.find((item) => item.id === game.activePlayerId);
  if (!player) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-violet-300/25 bg-violet-400/8 p-3">
      <PlayerAvatar player={player} />
      <div>
        <span className="block text-[9px] font-black uppercase tracking-[.18em] text-violet-300">TERAZ GRA</span>
        <strong className="mt-1 block text-lg font-black">{player.displayName}</strong>
      </div>
      <div className="ml-auto text-right">
        <small className="block text-[8px] font-black text-zinc-500">PUNKTY W RUNDZIE</small>
        <b className="text-xl font-black text-violet-200">{player.roundScore}</b>
      </div>
    </div>
  );
}

function GameHeader({ room, game }: { room: RoomInfo; game: ZhGameState }) {
  return (
    <header className="border-b border-white/8 bg-black/15 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div>
          <span className="block text-[9px] font-black uppercase tracking-[.22em] text-violet-300">ZAKRĘCONE HASŁO</span>
          <strong className="mt-1 block text-sm font-black">RUNDA {game.roundNumber}/{game.puzzleCount}</strong>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-zinc-400">
            {DIFFICULTY[game.difficulty]}
          </span>
          <div className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-right">
            <small className="block text-[7px] font-black uppercase tracking-[.15em] text-zinc-500">KOD</small>
            <b className="block text-lg font-black tracking-[.13em] text-violet-200">{room.code}</b>
          </div>
        </div>
      </div>
    </header>
  );
}

function HostGame({ data, busy, error, onNext }: { data: HostState; busy: boolean; error: string; onNext: () => void }) {
  const game = data.game;
  const wheelSpinning = useWheelSpinning(game);
  const roundWinner = game.players.find((player) => player.id === game.roundWinnerId);
  const ranking = [...game.players].sort((a, b) => scoreFor(b) - scoreFor(a));
  const topScore = ranking[0] ? scoreFor(ranking[0]) : 0;
  const winners = ranking.filter((player) => scoreFor(player) === topScore);
  const winner = winners[0];

  if (game.mode === "game_over") {
    return (
      <main className="min-h-screen bg-[#080512] text-white">
        <GameHeader room={data.room} game={game} />
        <section className="mx-auto max-w-5xl px-5 py-12 text-center">
          <span className="text-5xl">🏆</span>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[.28em] text-violet-300">KONIEC GRY</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-.06em] sm:text-7xl">
            {winners.length > 1 ? "REMIS!" : winner?.displayName ?? "Mamy zwycięzcę!"}
          </h1>
          <p className="mt-3 text-lg font-bold text-zinc-400">
            {winner
              ? winners.length > 1
                ? `${winners.map((player) => player.displayName).join(" · ")} · po ${topScore} punktów`
                : `${scoreFor(winner)} punktów`
              : "Końcowa klasyfikacja"}
          </p>
          <div className="mx-auto mt-10 max-w-3xl text-left">
            <ScoreList game={game} />
          </div>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[.03] p-6">
            <span className="text-[9px] font-black uppercase tracking-[.2em] text-zinc-500">OSTATNIE HASŁO</span>
            <div className="mt-4">{formatPhrase(game.phrase)}</div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080512] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(139,92,246,.22),transparent_28%),radial-gradient(circle_at_86%_22%,rgba(236,72,153,.14),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,.1),transparent_32%)]" />
      <div className="relative z-10">
        <GameHeader room={data.room} game={game} />
        <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1.25fr_.75fr]">
          <div className="min-w-0 space-y-5">
            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-[.2em] text-fuchsia-300">KATEGORIA</span>
                  <h1 className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">{game.category}</h1>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[9px] font-black text-zinc-400">
                  {game.usedLetters.length ? `UŻYTE: ${game.usedLetters.join(" · ")}` : "BRAK UŻYTYCH LITER"}
                </span>
              </div>
              <div className="mt-7">{formatPhrase(game.phrase)}</div>
            </div>

            {game.mode === "round_over" ? (
              <div className="rounded-[1.75rem] border border-emerald-300/20 bg-emerald-400/[.06] p-6">
                <span className="text-4xl">🎉</span>
                <p className="mt-3 text-[9px] font-black uppercase tracking-[.2em] text-emerald-300">HASŁO ODGADNIĘTE</p>
                <h2 className="mt-2 text-3xl font-black tracking-[-.05em]">
                  {roundWinner?.displayName ?? "Gracz"} wygrywa rundę
                </h2>
                <p className="mt-2 text-sm text-zinc-400">Punkty z rundy zostaną dopisane po przejściu dalej.</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onNext}
                  className="mt-5 rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-6 py-4 text-sm font-black disabled:opacity-50"
                >
                  {busy ? "CHWILA…" : game.roundNumber >= game.puzzleCount ? "POKAŻ WYNIKI →" : "DALEJ TERAZ →"}
                </button>
              </div>
            ) : (
              <>
                <ActivePlayer game={game} />
                {wheelSpinning ? (
                  <div className="rounded-2xl border border-violet-300/20 bg-violet-400/[.06] p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎡</span>
                      <div>
                        <strong className="block text-sm font-black text-white">Koło się kręci…</strong>
                        <span className="mt-0.5 block text-xs leading-5 text-zinc-400">Wynik poznamy dopiero po zatrzymaniu koła.</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EventBanner event={game.lastEvent} />
                )}
              </>
            )}

            {error && <div className="rounded-2xl border border-red-400/25 bg-red-400/10 p-3 text-sm font-bold text-red-200">{error}</div>}

            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-500">KLASYFIKACJA</span>
                <span className="text-[9px] font-bold text-zinc-600">wynik = suma + bieżąca runda</span>
              </div>
              <ScoreList game={game} />
            </div>
          </div>

          <aside className="min-w-0 rounded-[1.75rem] border border-white/10 bg-black/25 p-5 sm:p-6">
            <span className="block text-center text-[9px] font-black uppercase tracking-[.2em] text-violet-300">KOŁO RYZYKA</span>
            <div className="mt-6">
              <Wheel game={game} spinning={wheelSpinning} />
            </div>
            <div className="mt-6 rounded-2xl border border-white/8 bg-white/[.025] p-4">
              <strong className="block text-sm font-black">
                {wheelSpinning
                  ? "Koło się kręci…"
                  : game.mode === "choose_letter"
                    ? "Czekamy na wybór spółgłoski"
                    : game.mode === "round_over"
                      ? "Runda zakończona"
                      : "Czekamy na ruch gracza"}
              </strong>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Sterowanie odbywa się na telefonie osoby, której jest kolej.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function LetterGrid({
  game,
  onLetter,
  busy,
}: {
  game: ZhGameState;
  onLetter: (letter: string) => void;
  busy: boolean;
}) {
  const letters = ZH_ALPHABET.filter((letter) => !ZH_VOWELS.has(letter));
  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
      {letters.map((letter) => {
        const used = game.usedLetters.includes(letter);
        return (
          <button
            key={letter}
            type="button"
            disabled={busy || used}
            onClick={() => onLetter(letter)}
            className={`min-h-12 rounded-xl border text-sm font-black ${
              used
                ? "border-white/5 bg-white/[.02] text-zinc-700"
                : "border-violet-300/20 bg-violet-400/[.07] text-white active:scale-95"
            } disabled:cursor-not-allowed`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}

function VowelPicker({
  game,
  onVowel,
  busy,
}: {
  game: ZhGameState;
  onVowel: (letter: string) => void;
  busy: boolean;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {[...ZH_VOWELS].map((letter) => {
        const used = game.usedLetters.includes(letter);
        return (
          <button
            key={letter}
            type="button"
            disabled={busy || used}
            onClick={() => onVowel(letter)}
            className="min-h-12 rounded-xl border border-cyan-300/20 bg-cyan-400/[.07] text-sm font-black disabled:opacity-25"
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}

function SolveForm({
  busy,
  onSolve,
  onCancel,
}: {
  busy: boolean;
  onSolve: (guess: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [guess, setGuess] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = guess.trim();
    if (!clean) return;
    const ok = await onSolve(clean);
    if (ok) setGuess("");
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/[.06] p-4">
      <label htmlFor="zhSolve" className="text-[9px] font-black uppercase tracking-[.16em] text-fuchsia-200">
        WPISZ CAŁE HASŁO
      </label>
      <input
        id="zhSolve"
        value={guess}
        onChange={(event) => setGuess(event.target.value)}
        maxLength={120}
        autoComplete="off"
        autoFocus
        placeholder="Twoja odpowiedź…"
        className="mt-3 w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-base font-bold text-white outline-none focus:border-fuchsia-300/50"
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="min-h-12 rounded-xl border border-white/10 bg-white/[.03] text-xs font-black text-zinc-400">
          ANULUJ
        </button>
        <button type="submit" disabled={busy || !guess.trim()} className="min-h-12 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 text-xs font-black disabled:opacity-40">
          {busy ? "SPRAWDZAMY…" : "SPRAWDŹ HASŁO"}
        </button>
      </div>
    </form>
  );
}

function PlayerGame({
  data,
  busy,
  error,
  send,
}: {
  data: PlayerState;
  busy: boolean;
  error: string;
  send: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const game = data.game;
  const wheelSpinning = useWheelSpinning(game);
  const me = game.players.find((item) => item.id === data.player.id);
  const active = game.players.find((item) => item.id === game.activePlayerId);
  const isMyTurn = game.activePlayerId === data.player.id;
  const canSpin = hasUnusedConsonants(game);
  const canBuyVowel = hasUnusedVowels(game);
  const [panel, setPanel] = useState<"main" | "vowel" | "solve">("main");

  useEffect(() => {
    if (!isMyTurn || game.mode === "round_over" || game.mode === "game_over") {
      setPanel("main");
    }
  }, [isMyTurn, game.mode, game.roundNumber]);

  async function solve(guess: string) {
    const ok = await send({ action: "solve", guess });
    if (ok) setPanel("main");
    return ok;
  }

  const ranking = useMemo(
    () => [...game.players].sort((a, b) => scoreFor(b) - scoreFor(a)),
    [game.players],
  );

  if (game.mode === "game_over") {
    const topScore = ranking[0] ? scoreFor(ranking[0]) : 0;
    const winners = ranking.filter((item) => scoreFor(item) === topScore);
    const winner = winners[0];
    const amIWinner = Boolean(me && scoreFor(me) === topScore);
    const myPlace = me ? 1 + ranking.filter((item) => scoreFor(item) > scoreFor(me)).length : 0;
    return (
      <main className="min-h-screen bg-[#080512] p-4 text-white">
        <section className="mx-auto max-w-xl rounded-[1.75rem] border border-white/10 bg-[#0d0918] p-5 text-center">
          <span className="text-5xl">{amIWinner ? "🏆" : "🎉"}</span>
          <p className="mt-4 text-[9px] font-black uppercase tracking-[.2em] text-violet-300">KONIEC GRY</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.05em]">
            {amIWinner
              ? winners.length > 1
                ? "REMIS NA 1. MIEJSCU!"
                : "WYGRYWASZ!"
              : winners.length > 1
                ? `Wygrywają ${winners.map((item) => item.displayName).join(" i ")}`
                : `Wygrywa ${winner?.displayName ?? "gracz"}`}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Twoje miejsce: <b className="text-white">{myPlace || "—"}</b> · {scoreFor(me ?? ranking[0])} pkt
          </p>
          <div className="mt-6 text-left"><ScoreList game={game} /></div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080512] p-3 text-white sm:p-4">
      <section className="mx-auto max-w-xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,#100a1d,#090711)] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/8 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <PlayerAvatar player={{ avatar: data.player.avatar }} small />
            <div className="min-w-0">
              <span className="block text-[8px] font-black uppercase tracking-[.16em] text-violet-300">GRASZ JAKO</span>
              <strong className="block truncate text-sm font-black">{data.player.display_name}</strong>
            </div>
          </div>
          <div className="text-right">
            <small className="block text-[7px] font-black text-zinc-500">TWÓJ WYNIK</small>
            <b className="text-xl font-black text-violet-200">{me ? scoreFor(me) : 0}</b>
          </div>
        </header>

        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[8px] font-black uppercase tracking-[.17em] text-zinc-500">
                RUNDA {game.roundNumber}/{game.puzzleCount} · {DIFFICULTY[game.difficulty]}
              </span>
              <h1 className="mt-1 text-xl font-black tracking-[-.04em]">{game.category}</h1>
            </div>
            <span className="rounded-lg border border-white/8 bg-white/[.03] px-2.5 py-2 text-[8px] font-black text-zinc-500">
              KOD {data.room.code}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-white/8 bg-black/25 p-4">
            <div className="scale-[.82] sm:scale-90">{formatPhrase(game.phrase)}</div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {game.usedLetters.map((letter) => (
              <span key={letter} className="grid h-7 min-w-7 place-items-center rounded-lg border border-white/8 bg-white/[.025] text-[10px] font-black text-zinc-500">
                {letter}
              </span>
            ))}
          </div>

          {game.mode === "round_over" ? (
            <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/[.06] p-5 text-center">
              <span className="text-3xl">🎉</span>
              <strong className="mt-2 block text-xl font-black">Hasło odgadnięte!</strong>
              <p className="mt-1 text-xs text-zinc-400">Kolejna runda uruchomi się automatycznie za chwilę.</p>
            </div>
          ) : wheelSpinning ? (
            <div className="mt-4 rounded-2xl border border-violet-300/20 bg-violet-400/[.06] p-5 text-center">
              <span className="text-4xl">🎡</span>
              <strong className="mt-2 block text-lg font-black">Koło się kręci…</strong>
              <p className="mt-1 text-xs text-zinc-500">Nie zdradzamy wyniku przed zatrzymaniem koła.</p>
            </div>
          ) : !isMyTurn ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.025] p-5 text-center">
              <span className="text-3xl">{active ? <PartyPlayAvatar id={active.avatar} size={48} /> : "⏳"}</span>
              <strong className="mt-2 block text-lg font-black">
                {active ? `Teraz gra ${active.displayName}` : "Czekamy na ruch"}
              </strong>
              <p className="mt-1 text-xs text-zinc-500">Obserwuj planszę, zaraz może być Twoja kolej.</p>
            </div>
          ) : panel === "vowel" ? (
            <div className="mt-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/[.045] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-black uppercase tracking-[.16em] text-cyan-300">KUP SAMOGŁOSKĘ</span>
                  <strong className="mt-1 block text-sm font-black">Koszt: 200 pkt z tej rundy</strong>
                </div>
                <button type="button" onClick={() => setPanel("main")} className="h-10 w-10 rounded-xl border border-white/10 bg-white/[.03] text-zinc-400">✕</button>
              </div>
              <div className="mt-4">
                <VowelPicker
                  game={game}
                  busy={busy}
                  onVowel={(letter) => void send({ action: "vowel", letter }).then((ok) => ok && setPanel("main"))}
                />
              </div>
            </div>
          ) : panel === "solve" ? (
            <div className="mt-4">
              <SolveForm busy={busy} onSolve={solve} onCancel={() => setPanel("main")} />
            </div>
          ) : game.mode === "choose_letter" ? (
            <div className="mt-4">
              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-violet-300/20 bg-violet-400/[.06] p-3">
                <div>
                  <span className="block text-[8px] font-black uppercase tracking-[.16em] text-violet-300">WYNIK KOŁA</span>
                  <strong className="text-2xl font-black">{game.wheel?.label ?? "—"}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setPanel("solve")}
                  className="min-h-11 rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/[.06] px-3 text-[9px] font-black text-fuchsia-100"
                >
                  ZGADUJĘ HASŁO
                </button>
              </div>
              <p className="mb-2 text-[9px] font-black uppercase tracking-[.16em] text-zinc-500">WYBIERZ SPÓŁGŁOSKĘ</p>
              <LetterGrid
                game={game}
                busy={busy}
                onLetter={(letter) => void send({ action: "letter", letter })}
              />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={busy || !canSpin}
                onClick={() => void send({ action: "spin" })}
                className="min-h-16 w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 text-base font-black shadow-[0_18px_45px_rgba(139,92,246,.22)] disabled:opacity-50"
              >
                {busy ? "KRĘCIMY…" : canSpin ? "🎡 ZAKRĘĆ KOŁEM" : "BRAK SPÓŁGŁOSEK — ZGADNIJ HASŁO"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy || !canBuyVowel || (me?.roundScore ?? 0) < 200}
                  onClick={() => setPanel("vowel")}
                  className="min-h-14 rounded-2xl border border-cyan-300/20 bg-cyan-400/[.06] px-2 text-[10px] font-black text-cyan-100 disabled:opacity-30"
                >
                  KUP SAMOGŁOSKĘ
                  <span className="mt-1 block text-[8px] text-cyan-300/65">200 PKT</span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setPanel("solve")}
                  className="min-h-14 rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/[.06] px-2 text-[10px] font-black text-fuchsia-100"
                >
                  ZGADUJĘ HASŁO
                  <span className="mt-1 block text-[8px] text-fuchsia-300/65">+1000 PKT</span>
                </button>
              </div>
            </div>
          )}

          {!wheelSpinning && (
            <div className="mt-4">
              <EventBanner event={game.lastEvent} compact />
            </div>
          )}
          {error && <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs font-bold text-red-200">{error}</div>}

          <div className="mt-5 border-t border-white/8 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-[.15em] text-zinc-600">PUNKTY W TEJ RUNDZIE</span>
              <b className="text-lg font-black text-white">{me?.roundScore ?? 0}</b>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function GameClient({ code }: { code: string }) {
  const [data, setData] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/gra/zakrecone-haslo/${code}`, { cache: "no-store" });

      if (response.status === 401) {
        window.location.assign(`/pokoj/${code}`);
        return;
      }

      if (!response.ok) return;
      setData((await response.json()) as GameState);
    } catch {
      // Kolejna próba pollingu spróbuje ponownie.
    }
  }, [code]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 1100);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/gra/zakrecone-haslo/${code}`, {
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

  useEffect(() => {
    if (!data || !data.canAutoAdvance || data.game.mode !== "round_over" || busy) return;

    const timer = window.setTimeout(() => {
      void send({ action: "next" });
    }, 4500);

    return () => window.clearTimeout(timer);
    // Przejście między rundami nie wymaga prowadzącego. Twórca pokoju może jednocześnie grać.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.role, data?.game.mode, data?.game.roundNumber, busy]);

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080512] p-5 text-white">
        <div className="text-center">
          <span className="text-4xl">🎡</span>
          <p className="mt-4 text-sm font-black text-violet-200">Uruchamiamy Zakręcone Hasło…</p>
        </div>
      </main>
    );
  }

  if (data.role === "host") {
    return <HostGame data={data} busy={busy} error={error} onNext={() => void send({ action: "next" })} />;
  }

  return <PlayerGame data={data} busy={busy} error={error} send={send} />;
}
