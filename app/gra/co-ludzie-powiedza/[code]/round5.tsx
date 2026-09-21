"use client";

import type { ClpRound5State } from "@/lib/platform-db";

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

export function HostRound5({
  code,
  round,
  busy,
  error,
  onNext,
}: {
  code: string;
  round: ClpRound5State;
  busy: boolean;
  error: string;
  onNext: () => void;
}) {
  const reveal = round.mode === "reveal";

  return (
    <main className="clp-game-shell clp-r5-shell">
      <header className="clp-r5-topbar">
        <div>
          <span>CO LUDZIE POWIEDZĄ</span>
          <strong>JEDEN Z WAS</strong>
        </div>
        <div className="clp-r5-scoreboard">
          <div><span>A</span><strong>{round.scoreA}</strong></div>
          <small>:</small>
          <div><strong>{round.scoreB}</strong><span>B</span></div>
        </div>
        <div className="clp-r5-code">
          <small>KOD</small>
          <b>{code}</b>
        </div>
      </header>

      <section className="clp-r5-main">
        <div className="clp-r5-meta">
          <span>PYTANIE {round.questionIndex + 1}/{round.questionCount}</span>
          <small>
            {round.mode === "vote"
              ? "GŁOSUJE CAŁA EKIPA"
              : round.mode === "predict"
                ? "DRUŻYNY PRZEWIDUJĄ WYNIK"
                : "WYNIK GŁOSOWANIA"}
          </small>
        </div>

        <h1>{round.prompt}</h1>

        {round.mode === "vote" && (
          <section className="clp-r5-progress">
            <span>TAJNE GŁOSOWANIE</span>
            <h2>{round.votesSubmitted}/{round.playerCount} głosów</h2>
            <div><i style={{ width: Math.round((round.votesSubmitted / Math.max(1, round.playerCount)) * 100) + "%" }} /></div>
            <p>Na ekranie głównym nie pokazujemy, kto na kogo głosuje.</p>
          </section>
        )}

        {round.mode === "predict" && (
          <div className="clp-r5-predictors">
            <PredictorCard team="A" predictor={round.predictorA} prediction={round.predictionA} />
            <div className="clp-r5-vs">VS</div>
            <PredictorCard team="B" predictor={round.predictorB} prediction={round.predictionB} />
          </div>
        )}

        {reveal && (
          <>
            <Distribution round={round} />
            <Round5Result round={round} />
          </>
        )}

        {error && <div className="clp-error">{error}</div>}

        {reveal && (
          <section className="clp-r5-next">
            <div>
              <span>GŁOSY ODSŁONIĘTE</span>
              <p>80 pkt za trafienie 1. miejsca, 30 pkt za trafienie 2. miejsca.</p>
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

export function PlayerRound5({
  player,
  round,
  busy,
  error,
  onVote,
  onPrediction,
}: {
  player: Player;
  round: ClpRound5State;
  busy: boolean;
  error: string;
  onVote: (targetPlayerId: string) => void;
  onPrediction: (targetPlayerId: string) => void;
}) {
  const team = player.team;
  const predictor = team === "A" ? round.predictorA : round.predictorB;
  const prediction = team === "A" ? round.predictionA : round.predictionB;
  const isPredictor = predictor?.id === player.id;
  const reveal = round.mode === "reveal";

  return (
    <main className="clp-game-shell clp-r5-phone-shell">
      <section className="clp-r5-phone-card">
        <header className="clp-r5-phone-head">
          <div>
            <span>JEDEN Z WAS</span>
            <strong>PYTANIE {round.questionIndex + 1}/{round.questionCount}</strong>
          </div>
          <div className="clp-r5-phone-score">
            <b>{round.scoreA}</b><span>:</span><b>{round.scoreB}</b>
          </div>
        </header>

        <div className="clp-r5-phone-question">
          <span>
            {round.mode === "vote"
              ? "TWÓJ TAJNY GŁOS"
              : round.mode === "predict"
                ? "PRZEWIDŹ WYNIK"
                : "WYNIKI"}
          </span>
          <h1>{round.prompt}</h1>
        </div>

        {round.mode === "vote" ? (
          round.viewerHasVoted ? (
            <div className="clp-r5-locked">
              <span>✓</span>
              <strong>Twój głos jest zapisany</strong>
              <p>{round.votesSubmitted}/{round.playerCount} osób już zagłosowało.</p>
            </div>
          ) : (
            <PlayerGrid
              players={round.players.filter((candidate) => candidate.id !== player.id)}
              busy={busy}
              label="Wybierz 1 osobę. Nie możesz zagłosować na siebie."
              onPick={onVote}
            />
          )
        ) : round.mode === "predict" ? (
          prediction?.locked ? (
            <div className="clp-r5-locked">
              <span>🔒</span>
              <strong>Typ Waszej drużyny zapisany</strong>
              <p>Czekamy na drugą drużynę.</p>
            </div>
          ) : isPredictor ? (
            <PlayerGrid
              players={round.players}
              busy={busy}
              label="Kto dostał najwięcej głosów całej ekipy?"
              onPick={onPrediction}
            />
          ) : (
            <div className="clp-r5-wait-card">
              <span>{predictor ? AVATARS[predictor.avatar] ?? "🎮" : "🎮"}</span>
              <strong>
                {predictor
                  ? predictor.display_name + " zatwierdza typ Waszej drużyny"
                  : "Czekamy na reprezentanta"}
              </strong>
              <p>Naradźcie się razem, ale tylko wskazana osoba może zatwierdzić wybór.</p>
            </div>
          )
        ) : (
          <>
            <Distribution round={round} compact />
            <Round5Result round={round} compact team={team ?? undefined} />
            <div className="clp-r5-phone-wait">Czekamy na kolejne pytanie.</div>
          </>
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

function PlayerGrid({
  players,
  busy,
  label,
  onPick,
}: {
  players: ClpRound5State["players"];
  busy: boolean;
  label: string;
  onPick: (id: string) => void;
}) {
  return (
    <section className="clp-r5-picker">
      <p>{label}</p>
      <div className="clp-r5-player-grid">
        {players.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            disabled={busy}
            onClick={() => onPick(candidate.id)}
          >
            <span>{AVATARS[candidate.avatar] ?? "🎮"}</span>
            <strong>{candidate.display_name}</strong>
            <small>DRUŻYNA {candidate.team}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function PredictorCard({
  team,
  predictor,
  prediction,
}: {
  team: "A" | "B";
  predictor: ClpRound5State["predictorA"];
  prediction: ClpRound5State["predictionA"];
}) {
  return (
    <article className={"clp-r5-predictor team-" + team.toLowerCase()}>
      <span>{predictor ? AVATARS[predictor.avatar] ?? "🎮" : "🎮"}</span>
      <div>
        <small>DRUŻYNA {team}</small>
        <strong>{predictor?.display_name ?? "—"}</strong>
        <p>{prediction?.locked ? "TYP ZAPISANY 🔒" : "PRZEWIDUJE…"}</p>
      </div>
    </article>
  );
}

function Distribution({
  round,
  compact = false,
}: {
  round: ClpRound5State;
  compact?: boolean;
}) {
  const max = Math.max(1, ...round.distribution.map((item) => item.count));

  return (
    <section className={compact ? "clp-r5-distribution compact" : "clp-r5-distribution"}>
      {round.distribution.map((item) => (
        <article key={item.id} className={item.rank === 1 ? "winner" : ""}>
          <div>
            <span>{AVATARS[item.avatar] ?? "🎮"}</span>
            <strong>{item.display_name}</strong>
            <b>{item.count}</b>
          </div>
          <div className="clp-r5-bar">
            <i style={{ width: Math.max(6, (item.count / max) * 100) + "%" }} />
          </div>
        </article>
      ))}
    </section>
  );
}

function Round5Result({
  round,
  compact = false,
  team,
}: {
  round: ClpRound5State;
  compact?: boolean;
  team?: "A" | "B";
}) {
  const getName = (id?: string | null) =>
    round.players.find((player) => player.id === id)?.display_name ?? "—";

  const rows = [
    {
      id: "A" as const,
      pick: getName(round.predictionA?.targetPlayerId),
      gain: round.lastEvent?.scoreGainA ?? 0,
    },
    {
      id: "B" as const,
      pick: getName(round.predictionB?.targetPlayerId),
      gain: round.lastEvent?.scoreGainB ?? 0,
    },
  ].filter((row) => !team || row.id === team);

  return (
    <section className={compact ? "clp-r5-result compact" : "clp-r5-result"}>
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
