import type { Metadata } from "next";
import Link from "next/link";
import { AKTA_NOCY_CASES, AKTA_NOCY_PHASES } from "@/lib/akta-nocy";
import {
  OSTATNI_KURS_CASE,
  OSTATNI_KURS_PHASES,
} from "@/lib/akta-nocy-ostatni-kurs";
import { createRoom } from "../../room-actions";
import TestGameButton from "@/components/test-game-button";
import AktaNocyCoverArtwork from "@/components/akta-nocy-cover-artwork";
import {
  OstatniKursCover,
  OstatniKursTrainMap,
} from "@/components/akta-nocy-ostatni-kurs-artwork";

export const metadata: Metadata = {
  title: "Akta Nocy — zaGRAj",
  description:
    "Interaktywna gra śledcza: fikcyjne sprawy, tajne role, dowody, rekonstrukcje i tryb z prowadzącym lub bez.",
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

        <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-14 pt-10 sm:px-8 sm:pt-12 lg:grid-cols-[1.02fr_.98fr] lg:items-start lg:gap-12 lg:pb-20 lg:pt-12">
          <div className="lg:pt-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-950/40 px-3 py-2 text-[10px] font-black uppercase tracking-[.24em] text-orange-200">
              <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_14px_rgba(248,113,113,.8)]" />
              Interaktywne śledztwo · gotowe do gry
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
              {["👥 5–12 graczy", "⏱ 75–115 min", "🔎 dedukcja", "🎭 tajne role", "📁 różne sprawy", "🤖 tryb bez prowadzącego"].map((item) => (
                <span key={item} className="rounded-full border border-orange-100/10 bg-black/20 px-3 py-2">
                  {item}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#sprawy"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-red-700 to-orange-600 px-6 py-4 text-sm font-black text-white shadow-[0_18px_55px_rgba(153,27,27,.22)] transition hover:brightness-110 sm:w-auto"
              >
                Wybierz sprawę
              </a>
              <a
                href="#jak-to-dziala"
                className="inline-flex items-center justify-center rounded-2xl border border-orange-100/12 bg-white/[.035] px-6 py-4 text-sm font-black text-orange-50/80 transition hover:bg-white/[.07]"
              >
                Jak to działa
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-10 rounded-full bg-red-900/20 blur-3xl" />
            <div className="relative rotate-[1.3deg] rounded-[1.75rem] border border-orange-200/15 bg-[#1a0b08]/95 p-5 shadow-[0_36px_100px_rgba(0,0,0,.65)] sm:p-7">
              <AktaNocyCoverArtwork className="mb-5" />
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
                    <strong className="mt-1 block text-orange-50/85">Gotowa</strong>
                  </div>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[repeating-linear-gradient(90deg,rgba(251,146,60,.35)_0_18px,transparent_18px_30px)] opacity-55" />
            </div>
          </div>
        </section>

        <section id="sprawy" className="border-y border-orange-100/8 bg-[#090707]">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[.28em] text-orange-300/65">
                Wybierz sprawę
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-5xl">
                Każda noc opowiada inną historię
              </h2>
              <p className="mt-4 text-sm leading-7 text-orange-50/50">
                Sprawy korzystają z tego samego systemu prywatnych akt, ale mają
                własne role, dowody, mechaniki i rozwiązania. Nie trzeba nic drukować.
              </p>
            </div>

            <div className="mt-10 grid gap-6 xl:grid-cols-2">
              <article className="rounded-[2rem] border border-orange-200/12 bg-[#140b08] p-5 shadow-[0_24px_70px_rgba(0,0,0,.35)] sm:p-7">
                <AktaNocyCoverArtwork />
                <div className="mt-6">
                  <span className="text-[9px] font-black uppercase tracking-[.24em] text-red-300">SPRAWA #001</span>
                  <h3 className="mt-2 font-serif text-3xl font-black">Apartament 214</h3>
                  <p className="mt-3 text-sm leading-7 text-orange-50/50">
                    Hotel, zaginiony pendrive, luka monitoringu i wiadomość wysłana po śmierci.
                    Klasyczne śledztwo prowadzone przez jedną osobę.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black">
                    <span className="rounded-full border border-white/10 px-3 py-2">5–12 osób</span>
                    <span className="rounded-full border border-white/10 px-3 py-2">75–105 min</span>
                    <span className="rounded-full border border-white/10 px-3 py-2">z prowadzącym</span>
                  </div>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <form action={createRoom}>
                      <input type="hidden" name="gameSlug" value="akta-nocy" />
                      <input type="hidden" name="aktaCase" value="apartament-214" />
                      <input type="hidden" name="aktaMode" value="host" />
                      <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-red-700 to-orange-600 px-5 py-3.5 text-xs font-black text-white">
                        UTWÓRZ POKÓJ
                      </button>
                    </form>
                    <TestGameButton gameSlug="akta-nocy" aktaCase="apartament-214" aktaMode="host" label="Test #001" />
                  </div>
                </div>
              </article>

              <article className="rounded-[2rem] border border-slate-300/12 bg-[#07101a] p-5 shadow-[0_24px_70px_rgba(0,0,0,.4)] sm:p-7">
                <OstatniKursCover />
                <div className="mt-6">
                  <span className="text-[9px] font-black uppercase tracking-[.24em] text-amber-300/70">SPRAWA #002 · NOWA</span>
                  <h3 className="mt-2 font-serif text-3xl font-black">Ostatni Kurs</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    Pasażer znika z nocnego pociągu. Telefon i bagaż zostają w przedziale,
                    a głównym narzędziem dedukcji staje się interaktywna mapa składu.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-black text-slate-300">
                    <span className="rounded-full border border-white/10 px-3 py-2">5–12 osób</span>
                    <span className="rounded-full border border-white/10 px-3 py-2">85–115 min</span>
                    <span className="rounded-full border border-white/10 px-3 py-2">z prowadzącym lub bez</span>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <form action={createRoom}>
                      <input type="hidden" name="gameSlug" value="akta-nocy" />
                      <input type="hidden" name="aktaCase" value="ostatni-kurs" />
                      <input type="hidden" name="aktaMode" value="host" />
                      <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-red-800 to-amber-700 px-5 py-3.5 text-xs font-black text-white">
                        Z PROWADZĄCYM
                      </button>
                    </form>
                    <form action={createRoom}>
                      <input type="hidden" name="gameSlug" value="akta-nocy" />
                      <input type="hidden" name="aktaCase" value="ostatni-kurs" />
                      <input type="hidden" name="aktaMode" value="auto" />
                      <button type="submit" className="w-full rounded-xl border border-amber-300/20 bg-amber-300/[.07] px-5 py-3.5 text-xs font-black text-amber-100">
                        BEZ PROWADZĄCEGO
                      </button>
                    </form>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <TestGameButton gameSlug="akta-nocy" aktaCase="ostatni-kurs" aktaMode="host" label="Test z prowadzącym" />
                    <TestGameButton gameSlug="akta-nocy" aktaCase="ostatni-kurs" aktaMode="auto" label="Test bez prowadzącego" />
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="jak-to-dziala" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-4">
            {[
              ["1", "Każdy ma telefon", "Prywatne akta, sekrety i odpowiedzi nigdy nie muszą być drukowane."],
              ["2", "Wybieracie tryb", "W Ostatnim Kursie może prowadzić jedna osoba albo system może prowadzić wszystkich automatycznie."],
              ["3", "Rozmawiacie naprawdę", "Aplikacja daje fakty i pytania, ale śledztwo odbywa się między Wami przy jednym stole."],
              ["4", "Oskarżacie prywatnie", "Na końcu każdy wskazuje osobę, motyw, sposób i kluczowy dowód, zanim prawda zostanie ujawniona."],
            ].map(([no,title,copy])=>(
              <article key={no} className="rounded-2xl border border-orange-100/9 bg-white/[.02] p-5">
                <span className="text-2xl font-black text-red-300/70">{no}</span>
                <h3 className="mt-3 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-orange-50/45">{copy}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-emerald-300/10 bg-emerald-300/[.035] p-5 text-sm leading-7 text-orange-50/55">
            <strong className="text-orange-50">Czego potrzebujecie:</strong> 5–12 osób i po jednym telefonie na gracza.
            Wspólny ekran jest opcjonalny. Nie trzeba nic drukować ani instalować.
          </div>
        </section>

        <section id="sprawa-002" className="border-y border-slate-200/8 bg-[#060b11]">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:py-20">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.28em] text-amber-300/70">Sprawa #002</p>
              <h2 className="mt-3 font-serif text-4xl font-black sm:text-5xl">Ostatni Kurs</h2>
              <p className="mt-3 text-sm text-slate-500">{OSTATNI_KURS_CASE.train}</p>
              <p className="mt-5 text-base leading-7 text-slate-300">{OSTATNI_KURS_CASE.premise}</p>
              <p className="mt-5 border-l-2 border-red-500/55 pl-5 font-serif text-lg italic text-slate-400">„{OSTATNI_KURS_CASE.hook}”</p>
            </div>
            <div>
              <OstatniKursTrainMap />
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
              W trybie z prowadzącym jedna osoba steruje etapami. W trybie automatycznym
              gracze klikają „Gotowy”, a system sam odsłania kolejne części śledztwa.
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
          <div className="mt-14">
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-amber-300/65">Ostatni Kurs · 11 etapów</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {OSTATNI_KURS_PHASES.map((phase) => (
                <article key={phase.no} className="rounded-2xl border border-slate-200/9 bg-[#08101a] p-5">
                  <span className="text-[10px] font-black tracking-[.28em] text-amber-300/70">{phase.no}</span>
                  <h3 className="mt-2 text-lg font-black text-slate-100">{phase.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{phase.copy}</p>
                </article>
              ))}
            </div>
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
              Sprawa #001
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-.045em] sm:text-4xl">
              Pełne śledztwo od tajnych akt do finałowego ujawnienia.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-orange-50/50">
              Pokój obsługuje 5–12 graczy bez drużyn. Role są przydzielane
              automatycznie, akta pozostają prywatne, a prowadzący odsłania
              kolejne dowody, przesłuchania, rekonstrukcję, akt oskarżenia
              i finał sprawy.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
