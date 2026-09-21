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

        <section className="mt-6 rounded-[1.5rem] border border-red-400/15 bg-red-950/15 p-5">
          <span className="text-[10px] font-black uppercase tracking-[.24em] text-red-300">
            Następny etap
          </span>
          <h2 className="mt-2 text-xl font-black">Akt oskarżenia</h2>
          <p className="mt-2 text-sm leading-6 text-orange-50/50">
            Za chwilę każdy prywatnie wskaże sprawcę, motyw i najważniejszy dowód. Dopiero po zebraniu oskarżeń odkryjemy prawdziwy przebieg nocy.
          </p>
        </section>
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
}: {
  data: PlayerState;
  busy: boolean;
  error: string;
  dossierVisible: boolean;
  onOpen: () => void;
  onHide: () => void;
  onShow: () => void;
}) {
  const phase = data.room.phase;
  const role = data.roleCard;
  const firstOpen = role.dossierOpened;
  const publicStage =
    phase === "pierwsze_zeznania" ||
    isEvidencePhase(phase) ||
    phase === "przesluchania_a";

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
