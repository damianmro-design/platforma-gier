"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CLP_WARMUP_QUESTIONS,
  CLP_WARMUP_TOTAL,
} from "@/lib/co-ludzie-powiedza";
import type { ClpRound1State, ClpRound2State, ClpRound3State, ClpRound4State, ClpRound5State, ClpRound6State } from "@/lib/platform-db";
import { HostRound2, PlayerRound2 } from "./round2";
import { HostRound3, PlayerRound3 } from "./round3";
import { HostRound4, PlayerRound4 } from "./round4";
import { HostRound5, PlayerRound5 } from "./round5";
import { HostRound6, PlayerRound6 } from "./round6";

type RoomState = {
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

type HostWarmupState = {
  role: "host";
  room: RoomState;
  progress: Array<{
    player_id: string;
    display_name: string;
    avatar: string;
    answer_count: number;
  }>;
};

type PlayerWarmupState = {
  role: "player";
  room: RoomState;
  player: Player;
  answers: Array<{
    question_key: string;
    answer_value: string;
  }>;
};

type HostRound1State = {
  role: "host";
  room: RoomState;
  round1: ClpRound1State;
};

type PlayerRound1State = {
  role: "player";
  room: RoomState;
  player: Player;
  round1: ClpRound1State;
};

type HostRound2State = {
  role: "host";
  room: RoomState;
  round2: ClpRound2State;
};

type PlayerRound2State = {
  role: "player";
  room: RoomState;
  player: Player;
  round2: ClpRound2State;
};

type HostRound3State = {
  role: "host";
  room: RoomState;
  round3: ClpRound3State;
};

type PlayerRound3State = {
  role: "player";
  room: RoomState;
  player: Player;
  round3: ClpRound3State;
};

type HostRound4State = {
  role: "host";
  room: RoomState;
  round4: ClpRound4State;
};

type PlayerRound4State = {
  role: "player";
  room: RoomState;
  player: Player;
  round4: ClpRound4State;
};

type HostRound5State = {
  role: "host";
  room: RoomState;
  round5: ClpRound5State;
};

type PlayerRound5State = {
  role: "player";
  room: RoomState;
  player: Player;
  round5: ClpRound5State;
};

type HostRound6State = {
  role: "host";
  room: RoomState;
  round6: ClpRound6State;
};

type PlayerRound6State = {
  role: "player";
  room: RoomState;
  player: Player;
  round6: ClpRound6State;
};

type GameState =
  | HostWarmupState
  | PlayerWarmupState
  | HostRound1State
  | PlayerRound1State
  | HostRound2State
  | PlayerRound2State
  | HostRound3State
  | PlayerRound3State
  | HostRound4State
  | PlayerRound4State
  | HostRound5State
  | PlayerRound5State
  | HostRound6State
  | PlayerRound6State;

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

export default function GameClient({ code }: { code: string }) {
  const [data, setData] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/gra/co-ludzie-powiedza/${code}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.assign(`/pokoj/${code}`);
        return;
      }

      if (!response.ok) return;
      setData((await response.json()) as GameState);
    } catch {
      // Kolejna próba odświeży dane.
    }
  }, [code]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 1200);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/gra/co-ludzie-powiedza/${code}`, {
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
      <main className="clp-game-shell">
        <div className="clp-loading">Uruchamiamy teleturniej…</div>
      </main>
    );
  }

  if (data.room.phase === "round_7") {
    return (
      <main className="clp-game-shell">
        <section className="clp-transition-card">
          <span>RUNDA 6 ZAKOŃCZONA ✓</span>
          <h1>Liczby nie kłamią.</h1>
          <p>
            Wynik jest zapisany. Następny etap to pojedynek drużyn przed finałem.
          </p>
        </section>
      </main>
    );
  }

  if (data.room.phase === "round_6" && "round6" in data) {
    if (data.role === "host") {
      return (
        <HostRound6
          code={data.room.code}
          round={data.round6}
          busy={busy}
          error={error}
          onNext={() => void send({ action: "round6Next" })}
        />
      );
    }

    return (
      <PlayerRound6
        player={data.player}
        round={data.round6}
        busy={busy}
        error={error}
        onPrediction={(count) =>
          void send({ action: "round6Prediction", count })
        }
      />
    );
  }

  if (data.room.phase === "round_5" && "round5" in data) {
    if (data.role === "host") {
      return (
        <HostRound5
          code={data.room.code}
          round={data.round5}
          busy={busy}
          error={error}
          onNext={() => void send({ action: "round5Next" })}
        />
      );
    }

    return (
      <PlayerRound5
        player={data.player}
        round={data.round5}
        busy={busy}
        error={error}
        onVote={(targetPlayerId) =>
          void send({ action: "round5Vote", targetPlayerId })
        }
        onPrediction={(targetPlayerId) =>
          void send({ action: "round5Prediction", targetPlayerId })
        }
      />
    );
  }

  if (data.room.phase === "round_4" && "round4" in data) {
    if (data.role === "host") {
      return (
        <HostRound4
          code={data.room.code}
          round={data.round4}
          busy={busy}
          error={error}
          onNext={() => void send({ action: "round4Next" })}
        />
      );
    }

    return (
      <PlayerRound4
        player={data.player}
        round={data.round4}
        busy={busy}
        error={error}
        onPrediction={(answer) =>
          void send({ action: "round4Prediction", answer })
        }
      />
    );
  }

  if (data.room.phase === "round_3" && "round3" in data) {
    if (data.role === "host") {
      return (
        <HostRound3
          code={data.room.code}
          round={data.round3}
          busy={busy}
          error={error}
          onNext={() => void send({ action: "round3Next" })}
        />
      );
    }

    return (
      <PlayerRound3
        player={data.player}
        round={data.round3}
        busy={busy}
        error={error}
        onRanking={(ranking) =>
          void send({ action: "round3Ranking", ranking })
        }
      />
    );
  }

  if (data.room.phase === "round_2" && "round2" in data) {
    if (data.role === "host") {
      return (
        <HostRound2
          code={data.room.code}
          round={data.round2}
          busy={busy}
          error={error}
          onNext={() => void send({ action: "round2Next" })}
        />
      );
    }

    return (
      <PlayerRound2
        player={data.player}
        round={data.round2}
        busy={busy}
        error={error}
        onPrediction={(answer) =>
          void send({ action: "round2Prediction", answer })
        }
      />
    );
  }

  if (data.room.phase === "round_1" && "round1" in data) {
    if (data.role === "host") {
      return (
        <HostRound1
          data={data}
          busy={busy}
          error={error}
          onNext={() => void send({ action: "round1Next" })}
        />
      );
    }

    return (
      <PlayerRound1
        data={data}
        busy={busy}
        error={error}
        onGuess={(guess) => send({ action: "round1Guess", guess })}
      />
    );
  }

  if (data.role === "host" && "progress" in data) {
    return (
      <HostWarmup
        data={data}
        busy={busy}
        error={error}
        onAdvance={() => void send({ action: "advance" })}
      />
    );
  }

  if (data.role === "player" && "answers" in data) {
    return (
      <PlayerWarmup
        data={data}
        busy={busy}
        error={error}
        onAnswer={(questionKey, answer) =>
          void send({ action: "answer", questionKey, answer })
        }
      />
    );
  }

  return (
    <main className="clp-game-shell">
      <div className="clp-loading">Synchronizujemy grę…</div>
    </main>
  );
}

function HostRound1({
  data,
  busy,
  error,
  onNext,
}: {
  data: HostRound1State;
  busy: boolean;
  error: string;
  onNext: () => void;
}) {
  const round = data.round1;
  const between = round.mode === "between";
  const steal = round.mode === "steal";

  return (
    <main className="clp-game-shell clp-round1-shell">
      <header className="clp-r1-topbar">
        <div>
          <span>CO LUDZIE POWIEDZĄ</span>
          <strong>CO POWIEDZIELI LUDZIE?</strong>
        </div>
        <Scoreboard round={round} />
        <div className="clp-r1-code">
          <small>KOD</small>
          <b>{data.room.code}</b>
        </div>
      </header>

      <section className="clp-r1-main">
        <div className="clp-r1-question-meta">
          <span>PYTANIE {round.questionIndex + 1}/{round.questionCount}</span>
          <div className="clp-r1-strikes" aria-label="Błędy">
            <b className={round.strikes >= 1 ? "on" : ""}>✕</b>
            <b className={round.strikes >= 2 ? "on" : ""}>✕</b>
          </div>
        </div>

        <h1>{round.prompt}</h1>

        <div className="clp-r1-status-row">
          <div className={`clp-active-team team-${round.activeTeam.toLowerCase()}`}>
            <span>{steal ? "PRÓBA PRZEJĘCIA" : "GRA"}</span>
            <strong>Drużyna {round.activeTeam}</strong>
          </div>

          {round.answerer && !between && (
            <div className="clp-answerer">
              <span>{AVATARS[round.answerer.avatar] ?? "🎮"}</span>
              <div>
                <small>TERAZ ODPOWIADA</small>
                <strong>{round.answerer.display_name}</strong>
              </div>
            </div>
          )}
        </div>

        <AnswerBoard round={round} />

        <RoundEvent event={round.lastEvent} />

        {error && <div className="clp-error">{error}</div>}

        {between && (
          <div className="clp-r1-between">
            <div>
              <span>PYTANIE ZAKOŃCZONE</span>
              <p>Odsłoniliśmy także odpowiedzi, których nikt nie trafił.</p>
            </div>
            <button type="button" disabled={busy} onClick={onNext}>
              {busy
                ? "CHWILA…"
                : round.questionIndex + 1 >= round.questionCount
                  ? "ZAKOŃCZ RUNDĘ →"
                  : "NASTĘPNE PYTANIE →"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function PlayerRound1({
  data,
  busy,
  error,
  onGuess,
}: {
  data: PlayerRound1State;
  busy: boolean;
  error: string;
  onGuess: (guess: string) => Promise<boolean>;
}) {
  const round = data.round1;
  const isMyTurn =
    round.mode !== "between" && round.answerer?.id === data.player.id;
  const [guess, setGuess] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = guess.trim();
    if (!clean) return;

    const ok = await onGuess(clean);
    if (ok) setGuess("");
  }

  return (
    <main className="clp-game-shell clp-r1-phone-shell">
      <section className="clp-r1-phone-card">
        <header className="clp-r1-phone-head">
          <div>
            <span>PYTANIE {round.questionIndex + 1}/{round.questionCount}</span>
            <strong>Drużyna {data.player.team}</strong>
          </div>
          <div className="clp-r1-phone-scores">
            <b>{round.scoreA}</b>
            <span>:</span>
            <b>{round.scoreB}</b>
          </div>
        </header>

        <div className="clp-r1-phone-question">
          <span>
            {round.mode === "steal"
              ? "PRÓBA PRZEJĘCIA"
              : round.activeTeam === data.player.team
                ? "WASZA KOLEJ"
                : "KOLEJ RYWALI"}
          </span>
          <h1>{round.prompt}</h1>
        </div>

        <AnswerBoard round={round} compact />

        {round.mode === "between" ? (
          <div className="clp-r1-wait-box">
            <strong>Pytanie zakończone</strong>
            <p>Czekamy, aż host uruchomi kolejne.</p>
          </div>
        ) : isMyTurn ? (
          <form className="clp-r1-guess-form" onSubmit={submit}>
            <label htmlFor="round1Guess">
              {round.mode === "steal"
                ? "Masz 1 próbę. Naradźcie się i wpisz odpowiedź."
                : "Naradźcie się. Ty zatwierdzasz odpowiedź drużyny."}
            </label>
            <input
              id="round1Guess"
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              maxLength={50}
              autoComplete="off"
              placeholder="Wpisz odpowiedź…"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !guess.trim()}>
              {busy ? "SPRAWDZAMY…" : "SPRAWDŹ ODPOWIEDŹ"}
            </button>
          </form>
        ) : (
          <div className="clp-r1-wait-box">
            <strong>
              {round.answerer
                ? `Teraz odpowiada ${round.answerer.display_name}`
                : "Czekamy na odpowiedź"}
            </strong>
            <p>
              {round.activeTeam === data.player.team
                ? "Pomóż swojej drużynie, ale odpowiedź zatwierdza wskazana osoba."
                : "Słuchaj rywali i szykujcie się na swoją kolej."}
            </p>
          </div>
        )}

        <RoundEvent event={round.lastEvent} compact />
        {error && <div className="clp-error">{error}</div>}

        <footer className="clp-phone-footer">
          <span>{AVATARS[data.player.avatar] ?? "🎮"}</span>
          <strong>{data.player.display_name}</strong>
          <small>DRUŻYNA {data.player.team}</small>
        </footer>
      </section>
    </main>
  );
}

function Scoreboard({ round }: { round: ClpRound1State }) {
  return (
    <div className="clp-scoreboard">
      <div className={round.activeTeam === "A" ? "active" : ""}>
        <span>A</span>
        <strong>{round.scoreA}</strong>
      </div>
      <small>:</small>
      <div className={round.activeTeam === "B" ? "active" : ""}>
        <strong>{round.scoreB}</strong>
        <span>B</span>
      </div>
    </div>
  );
}

function AnswerBoard({
  round,
  compact = false,
}: {
  round: ClpRound1State;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "clp-board compact" : "clp-board"}>
      {round.board.map((answer) => {
        const visible = Boolean(answer.label);
        const missed = round.mode === "between" && !answer.revealed;

        return (
          <div
            key={answer.key}
            className={`clp-board-row ${visible ? "visible" : ""} ${missed ? "missed" : ""}`}
          >
            <b>{answer.position}</b>
            <span>{visible ? answer.label : "••••••••"}</span>
            <strong>{visible ? answer.points : "?"}</strong>
          </div>
        );
      })}
    </div>
  );
}

function RoundEvent({
  event,
  compact = false,
}: {
  event: ClpRound1State["lastEvent"];
  compact?: boolean;
}) {
  if (!event?.type) return null;

  let title = "";
  let detail = "";
  let tone = "neutral";

  if (event.type === "correct" || event.type === "board_complete") {
    title = "JEST!";
    detail = `${event.answerLabel ?? event.guess} +${event.points ?? 0} pkt`;
    tone = "good";
  } else if (event.type === "wrong") {
    title = "NIE MA TEGO";
    detail = event.guess ? `„${event.guess}”` : "Błędna odpowiedź";
    tone = "bad";
  } else if (event.type === "pass_to_steal") {
    title = "PRZEJĘCIE!";
    detail = `Drużyna ${event.team === "A" ? "B" : "A"} ma 1 próbę.`;
    tone = "steal";
  } else if (event.type === "steal_success") {
    title = "PRZEJĘTE!";
    detail = `+${event.points ?? 0} pkt za odpowiedź i +${event.bonus ?? 0} bonusu`;
    tone = "steal";
  } else if (event.type === "steal_failed") {
    title = "NIEUDANE PRZEJĘCIE";
    detail = "Pytanie zostaje zamknięte.";
    tone = "bad";
  }

  return (
    <div className={`clp-r1-event ${tone} ${compact ? "compact" : ""}`}>
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function HostWarmup({
  data,
  busy,
  error,
  onAdvance,
}: {
  data: HostWarmupState;
  busy: boolean;
  error: string;
  onAdvance: () => void;
}) {
  const completeCount = data.progress.filter(
    (player) => player.answer_count >= CLP_WARMUP_TOTAL,
  ).length;
  const allComplete =
    data.progress.length >= 4 && completeCount === data.progress.length;

  return (
    <main className="clp-game-shell clp-host-shell">
      <header className="clp-topbar">
        <div>
          <span>CO LUDZIE POWIEDZĄ</span>
          <strong>POZNAJMY TŁUM</strong>
        </div>
        <div>
          <small>KOD</small>
          <b>{data.room.code}</b>
        </div>
      </header>

      <section className="clp-host-hero">
        <span className="clp-round-chip">RUNDA 0</span>
        <h1>Najpierw poznajmy Waszą ekipę.</h1>
        <p>
          Każdy odpowiada prywatnie na 6 krótkich pytań. Nie pokazujemy
          odpowiedzi na ekranie, wrócą do gry później.
        </p>
      </section>

      <section className="clp-progress-panel">
        <div className="clp-progress-head">
          <div>
            <span>POSTĘP EKIPY</span>
            <h2>{completeCount}/{data.progress.length} skończyło</h2>
          </div>
          <div className="clp-progress-total">
            {data.progress.reduce((sum, player) => sum + player.answer_count, 0)}
            /{data.progress.length * CLP_WARMUP_TOTAL} odpowiedzi
          </div>
        </div>

        <div className="clp-player-progress-grid">
          {data.progress.map((player) => {
            const complete = player.answer_count >= CLP_WARMUP_TOTAL;
            const percent = Math.min(
              100,
              (player.answer_count / CLP_WARMUP_TOTAL) * 100,
            );

            return (
              <article
                key={player.player_id}
                className={
                  complete
                    ? "clp-progress-player complete"
                    : "clp-progress-player"
                }
              >
                <span className="clp-progress-avatar">
                  {AVATARS[player.avatar] ?? "🎮"}
                </span>
                <div>
                  <strong>{player.display_name}</strong>
                  <small>
                    {complete
                      ? "GOTOWE"
                      : `${player.answer_count}/${CLP_WARMUP_TOTAL}`}
                  </small>
                </div>
                <div className="clp-mini-track">
                  <i style={{ width: `${percent}%` }} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {error && <div className="clp-error">{error}</div>}

      <section className="clp-host-footer">
        <p>
          {allComplete
            ? "Wszyscy odpowiedzieli. Możemy zaczynać właściwą grę."
            : "Czekamy, aż wszyscy skończą odpowiadać na telefonach."}
        </p>
        <button type="button" disabled={!allComplete || busy} onClick={onAdvance}>
          {busy ? "CHWILA…" : "ZACZYNAMY GRĘ →"}
        </button>
      </section>
    </main>
  );
}

function PlayerWarmup({
  data,
  busy,
  error,
  onAnswer,
}: {
  data: PlayerWarmupState;
  busy: boolean;
  error: string;
  onAnswer: (questionKey: string, answer: string) => void;
}) {
  const answeredKeys = useMemo(
    () => new Set(data.answers.map((answer) => answer.question_key)),
    [data.answers],
  );

  const question = CLP_WARMUP_QUESTIONS.find(
    (item) => !answeredKeys.has(item.key),
  );
  const completed = data.answers.length;
  const percent = Math.min(100, (completed / CLP_WARMUP_TOTAL) * 100);

  if (!question) {
    return (
      <main className="clp-game-shell clp-phone-shell">
        <section className="clp-phone-card clp-phone-done">
          <div className="clp-done-icon">✓</div>
          <span>ODPOWIEDZI ZAPISANE</span>
          <h1>Dzięki, {data.player.display_name}!</h1>
          <p>
            Nie pokazuj odpowiedzi innym. Za chwilę część z nich wróci w
            najmniej spodziewanym momencie.
          </p>
          <div className="clp-phone-waiting">Czekamy na resztę ekipy…</div>
        </section>
      </main>
    );
  }

  return (
    <main className="clp-game-shell clp-phone-shell">
      <section className="clp-phone-card">
        <header className="clp-phone-head">
          <div>
            <span>POZNAJMY TŁUM</span>
            <strong>{completed + 1}/{CLP_WARMUP_TOTAL}</strong>
          </div>
          <div className="clp-phone-track">
            <i style={{ width: `${percent}%` }} />
          </div>
        </header>

        <div className="clp-question-copy">
          <span>{question.eyebrow}</span>
          <h1>{question.question}</h1>
          <p>Wybierz odpowiedź, która najlepiej pasuje do Ciebie.</p>
        </div>

        <div className="clp-answer-grid">
          {question.options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={busy}
              onClick={() => onAnswer(question.key, option)}
            >
              {option}
            </button>
          ))}
        </div>

        {error && <div className="clp-error">{error}</div>}

        <footer className="clp-phone-footer">
          <span>{AVATARS[data.player.avatar] ?? "🎮"}</span>
          <strong>{data.player.display_name}</strong>
          <small>
            {data.player.team === "A" ? "DRUŻYNA A" : "DRUŻYNA B"}
          </small>
        </footer>
      </section>
    </main>
  );
}
