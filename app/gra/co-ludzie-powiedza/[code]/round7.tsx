"use client";

import type { ClpRound7State } from "@/lib/platform-db";

type Player = {
  id: string;
  display_name: string;
  avatar: string;
  team: "A" | "B" | null;
};

const AVATARS: Record<string, string> = {
  lion:"🦁", fox:"🦊", panda:"🐼", tiger:"🐯", koala:"🐨", owl:"🦉",
  frog:"🐸", penguin:"🐧", bear:"🐻", rabbit:"🐰", monkey:"🐵", cat:"🐱",
};

export function HostRound7({
  code,
  round,
  busy,
  error,
  onNext,
}: {
  code: string;
  round: ClpRound7State;
  busy: boolean;
  error: string;
  onNext: () => void;
}) {
  const reveal = round.mode === "reveal";

  return (
    <main className="clp-game-shell clp-r7-shell">
      <header className="clp-r7-topbar">
        <div><span>CO LUDZIE POWIEDZĄ</span><strong>POJEDYNEK</strong></div>
        <div className="clp-r7-scoreboard">
          <div><span>A</span><strong>{round.scoreA}</strong></div>
          <small>:</small>
          <div><strong>{round.scoreB}</strong><span>B</span></div>
        </div>
        <div className="clp-r7-code"><small>KOD</small><b>{code}</b></div>
      </header>

      <section className="clp-r7-main">
        <div className="clp-r7-meta">
          <span>POJEDYNEK {round.questionIndex + 1}/{round.questionCount}</span>
          <small>KTÓRA ODPOWIEDŹ BYŁA POPULARNIEJSZA?</small>
        </div>

        <h1>{round.prompt}</h1>

        <div className="clp-r7-reps">
          <Rep team="A" player={round.predictorA} locked={Boolean(round.predictionA)} />
          <div className="clp-r7-versus">VS</div>
          <Rep team="B" player={round.predictorB} locked={Boolean(round.predictionB)} />
        </div>

        <div className="clp-r7-options">
          <OptionCard
            label={round.optionA}
            percent={round.percentA}
            correct={round.correctAnswer === round.optionA}
            reveal={reveal}
          />
          <div className="clp-r7-or">CZY</div>
          <OptionCard
            label={round.optionB}
            percent={round.percentB}
            correct={round.correctAnswer === round.optionB}
            reveal={reveal}
          />
        </div>

        {reveal ? (
          <Round7Result round={round} />
        ) : (
          <section className="clp-r7-waiting">
            <span>TAJNE TYPOWANIE</span>
            <h2>
              {round.predictionA && round.predictionB
                ? "Oba typy zapisane."
                : "Reprezentanci wybierają…"}
            </h2>
          </section>
        )}

        {error && <div className="clp-error">{error}</div>}

        {reveal && (
          <section className="clp-r7-next">
            <div>
              <span>POJEDYNEK ROZSTRZYGNIĘTY</span>
              <p>50 pkt za poprawny wybór.</p>
            </div>
            <button type="button" disabled={busy} onClick={onNext}>
              {busy
                ? "CHWILA…"
                : round.questionIndex + 1 >= round.questionCount
                  ? "PRZEJDŹ DO FINAŁU →"
                  : "NASTĘPNY POJEDYNEK →"}
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

export function PlayerRound7({
  player,
  round,
  busy,
  error,
  onPrediction,
}: {
  player: Player;
  round: ClpRound7State;
  busy: boolean;
  error: string;
  onPrediction: (answer: string) => void;
}) {
  const team = player.team;
  const predictor = team === "A" ? round.predictorA : round.predictorB;
  const prediction = team === "A" ? round.predictionA : round.predictionB;
  const isPredictor = predictor?.id === player.id;
  const reveal = round.mode === "reveal";

  return (
    <main className="clp-game-shell clp-r7-phone-shell">
      <section className="clp-r7-phone-card">
        <header className="clp-r7-phone-head">
          <div><span>POJEDYNEK</span><strong>{round.questionIndex + 1}/{round.questionCount}</strong></div>
          <div className="clp-r7-phone-score"><b>{round.scoreA}</b><span>:</span><b>{round.scoreB}</b></div>
        </header>

        <div className="clp-r7-phone-question">
          <span>{reveal ? "WYNIK" : "DRUŻYNA " + team}</span>
          <h1>{round.prompt}</h1>
        </div>

        {reveal ? (
          <>
            <div className="clp-r7-phone-options">
              <OptionCard label={round.optionA} percent={round.percentA} correct={round.correctAnswer === round.optionA} reveal />
              <OptionCard label={round.optionB} percent={round.percentB} correct={round.correctAnswer === round.optionB} reveal />
            </div>
            <Round7Result round={round} compact team={team ?? undefined} />
            <div className="clp-r7-phone-wait">Czekamy na kolejny pojedynek.</div>
          </>
        ) : prediction?.locked ? (
          <div className="clp-r7-locked">
            <span>🔒</span>
            <strong>Typ Waszej drużyny zapisany</strong>
            <p>Czekamy na decyzję rywali.</p>
          </div>
        ) : isPredictor ? (
          <section className="clp-r7-picker">
            <div className="clp-r7-your-turn">
              <span>{AVATARS[player.avatar] ?? "🎮"}</span>
              <div><small>TY DECYDUJESZ</small><strong>Która odpowiedź była popularniejsza?</strong></div>
            </div>
            <div className="clp-r7-pick-grid">
              {[round.optionA, round.optionB].map((option) => (
                <button key={option} type="button" disabled={busy} onClick={() => onPrediction(option)}>
                  {option}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="clp-r7-wait-card">
            <span>{predictor ? AVATARS[predictor.avatar] ?? "🎮" : "🎮"}</span>
            <strong>{predictor ? predictor.display_name + " reprezentuje Was w tym pojedynku" : "Czekamy na reprezentanta"}</strong>
            <p>Naradźcie się razem, ale tylko wskazana osoba może zatwierdzić odpowiedź.</p>
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

function Rep({
  team,
  player,
  locked,
}: {
  team: "A" | "B";
  player: ClpRound7State["predictorA"];
  locked: boolean;
}) {
  return (
    <article className={"clp-r7-rep team-" + team.toLowerCase()}>
      <span>{player ? AVATARS[player.avatar] ?? "🎮" : "🎮"}</span>
      <div>
        <small>DRUŻYNA {team}</small>
        <strong>{player?.display_name ?? "—"}</strong>
        <p>{locked ? "TYP ZAPISANY 🔒" : "WYBIERA…"}</p>
      </div>
    </article>
  );
}

function OptionCard({
  label,
  percent,
  correct,
  reveal,
}: {
  label: string;
  percent: number | null;
  correct: boolean;
  reveal: boolean;
}) {
  return (
    <article className={"clp-r7-option" + (correct ? " correct" : "")}>
      <strong>{label}</strong>
      <b>{reveal ? (percent ?? 0) + "%" : "?"}</b>
      {correct && reveal && <span>POPULARNIEJSZA</span>}
    </article>
  );
}

function Round7Result({
  round,
  compact = false,
  team,
}: {
  round: ClpRound7State;
  compact?: boolean;
  team?: "A" | "B";
}) {
  const rows = [
    { id: "A" as const, pick: round.predictionA?.answer ?? "—", gain: round.lastEvent?.scoreGainA ?? 0 },
    { id: "B" as const, pick: round.predictionB?.answer ?? "—", gain: round.lastEvent?.scoreGainB ?? 0 },
  ].filter((row) => !team || row.id === team);

  return (
    <section className={compact ? "clp-r7-result compact" : "clp-r7-result"}>
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
