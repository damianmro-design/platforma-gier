import GamePageCmsSections from "@/components/game-page-cms-sections";
import type { Metadata } from "next";
import Link from "next/link";
import { createRoom, joinRoom } from "../../room-actions";

export const metadata: Metadata = {
  title: "SZYFR — zaGRAj",
  description:
    "Kooperacyjna misja dla 2–6 osób. Każdy widzi inne informacje, a zespół musi połączyć tropy i odszyfrować kod.",
};

type PageProps = {
  searchParams?: Promise<{ roomError?: string; code?: string }>;
};

const missions = [
  ["01", "Przechwycona transmisja", "Kody liczbowe, fragmenty wiadomości i pierwszy element klucza."],
  ["02", "Baza danych", "Eliminacja rekordów i mapowanie rozproszonych symboli."],
  ["03", "Sieć kontaktów", "Kolejność zdarzeń, zależności i identyfikacja właściwego kontaktu."],
  ["04", "Klucz dostępu", "Najtrudniejsze relacje między danymi i ostatni fragment finału."],
  ["05", "Kod główny", "Meta-zagadka wykorzystująca cyfry odzyskane w poprzednich misjach."],
];

export const dynamic = "force-dynamic";

export default async function SzyfrPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const joinError =
    params.roomError === "invalid-code"
      ? "Wpisz poprawny kod pokoju (4 lub 6 znaków)."
      : params.roomError === "not-found"
        ? `Nie znaleźliśmy pokoju ${params.code ? `„${params.code}”` : "o takim kodzie"}.`
        : params.roomError === "lookup-failed"
          ? "Nie udało się sprawdzić kodu. Spróbuj ponownie."
          : params.roomError === "create-failed"
            ? "Nie udało się utworzyć pokoju. Spróbuj ponownie."
            : null;

  return (
    <main className="min-h-screen overflow-hidden bg-[#041113] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(45,212,191,.20),transparent_32%),radial-gradient(circle_at_90%_45%,rgba(34,211,238,.11),transparent_28%),linear-gradient(180deg,#041113,#02090c_60%,#020608)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[.13] [background-image:linear-gradient(rgba(94,234,212,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(94,234,212,.12)_1px,transparent_1px)] [background-size:42px_42px]" />

      <header className="relative z-10 border-b border-cyan-200/8 bg-[#031014]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center" aria-label="Wróć do zaGRAj">
            <img src="/zagraj-logo.webp" alt="zaGRAj" className="h-9 w-auto" />
          </Link>
          <Link
            href="/#gry"
            className="rounded-xl border border-cyan-200/10 bg-cyan-200/[.04] px-4 py-2.5 text-xs font-black text-cyan-50/70 transition hover:bg-cyan-200/[.08]"
          >
            ← Wszystkie gry
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-11 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-20">
        <div>
          <span className="inline-flex rounded-full border border-teal-300/20 bg-teal-300/[.08] px-3 py-2 text-[10px] font-black uppercase tracking-[.24em] text-teal-200">
            KOOPERACJA · DEDUKCJA · KOMUNIKACJA
          </span>
          <h1 className="mt-6 text-6xl font-black leading-[.82] tracking-[-.075em] sm:text-7xl lg:text-8xl">
            SZY
            <span className="bg-gradient-to-r from-teal-200 via-cyan-300 to-sky-400 bg-clip-text text-transparent">
              FR
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-cyan-50/65">
            Przechwycono zaszyfrowaną transmisję. System usunie dane, jeśli nie
            odzyskacie klucza. Każdy z Was dostał inną część informacji, więc
            najważniejszym narzędziem jest rozmowa.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-black">
            {["👥 2–6 graczy", "⏱ 30–45 min", "📱 każdy na swoim telefonie", "◈ bez telewizora", "◎ współpraca"].map(
              (item) => (
                <span key={item} className="rounded-full border border-cyan-200/10 bg-black/20 px-3 py-2 text-cyan-50/65">
                  {item}
                </span>
              ),
            )}
          </div>

          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            <form action={createRoom} className="rounded-2xl border border-teal-300/16 bg-teal-300/[.055] p-4">
              <input type="hidden" name="gameSlug" value="szyfr" />
              <span className="text-[9px] font-black uppercase tracking-[.18em] text-teal-200">NOWA OPERACJA</span>
              <h2 className="mt-1 text-base font-black">Utwórz grę</h2>
              <p className="mt-1 text-xs leading-5 text-cyan-50/60">
                Dostaniesz kod pokoju. Każda osoba dołącza na własnym telefonie.
              </p>
              <button
                type="submit"
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-teal-300 via-cyan-300 to-sky-400 px-5 py-3.5 text-sm font-black text-[#032024] shadow-[0_18px_55px_rgba(45,212,191,.15)] transition hover:brightness-110"
              >
                Utwórz operację →
              </button>
            </form>

            <form id="dolacz" action={joinRoom} className="rounded-2xl border border-cyan-300/12 bg-cyan-300/[.04] p-4">
              <input type="hidden" name="returnPath" value="/gry/szyfr" />
              <span className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-200">MASZ KOD?</span>
              <h2 className="mt-1 text-base font-black">Dołącz do operacji</h2>
              <p className="mt-1 text-xs leading-5 text-cyan-50/60">
                Wpisz kod pokoju i dołącz do zespołu.
              </p>
              <label htmlFor="szyfr-room-code" className="sr-only">Kod pokoju</label>
              <input
                id="szyfr-room-code"
                name="roomCode"
                maxLength={6}
                required
                autoComplete="off"
                placeholder="AB12CD"
                defaultValue={params.code ?? ""}
                className="mt-4 w-full rounded-xl border border-cyan-200/12 bg-black/25 px-4 py-3.5 text-center text-2xl font-black uppercase tracking-[.34em] text-white outline-none placeholder:text-cyan-100/15 focus:border-teal-300/45 focus:ring-4 focus:ring-teal-300/10"
              />
              <button type="submit" className="mt-2 w-full rounded-xl border border-cyan-200/18 bg-cyan-300/[.08] px-5 py-3.5 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/[.12]">
                Dołącz →
              </button>
              {joinError && (
                <p className="mt-3 rounded-xl border border-red-300/15 bg-red-400/[.06] px-3 py-2.5 text-xs font-bold leading-5 text-red-200">
                  {joinError}
                </p>
              )}
            </form>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-10 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.2rem] border border-cyan-200/14 bg-[#07191d]/95 p-5 shadow-[0_35px_100px_rgba(0,0,0,.55)]">
            <div className="relative min-h-[470px] overflow-hidden rounded-[1.8rem] border border-cyan-200/10 bg-[radial-gradient(circle_at_50%_10%,rgba(45,212,191,.18),transparent_31%),linear-gradient(145deg,#0b2428,#071519_55%,#030b0e)] p-6">
              <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(45,212,191,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,.18)_1px,transparent_1px)] [background-size:26px_26px]" />
              <div className="relative z-10 flex items-center justify-between">
                <span className="rounded-full border border-teal-200/12 bg-black/25 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-teal-200">
                  TRANSMISJA 07-A
                </span>
                <span className="rounded-full border border-cyan-200/12 bg-cyan-300/[.08] px-3 py-2 text-[10px] font-black text-cyan-100">
                  31:42
                </span>
              </div>
              <div className="relative z-10 mt-10">
                <p className="text-[10px] font-black uppercase tracking-[.28em] text-teal-300/55">TWÓJ PRYWATNY FRAGMENT</p>
                <div className="mt-3 rounded-2xl border border-teal-200/15 bg-black/30 p-5 shadow-[inset_0_0_35px_rgba(45,212,191,.04)]">
                  <p className="font-mono text-lg font-bold leading-8 text-teal-100">
                    „Druga cyfra jest o 3 większa od pierwszej.”
                  </p>
                </div>
                <p className="mt-3 text-xs font-bold leading-5 text-cyan-50/50">
                  Nie pokazuj ekranu innym. Powiedz zespołowi własnymi słowami, co widzisz.
                </p>
              </div>
              <div className="relative z-10 mt-8 grid grid-cols-4 gap-2">
                {["7", "•", "•", "•"].map((value, index) => (
                  <div key={index} className="grid aspect-square place-items-center rounded-2xl border border-cyan-200/10 bg-cyan-200/[.045] text-xl font-black text-cyan-100">
                    {value}
                  </div>
                ))}
              </div>
              <div className="relative z-10 mt-5 rounded-2xl border border-teal-300/12 bg-teal-300/[.05] p-4">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-teal-200">ZASADA OPERACJI</p>
                <p className="mt-1 text-sm font-black">Nikt nie ma całego obrazu. Mówcie, porównujcie i łączcie fakty.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-cyan-200/7 bg-white/[.015]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <span className="text-[10px] font-black uppercase tracking-[.25em] text-teal-300">JAK TO DZIAŁA</span>
          <h2 className="mt-3 text-3xl font-black tracking-[-.045em] sm:text-4xl">Informacja jest rozproszona celowo.</h2>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            {[
              ["01", "Własny telefon", "Każdy widzi inne informacje. Nie pokazujcie sobie ekranów."],
              ["02", "Rozmowa", "Możecie mówić o wszystkim, co widzicie. To jest główny mechanizm gry."],
              ["03", "Wspólna odpowiedź", "Gdy jesteście pewni, dowolny gracz wysyła kod lub wybór dla całej drużyny."],
            ].map(([n, title, copy]) => (
              <div key={n} className="rounded-2xl border border-cyan-200/8 bg-[#061519]/70 p-5">
                <p className="text-[10px] font-black tracking-[.24em] text-teal-300">{n}</p>
                <h3 className="mt-2 text-base font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-cyan-50/50">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[.25em] text-cyan-300">OPERACJA</span>
            <h2 className="mt-3 text-4xl font-black tracking-[-.05em]">4 misje i finał.</h2>
            <p className="mt-4 text-sm leading-7 text-cyan-50/50">
              Przed startem przejdziecie krótki trening. Później macie 40 minut.
              Błędna odpowiedź kosztuje 20 sekund, a podpowiedź 30 sekund.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {missions.map(([n, title, copy], index) => (
              <div key={n} className={`rounded-2xl border border-cyan-200/9 bg-[#061519]/65 p-5 ${index === 4 ? "sm:col-span-2" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-teal-300/15 bg-teal-300/[.06] text-xs font-black text-teal-200">{n}</span>
                  <h3 className="font-black">{title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-cyan-50/50">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-cyan-200/7 px-5 py-8 text-center text-xs text-cyan-50/30">
        <Link href="/">zaGRAj</Link> · SZYFR · 2026
      </footer>
      <GamePageCmsSections slug="szyfr" />
    </main>
  );
}
