import type { Metadata } from "next";
import Link from "next/link";
import { AKTA_NOCY_CASES, AKTA_NOCY_PHASES } from "@/lib/akta-nocy";
import { createRoom } from "../../room-actions";
import TestGameButton from "@/components/test-game-button";

export const metadata: Metadata = {
  title: "Akta Nocy — zaGRAj",
  description:
    "Interaktywna gra śledcza: role, sekrety, dowody, przesłuchania i rekonstrukcja zbrodni.",
};

const firstCase = AKTA_NOCY_CASES[0];

export default function AktaNocyPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#070504] text-[#f8eee2]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(194,65,12,.22),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(127,29,29,.18),transparent_27%),radial-gradient(circle_at_50%_100%,rgba(120,53,15,.13),transparent_32%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[.14] [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="relative z-10">
        <header className="border-b border-orange-100/10 bg-[#070504]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
            <Link href="/" className="flex items-center" aria-label="Wróć do zaGRAj">
              <img src="/zagraj-logo.webp" alt="zaGRAj" className="h-10 w-auto" />
            </Link>
            <Link
              href="/#gry"
              className="rounded-xl border border-orange-100/10 bg-white/[.03] px-4 py-2.5 text-xs font-black text-orange-50/75 transition hover:bg-white/[.07]"
            >
              ← Wszystkie gry
            </Link>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-24 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-950/40 px-3 py-2 text-[10px] font-black uppercase tracking-[.24em] text-orange-200">
              <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_14px_rgba(248,113,113,.8)]" />
              Interaktywne śledztwo · w budowie
            </span>

            <p className="mt-7 text-xs font-black uppercase tracking-[.34em] text-orange-300/65">
              Ściśle tajne
            </p>
            <h1 className="mt-2 font-serif text-6xl font-black leading-[.9] tracking-[-.055em] text-orange-50 sm:text-7xl lg:text-8xl">
              AKTA
              <br />
              NOCY
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-orange-50/62">
              Każdy ma rolę. Każdy ma sekret. Jedna osoba zna prawdę o zbrodni.
              Odtwarzacie noc z zeznań, dokumentów, śladów cyfrowych i kolejnych
              paczek dowodów.
            </p>

            <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-orange-50/70">
              {["👥 5–12 graczy", "⏱ 60–120 min", "🔎 dedukcja", "🎭 tajne role", "📁 fabularna", "🎤 wymagany prowadzący"].map((item) => (
                <span key={item} className="rounded-full border border-orange-100/10 bg-black/20 px-3 py-2">
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <form action={createRoom}>
                <input type="hidden" name="gameSlug" value="akta-nocy" />
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-red-700 to-orange-600 px-6 py-4 text-sm font-black text-white shadow-[0_18px_55px_rgba(153,27,27,.22)] transition hover:brightness-110 sm:w-auto"
                >
                  Utwórz pokój · sprawa #001
                </button>
              </form>
              <a
                href="#przebieg"
                className="inline-flex items-center justify-center rounded-2xl border border-orange-100/12 bg-white/[.035] px-6 py-4 text-sm font-black text-orange-50/80 transition hover:bg-white/[.07]"
              >
                Jak wygląda rozgrywka
              </a>
            </div>
            <TestGameButton gameSlug="akta-nocy" className="mt-4" />
          </div>

          <div className="relative">
            <div className="absolute -inset-10 rounded-full bg-red-900/20 blur-3xl" />
            <div className="relative rotate-[1.3deg] rounded-[1.75rem] border border-orange-200/15 bg-[#1a0b08]/95 p-5 shadow-[0_36px_100px_rgba(0,0,0,.65)] sm:p-7">
              <div className="mb-5 overflow-hidden rounded-2xl border border-orange-200/15 bg-black/35">
                <img
                  src="/akta-nocy/case-cover-v4.webp"
                  alt="Akta sprawy Apartament 214"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <div className="rounded-2xl border border-orange-200/15 bg-[#2a100b] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.34em] text-orange-300/55">
                      Akta sprawy
                    </p>
                    <p className="mt-2 font-serif text-4xl font-black text-orange-100">
                      #{firstCase.number}
                    </p>
                  </div>
                  <span className="rotate-[7deg] rounded-md border-2 border-red-500/60 px-3 py-2 text-xs font-black uppercase tracking-[.16em] text-red-300">
                    poufne
                  </span>
                </div>

                <div className="mt-7 border-y border-orange-100/10 py-5">
                  <p className="text-xs font-black uppercase tracking-[.2em] text-orange-300/50">
                    Tytuł
                  </p>
                  <h2 className="mt-1 font-serif text-3xl font-black">{firstCase.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-orange-50/55">{firstCase.setting}</p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-black/25 p-3">
                    <span className="text-orange-100/35">GRACZE</span>
                    <strong className="mt-1 block text-orange-50/85">{firstCase.players}</strong>
                  </div>
                  <div className="rounded-xl bg-black/25 p-3">
                    <span className="text-orange-100/35">CZAS</span>
                    <strong className="mt-1 block text-orange-50/85">{firstCase.duration}</strong>
                  </div>
                  <div className="rounded-xl bg-black/25 p-3">
                    <span className="text-orange-100/35">POZIOM</span>
                    <strong className="mt-1 block capitalize text-orange-50/85">{firstCase.difficulty}</strong>
                  </div>
                  <div className="rounded-xl bg-black/25 p-3">
                    <span className="text-orange-100/35">STATUS</span>
                    <strong className="mt-1 block text-orange-50/85">Projektowanie</strong>
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[repeating-linear-gradient(90deg,rgba(251,146,60,.35)_0_18px,transparent_18px_30px)] opacity-55" />
            </div>
          </div>
        </section>

        <section id="sprawa-001" className="border-y border-orange-100/8 bg-white/[.018]">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:py-20">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
                Sprawa #{firstCase.number}
              </p>
              <h2 className="mt-3 font-serif text-4xl font-black tracking-[-.04em] sm:text-5xl">
                {firstCase.title}
              </h2>
              <p className="mt-3 text-sm text-orange-50/45">{firstCase.setting}</p>
            </div>

            <div>
              <p className="text-xl font-bold leading-8 text-orange-50/82">{firstCase.premise}</p>
              <p className="mt-5 border-l-2 border-red-500/55 pl-5 text-base italic leading-7 text-orange-100/60">
                „{firstCase.hook}”
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {firstCase.investigationMotifs.map((motif) => (
                  <span
                    key={motif}
                    className="rounded-full border border-orange-100/10 bg-black/20 px-3 py-2 text-xs font-bold text-orange-100/55"
                  >
                    {motif}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="przebieg" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-orange-300/65">
              Przebieg rozgrywki
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-5xl">
              Śledztwo odsłania się warstwa po warstwie
            </h2>
            <p className="mt-4 text-sm leading-7 text-orange-50/50">
              Telefon pokazuje wyłącznie prywatne informacje danej postaci.
              Wspólny ekran prowadzi fabułę, ujawnia dowody i pilnuje kolejności.
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {AKTA_NOCY_PHASES.map((phase) => (
              <article
                key={phase.no}
                className="rounded-2xl border border-orange-100/9 bg-[#100907]/78 p-5"
              >
                <span className="text-[10px] font-black tracking-[.28em] text-red-300/75">
                  {phase.no}
                </span>
                <h3 className="mt-2 text-lg font-black text-orange-50">{phase.title}</h3>
                <p className="mt-2 text-sm leading-6 text-orange-50/45">{phase.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-orange-100/8 bg-[#0c0706]">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:py-20">
            <div className="rounded-[1.75rem] border border-orange-100/10 bg-white/[.025] p-6 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[.26em] text-orange-300/65">
                Skalowanie 5–12 osób
              </p>
              <h2 className="mt-3 text-2xl font-black">Sprawa ma działać niezależnie od wielkości ekipy.</h2>
              <p className="mt-4 text-sm leading-7 text-orange-50/50">
                Rdzeń historii opiera się na 5 kluczowych postaciach. Przy większej
                liczbie graczy dochodzą świadkowie, osoby z pobocznymi sekretami i
                dodatkowe relacje. Jeśli danej postaci nie ma w pokoju, jej
                niezbędny trop przejmuje system i trafia do paczki dowodowej.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-red-400/15 bg-red-950/20 p-6 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[.26em] text-red-300">
                Inspiracja true crime
              </p>
              <h2 className="mt-3 text-2xl font-black">Bierzemy mechanizmy śledcze, nie kopiujemy prawdziwych ofiar.</h2>
              <p className="mt-4 text-sm leading-7 text-orange-50/50">
                Sprawy będą fikcyjne, ale konstruowane z elementów znanych z
                prawdziwych dochodzeń: upozorowanych scen, błędnych alibi,
                logów telefonu, monitoringu, finansów, luk czasowych, świadków
                i dowodów, które na początku znaczą coś innego niż na końcu.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="rounded-[2rem] border border-orange-200/12 bg-[linear-gradient(110deg,rgba(127,29,29,.24),rgba(124,45,18,.16),rgba(0,0,0,.1))] p-7 sm:p-10">
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-red-300">
              Etap 2
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-.045em] sm:text-4xl">
              Lobby bez drużyn i wejście do sprawy są gotowe.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/50">
              Pokój obsługuje 5–12 graczy bez podziału na drużyny. Kolejny krok
              to trwały przydział postaci i prywatne karty roli, a później
              paczki dowodowe, przesłuchania i finałowe oskarżenie.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
