"use client";

import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  PpGameState,
  PpPlayer,
  PpRole,
  PpVoteCount,
} from "@/lib/pod-przykrywka";

type RoomInfo = {
  code: string;
  status: string;
  phase: string | null;
};

type HostResponse = {
  role: "host";
  room: RoomInfo;
  game: PpGameState;
};

type PlayerResponse = {
  role: "player";
  room: RoomInfo;
  player: {
    id: string;
    display_name: string;
    avatar: string;
  };
  game: PpGameState;
};

type ResponseState = HostResponse | PlayerResponse;

const AVATARS: Record<string, string> = {
  lion: "🦁",
  fox: "🦊",
  panda: "🐼",
  tiger: "🐯",
  koala: "🐨",
  owl: "🦉",
  frog: "🐸",
  penguin: "🐧",
  bear: "🐻",
  rabbit: "🐰",
  monkey: "🐵",
  cat: "🐱",
};

function avatar(id: string) {
  return AVATARS[id] ?? "🎮";
}

function votePlayerId(item: PpVoteCount) {
  return item.playerId ?? item.player_id ?? "";
}

function votePlayerName(item: PpVoteCount) {
  return item.displayName ?? item.display_name ?? "";
}

function Shell({
  room,
  game,
  children,
}: {
  room: RoomInfo;
  game: PpGameState;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#041019] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,.16),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(37,99,235,.13),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(14,116,144,.13),transparent_30%)]" />
      <div className="relative z-10">
        <header className="border-b border-white/8 bg-black/20 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div>
              <span className="block text-[9px] font-black uppercase tracking-[.22em] text-cyan-300">POD PRZYKRYWKĄ</span>
              <strong className="mt-1 block text-sm font-black">
                {game.phase === "briefing" ? "TAJNE ROLE" : game.phase === "result" ? "FINAŁ" : `MISJA ${game.missionIndex}/${game.missionCount}`}
              </strong>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-right">
              <small className="block text-[7px] font-black uppercase tracking-[.15em] text-zinc-500">KOD POKOJU</small>
              <b className="block text-lg font-black tracking-[.13em] text-cyan-200">{room.code}</b>
            </div>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const safeMax = Math.max(max, 1);
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-sky-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-2 text-xs font-bold text-zinc-500">{value}/{max}</p>
    </div>
  );
}

function PlayerGrid({ players, mode }: { players: PpPlayer[]; mode: "submitted" | "voted" }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {players.map((player) => {
        const done = mode === "submitted" ? player.submitted : player.voted;
        return (
          <article key={player.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-xl">{avatar(player.avatar)}</span>
            <strong className="min-w-0 flex-1 truncate text-sm font-black">{player.displayName}</strong>
            <span className={done ? "text-xs font-black text-emerald-300" : "text-xs font-bold text-zinc-600"}>
              {done ? "✓ GOTOWE" : "czeka"}
            </span>
          </article>
        );
      })}
    </div>
  );
}

function AnswerCards({ game }: { game: PpGameState }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {game.submissions.map((item) => (
        <article key={item.playerId} className="rounded-2xl border border-white/9 bg-white/[.028] p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-xl">{avatar(item.avatar)}</span>
            <strong className="text-sm font-black">{item.displayName}</strong>
          </div>
          <p className="mt-4 text-lg font-bold leading-7 text-zinc-200">„{item.answer}”</p>
        </article>
      ))}
    </div>
  );
}

