"use client";

import type { ClpFinalState } from "@/lib/platform-db";
import { PartyPlayAvatar } from "@/components/partyplay-avatar";

type Player = {
  id: string;
  display_name: string;
  avatar: string;
  team: "A" | "B" | null;
};


export function HostFinal({
  code,
  final,
  busy,
  error,
  onNext,
}: {
  code: string;
  final: ClpFinalState;
  busy: boolean;
  error: string;
  onNext: () => void;
}) {
  if (final.mode === "finished") {
    return <FinalWinner code={code} final={final} />;
  }

  if (final.mode === "tiebreak") {
    return (
      <main className="clp-game-shell clp-final-shell">
        <header className="clp-final-topbar">
          <div><span>CO LUDZIE POWIEDZĄ</span><strong>FINAŁ</strong></div>
          <FinalScore final={final} />
          <div className="clp-final-code"><small>KOD</small><b>{code}</b></div>
        </header>

        <section className="clp-final-main">
          <div className="clp-final-kicker">DOGRYWKA</div>
          <h1>{final.tiebreakPrompt}</h1>
          <p className="clp-final-sub">
            Obie drużyny wpisują procent. Wygrywa odpowiedź bliższa prawdziwemu wynikowi.
            Przy identycznej różnicy rozstrzyga wcześniejsze zatwierdzenie.
          </p>

          <div className="clp-final-tiebreak-status">
            <LockStatus team="A" locked={Boolean(final.tiebreakA)} />
            <div>VS</div>
            <LockStatus team="B" locked={Boolean(final.tiebreakB)} />
          </div>

          {error && <div className="clp-error">{error}</div>}
        </section>
      </main>
    );
  }

  const reveal = final.mode === "reveal";

  return (
    <main className="clp-game-shell clp-final-shell">
      <header className="clp-final-topbar">
        <div><span>CO LUDZIE POWIEDZĄ</span><strong>FINAŁ</strong></div>
        <FinalScore final={final} />
        <div className="clp-final-code"><small>KOD</small><b>{code}</b></div>
      </header>

      <section className="clp-final-main">
        <div className="clp-final-meta">
          <span>PYTANIE {final.questionIndex + 1}/{final.questionCount}</span>
          <small>{final.multiplier === 3 ? "OSTATNIE PYTANIE ×3" : "PUNKTY WG MIEJSCA W RANKINGU"}</small>
        </div>

        <h1>{final.prompt}</h1>

        {!reveal && (
          <div className="clp-rule-card">
            <strong>JAK GRAMY?</strong>
            <span>
              Wybierzcie 1 z 5 odpowiedzi. 1. miejsce daje 50 pkt, potem 40/30/20/10.
              Ostatnie pytanie liczy się ×3. Lider po rundach głównych zaczyna finał z bonusem 50 pkt.
            </span>
          </div>
        )}

        {final.questionIndex === 0 && !reveal && (
          <div className="clp-final-carryover">
            <strong>WYNIK PRZED FINAŁEM: {final.startScoreA} : {final.startScoreB}</strong>
            <span>
              {final.startScoreA === final.startScoreB
                ? "Był remis, więc finał zaczyna się od 0 : 0."
                : `Lider dostał 50 pkt przewagi. Finał zaczyna się od ${final.scoreA} : ${final.scoreB}.`}
            </span>
          </div>
        )}

        <div className="clp-final-reps">
          <FinalRep team="A" player={final.predictorA} locked={Boolean(final.predictionA)} />
          <div className="clp-final-vs">VS</div>
          <FinalRep team="B" player={final.predictorB} locked={Boolean(final.predictionB)} />
        </div>

        <FinalBoard final={final} />

        {!reveal ? (
          <section className="clp-final-waiting">
            <span>TAJNE TYPOWANIE</span>
            <h2>
              {final.predictionA && final.predictionB
                ? "Obie odpowiedzi zapisane."
                : "Drużyny wybierają 1 odpowiedź…"}
            </h2>
            <p>50/40/30/20/10 pkt za miejsce w rankingu{final.multiplier === 3 ? ", wszystko ×3." : "."}</p>
          </section>
        ) : (
          <FinalResult final={final} />
        )}

        {error && <div className="clp-error">{error}</div>}

        {reveal && (
          <section className="clp-final-next">
            <div>
              <span>{final.questionIndex + 1 >= final.questionCount ? "OSTATNI WYNIK" : "RANKING ODSŁONIĘTY"}</span>
              <p>
                {final.multiplier === 3
                  ? "To pytanie liczyło się potrójnie."
                  : "Punkty zostały dodane do wyniku całej gry."}
              </p>
            </div>
            <button type="button" disabled={busy} onClick={onNext}>
              {busy
                ? "CHWILA…"
                : final.questionIndex + 1 >= final.questionCount
                  ? "POKAŻ WYNIK KOŃCOWY →"
                  : "NASTĘPNE PYTANIE →"}
            </button>
          </section>
        )}
      </section>
    </main>
  );
}

