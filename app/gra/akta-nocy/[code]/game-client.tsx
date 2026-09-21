"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type HostProgress = {
  player_id: string;
  display_name: string;
  avatar: string;
  dossier_opened: boolean;
};

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
      if (result.role === "player" && result.roleCard?.dossierOpened) {
        setDossierVisible((current) => current || false);
      }
    } catch {
      setError("Nie udało się połączyć z rozgrywką.");
    }
  }, [code]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 1500);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send(action: string) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/gra/akta-nocy/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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
    />
  );
}

function HostView({
  data,
  busy,
  error,
  onAdvance,
}: {
  data: HostState;
  busy: boolean;
  error: string;
  onAdvance: () => void;
}) {
  const opened = data.progress.filter((player) => player.dossier_opened).length;
  const allOpened = data.progress.length >= 5 && opened === data.progress.length;
  const statements = data.room.phase === "pierwsze_zeznania";

  return (
    <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
      <Backdrop />
      <div className="relative mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <TopBar code={data.room.code} label="PANEL PROWADZĄCEGO" />

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
          <div className="rounded-[1.8rem] border border-orange-100/10 bg-[#120907]/95 p-6 shadow-2xl sm:p-8">
            <span className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
              {statements ? "ETAP 01 · PIERWSZE ZEZNANIA" : "ETAP 00 · AKTA OSOBOWE"}
            </span>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-black tracking-[-.035em] sm:text-5xl">
              {statements
                ? "Każdy zna już swoją wersję wydarzeń."
                : "Każdy otrzymał inną postać i prywatne informacje."}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/55">
              {statements
                ? "Poproś uczestników, żeby po kolei przedstawili swoją postać i opowiedzieli, gdzie byli między 22:30 a 23:05. Nie muszą ujawniać swoich sekretów."
                : "Nie pokazuj graczom tego ekranu z bliska. Każdy powinien otworzyć swoje akta na własnym telefonie i przeczytać je w tajemnicy."}
            </p>

            {statements ? (
              <div className="mt-7 rounded-2xl border border-red-400/15 bg-red-950/20 p-5">
                <span className="text-[10px] font-black uppercase tracking-[.24em] text-red-300">
                  Instrukcja prowadzącego
                </span>
                <div className="mt-3 space-y-3 text-sm leading-6 text-orange-50/65">
                  <p>1. Każdy mówi, kim jest jego postać i jaki ma związek z Markiem.</p>
                  <p>2. Każdy opisuje swój przedział czasowy. Inni mogą zadawać krótkie pytania.</p>
                  <p>3. Nie wymagaj ujawnienia prywatnego sekretu. Gracz sam decyduje, co zataja.</p>
                  <p>4. Zwracaj uwagę na sprzeczności, wrócą do nich kolejne dowody.</p>
                </div>
              </div>
            ) : (
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
            )}
          </div>

          <div className="rounded-[1.8rem] border border-orange-100/10 bg-[#0d0807]/95 p-5 sm:p-6">
            <span className="text-[10px] font-black uppercase tracking-[.26em] text-orange-300/55">
              Uczestnicy
            </span>
            <div className="mt-4 space-y-2">
              {data.progress.map((player) => (
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
        </section>

        {error && <ErrorBox message={error} />}

        {!statements && (
          <section className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-red-400/15 bg-red-950/15 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <strong className="block text-lg">Kiedy wszyscy przeczytają akta</strong>
              <span className="mt-1 block text-sm text-orange-50/45">
                Uruchom pierwsze zeznania. Od tej chwili gracze mogą zacząć budować alibi.
              </span>
            </div>
            <button
              type="button"
              disabled={!allOpened || busy}
              onClick={onAdvance}
              className="rounded-xl bg-gradient-to-r from-red-700 to-orange-600 px-5 py-3 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-35"
            >
              {busy ? "CHWILA…" : "ROZPOCZNIJ ZEZNANIA →"}
            </button>
          </section>
        )}

        {statements && (
          <section className="mt-6 rounded-[1.5rem] border border-orange-100/10 bg-white/[.025] p-5 text-sm text-orange-50/45">
            Następny etap będzie ujawniał pierwszą paczkę dowodową. Na razie prowadź dyskusję i pozwól graczom zadawać sobie pytania.
          </section>
        )}
      </div>
    </main>
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
  const role = data.roleCard;
  const statements = data.room.phase === "pierwsze_zeznania";
  const firstOpen = role.dossierOpened;

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

            {statements && firstOpen && (
              <div className="mt-5 rounded-xl border border-orange-100/10 bg-white/[.025] p-4 text-left text-xs leading-5 text-orange-50/55">
                Pierwsze zeznania już trwają. Możesz ponownie otworzyć akta i sprawdzić swoją wersję wydarzeń.
              </div>
            )}

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
    <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
      <Backdrop />
      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <TopBar code={data.room.code} label={statements ? "PIERWSZE ZEZNANIA" : "AKTA OSOBOWE"} />

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

          <DossierSection label={statements ? "Powiedz teraz" : "Gdy zaczną się zeznania"}>
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
            UKRYJ AKTA
          </button>
        </div>

        {error && <ErrorBox message={error} />}
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
  children: React.ReactNode;
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
