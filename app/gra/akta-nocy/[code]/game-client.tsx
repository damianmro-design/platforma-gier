"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HostProgress = {
  player_id: string;
  display_name: string;
  avatar: string;
  dossier_opened: boolean;
};

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

type HostInterrogation = {
  playerId: string;
  displayName: string;
  avatar: string;
  headline: string;
  prompts: string[];
  pressurePoint: string;
};

type PublicCastMember = {
  playerId: string;
  displayName: string;
  avatar: string;
  characterName: string;
  characterLabel: string;
};

type ReconstructionEvent = {
  key: string;
  title: string;
  copy: string;
};

type ReconstructionOption = {
  key: string;
  label: string;
};

type ReconstructionSummary = {
  total: number;
  submitted: number;
  suspectRanking: Array<PublicCastMember & { count: number }>;
  motiveRanking: Array<ReconstructionOption & { count: number }>;
  coverupRanking: Array<ReconstructionOption & { count: number }>;
  consensusTimeline: Array<{
    key: string;
    title: string;
    count: number;
    avgPosition: number;
  }>;
};

type ReconstructionHostState = {
  players: Array<{
    playerId: string;
    displayName: string;
    avatar: string;
    submitted: boolean;
  }>;
  summary: ReconstructionSummary | null;
};

type ReconstructionPlayerState = {
  submitted: boolean;
  event_order: string[];
  suspect_player_id: string;
  motive_key: string;
  coverup_key: string;
} | null;

type AccusationSummary = {
  total: number;
  correctSuspect: number;
  correctMotive: number;
  fullyCorrect: number;
  results: Array<{
    playerId: string;
    displayName: string;
    avatar: string;
    suspect: PublicCastMember | null;
    motiveKey: string;
    motiveLabel: string;
    evidenceId: string;
    evidenceNo: string;
    evidenceTitle: string;
    suspectCorrect: boolean;
    motiveCorrect: boolean;
    fullyCorrect: boolean;
  }>;
};

type AccusationHostState = {
  players: Array<{
    playerId: string;
    displayName: string;
    avatar: string;
    submitted: boolean;
  }>;
  summary: AccusationSummary | null;
};

type AccusationPlayerState = {
  submitted: boolean;
  suspect_player_id: string;
  motive_key: string;
  evidence_id: string;
} | null;

type RevealPayload = {
  step: number;
  culprit: PublicCastMember | null;
  content: {
    eyebrow: string;
    title: string;
    subtitle?: string;
    body: string;
    bullets?: readonly string[];
    whyItFits?: readonly string[];
    timeline?: ReadonlyArray<{ time: string; text: string }>;
    redHerrings?: ReadonlyArray<{ name: string; truth: string }>;
  };
} | null;

type AccusationVerdict = {
  suspect: PublicCastMember | null;
  motiveLabel: string;
  evidenceNo: string;
  evidenceTitle: string;
  suspectCorrect: boolean;
  motiveCorrect: boolean;
} | null;

type RoleCard = {
  id: string;
  name: string;
  shortLabel: string;
  publicBio: string;
  privateSecret: string;
  objective: string;
  openingStatement: string;
  privateKnowledge: string[];
  timeline: string[];
  core: boolean;
  isCulprit: boolean;
  culpritBriefing?: string;
  dossierOpened: boolean;
};

type HostState = {
  role: "host";
  room: {
    code: string;
    status: string;
    phase: string | null;
  };
  progress: HostProgress[];
  evidence: Evidence[];
  interrogations: HostInterrogation[];
  cast: PublicCastMember[];
  reconstruction: ReconstructionHostState | null;
  reconstructionEvents: ReconstructionEvent[];
  motiveOptions: ReconstructionOption[];
  coverupOptions: ReconstructionOption[];
  accusation: AccusationHostState | null;
  reveal: RevealPayload;
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
    displayName: string;
    avatar: string;
  };
  roleCard: RoleCard;
  evidence: Evidence[];
  cast: PublicCastMember[];
  reconstruction: ReconstructionPlayerState;
  reconstructionEvents: ReconstructionEvent[];
  motiveOptions: ReconstructionOption[];
  coverupOptions: ReconstructionOption[];
  accusation: AccusationPlayerState;
  accusationVerdict: AccusationVerdict;
  reveal: RevealPayload;
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

function isEvidenceAPhase(phase: string | null) {
  return Boolean(phase?.startsWith("dowody_a_"));
}

function isEvidenceBPhase(phase: string | null) {
  return Boolean(phase?.startsWith("dowody_b_"));
}

function isEvidencePhase(phase: string | null) {
  return isEvidenceAPhase(phase) || isEvidenceBPhase(phase);
}

