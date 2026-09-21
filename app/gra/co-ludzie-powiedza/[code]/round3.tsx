"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClpRound3State } from "@/lib/platform-db";

type Player = {
  id: string;
  display_name: string;
  avatar: string;
  team: "A" | "B" | null;
};

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

export function HostRound3({
  code,
  round,
  busy,
  error,
  onNext,
}: {
  code: string;
  round: ClpRound3State;
  busy: boolean;
  error: string;
  onNext: () => void;
}) {
  const reveal = round.mode === "reveal";

  return (
    <main className="clp-game-shell clp-r3-shell">
      <header className="clp-r3-topbar">
        <div>
          <span>CO LUDZIE POWIEDZĄ</span>
          <strong>TOP 5</strong>
        </div>

        <Round3Scoreboard round={round} />

        <div className="clp-r3-code">
          <small>KOD</small>
          <b>{code}</b>
        </div>
      </header>

      <section className="clp-r3-main">
        <div className="clp-r3-question-meta">
          <span>PYTANIE {round.questionIndex + 1}/{round.questionCount}</span>
          <small>OD NAJPOPULARNIEJSZEJ DO NAJMNIEJ POPULARNEJ</small>
        </div>

        <h1>{round.prompt}</h1>

        {!reveal && (
          <div className="clp-rule-card">
            <strong>JAK GRAMY?</strong>
            <span>
              Ułóżcie wszystkie 5 odpowiedzi od najpopularniejszej do najmniej popularnej.
              Każda idealna pozycja daje 15 pkt, a perfekcyjne 5/5 dodatkowe 25 pkt.
            </span>
          </div>
        )}

        <div className="clp-r3-predictors">
          <RankerCard
            team="A"
            predictor={round.predictorA}
            ranking={round.rankingA}
            reveal={reveal}
          />
          <div className="clp-r3-vs">VS</div>
          <RankerCard
            team="B"
            predictor={round.predictorB}
            ranking={round.rankingB}
            reveal={reveal}
          />
        </div>

        {!reveal ? (
          <section className="clp-r3-waiting">
            <span>TAJNE UKŁADANIE</span>
            <h2>
              {round.rankingA && round.rankingB
                ? "Oba rankingi zapisane."
                : "Drużyny układają swoje TOP 5…"}
            </h2>
            <p>
              Kolejność pozostaje ukryta do momentu, aż obie drużyny zatwierdzą ranking.
            </p>
          </section>
        ) : (
          <>
            <CorrectRanking round={round} />
            <Round3Comparison round={round} />
          </>
        )}

        {error && <div className="clp-error">{error}</div>}

        {reveal && (
          <section className="clp-r3-next">
            <div>
              <span>RANKING ODSŁONIĘTY</span>
              <p>
                15 pkt za każdą pozycję ustawioną idealnie, +25 pkt za perfekcyjne 5/5.
              </p>
            </div>
            <button type="button" disabled={busy} onClick={onNext}>
              {busy
                ? "CHWILA…"
                : round.questionIndex + 1 >= round.questionCount
                  ? "ZAKOŃCZ RUNDĘ →"
                  : "NASTĘPNE PYTANIE →"}
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

export function PlayerRound3({
  player,
  round,
  busy,
  error,
  onRanking,
}: {
  player: Player;
  round: ClpRound3State;
  busy: boolean;
  error: string;
  onRanking: (ranking: string[]) => void;
}) {
  const reveal = round.mode === "reveal";
  const team = player.team;
  const predictor = team === "A" ? round.predictorA : round.predictorB;
  const ranking = team === "A" ? round.rankingA : round.rankingB;
  const isPredictor = predictor?.id === player.id;

  const seeded = useMemo(
    () => (ranking?.ranking?.length === 5 ? ranking.ranking : round.options),
    [ranking?.ranking, round.options],
  );
  const [ordered, setOrdered] = useState<string[]>(seeded);

  useEffect(() => {
    setOrdered(seeded);
  }, [seeded, round.questionKey]);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;

    setOrdered((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <main className="clp-game-shell clp-r3-phone-shell">
      <section className="clp-r3-phone-card">
        <header className="clp-r3-phone-head">
          <div>
            <span>TOP 5</span>
            <strong>PYTANIE {round.questionIndex + 1}/{round.questionCount}</strong>
          </div>
          <div className="clp-r3-phone-score">
            <b>{round.scoreA}</b>
            <span>:</span>
            <b>{round.scoreB}</b>
          </div>
        </header>

        <div className="clp-r3-phone-question">
          <span>{reveal ? "POPRAWNY RANKING" : "DRUŻYNA " + team}</span>
          <h1>{round.prompt}</h1>
          {!reveal && (
            <p className="clp-inline-rule">
              Ustawcie pełne TOP 5. 15 pkt za każdą idealną pozycję, +25 pkt za perfekcyjne 5/5.
            </p>
          )}
        </div>

        {reveal ? (
          <>
            <CorrectRanking round={round} compact />
            <Round3Comparison round={round} compact team={team ?? undefined} />
            <div className="clp-r3-phone-wait">
              Czekamy, aż host uruchomi kolejne pytanie.
            </div>
          </>
        ) : ranking?.locked ? (
          <div className="clp-r3-locked">
            <span>🔒</span>
            <strong>Ranking drużyny zapisany</strong>
            <p>Nie pokażemy kolejności rywalom, dopóki oni również nie zatwierdzą swojej.</p>
          </div>
        ) : isPredictor ? (
          <section className="clp-r3-ranker">
            <div className="clp-r3-your-turn">
              <span>{AVATARS[player.avatar] ?? "🎮"}</span>
              <div>
                <small>TY ZATWIERDZASZ KOLEJNOŚĆ</small>
                <strong>Naradźcie się i ustawcie TOP 5.</strong>
              </div>
            </div>

            <div className="clp-r3-order-list">
              {ordered.map((item, index) => (
                <article key={item}>
                  <b>{index + 1}</b>
                  <span>{item}</span>
                  <div>
                    <button
                      type="button"
                      aria-label={"Przesuń " + item + " wyżej"}
                      disabled={index === 0 || busy}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={"Przesuń " + item + " niżej"}
                      disabled={index === ordered.length - 1 || busy}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="clp-r3-lock-button"
              disabled={busy || ordered.length !== 5}
              onClick={() => onRanking(ordered)}
            >
              {busy ? "ZAPISUJEMY…" : "ZATWIERDŹ TOP 5"}
            </button>
          </section>
        ) : (
          <div className="clp-r3-wait-card">
            <span>{predictor ? AVATARS[predictor.avatar] ?? "🎮" : "🎮"}</span>
            <strong>
              {predictor
                ? predictor.display_name + " układa ranking Waszej drużyny"
                : "Czekamy na osobę układającą"}
            </strong>
            <p>Dyskutujcie razem. Tylko wskazana osoba może zatwierdzić kolejność.</p>
          </div>
        )}

        {error && <div className="clp-error">{error}</div>}

        <footer className="clp-phone-footer">
          <span>{AVATARS[player.avatar] ?? "🎮"}</span>
          <strong>{player.display_name}</strong>
          <small>DRUŻYNA {team}</small>
        </footer>
      </section>
    </main>
  );
}

function RankerCard({
  team,
  predictor,
  ranking,
  reveal,
}: {
  team: "A" | "B";
  predictor: ClpRound3State["predictorA"];
  ranking: ClpRound3State["rankingA"];
  reveal: boolean;
}) {
  return (
    <article className={"clp-r3-predictor team-" + team.toLowerCase()}>
      <div>
        <span>{predictor ? AVATARS[predictor.avatar] ?? "🎮" : "🎮"}</span>
        <div>
          <small>DRUŻYNA {team}</small>
          <strong>{predictor?.display_name ?? "—"}</strong>
        </div>
      </div>
      <p>{ranking?.locked ? (reveal ? "RANKING ODSŁONIĘTY" : "RANKING ZAPISANY 🔒") : "UKŁADA…"}</p>
    </article>
  );
}

function CorrectRanking({
  round,
  compact = false,
}: {
  round: ClpRound3State;
  compact?: boolean;
}) {
  const order = round.correctOrder ?? [];

  return (
    <section className={compact ? "clp-r3-correct compact" : "clp-r3-correct"}>
      <span>POPRAWNY TOP 5</span>
      <div>
        {order.map((item, index) => (
          <article key={item}>
            <b>{index + 1}</b>
            <strong>{item}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function Round3Comparison({
  round,
  compact = false,
  team,
}: {
  round: ClpRound3State;
  compact?: boolean;
  team?: "A" | "B";
}) {
  const exactA = round.lastEvent?.exactA ?? 0;
  const exactB = round.lastEvent?.exactB ?? 0;
  const gainA = round.lastEvent?.scoreGainA ?? 0;
  const gainB = round.lastEvent?.scoreGainB ?? 0;

  const rows = [
    { id: "A" as const, ranking: round.rankingA?.ranking ?? [], exact: exactA, gain: gainA },
    { id: "B" as const, ranking: round.rankingB?.ranking ?? [], exact: exactB, gain: gainB },
  ].filter((row) => !team || row.id === team);

  return (
    <section className={compact ? "clp-r3-comparison compact" : "clp-r3-comparison"}>
      {rows.map((row) => (
        <article key={row.id} className={"team-" + row.id.toLowerCase()}>
          <header>
            <span>DRUŻYNA {row.id}</span>
            <strong>+{row.gain} pkt</strong>
          </header>
          <div className="clp-r3-team-order">
            {row.ranking.map((item, index) => {
              const correct = round.correctOrder?.[index] === item;
              return (
                <div key={item} className={correct ? "correct" : ""}>
                  <b>{index + 1}</b>
                  <span>{item}</span>
                  <small>{correct ? "✓" : "×"}</small>
                </div>
              );
            })}
          </div>
          <footer>
            {row.exact}/5 idealnie
            {row.exact === 5 ? " + BONUS 25" : ""}
          </footer>
        </article>
      ))}
    </section>
  );
}

function Round3Scoreboard({ round }: { round: ClpRound3State }) {
  return (
    <div className="clp-r3-scoreboard">
      <div>
        <span>A</span>
        <strong>{round.scoreA}</strong>
      </div>
      <small>:</small>
      <div>
        <strong>{round.scoreB}</strong>
        <span>B</span>
      </div>
    </div>
  );
}
