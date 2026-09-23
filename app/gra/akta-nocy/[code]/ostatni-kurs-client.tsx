"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  OstatniKursCover,
  OstatniKursEvidenceArtwork,
  OstatniKursStageArtwork,
  OstatniKursTrainMap,
} from "@/components/akta-nocy-ostatni-kurs-artwork";

type Evidence = {
  id: string;
  no: string;
  title: string;
  source: string;
  time?: string;
  summary: string;
  details: string[];
  question: string;
};

type CastMember = {
  playerId: string;
  displayName: string;
  avatar: string;
  characterName: string;
  characterLabel: string;
};

type RoleCard = {
  id: string;
  name: string;
  shortLabel: string;
  publicBio: string;
  travelReason: string;
  privateSecret: string;
  privateKnowledge: string[];
  timeline: string[];
  objective: string;
  mayShare: string[];
  wantsToHide: string[];
  whyNotEarlier: string;
  isCulprit: boolean;
  culpritBriefing?: string;
};

type Interrogation = {
  playerId: string;
  displayName: string;
  avatar: string;
  characterName: string;
  characterLabel: string;
  headline: string;
  prompts: string[];
  pressurePoint: string;
};

type ReadyProgress = {
  total_players: number;
  ready_players: number;
  player_ready: boolean;
} | null;

type ReconstructionSummary = {
  total: number;
  fullyCorrect: number;
  consensusTimeline: Array<{
    key: string;
    title: string;
    count: number;
    avgPosition: number;
  }>;
  routes: Array<{ route: string; count: number }>;
} | null;

type AccusationSummary = {
  total: number;
  correctSuspect: number;
  correctMotive: number;
  correctEvidence: number;
  correctDisappearance: number;
  fullyCorrect: number;
  results: Array<{
    playerId: string;
    displayName: string;
    avatar: string;
    suspect: CastMember | null;
    motiveLabel: string;
    evidenceNo: string;
    evidenceTitle: string;
    disappearanceLabel: string;
    suspectCorrect: boolean;
    motiveCorrect: boolean;
    evidenceCorrect: boolean;
    disappearanceCorrect: boolean;
    fullyCorrect: boolean;
  }>;
} | null;

type CommonState = {
  playMode: "host" | "auto";
  room: { code: string; phase: string | null; status: string };
  evidence: Evidence[];
  cast: CastMember[];
  interrogation: Interrogation[];
  reconstruction: ReconstructionSummary;
  accusations: AccusationSummary;
  reveal: { step: number; content: any } | null;
  map: { rules: string[] };
  reconstructionOptions: Array<{ key: string; title: string; time?: string; copy: string }>;
  motiveOptions: Array<{ key: string; label: string }>;
  disappearanceOptions: Array<{ key: string; label: string }>;
  evidenceOptions: Array<{ id: string; no: string; title: string }>;
};

type HostState = CommonState & {
  role: "host";
  progress: Array<{
    player_id: string;
    display_name: string;
    avatar: string;
    dossier_opened: boolean;
  }>;
  submissionProgress: {
    reconstruction: number;
    accusation: number;
    total: number;
  };
};

type PlayerState = CommonState & {
  role: "player";
  player: {
    playerId: string;
    displayName: string;
    avatar: string;
    dossierOpened: boolean;
  };
  roleCard: RoleCard;
  ready: ReadyProgress;
  ownReconstruction: {
    event_order: string[];
    route: string[];
    submitted_at?: string;
  } | null;
  ownAccusation: {
    suspect_player_id: string;
    motive_key: string;
    evidence_id: string;
    disappearance_key: string;
    submitted_at?: string;
  } | null;
};

type TestHostState = {
  role: "testHost";
  playMode: "auto";
  room: { code: string; phase: string | null; status: string };
  players: Array<{ playerId: string; displayName: string; avatar: string }>;
};

type ObserverState = {
  role: "observer";
  playMode: "auto";
  room: { code: string; phase: string | null; status: string };
  message: string;
};

type ClosedState = {
  role: "closed";
  playMode: "host" | "auto";
  room: { code: string; phase: string | null; status: string };
};

type GameState = HostState | PlayerState | TestHostState | ObserverState | ClosedState;

