"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PartyPlayAvatar } from "@/components/partyplay-avatar";
import type { VaBanquePlayer, VaBanqueState } from "@/lib/va-banque-db";

type ApiState = {
  room: { code: string; status: string; phase: string | null };
  game: VaBanqueState;
};

const phaseLabels: Partial<Record<VaBanqueState["phase"], string>> = {
  intro: "ZASADY",
  category: "KATEGORIA",
  bidding: "LICYTACJA",
  bid_reveal: "ODSŁANIAMY STAWKI",
  tie_bid: "DOGRYWKA",
  tie_reveal: "ROZSTRZYGNIĘCIE",
  question: "PYTANIE",
  main_result: "WYNIK",
  takeover_open: "PRZEJĘCIE",
  takeover_question: "PRZEJĘTE PYTANIE",
  takeover_result: "WYNIK PRZEJĘCIA",
  round_result: "KONIEC RUNDY",
  final_category: "FINAŁ · KATEGORIA",
  final_bidding: "FINAŁ · STAWKA",
  final_question: "FINAŁ · PYTANIE",
  final_reveal: "FINAŁ · ODSŁONIĘCIE",
  finished: "KONIEC GRY",
};

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("pl-PL").format(Number(value ?? 0));
}

function playerById(game: VaBanqueState, id: string | null) {
  return game.players.find((player) => player.id === id) ?? null;
}

function bidFor(game: VaBanqueState, playerId: string) {
  return game.bids.find((item) => item.playerId === playerId) ?? null;
}