export function PlayerFinal({
  player,
  final,
  busy,
  error,
  onPrediction,
  onTiebreak,
}: {
  player: Player;
  final: ClpFinalState;
  busy: boolean;
  error: string;
  onPrediction: (answer: string) => void;
  onTiebreak: (count: number) => void;
}) {
  const team = player.team;
  const predictor = team === "A" ? final.predictorA : final.predictorB;
  const prediction = team === "A" ? final.predictionA : final.predictionB;
  const tiebreak = team === "A" ? final.tiebreakA : final.tiebreakB;
  const isPredictor = predictor?.id === player.id;

  if (final.mode === "finished") {
    return <PlayerWinner player={player} final={final} />;
  }

  if (final.mode === "tiebreak") {
    return (
      <main className="clp-game-shell clp-final-phone-shell">
        <section className="clp-final-phone-card">
          <header className="clp-final-phone-head">
            <div><span>DOGRYWKA</span><strong>FINAŁ</strong></div>
            <MiniScore final={final} />
          </header>

          <div className="clp-final-phone-question">
            <span>DRUŻYNA {team}</span>
            <h1>{final.tiebreakPrompt}</h1>
          </div>

          {tiebreak?.locked ? (
            <div className="clp-final-locked">
              <span>🔒</span>
              <strong>Wasz procent zapisany</strong>
              <p>Czekamy na drugą drużynę.</p>
            </div>
          ) : isPredictor ? (
            <section className="clp-final-picker">
              <div className="clp-final-your-turn">
                <span><PartyPlayAvatar id={player.avatar} size={38} /></span>
                <div><small>DOGRYWKA</small><strong>Wybierz procent od 0 do 100.</strong></div>
              </div>
              <div className="clp-final-percent-grid">
                {Array.from({ length: 21 }, (_, i) => i * 5).map((value) => (
                  <button key={value} type="button" disabled={busy} onClick={() => onTiebreak(value)}>
                    {value}%
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <WaitCard predictor={predictor} text="reprezentuje Was w dogrywce" />
          )}

          {error && <div className="clp-error">{error}</div>}
          <PhoneFooter player={player} />
        </section>
      </main>
    );
  }

  const reveal = final.mode === "reveal";

  return (
    <main className="clp-game-shell clp-final-phone-shell">
      <section className="clp-final-phone-card">
        <header className="clp-final-phone-head">
          <div>
            <span>FINAŁ {final.multiplier === 3 ? "×3" : ""}</span>
            <strong>PYTANIE {final.questionIndex + 1}/{final.questionCount}</strong>
          </div>
          <MiniScore final={final} />
        </header>

        <div className="clp-final-phone-question">
          <span>{reveal ? "RANKING" : "DRUŻYNA " + team}</span>
          <h1>{final.prompt}</h1>
          {!reveal && (
            <p className="clp-inline-rule">
              Wybierzcie 1 odpowiedź. Punkty za miejsce: 50/40/30/20/10{final.multiplier === 3 ? ", w tym pytaniu ×3." : "."}
            </p>
          )}
        </div>

        {reveal ? (
          <>
            <FinalBoard final={final} compact />
            <FinalResult final={final} compact team={team ?? undefined} />
            <div className="clp-final-phone-wait">Czekamy na kolejny krok prowadzącego.</div>
          </>
        ) : prediction?.locked ? (
          <div className="clp-final-locked">
            <span>🔒</span>
            <strong>Wasza odpowiedź jest zapisana</strong>
            <p>Nie pokażemy jej rywalom przed reveal.</p>
          </div>
        ) : isPredictor ? (
          <section className="clp-final-picker">
            <div className="clp-final-your-turn">
              <span><PartyPlayAvatar id={player.avatar} size={38} /></span>
              <div>
                <small>TY ZATWIERDZASZ</small>
                <strong>Wybierzcie odpowiedź, która Waszym zdaniem była najwyżej.</strong>
              </div>
            </div>
            <div className="clp-final-answer-grid">
              {final.options.map((option) => (
                <button key={option} type="button" disabled={busy} onClick={() => onPrediction(option)}>
                  {option}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <WaitCard predictor={predictor} text="zatwierdza odpowiedź Waszej drużyny" />
        )}

        {error && <div className="clp-error">{error}</div>}
        <PhoneFooter player={player} />
      </section>
    </main>
  );
}

function FinalBoard({ final, compact = false }: { final: ClpFinalState; compact?: boolean }) {
  return (
    <section className={compact ? "clp-final-board compact" : "clp-final-board"}>
      {final.board.map((item) => (
        <article key={item.label}>
          <b>{item.rank ?? "?"}</b>
          <strong>{item.label}</strong>
          <span>{item.percent == null ? "?" : item.percent + "%"}</span>
        </article>
      ))}
    </section>
  );
}

function FinalResult({
  final,
  compact = false,
  team,
}: {
  final: ClpFinalState;
  compact?: boolean;
  team?: "A" | "B";
}) {
  const rows = [
    {
      id: "A" as const,
      answer: final.predictionA?.answer ?? "—",
      rank: final.lastEvent?.rankA,
      gain: final.lastEvent?.scoreGainA ?? 0,
    },
    {
      id: "B" as const,
      answer: final.predictionB?.answer ?? "—",
      rank: final.lastEvent?.rankB,
      gain: final.lastEvent?.scoreGainB ?? 0,
    },
  ].filter((row) => !team || row.id === team);

  return (
    <section className={compact ? "clp-final-result compact" : "clp-final-result"}>
      {rows.map((row) => (
        <article key={row.id} className={"team-" + row.id.toLowerCase()}>
          <span>DRUŻYNA {row.id}</span>
          <strong>{row.answer}</strong>
          <small>{row.rank ? "MIEJSCE " + row.rank : ""}</small>
          <b>+{row.gain} pkt</b>
        </article>
      ))}
    </section>
  );
}

function FinalRep({
  team,
  player,
  locked,
}: {
  team: "A" | "B";
  player: ClpFinalState["predictorA"];
  locked: boolean;
}) {
  return (
    <article className={"clp-final-rep team-" + team.toLowerCase()}>
      <span><PartyPlayAvatar id={player?.avatar} size={38} /></span>
      <div>
        <small>DRUŻYNA {team}</small>
        <strong>{player?.display_name ?? "—"}</strong>
        <p>{locked ? "ODPOWIEDŹ ZAPISANA 🔒" : "WYBIERA…"}</p>
      </div>
    </article>
  );
}

function FinalScore({ final }: { final: ClpFinalState }) {
  return (
    <div className="clp-final-scoreboard">
      <div><span>A</span><strong>{final.scoreA}</strong></div>
      <small>:</small>
      <div><strong>{final.scoreB}</strong><span>B</span></div>
    </div>
  );
}

function MiniScore({ final }: { final: ClpFinalState }) {
  return <div className="clp-final-phone-score"><b>{final.scoreA}</b><span>:</span><b>{final.scoreB}</b></div>;
}

function LockStatus({ team, locked }: { team: "A" | "B"; locked: boolean }) {
  return (
    <article className={"clp-final-lock-status team-" + team.toLowerCase()}>
      <span>DRUŻYNA {team}</span>
      <strong>{locked ? "ZAPISANE 🔒" : "WYBIERA…"}</strong>
    </article>
  );
}

function WaitCard({
  predictor,
  text,
}: {
  predictor: ClpFinalState["predictorA"];
  text: string;
}) {
  return (
    <div className="clp-final-wait-card">
      <span><PartyPlayAvatar id={predictor?.avatar} size={38} /></span>
      <strong>{predictor ? predictor.display_name + " " + text : "Czekamy na reprezentanta"}</strong>
      <p>Naradźcie się razem. Tylko wskazana osoba może zatwierdzić odpowiedź.</p>
    </div>
  );
}

function FinalWinner({ code, final }: { code: string; final: ClpFinalState }) {
  const winner = final.winner ?? (final.scoreA >= final.scoreB ? "A" : "B");
  const tiebreak = final.lastEvent?.type === "tiebreak_finished";

  return (
    <main className="clp-game-shell clp-winner-shell">
      <section className={"clp-winner-card team-" + winner.toLowerCase()}>
        <span className="clp-winner-confetti">✦ ✧ ✦</span>
        <small>CO LUDZIE POWIEDZĄ</small>
        <h1>DRUŻYNA {winner} WYGRYWA!</h1>
        <div className="clp-winner-score">
          <strong>{final.scoreA}</strong><span>:</span><strong>{final.scoreB}</strong>
        </div>
        {tiebreak && (
          <div className="clp-winner-tiebreak">
            <span>DOGRYWKA</span>
            <p>
              Poprawny wynik: {final.tiebreakCorrectPercent}%.
              Typ A: {final.tiebreakA?.count ?? "—"}%, typ B: {final.tiebreakB?.count ?? "—"}%.
            </p>
          </div>
        )}
        <p>Kod gry: {code}</p>
      </section>
    </main>
  );
}

function PlayerWinner({ player, final }: { player: Player; final: ClpFinalState }) {
  const won = player.team === final.winner;
  return (
    <main className="clp-game-shell clp-final-phone-shell">
      <section className={"clp-final-phone-card clp-player-winner " + (won ? "won" : "")}>
        <span>{won ? "🏆" : "👏"}</span>
        <small>{won ? "WYGRALIŚCIE!" : "KONIEC GRY"}</small>
        <h1>{won ? "Wasza drużyna wygrywa." : "Tym razem wygrała druga drużyna."}</h1>
        <div className="clp-final-phone-score large"><b>{final.scoreA}</b><span>:</span><b>{final.scoreB}</b></div>
        <PhoneFooter player={player} />
      </section>
    </main>
  );
}

function PhoneFooter({ player }: { player: Player }) {
  return (
    <footer className="clp-phone-footer">
      <span><PartyPlayAvatar id={player.avatar} size={38} /></span>
      <strong>{player.display_name}</strong>
      <small>DRUŻYNA {player.team}</small>
    </footer>
  );
}