export default function OstatniKursClient({ code }: { code: string }) {
  const [data, setData] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/gra/akta-nocy-ostatni-kurs/${code}`,
        { cache: "no-store" },
      );
      const next = await response.json();
      if (!response.ok) {
        setError(next.error ?? "Nie udało się odczytać sprawy.");
        return;
      }
      setData(next as GameState);
      setError("");
    } catch {
      setError("Nie udało się połączyć ze śledztwem.");
    }
  }, [code]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 1400);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send(action: string, payload: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/gra/akta-nocy-ostatni-kurs/${code}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Nie udało się wykonać akcji.");
        return false;
      }
      await load();
      return true;
    } catch {
      setError("Nie udało się połączyć ze śledztwem.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl py-24 text-center">
          <div className="text-5xl">🚆</div>
          <h1 className="mt-5 font-serif text-4xl font-black">Ładuję Ostatni Kurs…</h1>
          {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
        </div>
      </Shell>
    );
  }

  return (
    <>
      <TestSwitcher code={code} />
      {data.role === "closed" ? (
        <ClosedView code={code} />
      ) : data.role === "testHost" ? (
        <TestHostView data={data} />
      ) : data.role === "observer" ? (
        <ObserverView data={data} />
      ) : data.role === "host" ? (
        <HostView
          data={data}
          busy={busy}
          error={error}
          onAdvance={() => void send("advance")}
          onClose={() => void send("closeGame")}
        />
      ) : (
        <PlayerView
          data={data}
          busy={busy}
          error={error}
          onOpen={() => void send("openDossier")}
          onReady={() => void send("ready")}
          onReconstruction={(eventOrder, route) =>
            send("submitReconstruction", { eventOrder, route })
          }
          onAccusation={(payload) => send("submitAccusation", payload)}
          onClose={() => void send("closeGame")}
        />
      )}
    </>
  );
}

function HostView({
  data,
  busy,
  error,
  onAdvance,
  onClose,
}: {
  data: HostState;
  busy: boolean;
  error: string;
  onAdvance: () => void;
  onClose: () => void;
}) {
  const phase = data.room.phase ?? "";

  if (phase === "ok_akta_osobowe") {
    const opened = data.progress.filter((p) => p.dossier_opened).length;
    return (
      <Shell>
        <Header code={data.room.code} phase="00 · AKTA OSOBOWE" />
        <section className="grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
          <Panel>
            <Eyebrow>PROWADZĄCY · PRYWATNE AKTA</Eyebrow>
            <h1 className="mt-3 font-serif text-4xl font-black sm:text-5xl">
              Każdy czyta swoją rolę w tajemnicy.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
              Nie pytaj jeszcze o sekrety. Poczekaj, aż wszyscy otworzą akta. Ty nie widzisz, kto odpowiada za zniknięcie.
            </p>
            <OstatniKursCover className="mt-6" />
          </Panel>
          <Panel>
            <Eyebrow>STATUS AKT</Eyebrow>
            <h2 className="mt-2 text-2xl font-black">{opened}/{data.progress.length} otwartych</h2>
            <div className="mt-5 space-y-2">
              {data.progress.map((p) => (
                <div key={p.player_id} className="flex items-center justify-between rounded-xl border border-white/7 bg-white/[.025] px-4 py-3">
                  <strong>{p.display_name}</strong>
                  <span className={p.dossier_opened ? "text-emerald-300" : "text-slate-600"}>
                    {p.dossier_opened ? "✓ AKTA OTWARTE" : "CZEKA"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <PrimaryButton disabled={busy || opened !== data.progress.length} onClick={onAdvance}>
                OSTATNI RAZ WIDZIANY →
              </PrimaryButton>
            </div>
          </Panel>
        </section>
        <ErrorLine error={error} />
      </Shell>
    );
  }

  if (phase === "ok_ostatni_raz") {
    return (
      <HostStage
        data={data}
        eyebrow="01 · OSTATNI RAZ WIDZIANY"
        title="Każdy składa pierwsze, krótkie zeznanie."
        copy="Po kolei poproś każdego: gdzie byłeś, kiedy ostatni raz widziałeś Adriana i co wtedy robiłeś. Na tym etapie nie wolno czytać prywatnych sekretów innych osób."
        busy={busy}
        error={error}
        onAdvance={onAdvance}
        button="OTWÓRZ PACZKĘ A →"
      >
        <InstructionGrid
          items={[
            "Mówcie po maksymalnie 45 sekund.",
            "Nie przerywajcie sobie podczas pierwszego zeznania.",
            "Można zatajać własny sekret, ale nie wolno wymyślać faktów spoza akt.",
            "Zapiszcie pierwsze sprzeczności. Za chwilę pojawią się dokumenty.",
          ]}
        />
      </HostStage>
    );
  }

  if (phase.startsWith("ok_a_") || phase.startsWith("ok_b_") || phase === "ok_nowy_trop") {
    const latest = data.evidence[data.evidence.length - 1];
    const isTwist = phase === "ok_nowy_trop";
    const isLastB = phase === "ok_b_5";
    return (
      <HostStage
        data={data}
        eyebrow={isTwist ? "06 · NOWY TROP" : phase.startsWith("ok_a_") ? "02 · PACZKA DOWODOWA A" : "05 · PACZKA DOWODOWA B"}
        title={isTwist ? "Pierwszy kadr nie pokazywał końca historii." : latest?.title ?? "Materiał dowodowy"}
        copy={isTwist ? "Pokaż grupie drugi kąt kamery. Nie tłumacz jeszcze, kto jest na nagraniu. Niech sami przeformułują teorię zniknięcia." : "Ten materiał widzą wszyscy. Przeczytajcie go wspólnie, a potem odpowiedzcie na pytanie śledcze."}
        busy={busy}
        error={error}
        onAdvance={onAdvance}
        button={
          isTwist
            ? "PRZEJDŹ DO REKONSTRUKCJI →"
            : isLastB
              ? "UJAWNIJ NOWY TROP →"
              : "KOLEJNY MATERIAŁ →"
        }
      >
        {latest && <EvidenceCard evidence={latest} />}
      </HostStage>
    );
  }

  if (phase === "ok_mapa") {
    return (
      <Shell>
        <Header code={data.room.code} phase="03 · PIERWSZA REKONSTRUKCJA" />
        <Panel>
          <Eyebrow>INTERAKTYWNA MAPA</Eyebrow>
          <h1 className="mt-3 font-serif text-4xl font-black">Które trasy są naprawdę możliwe?</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
            Grupa porównuje zeznania z fizycznym układem składu. Klikajcie wagony, które tworzą rozważaną trasę.
          </p>
          <LocalMap />
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {data.map.rules.map((rule) => (
              <div key={rule} className="rounded-xl border border-amber-300/10 bg-amber-300/[.035] p-4 text-sm leading-6 text-slate-300">{rule}</div>
            ))}
          </div>
          <div className="mt-6 flex justify-end"><PrimaryButton disabled={busy} onClick={onAdvance}>ROZPOCZNIJ PRZESŁUCHANIA →</PrimaryButton></div>
        </Panel>
        <ErrorLine error={error} />
      </Shell>
    );
  }

  if (phase === "ok_przesluchania") {
    return (
      <Shell>
        <Header code={data.room.code} phase="04 · PRZESŁUCHANIA" />
        <Panel>
          <Eyebrow>PYTANIA SYSTEMOWE</Eyebrow>
          <h1 className="mt-3 font-serif text-4xl font-black">Dopytajcie o miejsca, minuty i powody milczenia.</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
            Pytania są jawne. Odpowiedzi muszą wynikać z prywatnych akt postaci. Jeśli ktoś nie zna odpowiedzi, mówi wprost, że jego postać tego nie wie.
          </p>
          <DiscussionTimer minutes={4} />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {data.interrogation.map((item) => <InterrogationCard key={item.playerId} item={item} />)}
          </div>
          <div className="mt-7 flex justify-end"><PrimaryButton disabled={busy} onClick={onAdvance}>OTWÓRZ PACZKĘ B →</PrimaryButton></div>
        </Panel>
        <ErrorLine error={error} />
      </Shell>
    );
  }

  if (phase === "ok_rekonstrukcja") {
    return (
      <WaitingHost
        data={data}
        title="Każdy układa własną rekonstrukcję."
        copy="Na telefonach gracze wybierają 9 wydarzeń i trasę osoby odpowiedzialnej. Nie pokazujcie sobie ekranów."
        current={data.submissionProgress.reconstruction}
        total={data.submissionProgress.total}
        busy={busy}
        error={error}
        onAdvance={onAdvance}
        button="POKAŻ REKONSTRUKCJĘ GRUPY →"
      />
    );
  }

  if (phase === "ok_rekonstrukcja_wynik") {
    return (
      <HostStage
        data={data}
        eyebrow="07 · REKONSTRUKCJA GRUPY"
        title="Tak grupa odtworzyła Ostatni Kurs."
        copy="To nadal nie jest rozwiązanie. Zobaczcie wspólne punkty i różnice, a potem przejdźcie do prywatnych oskarżeń."
        busy={busy}
        error={error}
        onAdvance={onAdvance}
        button="PRZEJDŹ DO AKTU OSKARŻENIA →"
      >
        <ReconstructionSummaryView summary={data.reconstruction} />
      </HostStage>
    );
  }

  if (phase === "ok_oskarzenie") {
    return (
      <WaitingHost
        data={data}
        title="Akt oskarżenia jest prywatny."
        copy="Każdy wskazuje osobę odpowiedzialną, motyw, sposób upozorowania zniknięcia i jeden kluczowy dowód."
        current={data.submissionProgress.accusation}
        total={data.submissionProgress.total}
        busy={busy}
        error={error}
        onAdvance={onAdvance}
        button="POKAŻ GŁOSY GRUPY →"
      />
    );
  }

  if (phase === "ok_oskarzenie_wynik") {
    return (
      <HostStage
        data={data}
        eyebrow="08 · WYNIK OSKARŻEŃ"
        title="Oto teorie grupy. Prawda jeszcze nie została ujawniona."
        copy="Najpierw porównajcie swoje wybory. Dopiero po tym otworzymy prawdziwe akta."
        busy={busy}
        error={error}
        onAdvance={onAdvance}
        button="ROZPOCZNIJ UJAWNIENIE →"
      >
        <AccusationSummaryView summary={data.accusations} showCorrectness={false} />
      </HostStage>
    );
  }

  if (phase.startsWith("ok_ujawnienie_")) {
    const final = phase === "ok_ujawnienie_5";
    return (
      <Shell>
        <Header code={data.room.code} phase={`09 · UJAWNIENIE ${data.reveal?.step ?? ""}/5`} />
        <Panel>
          <OstatniKursStageArtwork kind={final ? "closed" : "reveal"} />
          <RevealContent reveal={data.reveal} cast={data.cast} accusations={final ? data.accusations : null} />
          <div className="mt-7 flex justify-end">
            <PrimaryButton disabled={busy} onClick={final ? onClose : onAdvance}>
              {final ? "ZAMKNIJ SPRAWĘ →" : "KOLEJNA CZĘŚĆ UJAWNIENIA →"}
            </PrimaryButton>
          </div>
        </Panel>
        <ErrorLine error={error} />
      </Shell>
    );
  }

  return <Fallback phase={phase} />;
}

function PlayerView({
  data,
  busy,
  error,
  onOpen,
  onReady,
  onReconstruction,
  onAccusation,
  onClose,
}: {
  data: PlayerState;
  busy: boolean;
  error: string;
  onOpen: () => void;
  onReady: () => void;
  onReconstruction: (eventOrder: string[], route: string[]) => Promise<boolean>;
  onAccusation: (payload: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
}) {
  const phase = data.room.phase ?? "";
  const auto = data.playMode === "auto";

  if (phase === "ok_akta_osobowe") {
    return (
      <Shell>
        <Header code={data.room.code} phase="00 · TWOJE AKTA" />
        <Panel>
          <Eyebrow>TYLKO DLA CIEBIE · NIE POKAZUJ EKRANU</Eyebrow>
          {!data.player.dossierOpened ? (
            <>
              <h1 className="mt-3 font-serif text-4xl font-black">Twoje akta są zapieczętowane.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                W środku znajdziesz postać, sekret, wiedzę i dokładną oś czasu. Czytaj w tajemnicy.
              </p>
              <OstatniKursCover className="mt-6" />
              <div className="mt-6"><PrimaryButton disabled={busy} onClick={onOpen}>OTWÓRZ MOJE AKTA</PrimaryButton></div>
            </>
          ) : (
            <>
              <Dossier role={data.roleCard} />
              {auto && <ReadyBlock ready={data.ready} busy={busy} onReady={onReady} label="PRZECZYTAŁEM AKTA · JESTEM GOTOWY" />}
            </>
          )}
        </Panel>
        <ErrorLine error={error} />
      </Shell>
    );
  }

  if (phase === "ok_ostatni_raz") {
    return (
      <PlayerStage data={data} title="Twoje pierwsze zeznanie" eyebrow="01 · OSTATNI RAZ WIDZIANY" auto={auto} busy={busy} error={error} onReady={onReady}>
        <p className="text-sm leading-7 text-slate-300">
          Powiedz grupie krótko, gdzie Twoja postać była i kiedy ostatni raz widziała Adriana. Możesz zatajać prywatny sekret, ale nie wymyślaj nowych faktów.
        </p>
        <div className="mt-5 rounded-2xl border border-amber-300/12 bg-amber-300/[.04] p-5">
          <strong className="block text-lg">{data.roleCard.name} · {data.roleCard.shortLabel}</strong>
          <p className="mt-2 text-sm leading-6 text-slate-400">{data.roleCard.timeline[0]}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{data.roleCard.timeline[1]}</p>
        </div>
      </PlayerStage>
    );
  }

  if (phase.startsWith("ok_a_") || phase.startsWith("ok_b_") || phase === "ok_nowy_trop") {
    const latest = data.evidence[data.evidence.length - 1];
    return (
      <PlayerStage data={data} title={phase === "ok_nowy_trop" ? "Nowy trop zmienia wcześniejszą teorię." : latest?.title ?? "Nowy dowód"} eyebrow={phase === "ok_nowy_trop" ? "06 · NOWY TROP" : "MATERIAŁ WSPÓLNY"} auto={auto} busy={busy} error={error} onReady={onReady}>
        {latest && <EvidenceCard evidence={latest} />}
      </PlayerStage>
    );
  }

  if (phase === "ok_mapa") {
    return (
      <PlayerStage data={data} title="Sprawdźcie trasy na mapie pociągu." eyebrow="03 · PIERWSZA REKONSTRUKCJA" auto={auto} busy={busy} error={error} onReady={onReady}>
        <LocalMap />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {data.map.rules.map((r) => <div key={r} className="rounded-xl border border-white/8 bg-white/[.025] p-3 text-xs leading-5 text-slate-400">{r}</div>)}
        </div>
      </PlayerStage>
    );
  }

  if (phase === "ok_przesluchania") {
    return (
      <PlayerStage data={data} title="Przesłuchajcie się po kolei." eyebrow="04 · PRZESŁUCHANIA" auto={auto} busy={busy} error={error} onReady={onReady}>
        <DiscussionTimer minutes={4} />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {data.interrogation.map((item) => <InterrogationCard key={item.playerId} item={item} />)}
        </div>
        <details className="mt-5 rounded-xl border border-white/8 bg-white/[.025] p-4">
          <summary className="cursor-pointer text-sm font-black">Podejrzyj własne akta</summary>
          <Dossier role={data.roleCard} compact />
        </details>
      </PlayerStage>
    );
  }

  if (phase === "ok_rekonstrukcja") {
    return (
      <Shell>
        <Header code={data.room.code} phase="07 · TWOJA REKONSTRUKCJA" />
        <Panel>
          <OstatniKursStageArtwork kind="reconstruction" />
          <ReconstructionEditor
            options={data.reconstructionOptions}
            submitted={Boolean(data.ownReconstruction?.submitted_at)}
            busy={busy}
            onSubmit={onReconstruction}
          />
        </Panel>
        <ErrorLine error={error} />
      </Shell>
    );
  }

  if (phase === "ok_rekonstrukcja_wynik") {
    return (
      <PlayerStage data={data} title="Tak grupa odtworzyła wydarzenia." eyebrow="07 · WYNIK REKONSTRUKCJI" auto={auto} busy={busy} error={error} onReady={onReady}>
        <ReconstructionSummaryView summary={data.reconstruction} />
      </PlayerStage>
    );
  }

  if (phase === "ok_oskarzenie") {
    return (
      <Shell>
        <Header code={data.room.code} phase="08 · AKT OSKARŻENIA" />
        <Panel>
          <OstatniKursStageArtwork kind="accusation" />
          <AccusationEditor
            cast={data.cast}
            motives={data.motiveOptions}
            methods={data.disappearanceOptions}
            evidence={data.evidenceOptions}
            submitted={Boolean(data.ownAccusation?.submitted_at)}
            busy={busy}
            onSubmit={onAccusation}
          />
        </Panel>
        <ErrorLine error={error} />
      </Shell>
    );
  }

  if (phase === "ok_oskarzenie_wynik") {
    return (
      <PlayerStage data={data} title="Teorie są zamknięte." eyebrow="08 · GŁOSY GRUPY" auto={auto} busy={busy} error={error} onReady={onReady}>
        <AccusationSummaryView summary={data.accusations} showCorrectness={false} />
      </PlayerStage>
    );
  }

  if (phase.startsWith("ok_ujawnienie_")) {
    const final = phase === "ok_ujawnienie_5";
    return (
      <Shell>
        <Header code={data.room.code} phase={`09 · UJAWNIENIE ${data.reveal?.step ?? ""}/5`} />
        <Panel>
          <OstatniKursStageArtwork kind={final ? "closed" : "reveal"} />
          <RevealContent reveal={data.reveal} cast={data.cast} accusations={final ? data.accusations : null} />
          {auto && !final && <ReadyBlock ready={data.ready} busy={busy} onReady={onReady} label="GOTOWY NA KOLEJNĄ CZĘŚĆ" />}
          {auto && final && <div className="mt-7"><PrimaryButton disabled={busy} onClick={onClose}>ZAMKNIJ SPRAWĘ →</PrimaryButton></div>}
        </Panel>
        <ErrorLine error={error} />
      </Shell>
    );
  }

  return <Fallback phase={phase} />;
}

function PlayerStage({
  data,
  title,
  eyebrow,
  auto,
  busy,
  error,
  onReady,
  children,
}: {
  data: PlayerState;
  title: string;
  eyebrow: string;
  auto: boolean;
  busy: boolean;
  error: string;
  onReady: () => void;
  children: ReactNode;
}) {
  return (
    <Shell>
      <Header code={data.room.code} phase={eyebrow} />
      <Panel>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 font-serif text-4xl font-black">{title}</h1>
        <div className="mt-6">{children}</div>
        {auto && <ReadyBlock ready={data.ready} busy={busy} onReady={onReady} label="GOTOWY · MOŻEMY IŚĆ DALEJ" />}
      </Panel>
      <ErrorLine error={error} />
    </Shell>
  );
}

function HostStage({
  data,
  eyebrow,
  title,
  copy,
  busy,
  error,
  onAdvance,
  button,
  children,
}: {
  data: HostState;
  eyebrow: string;
  title: string;
  copy: string;
  busy: boolean;
  error: string;
  onAdvance: () => void;
  button: string;
  children: ReactNode;
}) {
  return (
    <Shell>
      <Header code={data.room.code} phase={eyebrow} />
      <Panel>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 font-serif text-4xl font-black sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">{copy}</p>
        <div className="mt-6">{children}</div>
        <div className="mt-7 flex justify-end"><PrimaryButton disabled={busy} onClick={onAdvance}>{button}</PrimaryButton></div>
      </Panel>
      <ErrorLine error={error} />
    </Shell>
  );
}

function WaitingHost({
  data,
  title,
  copy,
  current,
  total,
  busy,
  error,
  onAdvance,
  button,
}: {
  data: HostState;
  title: string;
  copy: string;
  current: number;
  total: number;
  busy: boolean;
  error: string;
  onAdvance: () => void;
  button: string;
}) {
  return (
    <Shell>
      <Header code={data.room.code} phase="PRYWATNE ODPOWIEDZI" />
      <Panel>
        <h1 className="font-serif text-4xl font-black">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">{copy}</p>
        <div className="mt-7 rounded-2xl border border-amber-300/12 bg-amber-300/[.04] p-6">
          <span className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300/60">ODDANE</span>
          <strong className="mt-2 block text-5xl">{current}/{total}</strong>
        </div>
        <div className="mt-6 flex justify-end">
          <PrimaryButton disabled={busy || current !== total} onClick={onAdvance}>{button}</PrimaryButton>
        </div>
      </Panel>
      <ErrorLine error={error} />
    </Shell>
  );
}

function EvidenceCard({ evidence }: { evidence: Evidence }) {
  return (
    <article className="grid gap-5 lg:grid-cols-[.9fr_1.1fr]">
      <OstatniKursEvidenceArtwork id={evidence.id} />
      <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5">
        <span className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300/60">{evidence.no} · {evidence.time ?? "bez znacznika czasu"}</span>
        <h3 className="mt-2 text-2xl font-black">{evidence.title}</h3>
        <p className="mt-2 text-xs font-bold uppercase tracking-[.08em] text-slate-600">{evidence.source}</p>
        <p className="mt-5 text-sm leading-7 text-slate-300">{evidence.summary}</p>
        <ul className="mt-5 space-y-2">
          {evidence.details.map((d) => <li key={d} className="rounded-xl border border-white/7 bg-black/15 px-4 py-3 text-sm leading-6 text-slate-400">{d}</li>)}
        </ul>
        <div className="mt-5 rounded-xl border border-red-300/15 bg-red-500/[.05] p-4">
          <span className="text-[9px] font-black uppercase tracking-[.18em] text-red-300/70">PYTANIE ŚLEDCZE</span>
          <p className="mt-2 font-serif text-lg font-bold italic">{evidence.question}</p>
        </div>
      </div>
    </article>
  );
}

function Dossier({ role, compact = false }: { role: RoleCard; compact?: boolean }) {
  return (
    <div className={compact ? "mt-5" : "mt-6"}>
      <div className="rounded-2xl border border-amber-200/12 bg-[#15100b] p-5">
        <span className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300/60">POSTAĆ PRYWATNA</span>
        <h2 className="mt-2 font-serif text-3xl font-black">{role.name}</h2>
        <strong className="mt-1 block text-amber-200/75">{role.shortLabel}</strong>
        <p className="mt-4 text-sm leading-7 text-slate-400">{role.publicBio}</p>
        <p className="mt-3 text-sm leading-7 text-slate-400"><b className="text-slate-200">Powód podróży:</b> {role.travelReason}</p>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Secret title="TWÓJ SEKRET">{role.privateSecret}</Secret>
        <Secret title="TWÓJ CEL">{role.objective}</Secret>
      </div>
      {role.isCulprit && role.culpritBriefing && (
        <div className="mt-4 rounded-2xl border-2 border-red-500/35 bg-red-950/35 p-5">
          <span className="text-[10px] font-black uppercase tracking-[.2em] text-red-300">JESTEŚ ODPOWIEDZIALNY ZA TO, CO SIĘ WYDARZYŁO</span>
          <p className="mt-3 text-sm leading-7 text-red-50/80">{role.culpritBriefing}</p>
        </div>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ListBlock title="CO WIESZ" items={role.privateKnowledge} />
        <ListBlock title="TWOJA OŚ CZASU" items={role.timeline} />
        <ListBlock title="MOŻESZ UJAWNIĆ" items={role.mayShare} />
        <ListBlock title="CHCESZ UKRYĆ" items={role.wantsToHide} />
      </div>
      <div className="mt-4 rounded-xl border border-white/8 bg-white/[.025] p-4 text-sm leading-6 text-slate-400">
        <b className="text-slate-200">Dlaczego nie powiedziałeś tego od razu?</b> {role.whyNotEarlier}
      </div>
    </div>
  );
}

function ReconstructionEditor({
  options,
  submitted,
  busy,
  onSubmit,
}: {
  options: Array<{ key: string; title: string; time?: string; copy: string }>;
  submitted: boolean;
  busy: boolean;
  onSubmit: (eventOrder: string[], route: string[]) => Promise<boolean>;
}) {
  const [events, setEvents] = useState<string[]>([]);
  const [route, setRoute] = useState<string[]>([]);

  const addEvent = (key: string) => {
    if (events.includes(key) || events.length >= 9) return;
    setEvents((current) => [...current, key]);
  };

  const routeOptions = [
    ["w1","W1"],["w2","W2"],["w3","W3"],["w4","W4"],["w5","W5"],["w6","W6"],["platform","PERON"],
  ];

  if (submitted) {
    return <SubmittedBox title="Rekonstrukcja wysłana" copy="Nie możesz już zmienić odpowiedzi. Poczekaj na pozostałych graczy." />;
  }

  return (
    <div className="mt-6">
      <Eyebrow>KROK 1 · WYBIERZ 9 WYDARZEŃ W KOLEJNOŚCI</Eyebrow>
      <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 p-4">
        <div className="flex flex-wrap gap-2">
          {events.map((key, i) => {
            const item = options.find((x) => x.key === key);
            return <span key={key} className="rounded-full border border-amber-300/20 bg-amber-300/[.07] px-3 py-2 text-xs font-bold">{i+1}. {item?.title ?? key}</span>;
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setEvents((x) => x.slice(0,-1))} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black">COFNIJ</button>
          <button type="button" onClick={() => setEvents([])} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black">WYCZYŚĆ</button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((item) => (
          <button key={item.key} type="button" disabled={events.includes(item.key) || events.length>=9} onClick={() => addEvent(item.key)} className="rounded-xl border border-white/8 bg-white/[.025] p-4 text-left disabled:opacity-35">
            <span className="text-[9px] font-black text-amber-300/60">{item.time ?? "?"}</span>
            <strong className="mt-1 block">{item.title}</strong>
            <small className="mt-2 block leading-5 text-slate-500">{item.copy}</small>
          </button>
        ))}
      </div>

      <Eyebrow className="mt-7">KROK 2 · TRASA OSOBY ODPOWIEDZIALNEJ</Eyebrow>
      <div className="mt-3 flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-black/15 p-4">
        {route.length ? route.map((key,i)=><span key={`${key}-${i}`} className="rounded-full bg-slate-800 px-3 py-2 text-xs font-black">{i+1}. {routeOptions.find((x)=>x[0]===key)?.[1]}</span>) : <span className="text-sm text-slate-600">Dodaj kolejne miejsca…</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {routeOptions.map(([key,label])=>(
          <button key={key} type="button" disabled={route.length>=7} onClick={()=>setRoute((x)=>[...x,key])} className="rounded-xl border border-slate-300/10 bg-white/[.025] px-4 py-3 text-xs font-black">{label}</button>
        ))}
        <button type="button" onClick={()=>setRoute((x)=>x.slice(0,-1))} className="rounded-xl border border-red-300/10 px-4 py-3 text-xs font-black text-red-200">COFNIJ</button>
      </div>

      <div className="mt-7">
        <PrimaryButton disabled={busy || events.length!==9 || route.length<4} onClick={() => void onSubmit(events,route)}>WYŚLIJ REKONSTRUKCJĘ</PrimaryButton>
      </div>
    </div>
  );
}

function AccusationEditor({
  cast,
  motives,
  methods,
  evidence,
  submitted,
  busy,
  onSubmit,
}: {
  cast: CastMember[];
  motives: Array<{ key: string; label: string }>;
  methods: Array<{ key: string; label: string }>;
  evidence: Array<{ id: string; no: string; title: string }>;
  submitted: boolean;
  busy: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [suspect, setSuspect] = useState("");
  const [motive, setMotive] = useState("");
  const [method, setMethod] = useState("");
  const [evidenceId, setEvidenceId] = useState("");

  if (submitted) return <SubmittedBox title="Akt oskarżenia złożony" copy="Twoja teoria jest zamknięta. Poczekaj, aż pozostali oddadzą swoje odpowiedzi." />;

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <Choice title="1 · Kto odpowiada za sprawę?">
        {cast.map((p)=><ChoiceButton key={p.playerId} active={suspect===p.playerId} onClick={()=>setSuspect(p.playerId)}>{p.characterName}<small>{p.displayName} · {p.characterLabel}</small></ChoiceButton>)}
      </Choice>
      <Choice title="2 · Jaki był motyw?">
        {motives.map((x)=><ChoiceButton key={x.key} active={motive===x.key} onClick={()=>setMotive(x.key)}>{x.label}</ChoiceButton>)}
      </Choice>
      <Choice title="3 · Jak upozorowano zniknięcie?">
        {methods.map((x)=><ChoiceButton key={x.key} active={method===x.key} onClick={()=>setMethod(x.key)}>{x.label}</ChoiceButton>)}
      </Choice>
      <Choice title="4 · Najważniejszy dowód">
        {evidence.map((x)=><ChoiceButton key={x.id} active={evidenceId===x.id} onClick={()=>setEvidenceId(x.id)}>{x.no} · {x.title}</ChoiceButton>)}
      </Choice>
      <div className="lg:col-span-2">
        <PrimaryButton disabled={busy || !suspect || !motive || !method || !evidenceId} onClick={() => void onSubmit({ suspectPlayerId:suspect,motiveKey:motive,evidenceId,disappearanceKey:method })}>ZŁÓŻ AKT OSKARŻENIA</PrimaryButton>
      </div>
    </div>
  );
}

function ReconstructionSummaryView({ summary }: { summary: ReconstructionSummary }) {
  if (!summary) return <p className="text-sm text-slate-500">Czekamy na rekonstrukcje.</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5">
        <Eyebrow>WSPÓLNA OŚ CZASU</Eyebrow>
        <div className="mt-4 space-y-2">
          {summary.consensusTimeline.map((x,i)=><div key={x.key} className="flex gap-3 rounded-xl bg-black/15 p-3"><span className="font-black text-amber-300">{i+1}</span><div><strong className="text-sm">{x.title}</strong><small className="mt-1 block text-slate-600">{x.count}/{summary.total} osób umieściło ten punkt</small></div></div>)}
        </div>
      </div>
      <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5">
        <Eyebrow>NAJCZĘSTSZE TRASY</Eyebrow>
        <div className="mt-4 space-y-2">{summary.routes.map((x)=><div key={x.route} className="rounded-xl bg-black/15 p-3"><strong className="text-sm">{x.route}</strong><small className="mt-1 block text-slate-600">{x.count} głosów</small></div>)}</div>
      </div>
    </div>
  );
}

function AccusationSummaryView({ summary, showCorrectness }: { summary: AccusationSummary; showCorrectness: boolean }) {
  if (!summary) return <p className="text-sm text-slate-500">Czekamy na oskarżenia.</p>;
  return (
    <div className="mt-4 space-y-3">
      {summary.results.map((x)=>(
        <div key={x.playerId} className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
          <div className="flex items-center justify-between gap-4">
            <strong>{x.displayName}</strong>
            {showCorrectness && <span className={x.fullyCorrect?"text-emerald-300":"text-amber-300"}>{x.fullyCorrect?"PEŁNE TRAFIENIE":"CZĘŚCIOWO / BŁĘDNIE"}</span>}
          </div>
          <p className="mt-2 text-sm text-slate-400">{x.suspect?.characterName ?? "?"} · {x.motiveLabel}</p>
          <p className="mt-1 text-xs text-slate-600">{x.disappearanceLabel}</p>
          <p className="mt-1 text-xs text-slate-600">{x.evidenceNo} · {x.evidenceTitle}</p>
        </div>
      ))}
    </div>
  );
}

function RevealContent({ reveal, cast, accusations }: { reveal: any; cast: CastMember[]; accusations: AccusationSummary }) {
  if (!reveal) return null;
  const c = reveal.content;
  const culprit = cast.find((x)=>x.characterName==="Kamil Drzewiecki");
  return (
    <div className="mt-6">
      <Eyebrow>{c.eyebrow}</Eyebrow>
      <h1 className="mt-3 font-serif text-4xl font-black sm:text-5xl">{c.title}</h1>
      {c.subtitle && <p className="mt-2 text-lg font-black text-amber-200/75">{c.subtitle}{culprit ? ` · grany przez ${culprit.displayName}` : ""}</p>}
      {c.body && <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-300">{c.body}</p>}
      {c.bullets && <ListBlock title="CO TO WYJAŚNIA" items={c.bullets} />}
      {c.whyItFits && <ListBlock title="DLACZEGO TO PASUJE" items={c.whyItFits} />}
      {c.timeline && <div className="mt-6 space-y-2">{c.timeline.map((x:any)=><div key={x.time} className="grid grid-cols-[70px_1fr] gap-3 rounded-xl border border-white/8 bg-white/[.025] p-3"><strong className="text-amber-300">{x.time}</strong><span className="text-sm leading-6 text-slate-300">{x.text}</span></div>)}</div>}
      {c.redHerrings && <div className="mt-6 grid gap-3 sm:grid-cols-2">{c.redHerrings.map((x:any)=><div key={x.name} className="rounded-xl border border-red-300/10 bg-red-500/[.035] p-4"><strong>{x.name}</strong><p className="mt-2 text-sm leading-6 text-slate-400">{x.truth}</p></div>)}</div>}
      {accusations && <div className="mt-8"><Eyebrow>JAK POSZŁO GRUPIE</Eyebrow><div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">{[
        ["Sprawca",accusations.correctSuspect],
        ["Motyw",accusations.correctMotive],
        ["Dowód",accusations.correctEvidence],
        ["Sposób",accusations.correctDisappearance],
        ["Pełne",accusations.fullyCorrect],
      ].map(([label,value])=><div key={String(label)} className="rounded-xl border border-white/8 bg-white/[.025] p-4"><span className="text-xs text-slate-500">{label}</span><strong className="mt-1 block text-2xl">{value}/{accusations.total}</strong></div>)}</div></div>}
    </div>
  );
}

function InterrogationCard({ item }: { item: Interrogation }) {
  return (
    <article className="rounded-2xl border border-white/8 bg-white/[.025] p-5">
      <span className="text-[9px] font-black uppercase tracking-[.18em] text-amber-300/60">{item.characterName} · {item.displayName}</span>
      <h3 className="mt-2 text-xl font-black">{item.headline}</h3>
      <ol className="mt-4 space-y-2">{item.prompts.map((p,i)=><li key={p} className="rounded-xl bg-black/15 p-3 text-sm leading-6 text-slate-300"><b className="mr-2 text-amber-300">{i+1}.</b>{p}</li>)}</ol>
      <p className="mt-4 border-l-2 border-red-400/35 pl-3 text-xs leading-5 text-slate-500">{item.pressurePoint}</p>
    </article>
  );
}

function DiscussionTimer({ minutes }: { minutes: number }) {
  const [seconds, setSeconds] = useState(minutes*60);
  const [running, setRunning] = useState(false);
  useEffect(()=>{
    if(!running || seconds<=0) return;
    const t=window.setInterval(()=>setSeconds((s)=>Math.max(0,s-1)),1000);
    return ()=>window.clearInterval(t);
  },[running,seconds]);
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300/10 bg-amber-300/[.035] p-4">
      <strong className="font-mono text-2xl">{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</strong>
      <button type="button" onClick={()=>setRunning((x)=>!x)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black">{running?"PAUZA":"START"}</button>
      <button type="button" onClick={()=>{setSeconds(minutes*60);setRunning(false);}} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black">RESET</button>
      <span className="text-xs text-slate-500">Timer jest pomocniczy. Nie blokuje przejścia dalej.</span>
    </div>
  );
}

function ReadyBlock({ ready, busy, onReady, label }: { ready: ReadyProgress; busy: boolean; onReady: () => void; label: string }) {
  if (!ready) return null;
  return (
    <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.035] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><strong className="block">{ready.ready_players}/{ready.total_players} gotowych</strong><span className="text-xs text-slate-500">Gdy ostatnia osoba zatwierdzi etap, śledztwo przejdzie dalej automatycznie.</span></div>
      <PrimaryButton disabled={busy || ready.player_ready} onClick={onReady}>{ready.player_ready?"✓ GOTOWY":label}</PrimaryButton>
    </div>
  );
}

function LocalMap() {
  const [selected,setSelected]=useState<string[]>([]);
  return (
    <div className="mt-5">
      <OstatniKursTrainMap selected={selected} onToggle={(key)=>setSelected((x)=>x.includes(key)?x.filter((v)=>v!==key):[...x,key])} />
      <button type="button" onClick={()=>setSelected([])} className="mt-2 text-xs font-black text-slate-500">WYCZYŚĆ ZAZNACZENIA</button>
    </div>
  );
}

function TestHostView({ data }: { data: TestHostState }) {
  return (
    <Shell>
      <Header code={data.room.code} phase="TRYB TESTOWY · AUTO" />
      <Panel>
        <Eyebrow>AUTOMATYCZNE ŚLEDZTWO</Eyebrow>
        <h1 className="mt-3 font-serif text-4xl font-black">Wejdź w ekran jednego z testerów.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">Boty tworzą pełną obsadę. Przełącz widok na dowolnego gracza, aby wykonywać jego ruchy. Gdy zatwierdzisz prosty etap, pozostałe boty zrobią to automatycznie.</p>
        <OstatniKursCover className="mt-6" />
        <p className="mt-5 text-xs text-slate-500">Przełącznik testowy znajduje się u góry ekranu.</p>
      </Panel>
    </Shell>
  );
}

function ObserverView({ data }: { data: ObserverState }) {
  return (
    <Shell>
      <Header code={data.room.code} phase="AUTOMATYCZNE ŚLEDZTWO" />
      <Panel>
        <h1 className="font-serif text-4xl font-black">Śledztwo prowadzi system.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">{data.message}</p>
        <a href={`/pokoj/${data.room.code}`} className="mt-6 inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-black">WRÓĆ DO POKOJU</a>
      </Panel>
    </Shell>
  );
}

function ClosedView({ code }: { code: string }) {
  return (
    <Shell>
      <Header code={code} phase="SPRAWA ZAMKNIĘTA" />
      <Panel>
        <OstatniKursStageArtwork kind="closed" />
        <h1 className="mt-6 font-serif text-5xl font-black">N417 dotarł do końca trasy.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-400">Ostatni Kurs został formalnie zakończony. Wszystkie odpowiedzi są zamknięte.</p>
        <a href="/" className="mt-7 inline-flex rounded-xl bg-gradient-to-r from-red-700 to-amber-600 px-6 py-4 text-sm font-black text-white">WRÓĆ DO zaGRAJ</a>
      </Panel>
    </Shell>
  );
}

function TestSwitcher({ code }: { code: string }) {
  const [state,setState]=useState<{view:string;players:Array<{id:string;displayName:string}>}|null>(null);
  useEffect(()=>{
    let mounted=true;
    void fetch(`/api/test-room/${code}`,{cache:"no-store"}).then(async r=>{
      if(!mounted || !r.ok) return;
      const j=await r.json();
      setState({view:j.view,players:j.players});
    }).catch(()=>{});
    return ()=>{mounted=false;};
  },[code]);
  if(!state) return null;

  async function switchView(view:"host"|"player",playerId?:string){
    await fetch(`/api/test-room/${code}`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({view,playerId}),
    });
    window.location.reload();
  }

  return (
    <div className="fixed inset-x-3 top-3 z-[90] mx-auto flex max-w-4xl flex-wrap items-center gap-2 rounded-2xl border border-cyan-300/20 bg-[#06131a]/95 p-3 text-xs shadow-2xl backdrop-blur">
      <span className="mr-2 font-black text-cyan-200">🧪 TEST</span>
      <button type="button" onClick={()=>void switchView("host")} className="rounded-lg border border-white/10 px-3 py-2 font-black">PROWADZĄCY</button>
      {state.players.map((p)=><button key={p.id} type="button" onClick={()=>void switchView("player",p.id)} className="rounded-lg border border-white/10 px-3 py-2 font-black">{p.displayName}</button>)}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#05070a] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(30,64,175,.16),transparent_28rem),radial-gradient(circle_at_88%_12%,rgba(127,29,29,.17),transparent_28rem),radial-gradient(circle_at_50%_100%,rgba(180,83,9,.08),transparent_32rem)]" />
      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-20 sm:px-6">{children}</div>
    </main>
  );
}

function Header({ code, phase }: { code: string; phase: string }) {
  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
      <div><span className="text-[9px] font-black uppercase tracking-[.25em] text-amber-300/60">AKTA NOCY · OSTATNI KURS</span><strong className="mt-1 block text-sm text-slate-300">{phase}</strong></div>
      <div className="rounded-xl border border-white/8 bg-white/[.025] px-4 py-3"><small className="mr-2 text-slate-600">POKÓJ</small><strong className="tracking-[.18em]">{code}</strong></div>
    </header>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="rounded-[1.8rem] border border-slate-200/10 bg-[#0a0d12]/94 p-5 shadow-[0_28px_90px_rgba(0,0,0,.45)] sm:p-7">{children}</section>;
}

function Eyebrow({ children, className="" }: { children: ReactNode; className?:string }) {
  return <span className={`block text-[9px] font-black uppercase tracking-[.22em] text-amber-300/60 ${className}`}>{children}</span>;
}

function PrimaryButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-gradient-to-r from-red-700 to-amber-600 px-5 py-3 text-xs font-black text-white shadow-[0_14px_40px_rgba(127,29,29,.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35">{children}</button>;
}

function ErrorLine({ error }: { error: string }) {
  return error ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-950/30 p-4 text-sm font-bold text-red-200">{error}</div> : null;
}

function InstructionGrid({ items }: { items: string[] }) {
  return <div className="grid gap-3 sm:grid-cols-2">{items.map((x,i)=><div key={x} className="rounded-xl border border-white/8 bg-white/[.025] p-4 text-sm leading-6 text-slate-400"><b className="mr-2 text-amber-300">{i+1}.</b>{x}</div>)}</div>;
}

function Secret({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-red-400/14 bg-red-950/15 p-5"><Eyebrow>{title}</Eyebrow><p className="mt-3 text-sm leading-7 text-slate-300">{children}</p></div>;
}

function ListBlock({ title, items }: { title: string; items: readonly string[] }) {
  return <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.025] p-5"><Eyebrow>{title}</Eyebrow><ul className="mt-3 space-y-2">{items.map((x)=><li key={x} className="text-sm leading-6 text-slate-400">• {x}</li>)}</ul></div>;
}

function SubmittedBox({ title, copy }: { title: string; copy: string }) {
  return <div className="mt-6 rounded-2xl border border-emerald-300/14 bg-emerald-300/[.04] p-5"><strong className="text-emerald-200">✓ {title}</strong><p className="mt-2 text-sm text-slate-500">{copy}</p></div>;
}

function Choice({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[.02] p-4"><strong className="block text-sm">{title}</strong><div className="mt-3 space-y-2">{children}</div></div>;
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={`block w-full rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${active?"border-amber-300/45 bg-amber-300/[.08]":"border-white/8 bg-black/15"}`}>{children}</button>;
}

function Fallback({ phase }: { phase: string }) {
  return <Shell><Panel><h1 className="font-serif text-4xl font-black">Ostatni Kurs</h1><p className="mt-4 text-sm text-slate-500">Aktualny etap: {phase || "nieznany"}. Odśwież stronę za chwilę.</p></Panel></Shell>;
}
