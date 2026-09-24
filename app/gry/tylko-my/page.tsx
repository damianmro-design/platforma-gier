import type { Metadata } from "next";
import Link from "next/link";
import { createRoom, joinRoom } from "../../room-actions";
import TestGameButton from "@/components/test-game-button";

export const metadata: Metadata = {
  title: "TYLKO MY — zaGRAj",
  description:
    "Lekka gra dla 2 osób o przewidywaniu swoich wyborów, zgodności i momentach telepatii.",
};

const rounds = [
  {
    no: "01",
    title: "Na tej samej fali",
    copy: "Oboje odpowiadacie na to samo pytanie. Taki sam wybór daje 1 punkt.",
    accent: "text-pink-200",
  },
  {
    no: "02",
    title: "Czytam Ci w myślach",
    copy: "Jedna osoba odpowiada o sobie, druga próbuje przewidzieć jej wybór. Trafienie daje 2 punkty.",
    accent: "text-cyan-200",
  },
  {
    no: "03",
    title: "Kto z nas?",
    copy: "Wskazujecie: Ty, ja albo oboje. Punkt wpada wtedy, gdy widzicie sytuację tak samo.",
    accent: "text-violet-200",
  },
  {
    no: "04",
    title: "Telepatia",
    copy: "Finałowe pytania są warte 3 punkty. Tutaj jeden wspólny wybór potrafi mocno zmienić wynik.",
    accent: "text-fuchsia-200",
  },
];

type TylkoMyPageProps = {
  searchParams?: Promise<{ roomError?: string; code?: string }>;
};