export default function AktaNocyGameClient({ code }: { code: string }) {
  const [data, setData] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dossierVisible, setDossierVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/gra/akta-nocy/${code}`, {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Nie udało się odczytać gry.");
        return;
      }

      setData(result as GameState);
    } catch {
      setError("Nie udało się połączyć z rozgrywką.");
    }
  }, [code]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 1500);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send(
    action: string,
    payload: Record<string, unknown> = {},
  ) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/gra/akta-nocy/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, action }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error ?? "Nie udało się wykonać akcji.");
        return false;
      }

      await load();
      return true;
    } catch {
      setError("Nie udało się połączyć z rozgrywką.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function openDossier() {
    const ok = await send("openDossier");
    if (ok) setDossierVisible(true);
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-[#070504] text-[#f8eee2]">
        <div className="mx-auto max-w-5xl px-5 py-20 text-center text-sm text-orange-50/55">
          Otwieramy akta sprawy…
        </div>
      </main>
    );
  }

  if (data.role === "host") {
    return (
      <HostView
        data={data}
        busy={busy}
        error={error}
        onAdvance={() => void send("advance")}
        onRevealA={() => void send("revealEvidenceA")}
        onRevealB={() => void send("revealEvidenceB")}
      />
    );
  }

  return (
    <PlayerView
      data={data}
      busy={busy}
      error={error}
      dossierVisible={dossierVisible}
      onOpen={() => void openDossier()}
      onHide={() => setDossierVisible(false)}
      onShow={() => setDossierVisible(true)}
      onSubmitReconstruction={(payload) =>
        send("submitReconstruction", payload)
      }
      onSubmitAccusation={(payload) =>
        send("submitAccusation", payload)
      }
    />
  );
}

function HostView({
  data,
  busy,
  error,
  onAdvance,
  onRevealA,
  onRevealB,
}: {
  data: HostState;
  busy: boolean;
  error: string;
  onAdvance: () => void;
  onRevealA: () => void;
  onRevealB: () => void;
}) {
  const phase = data.room.phase;
  const opened = data.progress.filter((player) => player.dossier_opened).length;
  const allOpened = data.progress.length >= 5 && opened === data.progress.length;

  if (phase === "akta_osobowe") {
    return (
      <HostShell code={data.room.code} label="PANEL PROWADZĄCEGO">
        <section className="grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
          <div className="rounded-[1.8rem] border border-orange-100/10 bg-[#120907]/95 p-6 shadow-2xl sm:p-8">
            <span className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
              ETAP 00 · AKTA OSOBOWE
            </span>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-black tracking-[-.035em] sm:text-5xl">
              Każdy otrzymał inną postać i prywatne informacje.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/55">
              Każdy powinien otworzyć swoje akta na własnym telefonie i przeczytać je w tajemnicy. Prowadzący nie widzi, kto jest sprawcą.
            </p>

            <div className="mt-7">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300/55">
                    Otwarte akta
                  </span>
                  <strong className="mt-1 block text-4xl font-black">
                    {opened}/{data.progress.length}
                  </strong>
                </div>
                <span
                  className={`rounded-full border px-3 py-2 text-xs font-black ${
                    allOpened
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                      : "border-orange-100/10 bg-white/[.03] text-orange-100/45"
                  }`}
                >
                  {allOpened ? "WSZYSCY GOTOWI" : "CZEKAMY"}
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/35">
                <i
                  className="block h-full rounded-full bg-gradient-to-r from-red-700 to-orange-500 transition-all"
                  style={{
                    width: `${
                      data.progress.length
                        ? Math.round((opened / data.progress.length) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <Roster progress={data.progress} />
        </section>

        {error && <ErrorBox message={error} />}

        <section className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-red-400/15 bg-red-950/15 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="block text-lg">Kiedy wszyscy przeczytają akta</strong>
            <span className="mt-1 block text-sm text-orange-50/45">
              Rozpocznij pierwsze zeznania. Gracze będą mogli zatajać sekrety i budować alibi.
            </span>
          </div>
          <PrimaryButton disabled={!allOpened || busy} onClick={onAdvance}>
            {busy ? "CHWILA…" : "ROZPOCZNIJ ZEZNANIA →"}
          </PrimaryButton>
        </section>
      </HostShell>
    );
  }

  if (phase === "pierwsze_zeznania") {
    return (
      <HostShell code={data.room.code} label="PIERWSZE ZEZNANIA">
        <section className="rounded-[1.8rem] border border-orange-100/10 bg-[#120907]/95 p-6 shadow-2xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
            ETAP 01 · PIERWSZE ZEZNANIA
          </span>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl font-black tracking-[-.035em] sm:text-5xl">
            Każdy zna już swoją wersję wydarzeń.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/55">
            Poproś uczestników, żeby po kolei przedstawili swoją postać i opisali, gdzie byli między 22:30 a 23:05. Nie muszą ujawniać prywatnego sekretu.
          </p>

          <div className="mt-7 grid gap-3 md:grid-cols-2">
            {[
              "Każdy mówi, kim jest i jaki ma związek z Markiem.",
              "Każdy przedstawia swoją oś czasu. Inni mogą zadawać krótkie pytania.",
              "Nie wymuszaj ujawniania sekretu. Gracz sam decyduje, co przemilcza.",
              "Zapisz w pamięci sprzeczności. Za chwilę pojawią się pierwsze dowody.",
            ].map((item, index) => (
              <div
                key={item}
                className="rounded-2xl border border-orange-100/8 bg-white/[.025] p-4 text-sm leading-6 text-orange-50/62"
              >
                <b className="mr-2 text-red-300">{index + 1}.</b>
                {item}
              </div>
            ))}
          </div>
        </section>

        {error && <ErrorBox message={error} />}

        <section className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-red-400/15 bg-red-950/15 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="block text-lg">Kiedy każdy złoży pierwsze zeznanie</strong>
            <span className="mt-1 block text-sm text-orange-50/45">
              Otwórz pierwszą paczkę. Dowody pojawią się równocześnie na telefonach graczy.
            </span>
          </div>
          <PrimaryButton disabled={busy} onClick={onAdvance}>
            {busy ? "OTWIERANIE…" : "OTWÓRZ PACZKĘ DOWODOWĄ A →"}
          </PrimaryButton>
        </section>
      </HostShell>
    );
  }

  if (isEvidenceAPhase(phase)) {
    const allEvidence = data.evidence.length >= 4;

    return (
      <HostShell code={data.room.code} label="PACZKA DOWODOWA A">
        <EvidenceStage
          evidence={data.evidence}
          eyebrow="ETAP 02 · PACZKA DOWODOWA A"
          title="Każdy nowy dowód może zmienić znaczenie wcześniejszych zeznań."
          lead="Czytajcie dowody na głos i od razu zestawiajcie je z tym, co przed chwilą powiedzieli gracze."
        />

        {error && <ErrorBox message={error} />}

        <section className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-orange-100/10 bg-white/[.025] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="block text-lg">
              {allEvidence ? "Paczka A jest kompletna" : `Ujawniono ${data.evidence.length}/4 dowody`}
            </strong>
            <span className="mt-1 block text-sm text-orange-50/45">
              {allEvidence
                ? "Teraz system przygotuje pytania do konkretnych uczestników na podstawie ujawnionych sprzeczności."
                : "Daj ekipie chwilę na dyskusję przed pokazaniem kolejnego dokumentu."}
            </span>
          </div>
          <PrimaryButton
            disabled={busy}
            onClick={allEvidence ? onAdvance : onRevealA}
          >
            {busy
              ? "CHWILA…"
              : allEvidence
                ? "ROZPOCZNIJ PRZESŁUCHANIA →"
                : "UJAWNIJ KOLEJNY DOWÓD →"}
          </PrimaryButton>
        </section>
      </HostShell>
    );
  }

  if (phase === "przesluchania_a") {
    return (
      <HostShell code={data.room.code} label="PRZESŁUCHANIA">
        <section className="rounded-[1.8rem] border border-red-400/15 bg-red-950/15 p-6 shadow-2xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
            ETAP 03 · PRZESŁUCHANIA
          </span>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl font-black tracking-[-.035em] sm:text-5xl">
            Teraz naciskamy dokładnie tam, gdzie historie zaczynają się rozjeżdżać.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/55">
            Poniższe pytania są przygotowane pod konkretne osoby, ale nie ujawniają prowadzącemu ich tajnych ról ani sekretów.
          </p>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {data.interrogations.map((item, index) => (
            <article
              key={item.playerId}
              className="rounded-[1.5rem] border border-orange-100/10 bg-[#120907]/95 p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black/30 text-xl">
                    {AVATARS[item.avatar] ?? "●"}
                  </span>
                  <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-[.2em] text-red-300/75">
                      Przesłuchanie {index + 1}
                    </span>
                    <h2 className="truncate text-xl font-black">{item.displayName}</h2>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs font-black uppercase tracking-[.18em] text-orange-300/55">
                {item.headline}
              </p>

              <div className="mt-3 space-y-2">
                {item.prompts.map((prompt) => (
                  <div
                    key={prompt}
                    className="rounded-xl border border-orange-100/8 bg-white/[.025] p-3 text-sm leading-6 text-orange-50/68"
                  >
                    {prompt}
                  </div>
                ))}
              </div>

              <div className="mt-4 border-l-2 border-red-500/45 pl-4 text-xs leading-5 text-orange-100/45">
                <b className="text-red-300/70">Dociśnij:</b> {item.pressurePoint}
              </div>
            </article>
          ))}
        </div>

        <section className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-red-400/15 bg-red-950/15 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="block text-lg">Przesłuchania zakończone</strong>
            <span className="mt-1 block text-sm leading-6 text-orange-50/45">
              Teraz pojawią się mocniejsze dane techniczne, zdjęcie, nagranie i analiza czasu śmierci.
            </span>
          </div>
          <PrimaryButton disabled={busy} onClick={onAdvance}>
            {busy ? "OTWIERANIE…" : "OTWÓRZ PACZKĘ DOWODOWĄ B →"}
          </PrimaryButton>
        </section>
      </HostShell>
    );
  }

  if (isEvidenceBPhase(phase)) {
    const evidenceB = data.evidence.filter((item) => item.no.startsWith("B-"));
    const allEvidenceB = evidenceB.length >= 5;

    return (
      <HostShell code={data.room.code} label="PACZKA DOWODOWA B">
        <EvidenceStage
          evidence={evidenceB}
          eyebrow="ETAP 04 · PACZKA DOWODOWA B"
          title="Teraz sprawdzamy nie tylko co ludzie powiedzieli, ale co zostawiły po sobie urządzenia i przypadkowe nagrania."
          lead="Każdy z tych dowodów zawęża przedział czasowy albo zmienia znaczenie wcześniejszego alibi. Ujawniaj je po jednym i pozwól ekipie dyskutować."
        />

        {error && <ErrorBox message={error} />}

        <section className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-orange-100/10 bg-white/[.025] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="block text-lg">
              {allEvidenceB
                ? "Paczka B jest kompletna"
                : `Ujawniono ${evidenceB.length}/5 nowych dowodów`}
            </strong>
            <span className="mt-1 block text-sm leading-6 text-orange-50/45">
              {allEvidenceB
                ? "Macie już wystarczająco dużo danych, żeby w następnym etapie odtworzyć kluczowe minuty nocy i sprawdzić, która wersja wydarzeń naprawdę się spina."
                : "Po każdym dowodzie zapytaj: czyje alibi właśnie się wzmocniło, a czyje osłabło?"}
            </span>
          </div>
          {!allEvidenceB && (
            <PrimaryButton disabled={busy} onClick={onRevealB}>
              {busy ? "CHWILA…" : "UJAWNIJ KOLEJNY DOWÓD →"}
            </PrimaryButton>
          )}
        </section>

        {allEvidenceB && (
          <section className="mt-4 flex flex-col gap-4 rounded-[1.5rem] border border-red-400/15 bg-red-950/15 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[.24em] text-red-300">
                Następny etap
              </span>
              <h2 className="mt-2 text-xl font-black">Rekonstrukcja nocy</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-50/50">
                Każdy gracz wybierze 7 z 9 wydarzeń, ułoży je w kolejności i wskaże sprawcę, motyw oraz element upozorowania.
              </p>
            </div>
            <PrimaryButton disabled={busy} onClick={onAdvance}>
              {busy ? "URUCHAMIANIE…" : "ROZPOCZNIJ REKONSTRUKCJĘ →"}
            </PrimaryButton>
          </section>
        )}
      </HostShell>
    );
  }

  if (phase === "rekonstrukcja") {
    const reconstruction = data.reconstruction;
    const submitted = reconstruction?.players.filter((item) => item.submitted).length ?? 0;
    const total = reconstruction?.players.length ?? data.progress.length;
    const allSubmitted = total > 0 && submitted === total;

    return (
      <HostShell code={data.room.code} label="REKONSTRUKCJA NOCY">
        <section className="rounded-[1.8rem] border border-red-400/15 bg-red-950/15 p-6 shadow-2xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
            ETAP 05 · REKONSTRUKCJA NOCY
          </span>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl font-black tracking-[-.035em] sm:text-5xl">
            Teraz każdy buduje własną wersję kluczowych 18 minut.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/55">
            Gracze wybierają 7 wydarzeń spośród 9, ustawiają je w kolejności i wskazują, kto ich zdaniem odpowiada za śmierć Marka. Nie pokazuj jeszcze żadnego rozwiązania.
          </p>
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_.75fr]">
          <div className="rounded-[1.5rem] border border-orange-100/10 bg-[#120907]/95 p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300/55">
                  Przesłane rekonstrukcje
                </span>
                <strong className="mt-1 block text-4xl font-black">{submitted}/{total}</strong>
              </div>
              <span className={`rounded-full border px-3 py-2 text-xs font-black ${
                allSubmitted
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                  : "border-orange-100/10 bg-white/[.03] text-orange-100/45"
              }`}>
                {allSubmitted ? "WSZYSCY GOTOWI" : "CZEKAMY"}
              </span>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/35">
              <i
                className="block h-full rounded-full bg-gradient-to-r from-red-700 to-orange-500 transition-all"
                style={{
                  width: `${total ? Math.round((submitted / total) * 100) : 0}%`,
                }}
              />
            </div>

            <div className="mt-5 space-y-2">
              {reconstruction?.players.map((player) => (
                <div
                  key={player.playerId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-orange-100/8 bg-white/[.025] p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/30 text-lg">
                      {AVATARS[player.avatar] ?? "●"}
                    </span>
                    <strong className="truncate text-sm">{player.displayName}</strong>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-[.14em] ${
                    player.submitted ? "text-emerald-300" : "text-orange-100/30"
                  }`}>
                    {player.submitted ? "wysłano" : "układa"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-orange-100/10 bg-white/[.025] p-5 sm:p-6">
            <span className="text-[10px] font-black uppercase tracking-[.24em] text-red-300">
              Zasada
            </span>
            <div className="mt-4 space-y-3 text-sm leading-6 text-orange-50/58">
              <p>Każdy wybiera dokładnie 7 wydarzeń. Dwa z dziewięciu są fałszywymi tropami.</p>
              <p>Potem wskazuje podejrzanego, główny motyw i element, który miał stworzyć fałszywy obraz nocy.</p>
              <p>Po zebraniu wszystkich odpowiedzi pokażemy nie rozwiązanie, tylko wspólną teorię grupy.</p>
            </div>
          </div>
        </section>

        {error && <ErrorBox message={error} />}

        <section className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-red-400/15 bg-red-950/15 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="block text-lg">Wszyscy gotowi?</strong>
            <span className="mt-1 block text-sm text-orange-50/45">
              Pokaż na wspólnym ekranie, jaką teorię zbudowała cała grupa.
            </span>
          </div>
          <PrimaryButton disabled={!allSubmitted || busy} onClick={onAdvance}>
            {busy ? "LICZENIE…" : "POKAŻ WSPÓLNĄ TEORIĘ →"}
          </PrimaryButton>
        </section>
      </HostShell>
    );
  }

  if (phase === "rekonstrukcja_wynik") {
    const summary = data.reconstruction?.summary;
    const topSuspect = summary?.suspectRanking[0];
    const topMotive = summary?.motiveRanking[0];
    const topCoverup = summary?.coverupRanking[0];

    return (
      <HostShell code={data.room.code} label="WSPÓLNA TEORIA">
        <section className="rounded-[1.8rem] border border-orange-100/10 bg-[#120907]/95 p-6 shadow-2xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
            WYNIK REKONSTRUKCJI
          </span>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl font-black tracking-[-.035em] sm:text-5xl">
            Tak grupa odtworzyła noc w apartamencie 214.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/55">
            To nadal tylko Wasza teoria. System nie potwierdza jeszcze, które elementy są poprawne.
          </p>
        </section>

        {summary && (
          <>
            <section className="mt-6 grid gap-4 lg:grid-cols-3">
              <TheoryCard label="Najczęściej wskazywany podejrzany">
                {topSuspect ? (
                  <>
                    <strong className="block text-2xl">{topSuspect.characterName}</strong>
                    <span className="mt-1 block text-sm text-orange-50/45">
                      grany przez {topSuspect.displayName}
                    </span>
                    <b className="mt-3 block text-red-300">{topSuspect.count}/{summary.total} wskazań</b>
                  </>
                ) : (
                  <span>Brak danych</span>
                )}
              </TheoryCard>

              <TheoryCard label="Najczęściej wskazywany motyw">
                <strong className="block text-xl">{topMotive?.label ?? "Brak danych"}</strong>
                {topMotive && (
                  <b className="mt-3 block text-red-300">{topMotive.count}/{summary.total} wskazań</b>
                )}
              </TheoryCard>

              <TheoryCard label="Najczęściej wskazane upozorowanie">
                <strong className="block text-xl">{topCoverup?.label ?? "Brak danych"}</strong>
                {topCoverup && (
                  <b className="mt-3 block text-red-300">{topCoverup.count}/{summary.total} wskazań</b>
                )}
              </TheoryCard>
            </section>

            <section className="mt-6 rounded-[1.5rem] border border-orange-100/10 bg-[#100806]/90 p-5 sm:p-6">
              <span className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300/55">
                Uśredniona kolejność wydarzeń
              </span>
              <div className="mt-4 space-y-2">
                {summary.consensusTimeline.map((item, index) => (
                  <div
                    key={item.key}
                    className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-xl border border-orange-100/8 bg-white/[.025] p-3"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-950/40 text-sm font-black text-red-200">
                      {index + 1}
                    </span>
                    <strong className="text-sm">{item.title}</strong>
                    <span className="text-[10px] font-black text-orange-100/35">
                      {item.count}/{summary.total}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <section className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-red-400/15 bg-red-950/15 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[.24em] text-red-300">
              Następny etap
            </span>
            <h2 className="mt-2 text-xl font-black">Akt oskarżenia</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-orange-50/50">
              Każdy prywatnie wskaże sprawcę, motyw i najważniejszy dowód. Po zatwierdzeniu odpowiedzi nie będzie można jej zmienić.
            </p>
          </div>
          <PrimaryButton disabled={busy} onClick={onAdvance}>
            {busy ? "URUCHAMIANIE…" : "ROZPOCZNIJ AKT OSKARŻENIA →"}
          </PrimaryButton>
        </section>
      </HostShell>
    );
  }

  if (phase === "akt_oskarzenia") {
    const accusation = data.accusation;
    const submitted = accusation?.players.filter((item) => item.submitted).length ?? 0;
    const total = accusation?.players.length ?? data.progress.length;
    const allSubmitted = total > 0 && submitted === total;

    return (
      <HostShell code={data.room.code} label="AKT OSKARŻENIA">
        <section className="rounded-[1.8rem] border border-red-400/15 bg-red-950/15 p-6 shadow-2xl sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
            ETAP 06 · AKT OSKARŻENIA
          </span>
          <h1 className="mt-3 max-w-4xl font-serif text-4xl font-black tracking-[-.035em] sm:text-5xl">
            Czas przestać tylko podejrzewać.
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/55">
            Każdy gracz na własnym telefonie wybiera 1 osobę, 1 motyw i 1 najważniejszy dowód. Odpowiedź zostaje natychmiast zamknięta.
          </p>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-orange-100/10 bg-[#120907]/95 p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300/55">
                Złożone akty oskarżenia
              </span>
              <strong className="mt-1 block text-4xl font-black">{submitted}/{total}</strong>
            </div>
            <span className={`rounded-full border px-3 py-2 text-xs font-black ${
              allSubmitted
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                : "border-orange-100/10 bg-white/[.03] text-orange-100/45"
            }`}>
              {allSubmitted ? "WSZYSCY ZDECYDOWALI" : "CZEKAMY"}
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/35">
            <i
              className="block h-full rounded-full bg-gradient-to-r from-red-700 to-orange-500 transition-all"
              style={{ width: `${total ? Math.round((submitted / total) * 100) : 0}%` }}
            />
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {accusation?.players.map((player) => (
              <div
                key={player.playerId}
                className="flex items-center justify-between gap-3 rounded-xl border border-orange-100/8 bg-white/[.025] p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/30 text-lg">
                    {AVATARS[player.avatar] ?? "●"}
                  </span>
                  <strong className="truncate text-sm">{player.displayName}</strong>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-[.14em] ${
                  player.submitted ? "text-emerald-300" : "text-orange-100/30"
                }`}>
                  {player.submitted ? "zamknięte" : "decyduje"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {error && <ErrorBox message={error} />}

        <section className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-red-400/15 bg-red-950/15 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="block text-lg">Po tej decyzji nie ma już odwrotu.</strong>
            <span className="mt-1 block text-sm text-orange-50/45">
              Kiedy wszyscy zatwierdzą oskarżenia, rozpocznij finałowe ujawnienie.
            </span>
          </div>
          <PrimaryButton disabled={!allSubmitted || busy} onClick={onAdvance}>
            {busy ? "PRZYGOTOWUJĘ…" : "ROZPOCZNIJ UJAWNIENIE →"}
          </PrimaryButton>
        </section>
      </HostShell>
    );
  }

  if (phase?.startsWith("ujawnienie_") && data.reveal) {
    const reveal = data.reveal;
    const content = reveal.content;
    const summary = data.accusation?.summary;
    const isFinal = reveal.step === 4;

    return (
      <HostShell code={data.room.code} label={`UJAWNIENIE · ${reveal.step}/4`}>
        <section className={`overflow-hidden rounded-[2rem] border p-6 shadow-[0_30px_100px_rgba(0,0,0,.6)] sm:p-8 ${
          reveal.step === 3
            ? "border-red-500/35 bg-[#1c0706]"
            : "border-orange-100/10 bg-[#120907]/95"
        }`}>
          <span className="text-[10px] font-black uppercase tracking-[.3em] text-red-300">
            {content.eyebrow}
          </span>
          <h1 className="mt-3 max-w-5xl font-serif text-4xl font-black tracking-[-.04em] sm:text-6xl">
            {content.title}
          </h1>
          {content.subtitle && (
            <p className="mt-2 text-sm font-black uppercase tracking-[.16em] text-orange-300/55">
              {content.subtitle}
            </p>
          )}
          <p className="mt-5 max-w-4xl text-sm leading-7 text-orange-50/62 sm:text-base">
            {content.body}
          </p>

          {reveal.step === 3 && reveal.culprit && (
            <div className="mt-7 rounded-2xl border border-red-400/20 bg-red-950/30 p-5">
              <span className="text-[9px] font-black uppercase tracking-[.2em] text-red-300/70">
                W tę postać wcielał się
              </span>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-black/30 text-xl">
                  {AVATARS[reveal.culprit.avatar] ?? "●"}
                </span>
                <strong className="text-2xl">{reveal.culprit.displayName}</strong>
              </div>
            </div>
          )}

          {content.bullets && (
            <div className="mt-7 grid gap-3">
              {content.bullets.map((item) => (
                <div key={item} className="rounded-xl border border-orange-100/8 bg-white/[.025] p-4 text-sm leading-6 text-orange-50/58">
                  {item}
                </div>
              ))}
            </div>
          )}

          {content.timeline && (
            <div className="mt-7 space-y-2">
              {content.timeline.map((item) => (
                <div key={`${item.time}-${item.text}`} className="grid grid-cols-[64px_1fr] gap-3 rounded-xl border border-orange-100/8 bg-white/[.025] p-3">
                  <strong className="text-red-300">{item.time}</strong>
                  <span className="text-sm leading-6 text-orange-50/65">{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {content.whyItFits && (
            <div className="mt-7">
              <span className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300/55">
                Dlaczego dowody wskazują właśnie jego
              </span>
              <div className="mt-3 grid gap-2">
                {content.whyItFits.map((item) => (
                  <div key={item} className="rounded-xl border border-red-400/10 bg-red-950/15 p-3 text-sm leading-6 text-orange-50/62">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {content.redHerrings && (
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {content.redHerrings.map((item) => (
                <div key={item.name} className="rounded-xl border border-orange-100/8 bg-white/[.025] p-4">
                  <strong className="block text-sm">{item.name}</strong>
                  <span className="mt-2 block text-xs leading-5 text-orange-50/45">{item.truth}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {reveal.step >= 3 && summary && (
          <section className="mt-6 rounded-[1.5rem] border border-orange-100/10 bg-[#100806]/90 p-5 sm:p-6">
            <span className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300/55">
              Wasze akty oskarżenia
            </span>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <TheoryCard label="Trafiony sprawca">
                <strong className="text-2xl">{summary.correctSuspect}/{summary.total}</strong>
              </TheoryCard>
              <TheoryCard label="Trafiony motyw">
                <strong className="text-2xl">{summary.correctMotive}/{summary.total}</strong>
              </TheoryCard>
              <TheoryCard label="Sprawca + motyw">
                <strong className="text-2xl">{summary.fullyCorrect}/{summary.total}</strong>
              </TheoryCard>
            </div>

            {isFinal && (
              <div className="mt-5 space-y-2">
                {summary.results.map((item) => (
                  <div key={item.playerId} className="rounded-xl border border-orange-100/8 bg-white/[.025] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong>{item.displayName}</strong>
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${
                        item.fullyCorrect
                          ? "bg-emerald-400/10 text-emerald-200"
                          : item.suspectCorrect
                            ? "bg-orange-400/10 text-orange-200"
                            : "bg-red-400/10 text-red-200"
                      }`}>
                        {item.fullyCorrect ? "SPRAWCA + MOTYW" : item.suspectCorrect ? "TRAFIONY SPRAWCA" : "BŁĘDNY SPRAWCA"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-orange-50/45">
                      Oskarżenie: {item.suspect?.characterName ?? "brak"} · {item.motiveLabel}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-orange-50/35">
                      Kluczowy dowód: {item.evidenceNo} · {item.evidenceTitle}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {error && <ErrorBox message={error} />}

        {!isFinal && (
          <section className="mt-6 flex justify-end">
            <PrimaryButton disabled={busy} onClick={onAdvance}>
              {busy
                ? "CHWILA…"
                : reveal.step === 1
                  ? "ODTWÓRZ PRAWDZIWE MINUTY →"
                  : reveal.step === 2
                    ? "UJAWNIJ SPRAWCĘ →"
                    : "OTWÓRZ PEŁNE AKTA →"}
            </PrimaryButton>
          </section>
        )}
      </HostShell>
    );
  }

  return (
    <HostShell code={data.room.code} label="ŚLEDZTWO">
      <div className="rounded-2xl border border-orange-100/10 bg-white/[.025] p-6 text-orange-50/55">
        Synchronizujemy kolejny etap śledztwa…
      </div>
    </HostShell>
  );
}

function PlayerView({
  data,
  busy,
  error,
  dossierVisible,
  onOpen,
  onHide,
  onShow,
  onSubmitReconstruction,
  onSubmitAccusation,
}: {
  data: PlayerState;
  busy: boolean;
  error: string;
  dossierVisible: boolean;
  onOpen: () => void;
  onHide: () => void;
  onShow: () => void;
  onSubmitReconstruction: (payload: {
    eventOrder: string[];
    suspectPlayerId: string;
    motiveKey: string;
    coverupKey: string;
  }) => Promise<boolean>;
  onSubmitAccusation: (payload: {
    suspectPlayerId: string;
    motiveKey: string;
    evidenceId: string;
  }) => Promise<boolean>;
}) {
  const phase = data.room.phase;
  const role = data.roleCard;
  const firstOpen = role.dossierOpened;
  const reconstructionStage =
    phase === "rekonstrukcja" || phase === "rekonstrukcja_wynik";
  const accusationStage = phase === "akt_oskarzenia";
  const revealStage = Boolean(phase?.startsWith("ujawnienie_"));
  const publicStage =
    phase === "pierwsze_zeznania" ||
    isEvidencePhase(phase) ||
    phase === "przesluchania_a" ||
    reconstructionStage ||
    accusationStage ||
    revealStage;

  if (revealStage && !dossierVisible) {
    return (
      <PlayerRevealView
        data={data}
        error={error}
        onShowDossier={onShow}
      />
    );
  }

  if (accusationStage && !dossierVisible) {
    return (
      <PlayerAccusationView
        data={data}
        busy={busy}
        error={error}
        onShowDossier={onShow}
        onSubmit={onSubmitAccusation}
      />
    );
  }

  if (reconstructionStage && !dossierVisible) {
    return (
      <PlayerReconstructionView
        data={data}
        busy={busy}
        error={error}
        onShowDossier={onShow}
        onSubmit={onSubmitReconstruction}
      />
    );
  }

  if (publicStage && !dossierVisible) {
    if (isEvidencePhase(phase) || phase === "przesluchania_a") {
      return (
        <PlayerPublicEvidence
          data={data}
          error={error}
          onShowDossier={onShow}
        />
      );
    }

    return (
      <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
        <Backdrop />
        <div className="relative mx-auto max-w-2xl px-5 py-8">
          <TopBar code={data.room.code} label="PIERWSZE ZEZNANIA" />
          <section className="mt-6 rounded-[2rem] border border-orange-100/10 bg-[#120907]/95 p-6 text-center shadow-2xl sm:p-8">
            <span className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
              ETAP 01
            </span>
            <h1 className="mt-3 font-serif text-4xl font-black">Opowiedz swoją wersję nocy.</h1>
            <p className="mt-4 text-sm leading-7 text-orange-50/55">
              Przedstaw swoją postać i opisz, gdzie byłeś lub byłaś. Nie musisz ujawniać sekretu ani wszystkiego, co wiesz.
            </p>
            <button
              type="button"
              onClick={onShow}
              className="mt-7 rounded-xl border border-orange-100/12 bg-white/[.04] px-5 py-3 text-sm font-black text-orange-50/80"
            >
              PODEJRZYJ SWOJE AKTA
            </button>
            {error && <ErrorBox message={error} />}
          </section>
        </div>
      </main>
    );
  }

  if (!dossierVisible) {
    return (
      <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
        <Backdrop />
        <div className="relative mx-auto flex min-h-screen max-w-xl items-center px-5 py-8">
          <section className="w-full rounded-[2rem] border border-orange-200/12 bg-[#140a08]/95 p-6 text-center shadow-[0_36px_100px_rgba(0,0,0,.6)] sm:p-8">
            <span className="text-[10px] font-black uppercase tracking-[.3em] text-red-300">
              ŚCIŚLE TAJNE · TYLKO DLA CIEBIE
            </span>
            <div className="mx-auto mt-7 grid h-24 w-20 place-items-center rounded-xl border border-orange-200/15 bg-[#2a100b] font-serif text-4xl shadow-xl">
              214
            </div>
            <h1 className="mt-6 font-serif text-4xl font-black">Twoje akta osobowe</h1>
            <p className="mt-3 text-sm leading-6 text-orange-50/50">
              Upewnij się, że nikt nie patrzy na Twój ekran. W środku znajdziesz postać, sekret, oś czasu i informacje, których inni mogą nie znać.
            </p>

            <button
              type="button"
              disabled={busy}
              onClick={firstOpen ? onShow : onOpen}
              className="mt-7 w-full rounded-2xl bg-gradient-to-r from-red-700 to-orange-600 px-5 py-4 text-sm font-black text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {busy
                ? "OTWIERANIE…"
                : firstOpen
                  ? "OTWÓRZ PONOWNIE"
                  : "OTWÓRZ AKTA"}
            </button>

            {error && <ErrorBox message={error} />}
          </section>
        </div>
      </main>
    );
  }

  return (
    <DossierView
      data={data}
      error={error}
      publicStage={publicStage}
      onHide={onHide}
    />
  );
}

function PlayerAccusationView({
  data,
  busy,
  error,
  onShowDossier,
  onSubmit,
}: {
  data: PlayerState;
  busy: boolean;
  error: string;
  onShowDossier: () => void;
  onSubmit: (payload: {
    suspectPlayerId: string;
    motiveKey: string;
    evidenceId: string;
  }) => Promise<boolean>;
}) {
  const [suspectPlayerId, setSuspectPlayerId] = useState("");
  const [motiveKey, setMotiveKey] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const submitted = Boolean(data.accusation?.submitted);

  const selectedSuspect = data.cast.find(
    (item) => item.playerId === data.accusation?.suspect_player_id,
  );
  const selectedMotive = data.motiveOptions.find(
    (item) => item.key === data.accusation?.motive_key,
  );
  const selectedEvidence = data.evidence.find(
    (item) => item.id === data.accusation?.evidence_id,
  );

  async function submit() {
    if (!suspectPlayerId || !motiveKey || !evidenceId) return;
    await onSubmit({ suspectPlayerId, motiveKey, evidenceId });
  }

  if (submitted) {
    return (
      <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
        <Backdrop />
        <div className="relative mx-auto max-w-2xl px-5 py-8">
          <TopBar code={data.room.code} label="AKT OSKARŻENIA" />
          <section className="mt-6 rounded-[2rem] border border-emerald-300/15 bg-[#0d120d]/95 p-6 text-center shadow-2xl sm:p-8">
            <span className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">
              OSKARŻENIE ZABLOKOWANE
            </span>
            <h1 className="mt-3 font-serif text-4xl font-black">Decyzja została zapisana.</h1>
            <p className="mt-4 text-sm leading-7 text-orange-50/55">
              Nie możesz jej już zmienić. Prowadzący zobaczy tylko, że Twoja odpowiedź jest gotowa.
            </p>

            <div className="mt-6 grid gap-3 text-left">
              <MiniTheory label="Oskarżasz">
                {selectedSuspect
                  ? `${selectedSuspect.characterName} · ${selectedSuspect.displayName}`
                  : "zapisano"}
              </MiniTheory>
              <MiniTheory label="Motyw">
                {selectedMotive?.label ?? "zapisano"}
              </MiniTheory>
              <MiniTheory label="Najważniejszy dowód">
                {selectedEvidence
                  ? `${selectedEvidence.no} · ${selectedEvidence.title}`
                  : "zapisano"}
              </MiniTheory>
            </div>

            <button
              type="button"
              onClick={onShowDossier}
              className="mt-6 rounded-xl border border-orange-100/10 bg-white/[.035] px-5 py-3 text-xs font-black text-orange-50/70"
            >
              OTWÓRZ MOJE AKTA
            </button>
          </section>
          {error && <ErrorBox message={error} />}
        </div>
      </main>
    );
  }

  const ready = Boolean(suspectPlayerId && motiveKey && evidenceId);

  return (
    <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
      <Backdrop />
      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <TopBar code={data.room.code} label="AKT OSKARŻENIA" />

        <section className="mt-6 rounded-[1.8rem] border border-red-400/15 bg-red-950/15 p-5 sm:p-6">
          <span className="text-[10px] font-black uppercase tracking-[.26em] text-red-300">
            ETAP 06
          </span>
          <h1 className="mt-2 font-serif text-3xl font-black sm:text-4xl">
            Wskaż sprawcę. Teraz naprawdę.
          </h1>
          <p className="mt-3 text-sm leading-6 text-orange-50/52">
            Wybierz 1 osobę, 1 motyw i 1 najważniejszy dowód. Po zatwierdzeniu odpowiedź zostanie zamknięta i nie będzie można jej edytować.
          </p>
        </section>

        <ChoiceSection label="Kogo oskarżasz?">
          <div className="grid gap-2 sm:grid-cols-2">
            {data.cast.map((member) => (
              <button
                key={member.playerId}
                type="button"
                onClick={() => setSuspectPlayerId(member.playerId)}
                className={`rounded-xl border p-3 text-left transition ${
                  suspectPlayerId === member.playerId
                    ? "border-red-400/35 bg-red-950/25"
                    : "border-orange-100/10 bg-white/[.025]"
                }`}
              >
                <strong className="block text-sm">{member.characterName}</strong>
                <span className="mt-1 block text-[11px] text-orange-50/35">
                  {member.characterLabel} · {member.displayName}
                </span>
              </button>
            ))}
          </div>
        </ChoiceSection>

        <ChoiceSection label="Jaki był główny motyw?">
          <div className="grid gap-2">
            {data.motiveOptions.map((option) => (
              <ChoiceButton
                key={option.key}
                selected={motiveKey === option.key}
                onClick={() => setMotiveKey(option.key)}
              >
                {option.label}
              </ChoiceButton>
            ))}
          </div>
        </ChoiceSection>

        <ChoiceSection label="Który dowód jest dla Ciebie najważniejszy?">
          <div className="grid gap-2">
            {data.evidence.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setEvidenceId(item.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  evidenceId === item.id
                    ? "border-red-400/35 bg-red-950/25"
                    : "border-orange-100/10 bg-white/[.025]"
                }`}
              >
                <span className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300/45">
                  {item.no}
                </span>
                <strong className="mt-1 block text-sm">{item.title}</strong>
              </button>
            ))}
          </div>
        </ChoiceSection>

        {error && <ErrorBox message={error} />}

        <div className="sticky bottom-3 mt-6 rounded-2xl border border-red-400/15 bg-[#100806]/95 p-3 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => void submit()}
            className="w-full rounded-xl bg-gradient-to-r from-red-700 to-orange-600 px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            {busy ? "ZAPISUJĘ…" : "ZATWIERDŹ I ZABLOKUJ OSKARŻENIE"}
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onShowDossier}
            className="rounded-xl border border-orange-100/10 bg-white/[.035] px-5 py-3 text-xs font-black text-orange-50/70"
          >
            PODEJRZYJ MOJE AKTA
          </button>
        </div>
      </div>
    </main>
  );
}

function PlayerRevealView({
  data,
  error,
  onShowDossier,
}: {
  data: PlayerState;
  error: string;
  onShowDossier: () => void;
}) {
  const reveal = data.reveal;

  if (!reveal) {
    return (
      <main className="min-h-screen bg-[#070504] text-[#f8eee2]">
        <div className="mx-auto max-w-2xl px-5 py-20 text-center text-sm text-orange-50/55">
          Czekamy na kolejny krok prowadzącego…
        </div>
      </main>
    );
  }

  const content = reveal.content;
  const verdict = data.accusationVerdict;

  return (
    <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
      <Backdrop />
      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <TopBar code={data.room.code} label={`UJAWNIENIE · ${reveal.step}/4`} />

        <section className={`mt-6 overflow-hidden rounded-[2rem] border p-6 shadow-[0_30px_90px_rgba(0,0,0,.55)] sm:p-8 ${
          reveal.step === 3
            ? "border-red-500/35 bg-[#1c0706]"
            : "border-orange-200/12 bg-[#130a08]"
        }`}>
          <span className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
            {content.eyebrow}
          </span>
          <h1 className="mt-3 font-serif text-4xl font-black tracking-[-.035em] sm:text-5xl">
            {content.title}
          </h1>
          {content.subtitle && (
            <p className="mt-2 text-xs font-black uppercase tracking-[.16em] text-orange-300/55">
              {content.subtitle}
            </p>
          )}
          <p className="mt-5 text-sm leading-7 text-orange-50/62">{content.body}</p>

          {reveal.step === 3 && reveal.culprit && (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-950/30 p-5">
              <span className="text-[9px] font-black uppercase tracking-[.18em] text-red-300/65">
                Tę postać grał
              </span>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-black/30 text-xl">
                  {AVATARS[reveal.culprit.avatar] ?? "●"}
                </span>
                <strong className="text-xl">{reveal.culprit.displayName}</strong>
              </div>
            </div>
          )}

          {content.bullets && (
            <div className="mt-6 grid gap-2">
              {content.bullets.map((item) => (
                <div key={item} className="rounded-xl border border-orange-100/8 bg-white/[.025] p-3 text-sm leading-6 text-orange-50/56">
                  {item}
                </div>
              ))}
            </div>
          )}

          {content.timeline && (
            <div className="mt-6 space-y-2">
              {content.timeline.map((item) => (
                <div key={`${item.time}-${item.text}`} className="grid grid-cols-[58px_1fr] gap-3 rounded-xl border border-orange-100/8 bg-white/[.025] p-3">
                  <strong className="text-red-300">{item.time}</strong>
                  <span className="text-sm leading-6 text-orange-50/62">{item.text}</span>
                </div>
              ))}
            </div>
          )}

          {content.whyItFits && (
            <div className="mt-6 space-y-2">
              {content.whyItFits.map((item) => (
                <div key={item} className="rounded-xl border border-red-400/10 bg-red-950/15 p-3 text-sm leading-6 text-orange-50/58">
                  {item}
                </div>
              ))}
            </div>
          )}

          {content.redHerrings && (
            <div className="mt-6 grid gap-2">
              {content.redHerrings.map((item) => (
                <div key={item.name} className="rounded-xl border border-orange-100/8 bg-white/[.025] p-3">
                  <strong className="block text-sm">{item.name}</strong>
                  <span className="mt-1 block text-xs leading-5 text-orange-50/42">{item.truth}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {reveal.step >= 3 && verdict && (
          <section className="mt-5 rounded-[1.5rem] border border-orange-100/10 bg-[#100806]/90 p-5">
            <span className="text-[10px] font-black uppercase tracking-[.22em] text-orange-300/50">
              Twój akt oskarżenia
            </span>
            <div className="mt-4 grid gap-3">
              <MiniTheory label="Sprawca">
                {verdict.suspect?.characterName ?? "brak"} · {verdict.suspectCorrect ? "trafiony" : "nietrafiony"}
              </MiniTheory>
              <MiniTheory label="Motyw">
                {verdict.motiveLabel} · {verdict.motiveCorrect ? "trafiony" : "nietrafiony"}
              </MiniTheory>
              <MiniTheory label="Wybrany dowód">
                {verdict.evidenceNo} · {verdict.evidenceTitle}
              </MiniTheory>
            </div>
          </section>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-orange-50/35">
            Kolejny fragment ujawnienia uruchamia prowadzący.
          </span>
          <button
            type="button"
            onClick={onShowDossier}
            className="rounded-xl border border-orange-100/10 bg-white/[.035] px-4 py-3 text-xs font-black text-orange-50/70"
          >
            MOJE AKTA
          </button>
        </div>

        {error && <ErrorBox message={error} />}
      </div>
    </main>
  );
}

function PlayerReconstructionView({
  data,
  busy,
  error,
  onShowDossier,
  onSubmit,
}: {
  data: PlayerState;
  busy: boolean;
  error: string;
  onShowDossier: () => void;
  onSubmit: (payload: {
    eventOrder: string[];
    suspectPlayerId: string;
    motiveKey: string;
    coverupKey: string;
  }) => Promise<boolean>;
}) {
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [suspectPlayerId, setSuspectPlayerId] = useState("");
  const [motiveKey, setMotiveKey] = useState("");
  const [coverupKey, setCoverupKey] = useState("");
  const eventByKey = useMemo(
    () => new Map(data.reconstructionEvents.map((item) => [item.key, item])),
    [data.reconstructionEvents],
  );

  const resultPhase = data.room.phase === "rekonstrukcja_wynik";
  const submitted = Boolean(data.reconstruction?.submitted);

  function toggleEvent(key: string) {
    setSelectedEvents((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }
      if (current.length >= 7) return current;
      return [...current, key];
    });
  }

  function moveEvent(index: number, direction: -1 | 1) {
    setSelectedEvents((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function submit() {
    if (
      selectedEvents.length !== 7 ||
      !suspectPlayerId ||
      !motiveKey ||
      !coverupKey
    ) {
      return;
    }

    await onSubmit({
      eventOrder: selectedEvents,
      suspectPlayerId,
      motiveKey,
      coverupKey,
    });
  }

  if (submitted || resultPhase) {
    const suspect = data.cast.find(
      (item) => item.playerId === data.reconstruction?.suspect_player_id,
    );
    const motive = data.motiveOptions.find(
      (item) => item.key === data.reconstruction?.motive_key,
    );
    const coverup = data.coverupOptions.find(
      (item) => item.key === data.reconstruction?.coverup_key,
    );

    return (
      <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
        <Backdrop />
        <div className="relative mx-auto max-w-2xl px-5 py-8">
          <TopBar code={data.room.code} label="REKONSTRUKCJA NOCY" />
          <section className="mt-6 rounded-[2rem] border border-emerald-300/15 bg-[#0d120d]/95 p-6 text-center shadow-2xl sm:p-8">
            <span className="text-[10px] font-black uppercase tracking-[.28em] text-emerald-300">
              TEORIA ZAPISANA
            </span>
            <h1 className="mt-3 font-serif text-4xl font-black">
              {resultPhase ? "Wspólna teoria jest już na ekranie." : "Czekamy na pozostałych."}
            </h1>
            <p className="mt-4 text-sm leading-7 text-orange-50/55">
              Twoja rekonstrukcja pozostaje tajna do momentu, w którym prowadzący pokaże zbiorczy wynik.
            </p>

            {data.reconstruction && (
              <div className="mt-6 grid gap-3 text-left">
                <MiniTheory label="Podejrzany">
                  {suspect
                    ? `${suspect.characterName}, ${suspect.displayName}`
                    : "zapisano"}
                </MiniTheory>
                <MiniTheory label="Motyw">
                  {motive?.label ?? "zapisano"}
                </MiniTheory>
                <MiniTheory label="Upozorowanie">
                  {coverup?.label ?? "zapisano"}
                </MiniTheory>
              </div>
            )}

            <button
              type="button"
              onClick={onShowDossier}
              className="mt-6 rounded-xl border border-orange-100/10 bg-white/[.035] px-5 py-3 text-xs font-black text-orange-50/70"
            >
              OTWÓRZ MOJE AKTA
            </button>
          </section>
          {error && <ErrorBox message={error} />}
        </div>
      </main>
    );
  }

  const ready =
    selectedEvents.length === 7 &&
    Boolean(suspectPlayerId) &&
    Boolean(motiveKey) &&
    Boolean(coverupKey);

  return (
    <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
      <Backdrop />
      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <TopBar code={data.room.code} label="REKONSTRUKCJA NOCY" />

        <section className="mt-6 rounded-[1.8rem] border border-red-400/15 bg-red-950/15 p-5 sm:p-6">
          <span className="text-[10px] font-black uppercase tracking-[.26em] text-red-300">
            ETAP 05
          </span>
          <h1 className="mt-2 font-serif text-3xl font-black sm:text-4xl">
            Odtwórz 18 najważniejszych minut.
          </h1>
          <p className="mt-3 text-sm leading-6 text-orange-50/52">
            Spośród 9 wydarzeń wybierz dokładnie 7, które Twoim zdaniem naprawdę należą do przebiegu nocy. Dwa są fałszywymi tropami.
          </p>
        </section>

        <section className="mt-5 rounded-[1.5rem] border border-orange-100/10 bg-[#120907]/95 p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300/55">
              Twoja kolejność
            </span>
            <b className={selectedEvents.length === 7 ? "text-emerald-300" : "text-orange-100/40"}>
              {selectedEvents.length}/7
            </b>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="mt-4 text-sm text-orange-50/35">
              Wybieraj wydarzenia poniżej. Kolejność wyboru możesz później zmienić.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {selectedEvents.map((key, index) => {
                const event = eventByKey.get(key);
                if (!event) return null;

                return (
                  <div
                    key={key}
                    className="grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-xl border border-orange-100/8 bg-white/[.025] p-3"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-red-950/40 text-sm font-black text-red-200">
                      {index + 1}
                    </span>
                    <div>
                      <strong className="block text-sm">{event.title}</strong>
                      <span className="mt-1 block text-[11px] leading-4 text-orange-50/35">
                        {event.copy}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveEvent(index, -1)}
                        className="h-7 w-8 rounded-md border border-orange-100/10 text-xs disabled:opacity-20"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === selectedEvents.length - 1}
                        onClick={() => moveEvent(index, 1)}
                        className="h-7 w-8 rounded-md border border-orange-100/10 text-xs disabled:opacity-20"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-5">
          <span className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300/55">
            Wszystkie wydarzenia
          </span>
          <div className="mt-3 grid gap-3">
            {data.reconstructionEvents.map((event) => {
              const selectedIndex = selectedEvents.indexOf(event.key);
              const selected = selectedIndex >= 0;
              const blocked = !selected && selectedEvents.length >= 7;

              return (
                <button
                  key={event.key}
                  type="button"
                  disabled={blocked}
                  onClick={() => toggleEvent(event.key)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-red-400/35 bg-red-950/25"
                      : "border-orange-100/10 bg-white/[.025]"
                  } disabled:opacity-35`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <strong className="text-sm">{event.title}</strong>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${
                      selected
                        ? "bg-red-500/15 text-red-200"
                        : "bg-white/[.04] text-orange-50/30"
                    }`}>
                      {selected ? `#${selectedIndex + 1}` : "WYBIERZ"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-orange-50/40">{event.copy}</p>
                </button>
              );
            })}
          </div>
        </section>

        <ChoiceSection label="Kto jest najbardziej podejrzany?">
          <div className="grid gap-2 sm:grid-cols-2">
            {data.cast.map((member) => (
              <button
                key={member.playerId}
                type="button"
                onClick={() => setSuspectPlayerId(member.playerId)}
                className={`rounded-xl border p-3 text-left ${
                  suspectPlayerId === member.playerId
                    ? "border-red-400/35 bg-red-950/25"
                    : "border-orange-100/10 bg-white/[.025]"
                }`}
              >
                <strong className="block text-sm">{member.characterName}</strong>
                <span className="mt-1 block text-[11px] text-orange-50/35">
                  {member.characterLabel} · {member.displayName}
                </span>
              </button>
            ))}
          </div>
        </ChoiceSection>

        <ChoiceSection label="Jaki był główny motyw?">
          <div className="grid gap-2">
            {data.motiveOptions.map((option) => (
              <ChoiceButton
                key={option.key}
                selected={motiveKey === option.key}
                onClick={() => setMotiveKey(option.key)}
              >
                {option.label}
              </ChoiceButton>
            ))}
          </div>
        </ChoiceSection>

        <ChoiceSection label="Co miało najbardziej zafałszować obraz nocy?">
          <div className="grid gap-2">
            {data.coverupOptions.map((option) => (
              <ChoiceButton
                key={option.key}
                selected={coverupKey === option.key}
                onClick={() => setCoverupKey(option.key)}
              >
                {option.label}
              </ChoiceButton>
            ))}
          </div>
        </ChoiceSection>

        {error && <ErrorBox message={error} />}

        <div className="sticky bottom-3 mt-6 rounded-2xl border border-orange-100/10 bg-[#100806]/95 p-3 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => void submit()}
            className="w-full rounded-xl bg-gradient-to-r from-red-700 to-orange-600 px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            {busy ? "ZAPISUJĘ…" : "ZATWIERDŹ REKONSTRUKCJĘ"}
          </button>
        </div>
      </div>
    </main>
  );
}

function PlayerPublicEvidence({
  data,
  error,
  onShowDossier,
}: {
  data: PlayerState;
  error: string;
  onShowDossier: () => void;
}) {
  const interrogation = data.room.phase === "przesluchania_a";
  const evidenceBStage = isEvidenceBPhase(data.room.phase);
  const visibleEvidence = evidenceBStage
    ? data.evidence.filter((item) => item.no.startsWith("B-"))
    : data.evidence;

  return (
    <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
      <Backdrop />
      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <TopBar
          code={data.room.code}
          label={
            interrogation
              ? "PRZESŁUCHANIA"
              : evidenceBStage
                ? "PACZKA DOWODOWA B"
                : "PACZKA DOWODOWA A"
          }
        />

        {interrogation && (
          <section className="mt-6 rounded-[1.5rem] border border-red-400/15 bg-red-950/20 p-5">
            <span className="text-[10px] font-black uppercase tracking-[.24em] text-red-300">
              PRZESŁUCHANIA
            </span>
            <h1 className="mt-2 text-2xl font-black">Prowadzący będzie teraz zadawał bardziej precyzyjne pytania.</h1>
            <p className="mt-2 text-sm leading-6 text-orange-50/50">
              Odpowiadaj zgodnie ze swoją postacią. Możesz zatajać sekret i blefować, ale nie dopisuj nowych faktów sprzecznych z aktami.
            </p>
          </section>
        )}

        {evidenceBStage && (
          <section className="mt-6 rounded-[1.25rem] border border-orange-100/10 bg-white/[.025] p-4 text-xs leading-5 text-orange-50/45">
            Paczka A nadal pozostaje częścią śledztwa. Poniżej widzisz nowe dowody z Paczki B.
          </section>
        )}

        <EvidenceCards evidence={visibleEvidence} compact />

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onShowDossier}
            className="rounded-xl border border-orange-100/10 bg-white/[.035] px-5 py-3 text-xs font-black text-orange-50/70"
          >
            OTWÓRZ MOJE AKTA
          </button>
        </div>

        {error && <ErrorBox message={error} />}
      </div>
    </main>
  );
}

function DossierView({
  data,
  error,
  publicStage,
  onHide,
}: {
  data: PlayerState;
  error: string;
  publicStage: boolean;
  onHide: () => void;
}) {
  const role = data.roleCard;
  const statements = data.room.phase === "pierwsze_zeznania";

  return (
    <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
      <Backdrop />
      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <TopBar code={data.room.code} label="TWOJE AKTA" />

        <section
          className={`mt-6 overflow-hidden rounded-[2rem] border shadow-[0_30px_90px_rgba(0,0,0,.55)] ${
            role.isCulprit
              ? "border-red-500/30 bg-[#190706]"
              : "border-orange-200/12 bg-[#130a08]"
          }`}
        >
          <div className="border-b border-orange-100/10 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[.28em] text-orange-300/55">
                  Twoja postać
                </span>
                <h1 className="mt-2 font-serif text-4xl font-black tracking-[-.035em] sm:text-5xl">
                  {role.name}
                </h1>
                <p className="mt-2 text-sm font-bold uppercase tracking-[.12em] text-orange-200/55">
                  {role.shortLabel}
                </p>
              </div>
              <span
                className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase tracking-[.2em] ${
                  role.isCulprit
                    ? "rotate-[2deg] border-red-400/50 bg-red-500/10 text-red-200"
                    : "border-emerald-300/20 bg-emerald-300/8 text-emerald-200"
                }`}
              >
                {role.isCulprit ? "JESTEŚ SPRAWCĄ" : "NIE JESTEŚ SPRAWCĄ"}
              </span>
            </div>
            <p className="mt-5 text-base leading-7 text-orange-50/68">{role.publicBio}</p>
          </div>

          {role.isCulprit && role.culpritBriefing && (
            <div className="border-b border-red-400/15 bg-red-950/30 p-6 sm:p-8">
              <span className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
                Najważniejsza informacja
              </span>
              <p className="mt-3 text-sm font-bold leading-7 text-red-50/85">
                {role.culpritBriefing}
              </p>
            </div>
          )}

          <div className="grid gap-0 md:grid-cols-2">
            <DossierSection label="Twój sekret" strong>
              <p>{role.privateSecret}</p>
            </DossierSection>
            <DossierSection label="Twój cel">
              <p>{role.objective}</p>
            </DossierSection>
          </div>

          <DossierSection label="Co wiesz">
            <ul className="space-y-3">
              {role.privateKnowledge.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/70" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </DossierSection>

          <DossierSection label="Twoja oś czasu">
            <div className="space-y-3">
              {role.timeline.map((item) => {
                const [time, ...rest] = item.split(",");
                return (
                  <div key={item} className="grid grid-cols-[58px_1fr] gap-3">
                    <strong className="text-orange-300/70">{time}</strong>
                    <span>{rest.join(",").trim()}</span>
                  </div>
                );
              })}
            </div>
          </DossierSection>

          <DossierSection label={statements ? "Powiedz teraz" : "Twoja wersja na pierwsze zeznania"}>
            <p className="font-bold text-orange-50/80">{role.openingStatement}</p>
          </DossierSection>
        </section>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="rounded-xl border border-orange-100/10 bg-white/[.025] p-4 text-xs leading-5 text-orange-50/45">
            Możesz przemilczać swoje sekrety i blefować, ale nie wymyślaj nowych faktów sprzecznych z kartą postaci.
          </div>
          <button
            type="button"
            onClick={onHide}
            className="rounded-xl border border-orange-100/10 bg-black/30 px-5 py-3 text-xs font-black text-orange-50/70"
          >
            {publicStage ? "WRÓĆ DO ŚLEDZTWA" : "UKRYJ AKTA"}
          </button>
        </div>

        {error && <ErrorBox message={error} />}
      </div>
    </main>
  );
}

function EvidenceStage({
  evidence,
  eyebrow,
  title,
  lead,
}: {
  evidence: Evidence[];
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <>
      <section className="rounded-[1.8rem] border border-orange-100/10 bg-[#120907]/95 p-6 shadow-2xl sm:p-8">
        <span className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
          {eyebrow}
        </span>
        <h1 className="mt-3 max-w-4xl font-serif text-4xl font-black tracking-[-.035em] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/55">
          {lead}
        </p>
      </section>
      <EvidenceCards evidence={evidence} />
    </>
  );
}

function EvidenceCards({
  evidence,
  compact = false,
}: {
  evidence: Evidence[];
  compact?: boolean;
}) {
  const latestId = evidence.at(-1)?.id;

  return (
    <div className={`mt-6 grid gap-4 ${compact ? "" : "lg:grid-cols-2"}`}>
      {evidence.map((item) => {
        const latest = item.id === latestId;
        return (
          <article
            key={item.id}
            className={`relative overflow-hidden rounded-[1.5rem] border p-5 sm:p-6 ${
              latest
                ? "border-red-400/25 bg-red-950/20 shadow-[0_20px_65px_rgba(127,29,29,.16)]"
                : "border-orange-100/10 bg-[#100806]/90"
            }`}
          >
            {latest && evidence.length > 1 && (
              <span className="absolute right-4 top-4 rounded-full border border-red-400/20 bg-red-500/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.18em] text-red-200">
                nowy
              </span>
            )}
            <span className="text-[9px] font-black uppercase tracking-[.24em] text-orange-300/50">
              DOWÓD {item.no}
            </span>
            <h2 className="mt-2 pr-14 text-2xl font-black">{item.title}</h2>
            <p className="mt-1 text-xs font-bold text-orange-100/35">
              {item.source}{item.time ? ` · ${item.time}` : ""}
            </p>
            <p className="mt-4 text-sm leading-7 text-orange-50/67">{item.summary}</p>

            <div className="mt-4 space-y-2">
              {item.details.map((detail) => (
                <div
                  key={detail}
                  className="flex gap-3 rounded-xl border border-orange-100/7 bg-black/15 p-3 text-xs leading-5 text-orange-50/52"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300/50" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-l-2 border-red-500/45 pl-4 text-sm font-bold leading-6 text-orange-100/62">
              {item.question}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Roster({ progress }: { progress: HostProgress[] }) {
  return (
    <div className="rounded-[1.8rem] border border-orange-100/10 bg-[#0d0807]/95 p-5 sm:p-6">
      <span className="text-[10px] font-black uppercase tracking-[.26em] text-orange-300/55">
        Uczestnicy
      </span>
      <div className="mt-4 space-y-2">
        {progress.map((player) => (
          <div
            key={player.player_id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-orange-100/8 bg-white/[.025] p-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/30 text-xl">
                {AVATARS[player.avatar] ?? "●"}
              </span>
              <strong className="truncate text-sm text-orange-50/85">
                {player.display_name}
              </strong>
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-[.14em] ${
                player.dossier_opened ? "text-emerald-300" : "text-orange-100/30"
              }`}
            >
              {player.dossier_opened ? "akta otwarte" : "czeka"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HostShell({
  code,
  label,
  children,
}: {
  code: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
      <Backdrop />
      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <TopBar code={code} label={label} />
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

function DossierSection({
  label,
  strong = false,
  children,
}: {
  label: string;
  strong?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`border-b border-orange-100/8 p-6 sm:p-8 ${
        strong ? "bg-orange-950/15" : ""
      }`}
    >
      <span className="text-[10px] font-black uppercase tracking-[.26em] text-orange-300/55">
        {label}
      </span>
      <div className="mt-3 text-sm leading-7 text-orange-50/62">{children}</div>
    </section>
  );
}

function TheoryCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-orange-100/10 bg-[#100806]/90 p-5">
      <span className="text-[9px] font-black uppercase tracking-[.2em] text-orange-300/50">
        {label}
      </span>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MiniTheory({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-orange-100/8 bg-white/[.025] p-3">
      <span className="text-[9px] font-black uppercase tracking-[.18em] text-orange-300/45">
        {label}
      </span>
      <strong className="mt-1 block text-sm text-orange-50/78">{children}</strong>
    </div>
  );
}

function ChoiceSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-5 rounded-[1.5rem] border border-orange-100/10 bg-[#100806]/90 p-5">
      <span className="text-[10px] font-black uppercase tracking-[.24em] text-orange-300/55">
        {label}
      </span>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left text-sm font-bold transition ${
        selected
          ? "border-red-400/35 bg-red-950/25 text-orange-50"
          : "border-orange-100/10 bg-white/[.025] text-orange-50/60"
      }`}
    >
      {children}
    </button>
  );
}

function PrimaryButton({
  disabled,
  onClick,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="shrink-0 rounded-xl bg-gradient-to-r from-red-700 to-orange-600 px-5 py-3 text-sm font-black text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function TopBar({ code, label }: { code: string; label: string }) {
  return (
    <header className="flex items-center justify-between gap-4 rounded-2xl border border-orange-100/10 bg-[#100806]/90 px-4 py-3 backdrop-blur-xl sm:px-5">
      <div>
        <span className="text-[9px] font-black uppercase tracking-[.25em] text-red-300">
          AKTA NOCY
        </span>
        <strong className="mt-1 block text-sm">{label}</strong>
      </div>
      <div className="text-right">
        <small className="block text-[8px] font-black uppercase tracking-[.2em] text-orange-100/35">
          KOD POKOJU
        </small>
        <b className="text-lg tracking-[.18em]">{code}</b>
      </div>
    </header>
  );
}

function Backdrop() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(194,65,12,.18),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(127,29,29,.16),transparent_27%),radial-gradient(circle_at_50%_100%,rgba(120,53,15,.11),transparent_32%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[.11] [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:42px_42px]" />
    </>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-xl border border-red-400/20 bg-red-950/25 p-3 text-sm font-bold text-red-200">
      {message}
    </div>
  );
}
