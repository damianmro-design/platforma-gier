"use client";

import type { ClpRound4State } from "@/lib/platform-db";

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

export function HostRound4({
  code,
  round,
  busy,
  error,
  onNext,
}: {
  code: string;
  round: ClpRound4State;
  busy: boolean;
  error: string;
  onNext: () => void;
}) {
  const reveal = round.mode === "reveal";

  return (
    <main className="clp-game-shell clp-r4-shell">
      <header className="clp-r4-topbar">
        <div>
          <span>CO LUDZIE POWIEDZĄ</span>
          <strong>MNIEJSZOŚĆ</strong>
        </div>

        <Round4Scoreboard round={round} />

        <div className="clp-r4-code">
          <small>KOD</small>
          <b>{code}</b>
        </div>
      </header>

      <section className="clp-r4-main">
        <div className="clp-r4-question-meta">
          <span>PYTANIE {round.questionIndex + 1}/{round.questionCount}</span>
          <small>WSKAŻ NAJMNIEJ POPULARNĄ ODPOWIEDŹ</small>
        </div>

        <h1>{round.prompt}</h1>

        {!reveal && (
          <div className="clp-rule-card">
            <strong>JAK GRAMY?</strong>
            <span>
              Szukacie najmniej popularnej odpowiedzi. Trafienie mniejszości daje 60 pkt,
              a 2. najmniej popularnej odpowiedzi 20 pkt.
            </span>
          </div>
        )}

        <div className="clp-r4-predictors">
          <PredictorCard
            team="A"
            predictor={round.predictorA}
            prediction={round.predictionA}
            reveal={reveal}
          />
          <div className="clp-r4-vs">VS</div>
          <PredictorCard
            team="B"
            predictor={round.predictorB}
            prediction={round.predictionB}
            reveal={reveal}
          />
        </div>

        <MinorityBoard round={round} />

        {!reveal ? (
          <section className="clp-r4-waiting">
            <span>TAJNE TYPOWANIE</span>
            <h2>
              {round.predictionA && round.predictionB
                ? "Obie drużyny wybrały."
                : "Która odpowiedź jest najmniej popularna?"}
            </h2>
            <p>
              Procenty pozostają ukryte, dopóki obie drużyny nie zatwierdzą odpowiedzi.
            </p>
          </section>
        ) : (
          <Round4Result round={round} />
        )}

        {error && <div className="clp-error">{error}</div>}

        {reveal && (
          <section className="clp-r4-next">
            <div>
              <span>MNIEJSZOŚĆ ZNALEZIONA</span>
              <p>60 pkt za najmniej popularną, 20 pkt za 2. najmniej popularną.</p>
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

export function PlayerRound4({
  player,
  round,
  busy,
  error,
  onPrediction,
}: {
  player: Player;
  round: ClpRound4State;
  busy: boolean;
  error: string;
  onPrediction: (answer: string) => void;
}) {
  const reveal = round.mode === "reveal";
  const team = player.team;
  const predictor = team === "A" ? round.predictorA : round.predictorB;
  const prediction = team === "A" ? round.predictionA : round.predictionB;
  const isPredictor = predictor?.id === player.id;

  return (
    <main className="clp-game-shell clp-r4-phone-shell">
      <section className="clp-r4-phone-card">
        <header className="clp-r4-phone-head">
          <div>
            <span>MNIEJSZOŚĆ</span>
            <strong>PYTANIE {round.questionIndex + 1}/{round.questionCount}</strong>
          </div>
          <div className="clp-r4-phone-score">
            <b>{round.scoreA}</b>
            <span>:</span>
            <b>{round.scoreB}</b>
          </div>
        </header>

        <div className="clp-r4-phone-question">
          <span>{reveal ? "WYNIKI" : "DRUŻYNA " + team}</span>
          <h1>{round.prompt}</h1>
          {!reveal && <p>Szukacie odpowiedzi, którą wybrało najmniej ludzi.</p>}
        </div>

        {reveal ? (
          <>
            <MinorityBoard round={round} compact />
            <Round4Result round={round} compact team={team ?? undefined} />
            <div className="clp-r4-phone-wait">
              Czekamy, aż host uruchomi kolejne pytanie.
            </div>
          </>
        ) : prediction?.locked ? (
          <div className="clp-r4-locked">
            <span>🔒</span>
            <strong>Wasz typ został zapisany</strong>
            <p>Odpowiedź pozostanie ukryta, dopóki druga drużyna również nie wybierze.</p>
          </div>
        ) : isPredictor ? (
          <section className="clp-r4-picker">
            <div className="clp-r4-your-turn">
              <span>{AVATARS[player.avatar] ?? "🎮"}</span>
              <div>
                <small>TY ZATWIERDZASZ TYP</small>
                <strong>Naradźcie się. Która odpowiedź jest najmniej popularna?</strong>
              </div>
            </div>

            <div className="clp-r4-option-grid">
              {round.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  disabled={busy}
                  onClick={() => onPrediction(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="clp-r4-wait-card">
            <span>{predictor ? AVATARS[predictor.avatar] ?? "🎮" : "🎮"}</span>
            <strong>
              {predictor
                ? predictor.display_name + " zatwierdza odpowiedź Waszej drużyny"
                : "Czekamy na osobę typującą"}
            </strong>
            <p>Dyskutujcie razem. Tylko wskazana osoba może zatwierdzić wybór.</p>
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

function PredictorCard({
  team,
  predictor,
  prediction,
  reveal,
}: {
  team: "A" | "B";
  predictor: ClpRound4State["predictorA"];
  prediction: ClpRound4State["predictionA"];
  reveal: boolean;
}) {
  return (
    <article className={"clp-r4-predictor team-" + team.toLowerCase()}>
      <div>
        <span>{predictor ? AVATARS[predictor.avatar] ?? "🎮" : "🎮"}</span>
        <div>
          <small>DRUŻYNA {team}</small>
          <strong>{predictor?.display_name ?? "—"}</strong>
        </div>
      </div>
      <p>
        {prediction?.locked
          ? reveal
            ? prediction.answer
            : "ODPOWIEDŹ ZAPISANA 🔒"
          : "WYBIERA…"}
      </p>
    </article>
  );
}

function MinorityBoard({
  round,
  compact = false,
}: {
  round: ClpRound4State;
  compact?: boolean;
}) {
  const max = Math.max(
    1,
    ...round.board.map((item) => item.percent ?? 0),
  );

  return (
    <div className={compact ? "clp-r4-board compact" : "clp-r4-board"}>
      {round.board.map((item) => {
        const percent = item.percent ?? 0;
        const isLeast = round.lastEvent?.leastAnswer === item.label;
        const isSecond = round.lastEvent?.secondLeastAnswer === item.label;
        const width = item.percent == null ? 0 : Math.max(8, (percent / max) * 100);

        return (
          <article
            key={item.label}
            className={
              "clp-r4-board-row" +
              (isLeast ? " least" : "") +
              (isSecond ? " second" : "")
            }
          >
            <div>
              <b>{item.position}</b>
              <span>{item.label}</span>
              <strong>{item.percent == null ? "?" : item.percent + "%"}</strong>
            </div>
            <div className="clp-r4-bar">
              <i style={{ width: item.percent == null ? "0%" : width + "%" }} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Round4Result({
  round,
  compact = false,
  team,
}: {
  round: ClpRound4State;
  compact?: boolean;
  team?: "A" | "B";
}) {
  const rows = [
    {
      id: "A" as const,
      pick: round.predictionA?.answer ?? "—",
      gain: round.lastEvent?.scoreGainA ?? 0,
    },
    {
      id: "B" as const,
      pick: round.predictionB?.answer ?? "—",
      gain: round.lastEvent?.scoreGainB ?? 0,
    },
  ].filter((row) => !team || row.id === team);

  return (
    <section className={compact ? "clp-r4-result compact" : "clp-r4-result"}>
      {rows.map((row) => (
        <article key={row.id} className={"team-" + row.id.toLowerCase()}>
          <span>DRUŻYNA {row.id}</span>
          <strong>{row.pick}</strong>
          <b>+{row.gain} pkt</b>
        </article>
      ))}
    </section>
  );
}

function Round4Scoreboard({ round }: { round: ClpRound4State }) {
  return (
    <div className="clp-r4-scoreboard">
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
