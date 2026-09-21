"use client";

import type { ClpRound2State } from "@/lib/platform-db";

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

export function HostRound2({
  code,
  round,
  busy,
  error,
  onNext,
}: {
  code: string;
  round: ClpRound2State;
  busy: boolean;
  error: string;
  onNext: () => void;
}) {
  const reveal = round.mode === "reveal";

  return (
    <main className="clp-game-shell clp-r2-shell">
      <header className="clp-r2-topbar">
        <div>
          <span>CO LUDZIE POWIEDZĄ</span>
          <strong>WASZA EKIPA POWIEDZIAŁA</strong>
        </div>

        <Round2Scoreboard round={round} />

        <div className="clp-r2-code">
          <small>KOD</small>
          <b>{code}</b>
        </div>
      </header>

      <section className="clp-r2-main">
        <div className="clp-r2-question-meta">
          <span>PYTANIE {round.questionIndex + 1}/{round.questionCount}</span>
          <small>ODPOWIEDZI Z TEGO POKOJU</small>
        </div>

        <h1>{round.prompt}</h1>

        {!reveal && (
          <div className="clp-rule-card">
            <strong>JAK GRAMY?</strong>
            <span>
              Wybierzcie odpowiedź, którą Waszym zdaniem wskazało najwięcej osób z tego pokoju.
              Do 60 pkt zależy od udziału wybranej odpowiedzi, +40 pkt za trafienie najpopularniejszej.
            </span>
          </div>
        )}

        <div className="clp-r2-predictors">
          <PredictorCard
            team="A"
            predictor={round.predictorA}
            prediction={round.predictionA}
            reveal={reveal}
          />
          <div className="clp-r2-vs">VS</div>
          <PredictorCard
            team="B"
            predictor={round.predictorB}
            prediction={round.predictionB}
            reveal={reveal}
          />
        </div>

        {!reveal ? (
          <section className="clp-r2-waiting-panel">
            <span>TAJNE TYPOWANIE</span>
            <h2>
              {round.predictionA && round.predictionB
                ? "Mamy oba typy."
                : "Drużyny wybierają odpowiedź…"}
            </h2>
            <p>
              Typy pozostają ukryte, dopóki obie drużyny ich nie zatwierdzą.
            </p>
          </section>
        ) : (
          <>
            <DistributionBoard round={round} />
            <Round2Result round={round} />
          </>
        )}

        {error && <div className="clp-error">{error}</div>}

        {reveal && (
          <section className="clp-r2-next">
            <div>
              <span>ODPOWIEDZI ODSŁONIĘTE</span>
              <p>
                Do 60 pkt za udział osób, które wybrały Wasz typ, plus 40 pkt
                bonusu za trafienie najpopularniejszej odpowiedzi.
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

export function PlayerRound2({
  player,
  round,
  busy,
  error,
  onPrediction,
}: {
  player: Player;
  round: ClpRound2State;
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
    <main className="clp-game-shell clp-r2-phone-shell">
      <section className="clp-r2-phone-card">
        <header className="clp-r2-phone-head">
          <div>
            <span>WASZA EKIPA POWIEDZIAŁA</span>
            <strong>PYTANIE {round.questionIndex + 1}/{round.questionCount}</strong>
          </div>
          <div className="clp-r2-phone-score">
            <b>{round.scoreA}</b>
            <span>:</span>
            <b>{round.scoreB}</b>
          </div>
        </header>

        <div className="clp-r2-phone-question">
          <span>
            {reveal
              ? "WYNIKI WASZEJ EKIPY"
              : team
                ? `DRUŻYNA ${team}`
                : "TYPOWANIE"}
          </span>
          <h1>{round.prompt}</h1>
          {!reveal && (
            <p className="clp-inline-rule">
              Naradźcie się. Punkty zależą od tego, ile osób wybrało Wasz typ, a trafienie nr 1 daje dodatkowe 40 pkt.
            </p>
          )}
        </div>

        {reveal ? (
          <>
            <DistributionBoard round={round} compact />
            <Round2Result round={round} compact />
            <div className="clp-r2-phone-wait">
              Czekamy, aż host przejdzie do kolejnego pytania.
            </div>
          </>
        ) : prediction ? (
          <div className="clp-r2-locked">
            <span>🔒</span>
            <strong>Typ drużyny zablokowany</strong>
            <p>
              Odpowiedź została zapisana. Nie zobaczycie jej, dopóki druga
              drużyna również nie zatwierdzi swojego typu.
            </p>
          </div>
        ) : isPredictor ? (
          <div className="clp-r2-choice-panel">
            <div className="clp-r2-your-turn">
              <span>{AVATARS[player.avatar] ?? "🎮"}</span>
              <div>
                <small>TY ZATWIERDZASZ TYP DRUŻYNY</small>
                <strong>Naradźcie się i wybierz 1 odpowiedź.</strong>
              </div>
            </div>

            <div className="clp-r2-options">
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
          </div>
        ) : (
          <div className="clp-r2-wait-card">
            <span>
              {predictor ? AVATARS[predictor.avatar] ?? "🎮" : "🎮"}
            </span>
            <strong>
              {predictor
                ? `${predictor.display_name} zatwierdza typ Waszej drużyny`
                : "Czekamy na wybór osoby typującej"}
            </strong>
            <p>
              Dyskutujcie razem. Tylko wskazana osoba widzi przyciski do
              zatwierdzenia odpowiedzi.
            </p>
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
  predictor: ClpRound2State["predictorA"];
  prediction: ClpRound2State["predictionA"];
  reveal: boolean;
}) {
  return (
    <article className={`clp-r2-predictor team-${team.toLowerCase()}`}>
      <div className="clp-r2-predictor-person">
        <span>{predictor ? AVATARS[predictor.avatar] ?? "🎮" : "🎮"}</span>
        <div>
          <small>DRUŻYNA {team}</small>
          <strong>{predictor?.display_name ?? "—"}</strong>
        </div>
      </div>

      <div className={prediction ? "clp-r2-pick locked" : "clp-r2-pick"}>
        <small>{prediction ? "TYP ZABLOKOWANY" : "CZEKA NA TYP"}</small>
        <strong>
          {reveal && prediction ? prediction.answer : prediction ? "••••••" : "—"}
        </strong>
      </div>
    </article>
  );
}

function DistributionBoard({
  round,
  compact = false,
}: {
  round: ClpRound2State;
  compact?: boolean;
}) {
  const maxCount = Math.max(
    1,
    ...round.distribution.map((item) => item.count ?? 0),
  );

  return (
    <section className={compact ? "clp-r2-distribution compact" : "clp-r2-distribution"}>
      {round.distribution.map((item) => {
        const count = item.count ?? 0;
        const percent = (count / maxCount) * 100;
        const pickedA = round.predictionA?.answer === item.label;
        const pickedB = round.predictionB?.answer === item.label;

        return (
          <div className="clp-r2-result-row" key={item.label}>
            <div className="clp-r2-result-label">
              <strong>{item.label}</strong>
              <div className="clp-r2-pick-markers">
                {pickedA && <span className="team-a">A</span>}
                {pickedB && <span className="team-b">B</span>}
              </div>
            </div>

            <div className="clp-r2-bar-track">
              <i style={{ width: `${percent}%` }} />
            </div>

            <div className="clp-r2-count">
              <strong>{count}</strong>
              <small>{count === 1 ? "osoba" : "os."}</small>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Round2Result({
  round,
  compact = false,
}: {
  round: ClpRound2State;
  compact?: boolean;
}) {
  const gainA = round.lastEvent?.scoreGainA ?? 0;
  const gainB = round.lastEvent?.scoreGainB ?? 0;

  return (
    <section className={compact ? "clp-r2-gains compact" : "clp-r2-gains"}>
      <div className="team-a">
        <span>DRUŻYNA A</span>
        <strong>+{gainA}</strong>
      </div>
      <div>
        <small>PUNKTY ZA TEN TYP</small>
      </div>
      <div className="team-b">
        <strong>+{gainB}</strong>
        <span>DRUŻYNA B</span>
      </div>
    </section>
  );
}

function Round2Scoreboard({ round }: { round: ClpRound2State }) {
  return (
    <div className="clp-r2-scoreboard">
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