export default async function TylkoMyPage({ searchParams }: TylkoMyPageProps) {
  const params = (await searchParams) ?? {};
  const joinError =
    params.roomError === "invalid-code"
      ? "Wpisz poprawny kod pokoju (4 lub 6 znaków)."
      : params.roomError === "not-found"
        ? `Nie znaleźliśmy pokoju ${params.code ? `„${params.code}”` : "o takim kodzie"}.`
        : params.roomError === "lookup-failed"
          ? "Nie udało się sprawdzić kodu. Spróbuj ponownie."
          : null;
  return (
    <main className="min-h-screen overflow-hidden bg-[#090611] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_13%_12%,rgba(244,114,182,.24),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(34,211,238,.18),transparent_27%),radial-gradient(circle_at_50%_100%,rgba(139,92,246,.17),transparent_35%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[.13] [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:48px_48px]" />

      <header className="relative z-10 border-b border-white/8 bg-[#090611]/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center" aria-label="Wróć do zaGRAj">
            <img src="/zagraj-logo.webp" alt="zaGRAj" className="h-9 w-auto" />
          </Link>
          <Link
            href="/#gry"
            className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-xs font-black text-zinc-300 transition hover:bg-white/[.08]"
          >
            ← Wszystkie gry
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1fr_.92fr] lg:items-center lg:pt-20">
        <div>
          <span className="inline-flex rounded-full border border-pink-300/20 bg-pink-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.24em] text-pink-100">
            GRA DLA 2 OSÓB
          </span>

          <h1 className="mt-6 text-6xl font-black leading-[.82] tracking-[-.075em] sm:text-7xl lg:text-8xl">
            TYLKO
            <span className="block bg-gradient-to-r from-pink-300 via-violet-200 to-cyan-200 bg-clip-text text-transparent">
              MY
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-zinc-400">
            Jak dobrze potraficie przewidzieć swoje wybory? Odpowiadacie osobno, bez podglądania,
            a gra sprawdza, kiedy naprawdę nadajecie na tej samej fali. Wystarczą 2 telefony,
            nie potrzebujecie telewizora ani wspólnego ekranu.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-black">
            {[
              "👥 dokładnie 2 graczy",
              "⏱ 20–30 min",
              "♡ wspólny wynik",
              "20 pytań z większej puli",
              "📱 tylko 2 telefony",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-zinc-300"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            <form action={createRoom} className="rounded-2xl border border-pink-300/15 bg-pink-300/[.045] p-4">
              <input type="hidden" name="gameSlug" value="tylko-my" />
              <span className="text-[9px] font-black uppercase tracking-[.18em] text-pink-200">
                OSOBA 1
              </span>
              <h3 className="mt-1 text-base font-black">Utwórz nową grę</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Dostaniesz kod, który druga osoba wpisze na swoim telefonie.
              </p>
              <button
                type="submit"
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-pink-500 via-fuchsia-500 to-cyan-400 px-5 py-3.5 text-sm font-black shadow-[0_18px_55px_rgba(236,72,153,.18)] transition hover:brightness-110"
              >
                Utwórz grę →
              </button>
            </form>

            <form
              id="dolacz"
              action={joinRoom}
              className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.04] p-4"
            >
              <input type="hidden" name="returnPath" value="/gry/tylko-my" />
              <span className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">
                OSOBA 2
              </span>
              <h3 className="mt-1 text-base font-black">Dołącz za pomocą kodu</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Wpisz kod wyświetlony na telefonie osoby, która utworzyła pokój.
              </p>

              <label htmlFor="tm-room-code" className="sr-only">Kod pokoju</label>
              <input
                id="tm-room-code"
                name="roomCode"
                maxLength={6}
                required
                autoComplete="off"
                inputMode="text"
                placeholder="AB12CD"
                defaultValue={params.code ?? ""}
                className="mt-4 w-full rounded-xl border border-white/12 bg-black/25 px-4 py-3.5 text-center text-2xl font-black uppercase tracking-[.34em] text-white outline-none transition placeholder:text-zinc-700 focus:border-cyan-300/55 focus:ring-4 focus:ring-cyan-400/10"
              />

              <button
                type="submit"
                className="mt-2 w-full rounded-xl border border-cyan-200/20 bg-cyan-300/[.09] px-5 py-3.5 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/[.14]"
              >
                Dołącz do gry →
              </button>

              {joinError && (
                <p className="mt-3 rounded-xl border border-red-300/15 bg-red-400/[.06] px-3 py-2.5 text-xs font-bold leading-5 text-red-200">
                  {joinError}
                </p>
              )}
            </form>
          </div>

          <a
            href="#zasady"
            className="mt-3 inline-flex text-xs font-black text-zinc-500 transition hover:text-white"
          >
            Jak gramy? ↓
          </a>

          <TestGameButton gameSlug="tylko-my" className="mt-4" />
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-10 rounded-full bg-gradient-to-br from-pink-500/20 via-violet-500/10 to-cyan-400/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.2rem] border border-white/12 bg-[#100b1b]/90 p-5 shadow-[0_34px_100px_rgba(0,0,0,.55)] backdrop-blur-xl">
            <div className="relative min-h-[470px] overflow-hidden rounded-[1.8rem] border border-white/10 bg-[radial-gradient(circle_at_20%_25%,rgba(244,114,182,.32),transparent_28%),radial-gradient(circle_at_82%_70%,rgba(34,211,238,.25),transparent_30%),linear-gradient(145deg,#250b2f,#4c155b_48%,#083344)] p-6">
              <div className="absolute left-[8%] top-[12%] h-44 w-44 rounded-full border border-pink-200/25 bg-pink-300/[.06]" />
              <div className="absolute bottom-[9%] right-[6%] h-44 w-44 rounded-full border border-cyan-200/25 bg-cyan-300/[.06]" />
              <div className="absolute left-1/2 top-1/2 h-60 w-px -translate-x-1/2 -translate-y-1/2 rotate-[28deg] bg-gradient-to-b from-transparent via-white/35 to-transparent" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-pink-100">
                  RUNDA 2 · CZYTAM CI W MYŚLACH
                </span>
                <span className="rounded-full border border-cyan-200/15 bg-cyan-300/[.08] px-3 py-2 text-[10px] font-black text-cyan-100">
                  ♡ 12 pkt
                </span>
              </div>

              <div className="relative z-10 mt-12 text-center">
                <p className="text-[10px] font-black uppercase tracking-[.28em] text-pink-200/80">
                  JAK ODPOWIE DRUGA OSOBA?
                </p>
                <h2 className="mx-auto mt-4 max-w-md text-3xl font-black leading-tight tracking-[-.045em]">
                  Macie nagle wolny dzień bez żadnych obowiązków. Co wygrywa?
                </h2>
              </div>

              <div className="relative z-10 mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  "Nicnierobienie bez wyrzutów",
                  "Mały spontaniczny wypad",
                  "Spotkanie z ludźmi",
                  "Własny projekt albo hobby",
                ].map((label, index) => (
                  <div
                    key={label}
                    className={
                      "rounded-2xl border px-4 py-4 text-sm font-black " +
                      (index === 1
                        ? "border-cyan-200/45 bg-cyan-300/12 text-cyan-50 shadow-[0_0_32px_rgba(34,211,238,.09)]"
                        : "border-white/10 bg-black/18 text-zinc-300")
                    }
                  >
                    <span className="mr-2 text-[10px] text-white/40">0{index + 1}</span>
                    {label}
                  </div>
                ))}
              </div>

              <div className="relative z-10 mt-8 flex items-center justify-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-pink-200/30 bg-pink-300/10 text-xs font-black text-pink-100">
                  JA
                </span>
                <div className="flex items-center gap-2">
                  <span className="h-px w-10 bg-gradient-to-r from-pink-300/20 to-pink-200/80" />
                  <span className="text-xl text-white/70">♡</span>
                  <span className="h-px w-10 bg-gradient-to-r from-cyan-200/80 to-cyan-300/20" />
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-full border border-cyan-200/30 bg-cyan-300/10 text-xs font-black text-cyan-100">
                  TY
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-14 sm:px-8">
        <div className="rounded-[2rem] border border-white/9 bg-white/[.025] p-6 sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.24em] text-cyan-200">JAK TO DZIAŁA</span>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Utwórz pokój", "Jedna osoba uruchamia grę na swoim telefonie."],
              ["02", "Druga osoba wpisuje kod", "Może użyć kodu na stronie TYLKO MY albo wejść gotowym linkiem / QR."],
              ["03", "Odpowiadajcie osobno", "Każde z Was wybiera odpowiedź na własnym ekranie."],
              ["04", "Odkrywajcie wynik", "Po obu odpowiedziach gra sama pokazuje, czy się zgraliście."],
            ].map(([no, title, copy]) => (
              <div key={no} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <span className="text-[10px] font-black tracking-[.2em] text-pink-200">{no}</span>
                <h3 className="mt-2 text-sm font-black">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-zinc-500">{copy}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs font-bold text-zinc-500">
            Działa dla par, przyjaciół, rodzeństwa i każdego duetu, który chce sprawdzić, jak dobrze się zna.
          </p>
        </div>
      </section>

      <section id="zasady" className="relative z-10 border-y border-white/8 bg-white/[.018]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="max-w-3xl">
            <span className="text-[10px] font-black uppercase tracking-[.26em] text-pink-300">
              4 KRÓTKIE RUNDY
            </span>
            <h2 className="mt-2 text-4xl font-black tracking-[-.055em] sm:text-5xl">
              Bez wiedzy encyklopedycznej. Liczy się to, czy się wyczujecie.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-500">
              Każdy odpowiada na swoim ekranie. Odpowiedzi pozostają ukryte do chwili,
              w której oboje zatwierdzicie wybór.
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {rounds.map((round) => (
              <article
                key={round.no}
                className="rounded-3xl border border-white/9 bg-black/20 p-5 shadow-[0_20px_60px_rgba(0,0,0,.18)]"
              >
                <span className={"text-xs font-black tracking-[.25em] " + round.accent}>
                  {round.no}
                </span>
                <h3 className="mt-3 text-xl font-black">{round.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{round.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-3xl border border-pink-300/10 bg-pink-300/[.035] p-6">
            <span className="text-3xl">🙈</span>
            <h3 className="mt-4 text-xl font-black">Bez podglądania</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Najlepsze momenty powstają wtedy, gdy naprawdę odpowiadacie niezależnie.
            </p>
          </article>
          <article className="rounded-3xl border border-violet-300/10 bg-violet-300/[.035] p-6">
            <span className="text-3xl">♡</span>
            <h3 className="mt-4 text-xl font-black">Gracie razem</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Nie ma przegranego. Zbieracie wspólny wynik za trafienia i zgodność.
            </p>
          </article>
          <article className="rounded-3xl border border-cyan-300/10 bg-cyan-300/[.035] p-6">
            <span className="text-3xl">✦</span>
            <h3 className="mt-4 text-xl font-black">Zaskoczenia są częścią gry</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Rozbieżność nie jest błędem. Czasem najlepsza odpowiedź to ta, której się nie spodziewasz.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