export default function GameClient({ code }: { code: string }) {
  const [data, setData] = useState<ApiState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connectionIssue, setConnectionIssue] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [selectedBid, setSelectedBid] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedFinalBid, setSelectedFinalBid] = useState<number | null>(null);
  const lastPhase = useRef<string | null>(null);
  const clockOffset = useRef(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/gra/va-banque/${code}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        if (response.status === 401) {
          window.location.assign(`/pokoj/${code}`);
          return;
        }
        throw new Error(result.error ?? "Nie udało się odświeżyć gry.");
      }

      const next = (await response.json()) as ApiState;
      clockOffset.current = new Date(next.game.serverNow).getTime() - Date.now();
      setData(next);
      setConnectionIssue(false);
    } catch {
      setConnectionIssue(true);
    }
  }, [code]);

  // The local countdown updates independently, so most phases do not need
  // a 700 ms database poll. Keep takeover contention responsive.
  const pollInterval =
    data?.game.phase === "takeover_open"
      ? 700
      : data?.game.phase === "bidding" ||
          data?.game.phase === "tie_bid" ||
          data?.game.phase === "question" ||
          data?.game.phase === "takeover_question" ||
          data?.game.phase === "final_bidding" ||
          data?.game.phase === "final_question"
        ? 1200
        : 2000;

  useEffect(() => {
    let polling = false;
    const refreshIfVisible = async () => {
      if (document.hidden || polling) return;
      polling = true;
      try {
        await load();
      } finally {
        polling = false;
      }
    };

    void refreshIfVisible();
    const timer = window.setInterval(() => void refreshIfVisible(), pollInterval);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [load, pollInterval]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (!data?.game.deadline) {
        setSecondsLeft(0);
        return;
      }
      const now = Date.now() + clockOffset.current;
      const remaining = Math.max(0, new Date(data.game.deadline).getTime() - now);
      setSecondsLeft(Math.ceil(remaining / 1000));
    }, 150);

    return () => window.clearInterval(timer);
  }, [data?.game.deadline]);

  useEffect(() => {
    const phase = data?.game.phase ?? null;
    if (phase && phase !== lastPhase.current) {
      setError("");
      setSelectedAnswer(null);
      if (phase === "bidding" || phase === "tie_bid") setSelectedBid(null);
      if (phase === "final_bidding") setSelectedFinalBid(null);
      lastPhase.current = phase;
    }
  }, [data?.game.phase]);

  async function send(body: Record<string, unknown>) {
    if (busy) return null;
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/gra/va-banque/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(result.error ?? "Nie udało się wykonać tej akcji.");
        await load();
        return null;
      }

      if (navigator.vibrate) navigator.vibrate(25);
      await load();
      return result;
    } catch {
      setError("Połączenie zostało przerwane. Spróbuj ponownie.");
      setConnectionIssue(true);
      return null;
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#100906] px-5 text-white">
        <div className="w-full max-w-sm rounded-[2rem] border border-amber-300/15 bg-[#1a100b] p-7 text-center shadow-2xl">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full border-2 border-amber-300/30 border-t-amber-200" />
          <h1 className="mt-5 text-xl font-black">Łączymy Cię ze stołem…</h1>
          <p className="mt-2 text-sm leading-6 text-amber-100/55">
            Przywracamy aktualną rundę, wynik i pozostały czas.
          </p>
        </div>
      </main>
    );
  }

  const game = data.game;
  const viewer = game.viewer;
  const me = viewer ? playerById(game, viewer.id) : null;
  const winner = playerById(game, game.winningPlayerId);
  const takeover = playerById(game, game.takeoverPlayerId);
  const isMainAnswerer = Boolean(viewer && viewer.id === game.winningPlayerId);
  const isTakeoverAnswerer = Boolean(viewer && viewer.id === game.takeoverPlayerId);
  const canTakeover = Boolean(
    viewer &&
      viewer.points > 0 &&
      game.phase === "takeover_open" &&
      viewer.id !== game.winningPlayerId &&
      !game.takeoverPlayerId,
  );

  const normalMax = viewer
    ? Math.floor((viewer.points * 0.5) / 50) * 50
    : 0;
  const normalMin = normalMax >= 100 ? 100 : normalMax;

  const tieMin = Number(game.winningBid ?? 0) + 50;
  const canRaiseTie = Boolean(viewer && normalMax >= tieMin);
  const quickBids = viewer
    ? Array.from(
        new Set(
          [normalMin, 200, 300, 500, normalMax].filter(
            (value) => value > 0 && value >= normalMin && value <= normalMax,
          ),
        ),
      ).sort((a, b) => a - b)
    : [];

  const eventType = String(game.lastEvent?.type ?? "");
  const eventDelta = Number(game.lastEvent?.delta ?? 0);
  const eventPlayer = playerById(game, String(game.lastEvent?.playerId ?? "")) ?? null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#100906] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(251,191,36,.22),transparent_35%),radial-gradient(circle_at_100%_70%,rgba(234,88,12,.12),transparent_28%),linear-gradient(180deg,#100906,#090504_60%,#070303)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[.07] [background-image:linear-gradient(rgba(255,220,150,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,220,150,.12)_1px,transparent_1px)] [background-size:38px_38px]" />

      <header className="sticky top-0 z-40 border-b border-amber-200/10 bg-[#0d0705]/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/gry/va-banque" className="shrink-0" aria-label="Wróć do VA BANQUE">
            <img src="/zagraj-logo.webp" alt="zaGRAj" className="h-7 w-auto" />
          </Link>

          <div className="min-w-0 text-center">
            <p className="truncate text-[8px] font-black uppercase tracking-[.2em] text-amber-300/60">
              {phaseLabels[game.phase] ?? "VA BANQUE"}
            </p>
            <p className="mt-0.5 text-xs font-black text-amber-50">
              {game.phase.startsWith("final") || game.phase === "finished"
                ? "FINAŁ"
                : `RUNDA ${game.roundIndex}/${game.regularRounds}`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-xl border border-amber-200/10 bg-amber-200/[.05] px-2.5 py-1.5 text-right">
              <span className="block text-[7px] font-black uppercase tracking-[.16em] text-amber-200/45">KOD</span>
              <strong className="block text-xs tracking-[.14em] text-amber-100">{code}</strong>
            </div>
            {viewer && (
              <div className="hidden rounded-xl border border-amber-200/10 bg-black/20 px-2.5 py-1.5 text-right sm:block">
                <span className="block text-[7px] font-black uppercase tracking-[.16em] text-amber-200/45">TWÓJ STAN</span>
                <strong className="block text-xs text-amber-200">{money(viewer.points)} pkt</strong>
              </div>
            )}
          </div>
        </div>
      </header>

      {connectionIssue && (
        <div className="relative z-30 border-b border-orange-300/15 bg-orange-400/10 px-4 py-2 text-center text-[11px] font-bold text-orange-100">
          Słabsze połączenie. Zostajesz w grze, próbujemy zsynchronizować ekran…
        </div>
      )}

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6">
        <ScoreStrip players={game.players} viewerId={viewer?.id ?? null} />

        <section className="mt-4 overflow-hidden rounded-[1.8rem] border border-amber-200/12 bg-[#170d08]/92 shadow-[0_28px_90px_rgba(0,0,0,.45)]">
          <div className="border-b border-amber-200/8 bg-gradient-to-r from-amber-300/[.06] via-orange-400/[.03] to-transparent px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[.22em] text-amber-300/55">
                  {phaseLabels[game.phase]}
                </span>
                {game.category && game.phase !== "intro" && (
                  <p className="mt-1 text-sm font-black text-amber-100">{game.category}</p>
                )}
              </div>
              {game.phase !== "finished" && (
                <Timer seconds={secondsLeft} urgent={secondsLeft <= 5} />
              )}
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {game.phase === "intro" && <Intro />}

            {game.phase === "category" && (
              <Category category={game.category} />
            )}

            {game.phase === "bidding" && viewer && (
              viewer.bidLocked ? (
                <Waiting
                  title="Oferta przyjęta."
                  copy="Twoja stawka jest ukryta. Odsłonimy wszystkie dopiero po zamknięciu licytacji."
                  emphasis={`${money(viewer.bid)} pkt`}
                />
              ) : (
                <BidPanel
                  title="Ile ryzykujesz?"
                  copy="Widzisz kategorię, ale nie pytanie. Najwyższa stawka przejmie prawo do odpowiedzi."
                  points={viewer.points}
                  min={normalMin}
                  max={normalMax}
                  values={quickBids}
                  selected={selectedBid}
                  onSelect={setSelectedBid}
                  onPass={() => void send({ action: "bid", bid: 0 })}
                  onSubmit={() => selectedBid != null && void send({ action: "bid", bid: selectedBid })}
                  busy={busy}
                />
              )
            )}

            {game.phase === "bidding" && !viewer && (
              <Waiting title="Gracze licytują." copy="Stawki pozostają prywatne do końca czasu." />
            )}

            {game.phase === "bid_reveal" && (
              <BidReveal game={game} title={winner ? `${winner.name} przejmuje pytanie` : "Odsłaniamy stawki"} />
            )}

            {game.phase === "tie_bid" && (
              viewer && game.tiePlayerIds.includes(viewer.id) ? (
                viewer.tieLocked ? (
                  <Waiting
                    title={viewer.tieBid === 0 ? "Pas przyjęty." : "Podbicie przyjęte."}
                    copy="Czekamy na pozostałych remisujących."
                    emphasis={viewer.tieBid ? `${money(viewer.tieBid)} pkt` : "PAS"}
                  />
                ) : (
                  <TieBidPanel
                    currentBid={Number(game.winningBid ?? 0)}
                    min={tieMin}
                    max={normalMax}
                    canRaise={canRaiseTie}
                    selected={selectedBid}
                    onSelect={setSelectedBid}
                    onPass={() => void send({ action: "tieBid", bid: 0 })}
                    onSubmit={() => selectedBid != null && void send({ action: "tieBid", bid: selectedBid })}
                    busy={busy}
                  />
                )
              ) : (
                <Waiting
                  title="Dogrywka licytacji."
                  copy="Tylko gracze z najwyższą identyczną stawką mogą teraz podbić albo spasować."
                />
              )
            )}

            {game.phase === "tie_reveal" && (
              <BidReveal game={game} title={winner ? `${winner.name} wygrywa dogrywkę` : "Rozstrzygamy remis"} />
            )}

            {game.phase === "question" && (
              <QuestionPanel
                game={game}
                active={isMainAnswerer}
                selected={selectedAnswer}
                setSelected={setSelectedAnswer}
                onSubmit={() =>
                  selectedAnswer != null && void send({ action: "answer", answerIndex: selectedAnswer })
                }
                busy={busy}
                waitingCopy={winner ? `${winner.name} odpowiada za ${money(game.winningBid)} pkt.` : "Czekamy na odpowiedź."}
              />
            )}

            {game.phase === "main_result" && (
              <ResultPanel
                game={game}
                title={eventType === "main_correct" ? "DOBRZE" : "ŹLE"}
                delta={eventDelta}
                player={eventPlayer}
              />
            )}

            {game.phase === "takeover_open" && (
              canTakeover ? (
                <TakeoverPanel
                  risk={Math.min(
                    viewer?.points ?? 0,
                    Math.max(50, Math.round((Number(game.winningBid ?? 0) * 0.5) / 50) * 50),
                  )}
                  onClaim={async () => {
                    const result = await send({ action: "takeover" });
                    if (result && result.won === false) setError("Ktoś był szybszy. Pytanie zostało już przejęte.");
                  }}
                  busy={busy}
                />
              ) : (
                <Waiting
                  title={
                    viewer?.id === game.winningPlayerId
                      ? "Pozostali mogą przejąć pytanie."
                      : viewer && viewer.points <= 0
                        ? "Nie masz punktów na przejęcie."
                        : "Kto pierwszy?"
                  }
                  copy={
                    viewer && viewer.points <= 0
                      ? "Możesz obserwować dalszy przebieg rundy. Do przejęcia potrzebujesz dodatniego kapitału."
                      : "Okno przejęcia jest krótkie. Serwer przyzna pytanie tylko jednej osobie."
                  }
                />
              )
            )}

            {game.phase === "takeover_question" && (
              <QuestionPanel
                game={game}
                active={isTakeoverAnswerer}
                selected={selectedAnswer}
                setSelected={setSelectedAnswer}
                onSubmit={() =>
                  selectedAnswer != null && void send({ action: "answer", answerIndex: selectedAnswer })
                }
                busy={busy}
                waitingCopy={
                  takeover
                    ? `${takeover.name} przejął pytanie i ryzykuje ${money(game.takeoverRisk)} pkt.`
                    : "Pytanie zostało przejęte."
                }
                takeover
              />
            )}

            {game.phase === "takeover_result" && (
              <ResultPanel
                game={game}
                title={eventType === "takeover_correct" ? "PRZEJĘCIE UDANE" : "PRZEJĘCIE NIEUDANE"}
                delta={eventDelta}
                player={eventPlayer}
              />
            )}

            {game.phase === "round_result" && (
              eventType === "no_takeover" ? (
                <NoTakeoverResult game={game} />
              ) : (
                <Waiting
                  title={eventType === "all_pass" ? "Wszyscy spasowali." : "Runda zamknięta."}
                  copy={
                    eventType === "all_pass"
                      ? "Nikt nie ryzykuje punktów. Za chwilę nowa kategoria."
                      : "Aktualizujemy stany kont i przechodzimy do kolejnej kategorii."
                  }
                />
              )
            )}

            {game.phase === "final_category" && (
              <FinalCategory category={game.category} />
            )}

            {game.phase === "final_bidding" && viewer && (
              viewer.finalBidLocked ? (
                <Waiting
                  title="Stawka finałowa zamknięta."
                  copy="Pozostaje tajna aż do odsłonięcia finału."
                  emphasis={
                    viewer.finalBid === viewer.points && viewer.points > 0
                      ? `VA BANQUE · ${money(viewer.finalBid)} pkt`
                      : `${money(viewer.finalBid)} pkt`
                  }
                />
              ) : (
                <FinalBidPanel
                  points={viewer.points}
                  selected={selectedFinalBid}
                  onSelect={setSelectedFinalBid}
                  onSubmit={() =>
                    selectedFinalBid != null &&
                    void send({ action: "finalBid", bid: selectedFinalBid })
                  }
                  onAllIn={() => {
                    setSelectedFinalBid(viewer.points);
                    void send({ action: "finalBid", bid: viewer.points });
                  }}
                  busy={busy}
                />
              )
            )}

            {game.phase === "final_bidding" && !viewer && (
              <Waiting title="Finałowe stawki są tajne." copy="Każdy może postawić od 0 do 100% swojego kapitału." />
            )}

            {game.phase === "final_question" && (
              <QuestionPanel
                game={game}
                active={Boolean(viewer && !viewer.finalAnswerLocked)}
                selected={selectedAnswer}
                setSelected={setSelectedAnswer}
                onSubmit={() =>
                  selectedAnswer != null && void send({ action: "finalAnswer", answerIndex: selectedAnswer })
                }
                busy={busy}
                waitingCopy={
                  viewer?.finalAnswerLocked
                    ? "Twoja odpowiedź została zapisana. Czekamy na pozostałych."
                    : "W finale każdy odpowiada prywatnie."
                }
                final
              />
            )}

            {game.phase === "final_reveal" && <FinalReveal game={game} />}

            {game.phase === "finished" && (
              <Finished
                game={game}
                canRematch={game.isHost}
                onRematch={() => void send({ action: "rematch" })}
                busy={busy}
              />
            )}
          </div>
        </section>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-300/15 bg-red-400/[.08] px-4 py-3 text-sm font-bold leading-6 text-red-100">
            {error}
          </div>
        )}

        {viewer && game.phase !== "finished" && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200/8 bg-black/20 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <PartyPlayAvatar id={viewer.avatar} size={38} />
              <div className="min-w-0">
                <span className="block truncate text-xs font-black">{viewer.name}</span>
                <small className="text-[9px] font-bold uppercase tracking-[.12em] text-amber-200/35">
                  Twój kapitał
                </small>
              </div>
            </div>
            <strong className="text-xl font-black tabular-nums text-amber-200">{money(viewer.points)}</strong>
          </div>
        )}

        {!me && game.isHost && (
          <div className="mt-4 rounded-2xl border border-amber-300/12 bg-amber-300/[.05] px-4 py-3 text-xs leading-5 text-amber-100/55">
            Jesteś właścicielem pokoju, ale nie masz aktywnego gracza. Do rozgrywki wrócisz przez lobby i kod powrotu.
          </div>
        )}
      </div>
    </main>
  );
}

