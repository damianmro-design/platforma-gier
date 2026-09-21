"use client";

import type { ClpRound6State } from "@/lib/platform-db";

type Player = {
  id: string;
  display_name: string;
  avatar: string;
  team: "A" | "B" | null;
};

const AVATARS: Record<string, string> = {
  lion: "🦁", fox: "🦊", panda: "🐼", tiger: "🐯", koala: "🐨", owl: "🦉",
  frog: "🐸", penguin: "🐧", bear: "🐻", rabbit: "🐰", monkey: "🐵", cat: "🐱",
};

export function HostRound6({
  code,
  round,
  busy,
  error,
  onNext,
}: {
  code: string;
  round: ClpRound6State;
  busy: boolean;
  error: string;
  onNext: () => void;
}) {
  const reveal = round.mode === "reveal";

  return (
    <main className="clp-game-shell clp-r6-shell">
      <header className="clp-r6-topbar">
        <div>
          <span>CO LUDZIE POWIEDZĄ</span>
          <strong>ILE OSÓB?</strong>
        </div>
        <div className="clp-r6-scoreboard">
          <div><span>A</span><strong>{round.scoreA}</strong></div>
          <small>:</small>
          <div><strong>{round.scoreB}</strong><span>B</span></div>
        </div>
        <div className="clp-r6-code">
          <small>KOD</small>
          <b>{code}</b>
        </div>
      </header>

      <section className="clp-r6-main">
        <div className="clp-r6-meta">
          <span>PYTANIE {round.questionIndex + 1}/{round.questionCount}</span>
          <small>0–{round.playerCount} OSÓB</small>
        </div>

        <h1>{round.prompt}</h1>

        <div className="clp-r6-predictors">
          <PredictorCard team="A" predictor={round.predictorA} prediction={round.predictionA} reveal={reveal} />
          <div className="clp-r6-vs">VS</div>
          <PredictorCard team="B" predictor={round.predictorB} prediction={round.predictionB} reveal={reveal} />
        </div>

        {reveal ? (
          <>
            <section className="clp-r6-answer">
              <span>PRAWIDŁOWA ODPOWIEDŹ</span>
              <strong>{round.correctCount}</strong>
              <p>{round.correctCount === 1 ? "osoba" : "osób"}</p>
            </section>
            <Round6Result round={round} />
          </>
        ) : (
          <section className="clp-r6-waiting">
            <span>TAJNE TYPOWANIE</span>
            <h2>
              {round.predictionA && round.predictionB
                ? "Obie drużyny wybrały liczbę."
                : "Drużyny obstawiają…"}
            </h2>
            <p>Typ pozostaje ukryty do momentu zatwierdzenia przez obie drużyny.</p>
          </section>
        )}

        {error && <div className="clp-error">{error}</div>}

        {reveal && (
          <section className="clp-r6-next">
            <div>
              <span>WYNIK ODSŁONIĘTY</span>
              <p>70 pkt za idealne trafienie, 30 pkt za pomyłkę o 1.</p>
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

export function PlayerRound6({
  player,
  round,
  busy,
  error,
  onPrediction,
}: {
  player: Player;
  round: ClpRound6State;
  busy: boolean;
  error: string;
  onPrediction: (count: number) => void;
}) {
  const team = player.team;
  const predictor = team === "A" ? round.predictorA : round.predictorB;
  const prediction = team === "A" ? round.predictionA : round.predictionB;
  const isPredictor = predictor?.id === player.id;
  const reveal = round.mode === "reveal";
  const values = Array.from({ length: round.playerCount + 1 }, (_, index) => index);

  return (
    <main className="clp-game-shell clp-r6-phone-shell">
      <section className="clp-r6-phone-card">
        <header className="clp-r6-phone-head">
          <div>
            <span>ILE OSÓB?</span>
            <strong>PYTANIE {round.questionIndex + 1}/{round.questionCount}</strong>
          </div>
          <div className="clp-r6-phone-score">
            <b>{round.scoreA}</b><span>:</span><b>{round.scoreB}</b>
          </div>
        </header>

        <div className="clp-r6-phone-question">
          <span>{reveal ? "WYNIK" : "DRUŻYNA " + team}</span>
          <h1>{round.prompt}</h1>
        </div>

        {reveal ? (
          <>
            <section className="clp-r6-phone-answer">
              <small>PRAWIDŁOWA LICZBA</small>
              <strong>{round.correctCount}</strong>
            </section>
            <Round6Result round={round} compact team={team ?? undefined} />
            <div className="clp-r6-phone-wait">Czekamy na kolejne pytanie.</div>
          </>
        ) : prediction?.locked ? (
          <div className="clp-r6-locked">
            <span>🔒</span>
            <strong>Typ Waszej drużyny zapisany</strong>
            <p>Czekamy na wybór drugiej drużyny.</p>
          </div>
        ) : isPredictor ? (
          <section className="clp-r6-picker">
            <div className="clp-r6-your-turn">
              <span>{AVATARS[player.avatar] ?? "🎮"}</span>
              <div>
                <small>TY ZATWIERDZASZ LICZBĘ</small>
                <strong>Naradźcie się i wybierzcie od 0 do {round.playerCount}.</strong>
              </div>
            </div>
            <div className="clp-r6-number-grid">
              {values.map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={busy}
                  onClick={() => onPrediction(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="clp-r6-wait-card">
            <span>{predictor ? AVATARS[predictor.avatar] ?? "🎮" : "🎮"}</span>
            <strong>
              {predictor
                ? predictor.display_name + " zatwierdza liczbę Waszej drużyny"
                : "Czekamy na reprezentanta"}
            </strong>
            <p>Naradźcie się razem, ale tylko wskazana osoba może wysłać odpowiedź.</p>
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
  predictor: ClpRound6State["predictorA"];
  prediction: ClpRound6State["predictionA"];
  reveal: boolean;
}) {
  return (
    <article className={"clp-r6-predictor team-" + team.toLowerCase()}>
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
            ? "TYP: " + prediction.count
            : "LICZBA ZAPISANA 🔒"
          : "WYBIERA…"}
      </p>
    </article>
  );
}

function Round6Result({
  round,
  compact = false,
  team,
}: {
  round: ClpRound6State;
  compact?: boolean;
  team?: "A" | "B";
}) {
  const rows = [
    {
      id: "A" as const,
      count: round.predictionA?.count,
      diff: round.lastEvent?.differenceA ?? 0,
      gain: round.lastEvent?.scoreGainA ?? 0,
    },
    {
      id: "B" as const,
      count: round.predictionB?.count,
      diff: round.lastEvent?.differenceB ?? 0,
      gain: round.lastEvent?.scoreGainB ?? 0,
    },
  ].filter((row) => !team || row.id === team);

  return (
    <section className={compact ? "clp-r6-result compact" : "clp-r6-result"}>
      {rows.map((row) => (
        <article key={row.id} className={"team-" + row.id.toLowerCase()}>
          <span>DRUŻYNA {row.id}</span>
          <strong>{row.count ?? "—"} osób</strong>
          <small>{row.diff === 0 ? "IDEALNIE" : "RÓŻNICA: " + row.diff}</small>
          <b>+{row.gain} pkt</b>
        </article>
      ))}
    </section>
  );
}
