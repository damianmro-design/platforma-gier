import GamePageCmsSections from "@/components/game-page-cms-sections";
import type { Metadata } from "next";
import Link from "next/link";
import { createRoom, joinRoom } from "../../room-actions";

export const metadata: Metadata = {
  title: "VA BANQUE — zaGRAj",
  description:
    "Quiz imprezowy z licytacją, ryzykiem i przejmowaniem pytań. 2–8 graczy, każdy na swoim telefonie.",
};

type PageProps = {
  searchParams?: Promise<{ roomError?: string; code?: string }>;
};

const rules = [
  ["01", "Poznaj kategorię", "Najpierw widzisz tylko kategorię. Pytanie pozostaje ukryte do końca licytacji."],
  ["02", "Zalicytuj albo spasuj", "W zwykłej rundzie stawiasz maksymalnie 50% kapitału. PAS oznacza stawkę 0 pkt. Nie możesz stracić ostatnich 100 pkt przed finałem."],
  ["03", "Odpowiedz za swoją stawkę", "Najwyższa oferta przejmuje pytanie. Dobra odpowiedź dodaje stawkę, zła odejmuje ją od kapitału."],
  ["04", "Poluj na błąd", "Po złej odpowiedzi pierwszy z pozostałych graczy może przejąć pytanie. Ryzyko to zwykle połowa poprzedniej stawki, minimum 50 pkt i nigdy więcej niż posiadany kapitał."],
  ["05", "Rozstrzygnij remis", "Jeśli najwyższe oferty są równe, tylko remisujący podbijają albo pasują. Gdy nadal nie ma rozstrzygnięcia, wybiera serwer."],
  ["06", "Zagraj finał", "Każdy prywatnie stawia od 0 do 100% swojego kapitału, a potem wszyscy odpowiadają na to samo finałowe pytanie."],
];

export const dynamic = "force-dynamic";

