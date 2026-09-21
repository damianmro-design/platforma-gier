"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CLP_WARMUP_QUESTIONS,
  CLP_WARMUP_TOTAL,
} from "@/lib/co-ludzie-powiedza";

type HostState = {
  role: "host";
  room: {
    code: string;
    status: string;
    phase: string | null;
  };
  progress: Array<{
    player_id: string;
    display_name: string;
    avatar: string;
    answer_count: number;
  }>;
};

type PlayerState = {
  role: "player";
  room: {
    code: string;
    status: string;
    phase: string | null;
  };
  player: {
    id: string;
    display_name: string;
    avatar: string;
    team: "A" | "B" | null;
    ready: boolean;
  };
  answers: Array<{
    question_key: string;
    answer_value: string;
  }>;
};

type GameState = HostState | PlayerState;

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

  if (data.room.phase === "round_1") {
    return (
      <main className="clp-game-shell">
        <section className="clp-transition-card">
          <span>POZNAJMY TŁUM ✓</span>
          <h1>Mamy Wasze odpowiedzi.</h1>
          <p>
            Dane są zapisane i wrócą później w rundzie „Wasza ekipa powiedziała”.
            Następny moduł to pierwsza właściwa runda teleturnieju.
          </p>
        </section>
      </main>
    );
  }

  if (data.role === "host") {
    return (
      <HostWarmup
        data={data}
        busy={busy}
        error={error}
        onAdvance={() => void send({ action: "advance" })}
      />
    );
  }

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

function HostWarmup({
  data,
  busy,
  error,
  onAdvance,
}: {
  data: HostState;
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
            const percent = Math.min(100, (player.answer_count / CLP_WARMUP_TOTAL) * 100);

            return (
              <article
                key={player.player_id}
                className={complete ? "clp-progress-player complete" : "clp-progress-player"}
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
  data: PlayerState;
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
          <small>{data.player.team === "A" ? "DRUŻYNA A" : "DRUŻYNA B"}</small>
        </footer>
      </section>
    </main>
  );
}