function Timer({ seconds, urgent }: { seconds: number; urgent: boolean }) {
  return (
    <div
      className={
        "min-w-16 rounded-2xl border px-3 py-2 text-center " +
        (urgent
          ? "border-red-300/30 bg-red-400/10 text-red-100 shadow-[0_0_25px_rgba(248,113,113,.08)]"
          : "border-amber-200/12 bg-black/20 text-amber-100")
      }
    >
      <span className="block text-[7px] font-black uppercase tracking-[.18em] opacity-45">CZAS</span>
      <strong className="block text-xl font-black tabular-nums">{seconds}s</strong>
    </div>
  );
}

function ScoreStrip({
  players,
  viewerId,
}: {
  players: VaBanquePlayer[];
  viewerId: string | null;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
      {players.map((player, index) => (
        <div
          key={player.id}
          className={
            "flex min-w-[138px] items-center gap-2 rounded-2xl border px-3 py-2 " +
            (player.id === viewerId
              ? "border-amber-300/30 bg-amber-300/[.08]"
              : "border-amber-200/8 bg-black/20")
          }
        >
          <span className="text-[9px] font-black text-amber-300/45">#{index + 1}</span>
          <PartyPlayAvatar id={player.avatar} size={31} />
          <div className="min-w-0">
            <strong className="block truncate text-[11px]">{player.name}</strong>
            <span className="text-xs font-black tabular-nums text-amber-200">{money(player.points)}</span>
          </div>
          <span
            className={
              "ml-auto h-2 w-2 shrink-0 rounded-full " +
              (player.isConnected ? "bg-emerald-400" : "bg-zinc-700")
            }
            title={player.isConnected ? "połączony" : "chwilowo offline"}
          />
        </div>
      ))}
    </div>
  );
}