function SuspicionBars({ data }: { data: PpVoteCount[] }) {
  const max = Math.max(...data.map((item) => Number(item.votes) || 0), 1);
  return (
    <div className="space-y-3">
      {data.map((item) => {
        const votes = Number(item.votes) || 0;
        return (
          <div key={votePlayerId(item)} className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">{avatar(item.avatar)}</span>
              <strong className="min-w-0 flex-1 truncate text-sm font-black">{votePlayerName(item)}</strong>
              <b className="text-lg font-black text-cyan-200">{votes}</b>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-blue-500" style={{ width: `${(votes / max) * 100}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HostGame({
  data,
  busy,
  error,
  onAdvance,
}: {
  data: HostResponse;
  busy: boolean;
  error: string;
  onAdvance: () => void;
}) {
  const { room, game } = data;
  const readyToAdvance =
    game.phase === "mission"
      ? game.submittedCount === game.playerCount
      : game.phase === "suspicion" || game.phase === "final_vote"
        ? game.votedCount === game.playerCount
        : true;

  if (game.phase === "result" && game.result) {
    return (
      <Shell room={room} game={game}>
        <section className="mx-auto max-w-5xl px-5 py-12 text-center">
          <span className="text-6xl">{game.result.caught ? "🕵️‍♂️" : "🕶️"}</span>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[.28em] text-cyan-300">TO BYŁA OSOBA POD PRZYKRYWKĄ</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-.06em] sm:text-7xl">{game.result.saboteurName}</h1>
          <p className={`mx-auto mt-5 max-w-2xl text-xl font-black ${game.result.caught ? "text-emerald-300" : "text-amber-300"}`}>
            {game.result.caught ? "Grupa rozpracowała Oszusta." : "Oszust utrzymał przykrywkę i wygrywa."}
          </p>
          {!game.result.caught && (
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">Remis na pierwszym miejscu również oznacza ucieczkę Oszusta.</p>
          )}
          <div className="mx-auto mt-10 max-w-3xl text-left">
            <p className="mb-3 text-[10px] font-black uppercase tracking-[.22em] text-zinc-500">FINAŁOWE GŁOSY</p>
            <SuspicionBars data={game.result.finalVotes} />
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell room={room} game={game}>
      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
        {game.phase === "briefing" && (
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-cyan-300/15 bg-black/25 p-7 text-center sm:p-10">
            <span className="text-5xl">🔐</span>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">TAJNE ROLE ROZDANE</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-5xl">Każdy sprawdza swój telefon.</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
              W grupie jest dokładnie 1 Oszust. Host nie zna jego tożsamości. Gdy wszyscy przeczytają swoją rolę, rozpocznijcie pierwszą misję.
            </p>
            <button type="button" disabled={busy} onClick={onAdvance} className="mt-7 rounded-2xl bg-gradient-to-r from-cyan-300 to-sky-500 px-7 py-4 text-sm font-black text-slate-950 disabled:opacity-50">
              {busy ? "CHWILA…" : "ROZPOCZNIJ MISJĘ 1 →"}
            </button>
          </div>
        )}

        {game.phase !== "briefing" && game.mission && (
          <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <div className="min-w-0 space-y-5">
              <section className="rounded-[1.75rem] border border-white/10 bg-black/25 p-6 sm:p-7">
                <span className="text-[9px] font-black uppercase tracking-[.22em] text-cyan-300">{game.mission.category}</span>
                <h1 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-4xl">{game.mission.title}</h1>
                <p className="mt-4 text-base font-medium leading-7 text-zinc-400">{game.mission.briefing}</p>
              </section>

              {game.phase === "mission" && (
                <section className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-6">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[.2em] text-zinc-500">ODPOWIEDZI</span>
                      <h2 className="mt-1 text-2xl font-black">{game.submittedCount}/{game.playerCount} gotowych</h2>
                    </div>
                  </div>
                  <div className="mt-4"><ProgressBar value={game.submittedCount} max={game.playerCount} /></div>
                  <div className="mt-5"><PlayerGrid players={game.players} mode="submitted" /></div>
                  <button type="button" disabled={busy || !readyToAdvance} onClick={onAdvance} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-sky-500 px-6 py-4 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-35">
                    {readyToAdvance ? "POKAŻ ODPOWIEDZI →" : "CZEKAJ NA WSZYSTKICH"}
                  </button>
                </section>
              )}

              {(game.phase === "evidence" || game.phase === "suspicion" || game.phase === "suspicion_result" || game.phase === "final_vote") && (
                <section>
                  <p className="mb-3 text-[9px] font-black uppercase tracking-[.22em] text-zinc-500">DOWODY Z TEJ MISJI</p>
                  <AnswerCards game={game} />
                </section>
              )}
            </div>

            <aside className="min-w-0">
              {game.phase === "evidence" && (
                <div className="rounded-[1.75rem] border border-cyan-300/15 bg-cyan-300/[.05] p-6">
                  <span className="text-3xl">💬</span>
                  <h2 className="mt-4 text-2xl font-black">Dyskusja</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Pytajcie o tok myślenia. Oszust może kłamać, tłumaczyć się i odwracać podejrzenia.
                  </p>
                  <button type="button" disabled={busy} onClick={onAdvance} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-sky-500 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">
                    PRZEJDŹ DO TYPOWANIA →
                  </button>
                </div>
              )}

              {game.phase === "suspicion" && (
                <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-6">
                  <span className="text-3xl">🗳️</span>
                  <h2 className="mt-4 text-2xl font-black">Kto jest podejrzany?</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">Każdy wybiera 1 osobę na swoim telefonie. Głosy są anonimowe.</p>
                  <div className="mt-5"><ProgressBar value={game.votedCount} max={game.playerCount} /></div>
                  <div className="mt-5"><PlayerGrid players={game.players} mode="voted" /></div>
                  <button type="button" disabled={busy || !readyToAdvance} onClick={onAdvance} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-sky-500 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-35">
                    {readyToAdvance ? "POKAŻ PODEJRZENIA →" : "CZEKAJ NA WSZYSTKICH"}
                  </button>
                </div>
              )}

              {game.phase === "suspicion_result" && (
                <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-6">
                  <span className="text-3xl">🔎</span>
                  <h2 className="mt-4 text-2xl font-black">Poziom podejrzeń</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">Widzicie sumę głosów, ale nie to, kto na kogo zagłosował.</p>
                  <div className="mt-5"><SuspicionBars data={game.suspicion} /></div>
                  <button type="button" disabled={busy} onClick={onAdvance} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-sky-500 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">
                    {game.missionIndex >= game.missionCount ? "FINAŁOWE WSKAZANIE →" : `MISJA ${game.missionIndex + 1} →`}
                  </button>
                </div>
              )}

              {game.phase === "final_vote" && (
                <div className="rounded-[1.75rem] border border-amber-300/20 bg-amber-300/[.05] p-6">
                  <span className="text-3xl">🎯</span>
                  <h2 className="mt-4 text-2xl font-black">Ostatnia decyzja</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">Nie ma już kolejnej misji. Każdy wskazuje osobę, którą uważa za Oszusta.</p>
                  <div className="mt-5"><ProgressBar value={game.votedCount} max={game.playerCount} /></div>
                  <button type="button" disabled={busy || !readyToAdvance} onClick={onAdvance} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-35">
                    {readyToAdvance ? "ODKRYJ OSZUSTA →" : "CZEKAJ NA WSZYSTKICH"}
                  </button>
                </div>
              )}
            </aside>
          </div>
        )}

        {error && <div className="mx-auto mt-5 max-w-4xl rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-bold text-red-200">{error}</div>}
      </section>
    </Shell>
  );
}

function RoleCard({ role }: { role: PpRole }) {
  const saboteur = role === "saboteur";
  return (
    <div className={`rounded-[2rem] border p-7 text-center ${saboteur ? "border-amber-300/20 bg-amber-300/[.05]" : "border-cyan-300/20 bg-cyan-300/[.05]"}`}>
      <span className="text-6xl">{saboteur ? "🕶️" : "🛡️"}</span>
      <p className={`mt-5 text-[10px] font-black uppercase tracking-[.28em] ${saboteur ? "text-amber-300" : "text-cyan-300"}`}>TWOJA TAJNA ROLA</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-.055em]">{saboteur ? "OSZUST" : "AGENT"}</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400">
        {saboteur
          ? "Masz odpowiadać wiarygodnie, ale w każdej misji dostaniesz ukryty cel. Realizuj go subtelnie i nie daj się jednoznacznie wskazać w finale."
          : "Obserwuj odpowiedzi, pytaj o tok myślenia i szukaj osoby, która próbuje realizować inny cel niż reszta grupy."}
      </p>
      <p className="mt-5 rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-xs font-black text-zinc-500">Nie pokazuj tego ekranu innym.</p>
    </div>
  );
}

function VotePicker({
  game,
  busy,
  voteType,
  onVote,
}: {
  game: PpGameState;
  busy: boolean;
  voteType: "suspicion" | "final";
  onVote: (playerId: string, voteType: "suspicion" | "final") => void;
}) {
  const me = game.currentPlayer;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {game.players.filter((player) => player.id !== me?.id).map((player) => {
        const active = me?.voteTargetId === player.id;
        return (
          <button
            key={player.id}
            type="button"
            disabled={busy}
            onClick={() => onVote(player.id, voteType)}
            className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[.99] ${active ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/9 bg-white/[.025]"}`}
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-xl">{avatar(player.avatar)}</span>
            <strong className="min-w-0 flex-1 truncate text-sm font-black">{player.displayName}</strong>
            {active && <span className="text-cyan-300">✓</span>}
          </button>
        );
      })}
    </div>
  );
}

function PlayerGame({
  data,
  busy,
  error,
  onAnswer,
  onVote,
}: {
  data: PlayerResponse;
  busy: boolean;
  error: string;
  onAnswer: (answer: string) => void;
  onVote: (playerId: string, voteType: "suspicion" | "final") => void;
}) {
  const { room, game } = data;
  const me = game.currentPlayer;
  const [answer, setAnswer] = useState(me?.answer ?? "");

  useEffect(() => {
    setAnswer(me?.answer ?? "");
  }, [game.missionIndex, me?.answer]);

  if (!me) {
    return (
      <Shell room={room} game={game}>
        <div className="mx-auto max-w-xl px-5 py-12 text-center text-zinc-400">Nie udało się odczytać Twojej roli.</div>
      </Shell>
    );
  }

  if (game.phase === "result" && game.result) {
    const won = me.role === "saboteur" ? !game.result.caught : game.result.caught;
    return (
      <Shell room={room} game={game}>
        <section className="mx-auto max-w-2xl px-5 py-12 text-center">
          <span className="text-6xl">{won ? "🏆" : "🎭"}</span>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[.26em] text-cyan-300">KONIEC GRY</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-.055em]">{won ? "WYGRYWASZ" : "TYM RAZEM NIE"}</h1>
          <p className="mt-4 text-base leading-7 text-zinc-400">
            Oszustem był <strong className="text-white">{game.result.saboteurName}</strong>. {game.result.caught ? "Grupa go rozpracowała." : "Utrzymał przykrywkę do końca."}
          </p>
          <div className="mt-8"><RoleCard role={me.role} /></div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell room={room} game={game}>
      <section className="mx-auto max-w-3xl px-5 py-8">
        {game.phase === "briefing" && <RoleCard role={me.role} />}

        {game.phase !== "briefing" && game.mission && (
          <div className="space-y-5">
            <section className="rounded-[1.75rem] border border-white/10 bg-black/25 p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[9px] font-black uppercase tracking-[.22em] text-cyan-300">{game.mission.category}</span>
                <span className={`rounded-full px-3 py-1 text-[9px] font-black ${me.role === "saboteur" ? "bg-amber-300/10 text-amber-300" : "bg-cyan-300/10 text-cyan-300"}`}>
                  {me.role === "saboteur" ? "OSZUST" : "AGENT"}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-.05em]">{game.mission.title}</h1>
              <p className="mt-4 rounded-2xl border border-white/9 bg-white/[.035] p-5 text-base font-bold leading-7 text-zinc-200">{game.mission.prompt}</p>
            </section>

            {game.phase === "mission" && (
              <form
                onSubmit={(event: FormEvent) => {
                  event.preventDefault();
                  onAnswer(answer);
                }}
                className="rounded-[1.75rem] border border-white/10 bg-white/[.025] p-6"
              >
                <label htmlFor="pp-answer" className="text-[9px] font-black uppercase tracking-[.2em] text-zinc-500">TWOJA ODPOWIEDŹ</label>
                <textarea
                  id="pp-answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value.slice(0, 120))}
                  maxLength={120}
                  rows={4}
                  placeholder={game.mission.placeholder}
                  className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base font-bold text-white outline-none placeholder:text-zinc-700 focus:border-cyan-300/45"
                />
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-600">
                  <span>{me.answer ? "Możesz zmienić odpowiedź, dopóki host jej nie odkryje." : "Krótko i konkretnie."}</span>
                  <span>{answer.length}/120</span>
                </div>
                <button type="submit" disabled={busy || !answer.trim()} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-sky-500 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-35">
                  {busy ? "ZAPISUJĘ…" : me.answer ? "ZAPISZ ZMIANĘ" : "ZATWIERDŹ ODPOWIEDŹ"}
                </button>
                {me.answer && <p className="mt-3 text-center text-xs font-black text-emerald-300">✓ Odpowiedź zapisana</p>}
              </form>
            )}

            {game.phase === "evidence" && (
              <div className="rounded-[1.75rem] border border-cyan-300/15 bg-cyan-300/[.05] p-6 text-center">
                <span className="text-4xl">💬</span>
                <h2 className="mt-3 text-2xl font-black">Patrz na wspólny ekran</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">Host pokazuje wszystkie odpowiedzi. Broń swojej i zadawaj pytania innym.</p>
              </div>
            )}

            {game.phase === "suspicion" && (
              <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-6">
                <span className="text-3xl">🗳️</span>
                <h2 className="mt-3 text-2xl font-black">Kto jest najbardziej podejrzany?</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">Nie możesz wskazać siebie. Możesz zmienić głos, dopóki host nie pokaże wyniku.</p>
                <div className="mt-5"><VotePicker game={game} busy={busy} voteType="suspicion" onVote={onVote} /></div>
                {me.voteTargetId && <p className="mt-4 text-center text-xs font-black text-emerald-300">✓ Głos zapisany</p>}
              </div>
            )}

            {game.phase === "suspicion_result" && (
              <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-6">
                <span className="text-3xl">🔎</span>
                <h2 className="mt-3 text-2xl font-black">Poziom podejrzeń</h2>
                <div className="mt-5"><SuspicionBars data={game.suspicion} /></div>
              </div>
            )}

            {game.phase === "final_vote" && (
              <div className="rounded-[1.75rem] border border-amber-300/20 bg-amber-300/[.05] p-6">
                <span className="text-4xl">🎯</span>
                <h2 className="mt-3 text-3xl font-black">Ostatnie wskazanie</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">To ten głos rozstrzygnie grę. Remis na pierwszym miejscu pomaga Oszustowi.</p>
                <div className="mt-5"><VotePicker game={game} busy={busy} voteType="final" onVote={onVote} /></div>
                {me.voteTargetId && <p className="mt-4 text-center text-xs font-black text-emerald-300">✓ Finałowy głos zapisany</p>}
              </div>
            )}
          </div>
        )}

        {error && <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-bold text-red-200">{error}</div>}
      </section>
    </Shell>
  );
}

export default function GameClient({ code }: { code: string }) {
  const [data, setData] = useState<ResponseState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/gra/pod-przykrywka/${code}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Nie udało się pobrać stanu gry.");
        return;
      }
      setData(payload as ResponseState);
    } catch {
      setError("Nie udało się połączyć z grą.");
    }
  }, [code]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 1300);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/gra/pod-przykrywka/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Coś poszło nie tak.");
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

  const handlers = useMemo(() => ({
    advance: () => void send({ action: "advance" }),
    answer: (answer: string) => void send({ action: "answer", answer }),
    vote: (targetPlayerId: string, voteType: "suspicion" | "final") =>
      void send({ action: "vote", targetPlayerId, voteType }),
  // send intentionally uses current closure state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [code]);

  if (!data) {
    return (
      <main className="min-h-screen bg-[#041019] px-5 py-16 text-center text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[.03] p-8">
          <span className="text-4xl">🕵️</span>
          <h1 className="mt-4 text-2xl font-black">Łączenie z misją…</h1>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        </div>
      </main>
    );
  }

  return data.role === "host" ? (
    <HostGame data={data} busy={busy} error={error} onAdvance={handlers.advance} />
  ) : (
    <PlayerGame data={data} busy={busy} error={error} onAnswer={handlers.answer} onVote={handlers.vote} />
  );
}
