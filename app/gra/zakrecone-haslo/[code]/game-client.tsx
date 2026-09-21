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
};

type PlayerState = {
  role: "player";
  room: RoomInfo;
  player: Player;
  game: ZhGameState;
};

type GameState = HostState | PlayerState;


const DIFFICULTY: Record<number, string> = {
  1: "ŁATWE",
  2: "ŚREDNIE",
  3: "TRUDNE",
};

const WHEEL_GRADIENT =
  "conic-gradient(from -10deg,#8b5cf6 0deg 20deg,#ec4899 20deg 40deg,#22d3ee 40deg 60deg,#f59e0b 60deg 80deg,#7c3aed 80deg 100deg,#10b981 100deg 120deg,#e11d48 120deg 140deg,#3b82f6 140deg 160deg,#a855f7 160deg 180deg,#f97316 180deg 200deg,#06b6d4 200deg 220deg,#8b5cf6 220deg 240deg,#ec4899 240deg 260deg,#22c55e 260deg 280deg,#f59e0b 280deg 300deg,#7c3aed 300deg 320deg,#ef4444 320deg 340deg,#3b82f6 340deg 360deg)";

function wheelRotation(segmentIndex?: number | null) {
  if (segmentIndex == null || segmentIndex < 0) return 0;
  const segmentAngle = 360 / ZH_WHEEL_SEGMENTS.length;
  return 360 * 4 - segmentIndex * segmentAngle - segmentAngle / 2;
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
                    ? "border-white/10 bg-black/35 text-transparent"
                    : "border-violet-300/35 bg-violet-300/10 text-white shadow-[0_0_28px_rgba(167,139,250,.08)]"
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
      {sorted.map((player, index) => {
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
            <span className="w-5 text-center text-xs font-black text-zinc-600">{index + 1}</span>
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
  const rotation = wheelRotation(game.wheel?.segmentIndex);
  return (
    <div className="relative mx-auto w-full max-w-[370px]">
      <div className="absolute left-1/2 top-[-8px] z-20 -translate-x-1/2 text-3xl text-white drop-shadow-lg">▼</div>
      <div
        className="relative aspect-square rounded-full border-[12px] border-white/10 shadow-[0_30px_90px_rgba(0,0,0,.42)] transition-transform duration-[1200ms] ease-out"
        style={{
          background: WHEEL_GRADIENT,
          transform: `rotate(${spinning ? rotation + 1080 : rotation}deg)`,
        }}
      >
        {ZH_WHEEL_SEGMENTS.map((label, index) => {
          const angle = (360 / ZH_WHEEL_SEGMENTS.length) * index + 10;
          return (
            <span
              key={`${label}-${index}`}
              className="absolute left-1/2 top-1/2 origin-left text-[8px] font-black text-white/85 sm:text-[9px]"
              style={{
                width: "45%",
                transform: `rotate(${angle}deg) translateX(16%)`,
              }}
            >
              <span className="inline-block -rotate-90">{label === "BANKRUT" ? "💥" : label === "PAS" ? "↪" : label}</span>
            </span>
          );
        })}
        <div className="absolute left-1/2 top-1/2 grid h-[31%] w-[31%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[8px] border-white/15 bg-[#120a25] text-center shadow-2xl">
          <div style={{ transform: `rotate(${-(spinning ? rotation + 1080 : rotation)}deg)` }} className="transition-transform duration-[1200ms] ease-out">
            <span className="block text-[8px] font-black uppercase tracking-[.16em] text-violet-300">
              {game.wheel ? "WYNIK" : "KOŁO"}
            </span>
            <strong className={`mt-1 block font-black ${game.wheel?.label === "BANKRUT" ? "text-base sm:text-lg" : "text-xl sm:text-2xl"}`}>
              {game.wheel?.label ?? "START"}
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
  const roundWinner = game.players.find((player) => player.id === game.roundWinnerId);
  const ranking = [...game.players].sort((a, b) => scoreFor(b) - scoreFor(a));
  const winner = ranking[0];

  if (game.mode === "game_over") {
    return (
      <main className="min-h-screen bg-[#080512] text-white">
        <GameHeader room={data.room} game={game} />
        <section className="mx-auto max-w-5xl px-5 py-12 text-center">
          <span className="text-5xl">🏆</span>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[.28em] text-violet-300">KONIEC GRY</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-.06em] sm:text-7xl">
            {winner?.displayName ?? "Mamy zwycięzcę!"}
          </h1>
          <p className="mt-3 text-lg font-bold text-zinc-400">
            {winner ? `${scoreFor(winner)} punktów` : "Końcowa klasyfikacja"}
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
                  {busy ? "CHWILA…" : game.roundNumber >= game.puzzleCount ? "POKAŻ WYNIKI →" : "NASTĘPNA RUNDA →"}
                </button>
              </div>
            ) : (
              <>
                <ActivePlayer game={game} />
                <EventBanner event={game.lastEvent} />
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
              <Wheel game={game} />
            </div>
            <div className="mt-6 rounded-2xl border border-white/8 bg-white/[.025] p-4">
              <strong className="block text-sm font-black">
                {game.mode === "choose_letter"
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
  const me = game.players.find((item) => item.id === data.player.id);
  const active = game.players.find((item) => item.id === game.activePlayerId);
  const isMyTurn = game.activePlayerId === data.player.id;
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
    const winner = ranking[0];
    const myPlace = ranking.findIndex((item) => item.id === data.player.id) + 1;
    return (
      <main className="min-h-screen bg-[#080512] p-4 text-white">
        <section className="mx-auto max-w-xl rounded-[1.75rem] border border-white/10 bg-[#0d0918] p-5 text-center">
          <span className="text-5xl">{winner?.id === data.player.id ? "🏆" : "🎉"}</span>
          <p className="mt-4 text-[9px] font-black uppercase tracking-[.2em] text-violet-300">KONIEC GRY</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-.05em]">
            {winner?.id === data.player.id ? "WYGRYWASZ!" : `Wygrywa ${winner?.displayName ?? "gracz"}`}
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
              <p className="mt-1 text-xs text-zinc-400">Czekamy, aż host uruchomi kolejną rundę.</p>
            </div>
          ) : !isMyTurn ? (
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.025] p-5 text-center">
              <span className="text-3xl">{active ? AVATARS[active.avatar] ?? "🎮" : "⏳"}</span>
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
                disabled={busy}
                onClick={() => void send({ action: "spin" })}
                className="min-h-16 w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 text-base font-black shadow-[0_18px_45px_rgba(139,92,246,.22)] disabled:opacity-50"
              >
                {busy ? "KRĘCIMY…" : "🎡 ZAKRĘĆ KOŁEM"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy || (me?.roundScore ?? 0) < 200}
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

          <div className="mt-4">
            <EventBanner event={game.lastEvent} compact />
          </div>
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