export default async function VaBanquePage({ searchParams }: PageProps) {
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
    <main className="min-h-screen overflow-hidden bg-[#100906] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(251,191,36,.25),transparent_30%),radial-gradient(circle_at_88%_36%,rgba(234,88,12,.14),transparent_28%),linear-gradient(180deg,#100906,#080403)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[.08] [background-image:linear-gradient(rgba(255,220,160,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,220,160,.1)_1px,transparent_1px)] [background-size:44px_44px]" />

      <header className="relative z-10 border-b border-amber-200/8 bg-[#0c0705]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center" aria-label="Wróć do zaGRAj">
            <img src="/zagraj-logo.webp" alt="zaGRAj" className="h-9 w-auto" />
          </Link>
          <Link
            href="/#gry"
            className="rounded-xl border border-amber-200/10 bg-amber-200/[.04] px-4 py-2.5 text-xs font-black text-amber-100/70 transition hover:bg-amber-200/[.08]"
          >
            ← Wszystkie gry
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-11 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-20">
        <div>
          <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/[.08] px-3 py-2 text-[10px] font-black uppercase tracking-[.24em] text-amber-200">
            QUIZ · LICYTACJA · RYZYKO
          </span>
          <h1 className="mt-6 text-6xl font-black leading-[.82] tracking-[-.075em] sm:text-7xl lg:text-8xl">
            VA
            <span className="block bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400 bg-clip-text text-transparent">
              BANQUE
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-amber-50/65">
            Licytuj kategorie, przejmuj pytania i decyduj, ile jesteś gotów postawić.
            Wiedza to dopiero połowa gry.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-black">
            {["👥 2–8 graczy", "⏱ 30–45 min", "📱 każdy na telefonie", "◆ 2 000 pkt na start", "⚡ bez prowadzącego"].map(
              (item) => (
                <span key={item} className="rounded-full border border-amber-200/10 bg-black/20 px-3 py-2 text-amber-50/65">
                  {item}
                </span>
              ),
            )}
          </div>

          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            <form action={createRoom} className="rounded-2xl border border-amber-300/16 bg-amber-300/[.055] p-4">
              <input type="hidden" name="gameSlug" value="va-banque" />
              <span className="text-[9px] font-black uppercase tracking-[.18em] text-amber-200">NOWY STÓŁ</span>
              <h2 className="mt-1 text-base font-black">Utwórz grę</h2>
              <p className="mt-1 text-xs leading-5 text-amber-50/60">
                Dostaniesz kod pokoju. Pozostali wpisują go na swoich telefonach.
              </p>
              <button
                type="submit"
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-orange-400 px-5 py-3.5 text-sm font-black text-[#261205] shadow-[0_18px_55px_rgba(251,191,36,.15)] transition hover:brightness-110"
              >
                Utwórz grę →
              </button>
            </form>

            <form
              id="dolacz"
              action={joinRoom}
              className="rounded-2xl border border-orange-300/12 bg-orange-300/[.04] p-4"
            >
              <input type="hidden" name="returnPath" value="/gry/va-banque" />
              <span className="text-[9px] font-black uppercase tracking-[.18em] text-orange-200">MASZ KOD?</span>
              <h2 className="mt-1 text-base font-black">Dołącz do gry</h2>
              <p className="mt-1 text-xs leading-5 text-amber-50/60">
                Wpisz kod wyświetlony osobie, która utworzyła pokój.
              </p>
              <label htmlFor="vb-room-code" className="sr-only">Kod pokoju</label>
              <input
                id="vb-room-code"
                name="roomCode"
                maxLength={6}
                required
                autoComplete="off"
                placeholder="AB12CD"
                defaultValue={params.code ?? ""}
                className="mt-4 w-full rounded-xl border border-amber-200/12 bg-black/25 px-4 py-3.5 text-center text-2xl font-black uppercase tracking-[.34em] text-white outline-none placeholder:text-amber-100/15 focus:border-amber-300/45 focus:ring-4 focus:ring-amber-300/10"
              />
              <button
                type="submit"
                className="mt-2 w-full rounded-xl border border-orange-200/18 bg-orange-300/[.08] px-5 py-3.5 text-sm font-black text-orange-50 transition hover:bg-orange-300/[.12]"
              >
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
          <div className="absolute -inset-10 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2.2rem] border border-amber-200/14 bg-[#170d08]/95 p-5 shadow-[0_35px_100px_rgba(0,0,0,.55)]">
            <div className="relative min-h-[470px] overflow-hidden rounded-[1.8rem] border border-amber-200/10 bg-[radial-gradient(circle_at_50%_15%,rgba(251,191,36,.2),transparent_30%),linear-gradient(145deg,#281407,#160b07_55%,#090403)] p-6">
              <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-amber-300/[.06]" />
              <div className="absolute -bottom-20 -left-14 h-60 w-60 rounded-full border border-orange-300/10" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="rounded-full border border-amber-200/12 bg-black/25 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-amber-200">
                  KATEGORIA · GEOGRAFIA
                </span>
                <span className="rounded-full border border-amber-200/12 bg-amber-300/[.08] px-3 py-2 text-[10px] font-black text-amber-100">
                  2 000 pkt
                </span>
              </div>

              <div className="relative z-10 mt-12 text-center">
                <p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-300/55">ILE RYZYKUJESZ?</p>
                <h2 className="mt-3 text-4xl font-black tracking-[-.055em]">Pytania jeszcze nie znasz.</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-amber-50/60">
                  Oceniasz kategorię, własną wiedzę i przeciwników.
                </p>
              </div>

              <div className="relative z-10 mt-8 grid grid-cols-2 gap-3">
                {["100", "300", "500", "MAX 1 000"].map((value, index) => (
                  <div
                    key={value}
                    className={
                      "rounded-2xl border px-4 py-4 text-center text-xl font-black " +
                      (index === 2
                        ? "border-amber-200/45 bg-amber-300 text-[#261205] shadow-[0_12px_35px_rgba(251,191,36,.13)]"
                        : "border-amber-200/10 bg-black/20 text-amber-100")
                    }
                  >
                    {value}
                  </div>
                ))}
              </div>

              <div className="relative z-10 mt-5 rounded-2xl border border-orange-300/15 bg-orange-400/[.06] p-4 text-center">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-orange-200">PAMIĘTAJ</p>
                <p className="mt-1 text-sm font-black">W finale limit znika. Możesz zagrać VA BANQUE.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="zasady" className="relative z-10 border-y border-amber-200/8 bg-amber-100/[.015]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <span className="text-[10px] font-black uppercase tracking-[.24em] text-amber-300">6 PROSTYCH ZASAD</span>
          <h2 className="mt-2 max-w-3xl text-4xl font-black tracking-[-.055em] sm:text-5xl">
            Nie wygrywa ten, kto wie wszystko. Wygrywa ten, kto najlepiej wie, kiedy ryzykować.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rules.map(([no, title, copy]) => (
              <article key={no} className="rounded-3xl border border-amber-200/9 bg-black/20 p-5">
                <span className="text-xs font-black tracking-[.24em] text-orange-300">{no}</span>
                <h3 className="mt-3 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-amber-50/60">{copy}</p>
              </article>
            ))}
          </div>
          <div className="mt-5 rounded-3xl border border-amber-300/15 bg-gradient-to-r from-amber-300/[.08] to-orange-500/[.04] p-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-amber-300">FINAŁ</p>
            <p className="mt-2 text-xl font-black">Możesz postawić od 0 do 100%. Przycisk VA BANQUE stawia wszystko.</p>
          </div>
        </div>
      </section>

      <GamePageCmsSections slug="va-banque" />
      <footer className="relative z-10 px-5 py-8 text-center text-xs text-amber-50/25">
        VA BANQUE · zaGRAj · 2026
      </footer>
    </main>
  );
}