function Intro() {
  const rules = [
    ["01", "Najpierw kategoria", "Nie zobaczysz pytania przed licytacją."],
    ["02", "Licytuj ryzyko", "W zwykłej rundzie możesz postawić maksymalnie 50% kapitału albo wybrać PAS."],
    ["03", "Wygrywasz albo tracisz", "Dobra odpowiedź dodaje stawkę. Zła ją odejmuje, ale przed finałem zawsze zostaje Ci co najmniej 100 pkt."],
    ["04", "Przejmuj błędy", "Gdy ktoś odpowie źle, pierwszy z pozostałych graczy może przejąć pytanie, zwykle za połowę poprzedniej stawki."],
    ["05", "Remis? Dogrywka", "Gracze z najwyższą równą stawką mogą jeszcze podbić albo spasować. Jeśli nadal jest remis, rozstrzyga serwer."],
    ["06", "Finał bez limitu", "Na końcu każdy może postawić od 0 do 100% swojego kapitału. VA BANQUE oznacza wszystko."],
  ];

  return (
    <div>
      <span className="text-[10px] font-black uppercase tracking-[.25em] text-amber-300">JAK GRAMY</span>
      <h1 className="mt-2 text-3xl font-black tracking-[-.05em] sm:text-4xl">Wiedza to dopiero połowa gry.</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {rules.map(([no, title, copy]) => (
          <article key={no} className="rounded-2xl border border-amber-200/10 bg-black/20 p-4">
            <span className="text-[9px] font-black tracking-[.2em] text-orange-300">{no}</span>
            <h2 className="mt-2 text-sm font-black">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-amber-50/60">{copy}</p>
          </article>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-amber-300/20 bg-gradient-to-r from-amber-300/10 to-orange-500/[.05] p-4 text-center">
        <strong className="text-sm font-black text-amber-100">Każdy wybór jest prywatny. W finale możesz postawić wszystko. Dosłownie.</strong>
      </div>
    </div>
  );
}

function Category({ category }: { category: string }) {
  return (
    <div className="py-8 text-center sm:py-12">
      <p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-300/55">NASTĘPNA KATEGORIA</p>
      <h1 className="mt-4 bg-gradient-to-r from-amber-100 via-yellow-300 to-orange-300 bg-clip-text text-5xl font-black tracking-[-.06em] text-transparent sm:text-6xl">
        {category}
      </h1>
      <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-amber-50/60">
        Pytanie pozostaje ukryte. Za chwilę zdecydujesz, ile ta kategoria jest dla Ciebie warta.
      </p>
    </div>
  );
}

function BidPanel({
  title,
  copy,
  points,
  min,
  max,
  values,
  selected,
  onSelect,
  onPass,
  onSubmit,
  busy,
}: {
  title: string;
  copy: string;
  points: number;
  min: number;
  max: number;
  values: number[];
  selected: number | null;
  onSelect: (value: number) => void;
  onPass: () => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Metric label="MASZ" value={money(points)} />
        <Metric label="MIN" value={money(min)} />
        <Metric label="MAX 50%" value={money(max)} highlight />
      </div>
      <h1 className="mt-6 text-3xl font-black tracking-[-.045em]">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-amber-50/60">{copy}</p>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            disabled={busy}
            onClick={() => onSelect(value)}
            className={
              "rounded-2xl border px-4 py-4 text-xl font-black tabular-nums transition " +
              (selected === value
                ? "border-amber-200/50 bg-amber-300 text-[#241005] shadow-[0_10px_35px_rgba(251,191,36,.16)]"
                : "border-amber-200/12 bg-black/25 text-amber-100 hover:bg-amber-300/10")
            }
          >
            {value === max ? "MAX " : ""}{money(value)}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[.8fr_1.4fr] gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onPass}
          className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-4 text-sm font-black text-zinc-400"
        >
          PAS
        </button>
        <button
          type="button"
          disabled={busy || selected == null}
          onClick={onSubmit}
          className="rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-4 text-sm font-black text-[#241005] disabled:cursor-not-allowed disabled:opacity-35"
        >
          {selected == null ? "Wybierz stawkę" : `Zatwierdź ${money(selected)} pkt`}
        </button>
      </div>
    </div>
  );
}

function TieBidPanel({
  currentBid,
  min,
  max,
  canRaise,
  selected,
  onSelect,
  onPass,
  onSubmit,
  busy,
}: {
  currentBid: number;
  min: number;
  max: number;
  canRaise: boolean;
  selected: number | null;
  onSelect: (value: number) => void;
  onPass: () => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  const choices = Array.from(
    new Set([min, min + 100, min + 200, max].filter((value) => value >= min && value <= max)),
  ).sort((a, b) => a - b);

  return (
    <div>
      <span className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300">REMIS NA {money(currentBid)}</span>
      <h1 className="mt-2 text-3xl font-black tracking-[-.045em]">Podbijasz czy pasujesz?</h1>
      <p className="mt-2 text-sm leading-6 text-amber-50/60">
        Tylko remisujący gracze biorą udział w tej krótkiej dogrywce. Jeśli po niej nadal będzie remis, rozstrzygnie serwer.
      </p>

      {canRaise ? (
        <div className="mt-6 grid grid-cols-2 gap-2">
          {choices.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              className={
                "rounded-2xl border px-4 py-4 text-xl font-black transition " +
                (selected === value
                  ? "border-amber-200/50 bg-amber-300 text-[#241005]"
                  : "border-amber-200/12 bg-black/25 text-amber-100")
              }
            >
              {value === max ? "MAX " : ""}{money(value)}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-orange-300/15 bg-orange-300/[.06] p-4 text-sm font-bold leading-6 text-orange-100">
          Osiągnąłeś swój limit ryzyka. Możesz spasować. Jeśli pozostali też nie mogą podbić, serwer rozstrzygnie remis.
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onPass}
          className="rounded-2xl border border-white/10 bg-white/[.035] px-4 py-4 text-sm font-black text-zinc-300"
        >
          PAS
        </button>
        <button
          type="button"
          disabled={busy || selected == null || !canRaise}
          onClick={onSubmit}
          className="rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-4 text-sm font-black text-[#241005] disabled:opacity-35"
        >
          PODBIJ
        </button>
      </div>
    </div>
  );
}

function BidReveal({ game, title }: { game: VaBanqueState; title: string }) {
  const ordered = game.players
    .map((player) => {
      const bid = bidFor(game, player.id);
      return {
        player,
        amount: bid?.tieBid && game.phase === "tie_reveal" ? bid.tieBid : bid?.bid ?? 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[.22em] text-amber-300/55">STAWKI ODSŁONIĘTE</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-.045em]">{title}</h1>
      <div className="mt-6 space-y-2">
        {ordered.map(({ player, amount }) => (
          <div
            key={player.id}
            className={
              "flex items-center gap-3 rounded-2xl border px-4 py-3 " +
              (player.id === game.winningPlayerId
                ? "border-amber-300/35 bg-amber-300/[.1]"
                : "border-amber-200/8 bg-black/20")
            }
          >
            <PartyPlayAvatar id={player.avatar} size={38} />
            <strong className="min-w-0 flex-1 truncate text-sm">{player.name}</strong>
            <span className="text-xl font-black tabular-nums text-amber-200">{amount ? money(amount) : "PAS"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionPanel({
  game,
  active,
  selected,
  setSelected,
  onSubmit,
  busy,
  waitingCopy,
  takeover = false,
  final = false,
}: {
  game: VaBanqueState;
  active: boolean;
  selected: number | null;
  setSelected: (value: number) => void;
  onSubmit: () => void;
  busy: boolean;
  waitingCopy: string;
  takeover?: boolean;
  final?: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-amber-200/12 bg-amber-300/[.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.15em] text-amber-200">
          {game.category}
        </span>
        {takeover && (
          <span className="rounded-full border border-orange-200/15 bg-orange-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.15em] text-orange-100">
            RYZYKO {money(game.takeoverRisk)}
          </span>
        )}
        {final && (
          <span className="rounded-full border border-yellow-200/20 bg-yellow-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.15em] text-yellow-100">
            VA BANQUE
          </span>
        )}
      </div>

      <h1 className="mt-5 text-2xl font-black leading-tight tracking-[-.035em] sm:text-3xl">
        {game.question}
      </h1>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {game.options.map((option, index) => (
          <button
            key={`${index}-${option}`}
            type="button"
            disabled={!active || busy}
            onClick={() => setSelected(index)}
            className={
              "min-h-16 rounded-2xl border px-4 py-4 text-left text-sm font-black leading-5 transition " +
              (selected === index
                ? "border-amber-200/50 bg-amber-300 text-[#241005]"
                : active
                  ? "border-amber-200/12 bg-black/25 text-amber-50 hover:bg-amber-300/[.08]"
                  : "border-white/6 bg-black/15 text-zinc-500")
            }
          >
            <span className="mr-2 text-[10px] opacity-50">{String.fromCharCode(65 + index)}</span>
            {option}
          </button>
        ))}
      </div>

      {active ? (
        <button
          type="button"
          disabled={busy || selected == null}
          onClick={onSubmit}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-4 text-sm font-black text-[#241005] disabled:opacity-35"
        >
          {selected == null ? "Wybierz odpowiedź" : "Zatwierdź odpowiedź"}
        </button>
      ) : (
        <div className="mt-4 rounded-2xl border border-amber-200/8 bg-amber-200/[.035] px-4 py-3 text-center text-xs font-bold leading-5 text-amber-100/50">
          {waitingCopy}
        </div>
      )}
    </div>
  );
}

function ResultPanel({
  game,
  title,
  delta,
  player,
}: {
  game: VaBanqueState;
  title: string;
  delta: number;
  player: VaBanquePlayer | null;
}) {
  const correct = delta > 0;
  const correctLabel =
    game.correctIndex != null ? game.options[game.correctIndex] : null;

  return (
    <div className="py-5 text-center">
      <span
        className={
          "inline-flex rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] " +
          (correct
            ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
            : "border-red-300/20 bg-red-400/10 text-red-100")
        }
      >
        {player?.name ?? "GRACZ"}
      </span>
      <h1 className={"mt-4 text-5xl font-black tracking-[-.06em] " + (correct ? "text-emerald-300" : "text-red-300")}>
        {title}
      </h1>
      <p className={"mt-2 text-4xl font-black tabular-nums " + (correct ? "text-emerald-200" : "text-red-200")}>
        {delta > 0 ? "+" : "−"}{money(Math.abs(delta))}
      </p>
      {correctLabel && (
        <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-amber-200/10 bg-black/20 p-4">
          <span className="text-[9px] font-black uppercase tracking-[.16em] text-amber-300/50">POPRAWNA ODPOWIEDŹ</span>
          <strong className="mt-1 block text-sm text-amber-100">{correctLabel}</strong>
          {game.explanation && (
            <p className="mt-2 text-xs leading-5 text-amber-50/60">{game.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}

function NoTakeoverResult({ game }: { game: VaBanqueState }) {
  const correctLabel =
    game.correctIndex != null ? game.options[game.correctIndex] : null;

  return (
    <div className="py-5 text-center">
      <p className="text-[10px] font-black uppercase tracking-[.24em] text-amber-300">
        NIKT NIE PRZEJĄŁ PYTANIA
      </p>
      <h1 className="mt-3 text-3xl font-black tracking-[-.045em]">Zamykamy odpowiedź.</h1>
      {correctLabel && (
        <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-emerald-300/15 bg-emerald-300/[.06] p-4">
          <span className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-200/70">
            POPRAWNA ODPOWIEDŹ
          </span>
          <strong className="mt-1 block text-base text-emerald-100">{correctLabel}</strong>
          {game.explanation && (
            <p className="mt-2 text-xs leading-5 text-amber-50/60">{game.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}

function TakeoverPanel({
  risk,
  onClaim,
  busy,
}: {
  risk: number;
  onClaim: () => void;
  busy: boolean;
}) {
  return (
    <div className="py-4 text-center">
      <p className="text-[10px] font-black uppercase tracking-[.28em] text-orange-300">ODPOWIEDŹ BYŁA BŁĘDNA</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-.055em]">Masz odwagę przejąć?</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-amber-50/60">
        Pierwsze prawidłowo zarejestrowane kliknięcie dostanie pytanie. Ryzykujesz {money(risk)} pkt.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={onClaim}
        className="mt-7 w-full rounded-[1.4rem] border border-orange-200/35 bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 px-6 py-6 text-2xl font-black tracking-[-.025em] text-white shadow-[0_18px_65px_rgba(249,115,22,.22)] transition active:scale-[.985] disabled:opacity-40"
      >
        PRZEJMUJĘ
      </button>
    </div>
  );
}

function FinalCategory({ category }: { category: string }) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-amber-200/25 bg-[radial-gradient(circle,rgba(251,191,36,.22),rgba(120,53,15,.05))] text-3xl shadow-[0_0_60px_rgba(251,191,36,.14)]">
        ◆
      </div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[.32em] text-amber-300">FINAŁ VA BANQUE</p>
      <h1 className="mt-3 text-5xl font-black tracking-[-.06em] text-amber-100">{category}</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-amber-50/60">
        To ostatnia kategoria. Za chwilę każdy prywatnie zdecyduje, ile z całego kapitału stawia na finał.
      </p>
    </div>
  );
}

function FinalBidPanel({
  points,
  selected,
  onSelect,
  onSubmit,
  onAllIn,
  busy,
}: {
  points: number;
  selected: number | null;
  onSelect: (value: number) => void;
  onSubmit: () => void;
  onAllIn: () => void;
  busy: boolean;
}) {
  const values = Array.from(
    new Set([
      0,
      Math.floor((points * 0.25) / 50) * 50,
      Math.floor((points * 0.5) / 50) * 50,
      Math.floor((points * 0.75) / 50) * 50,
    ]),
  ).filter((value) => value >= 0 && value < points);

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[.25em] text-amber-300">OSTATNIA DECYZJA</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-.045em]">Ile jesteś gotów postawić?</h1>
      <p className="mt-2 text-sm leading-6 text-amber-50/60">
        Masz {money(points)} pkt. W finale możesz zagrać bezpiecznie, spasować albo postawić wszystko.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            disabled={busy}
            onClick={() => onSelect(value)}
            className={
              "rounded-2xl border px-4 py-4 text-lg font-black transition " +
              (selected === value
                ? "border-amber-200/50 bg-amber-300 text-[#241005]"
                : "border-amber-200/12 bg-black/25 text-amber-100")
            }
          >
            {value === 0 ? "0 · bez ryzyka" : `${money(value)} pkt`}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onAllIn}
        className="mt-3 w-full rounded-[1.35rem] border border-yellow-100/35 bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-400 px-5 py-5 text-xl font-black tracking-[-.02em] text-[#291304] shadow-[0_18px_55px_rgba(251,191,36,.18)]"
      >
        {points > 0 ? "VA BANQUE · " + money(points) + " PKT" : "ZATWIERDŹ 0 PKT"}
      </button>

      <button
        type="button"
        disabled={busy || selected == null}
        onClick={onSubmit}
        className="mt-3 w-full rounded-2xl border border-amber-200/15 bg-amber-200/[.07] px-5 py-4 text-sm font-black text-amber-100 disabled:opacity-30"
      >
        {selected == null ? "Wybierz stawkę" : `Zatwierdź ${money(selected)} pkt`}
      </button>
    </div>
  );
}

function FinalReveal({ game }: { game: VaBanqueState }) {
  const correct =
    game.correctIndex == null ? null : game.options[game.correctIndex];

  return (
    <div>
      <div className="text-center">
        <p className="text-[10px] font-black uppercase tracking-[.25em] text-amber-300">ODSŁANIAMY FINAŁ</p>
        <h1 className="mt-3 text-2xl font-black leading-tight tracking-[-.035em]">{game.question}</h1>
        {correct && (
          <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-emerald-300/15 bg-emerald-300/[.07] p-4">
            <span className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-200/60">POPRAWNA ODPOWIEDŹ</span>
            <strong className="mt-1 block text-base text-emerald-100">{correct}</strong>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {game.players.map((player) => {
          const answer = game.finalAnswers.find((item) => item.playerId === player.id);
          const label =
            answer?.answerIndex != null ? game.options[answer.answerIndex] : "brak odpowiedzi";
          return (
            <div key={player.id} className="rounded-2xl border border-amber-200/9 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <PartyPlayAvatar id={player.avatar} size={38} />
                <strong className="min-w-0 flex-1 truncate text-sm">{player.name}</strong>
                <span className={"text-sm font-black " + (answer?.correct ? "text-emerald-300" : "text-red-300")}>
                  {(answer?.bid ?? 0) === 0
                    ? "0"
                    : (answer?.correct ? "+" : "−") + money(answer?.bid ?? 0)}
                </span>
              </div>
              <p className="mt-2 pl-[50px] text-xs leading-5 text-amber-50/60">
                {label} · stawka {money(answer?.bid ?? 0)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Finished({
  game,
  canRematch,
  onRematch,
  busy,
}: {
  game: VaBanqueState;
  canRematch: boolean;
  onRematch: () => void;
  busy: boolean;
}) {
  const ranking = [...game.players].sort((a, b) => b.points - a.points);
  const topScore = ranking[0]?.points ?? 0;
  const winners = ranking.filter((player) => player.points === topScore);

  return (
    <div>
      <div className="text-center">
        <span className="text-[10px] font-black uppercase tracking-[.28em] text-amber-300">KOŃCOWY RANKING</span>
        <h1 className="mt-3 text-4xl font-black tracking-[-.055em]">
          {winners.length > 1 ? "Mamy remis na szczycie." : `${winners[0]?.name ?? "Zwycięzca"} wygrywa!`}
        </h1>
        <p className="mt-2 text-sm text-amber-50/60">
          Finał zamknął stawki. Oto ostateczny kapitał.
        </p>
      </div>

      <div className="mt-7 space-y-2">
        {ranking.map((player, index) => (
          <div
            key={player.id}
            className={
              "flex items-center gap-3 rounded-2xl border px-4 py-3 " +
              (index === 0
                ? "border-amber-300/35 bg-gradient-to-r from-amber-300/[.12] to-orange-400/[.05]"
                : "border-amber-200/8 bg-black/20")
            }
          >
            <span className="w-7 text-center text-sm font-black text-amber-300/55">#{index + 1}</span>
            <PartyPlayAvatar id={player.avatar} size={42} />
            <strong className="min-w-0 flex-1 truncate text-sm">{player.name}</strong>
            <span className="text-xl font-black tabular-nums text-amber-200">{money(player.points)}</span>
          </div>
        ))}
      </div>

      <div className="mt-7 grid gap-2 sm:grid-cols-2">
        {canRematch ? (
          <button
            type="button"
            disabled={busy}
            onClick={onRematch}
            className="rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-5 py-4 text-sm font-black text-[#241005]"
          >
            Zagraj rewanż
          </button>
        ) : (
          <div className="rounded-2xl border border-amber-200/10 bg-amber-200/[.04] px-5 py-4 text-center text-xs font-bold text-amber-100/55">
            Właściciel pokoju może uruchomić rewanż.
          </div>
        )}
        <Link
          href="/gry/va-banque"
          className="rounded-2xl border border-amber-200/12 bg-black/20 px-5 py-4 text-center text-sm font-black text-amber-100"
        >
          Wróć do VA BANQUE
        </Link>
      </div>

      <Link
        href="/"
        className="mt-3 block text-center text-xs font-bold text-amber-100/35 transition hover:text-amber-100"
      >
        Wróć na stronę główną zaGRAj
      </Link>
    </div>
  );
}

function Waiting({
  title,
  copy,
  emphasis,
}: {
  title: string;
  copy: string;
  emphasis?: string;
}) {
  return (
    <div className="py-8 text-center">
      <div className="mx-auto h-10 w-10 animate-pulse rounded-full border-2 border-amber-300/20 border-t-amber-300" />
      <h1 className="mt-5 text-2xl font-black tracking-[-.035em]">{title}</h1>
      {emphasis && <strong className="mt-2 block text-3xl font-black text-amber-200">{emphasis}</strong>}
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-amber-50/60">{copy}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={"rounded-2xl border p-3 text-center " + (highlight ? "border-amber-300/20 bg-amber-300/[.07]" : "border-amber-200/8 bg-black/20")}>
      <span className="block text-[8px] font-black uppercase tracking-[.15em] text-amber-100/35">{label}</span>
      <strong className="mt-1 block text-base font-black tabular-nums text-amber-100">{value}</strong>
    </div>
  );
}
