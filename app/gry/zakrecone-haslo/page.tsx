import type { Metadata } from "next";
import Link from "next/link";
import { createRoom } from "../../room-actions";
import TestGameButton from "@/components/test-game-button";

export const metadata: Metadata = {
  title: "Zakręcone Hasło — zaGRAj",
  description:
    "Szybki teleturniej słowny z kołem ryzyka, literami, punktami i hasłami o rosnącym poziomie trudności.",
};

const rules = [
  ["01", "Zakręć kołem", "Wartość z koła określa punkty za każdą trafioną spółgłoskę. BANKRUT zeruje punkty z rundy, a PAS oddaje kolejkę."],
  ["02", "Wybierz literę", "Trafiona spółgłoska odkrywa wszystkie jej wystąpienia i grasz dalej. Pudło przekazuje ruch następnej osobie."],
  ["03", "Kup samogłoskę", "Za 200 pkt z bieżącej rundy możesz wybrać samogłoskę. Koszt płacisz zawsze, a nietrafiona samogłoska kończy Twoją kolejkę."],
  ["04", "Rozwiąż hasło", "W swojej kolejce możesz podać całe hasło. Poprawna odpowiedź daje 1000 pkt bonusu, błędna oddaje kolejkę."],
];

export default function ZakreconeHasloPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#080512] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(139,92,246,.28),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(236,72,153,.18),transparent_25%),radial-gradient(circle_at_50%_90%,rgba(59,130,246,.16),transparent_32%)]" />

      <header className="relative z-10 border-b border-white/10 bg-black/15 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center" aria-label="Wróć do zaGRAj">
            <img src="/zagraj-logo.webp" alt="zaGRAj" className="h-10 w-auto" />
          </Link>
          <Link href="/#gry" className="rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-xs font-black text-zinc-300">
            ← Wszystkie gry
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1fr_.9fr] lg:items-center lg:pt-20">
        <div>
          <span className="inline-flex rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.24em] text-violet-200">
            LEKKI TELETURNIEJ SŁOWNY
          </span>

          <h1 className="mt-6 text-6xl font-black leading-[.84] tracking-[-.075em] sm:text-7xl">
            ZAKRĘCONE
            <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">HASŁO</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-zinc-400">
            Kręcisz kołem, odkrywasz litery i próbujesz rozwiązać hasło, zanim zrobią to inni.
            6 rund, rosnący poziom trudności i wystarczająco dużo ryzyka, żeby prowadzenie mogło zniknąć w jednej chwili.
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-black">
            {["👥 3–12 graczy", "⏱ 20–35 min", "🏆 każdy gra na siebie", "🧠 6 haseł", "🤖 bez prowadzącego"].map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-zinc-300">{item}</span>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <form action={createRoom}>
              <input type="hidden" name="gameSlug" value="zakrecone-haslo" />
              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-7 py-4 text-sm font-black shadow-[0_18px_55px_rgba(139,92,246,.3)] transition hover:brightness-110 sm:w-auto"
              >
                Utwórz pokój →
              </button>
            </form>
            <a href="#zasady" className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[.04] px-7 py-4 text-sm font-black text-zinc-300">
              Jak gramy?
            </a>
          </div>
          <TestGameButton gameSlug="zakrecone-haslo" className="mt-4" />
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-8 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/12 bg-black/30 p-5 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[1.6rem] border border-violet-300/15 bg-[radial-gradient(circle_at_50%_30%,rgba(167,139,250,.32),transparent_38%),linear-gradient(145deg,#190b35,#43157a_58%,#111827)] p-6">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black text-violet-800">FILMY</span>
                <span className="text-xs font-black text-violet-200">RUNDA 4/6</span>
              </div>

              <div className="mt-8 rounded-2xl border border-white/12 bg-black/25 p-5 text-center">
                <p className="text-[11px] font-black uppercase tracking-[.25em] text-violet-200">HASŁO</p>
                <p className="mt-3 font-mono text-3xl font-black tracking-[.14em] text-white sm:text-4xl">
                  □□□□ □□□□□□□
                </p>
              </div>

              <div className="mx-auto mt-6 grid aspect-square max-w-[310px] place-items-center rounded-full border-[14px] border-white/10 bg-[conic-gradient(from_-10deg,#8b5cf6_0_20deg,#ec4899_20deg_40deg,#22d3ee_40deg_60deg,#f59e0b_60deg_80deg,#7c3aed_80deg_100deg,#10b981_100deg_120deg,#e11d48_120deg_140deg,#3b82f6_140deg_160deg,#a855f7_160deg_180deg,#f97316_180deg_200deg,#06b6d4_200deg_220deg,#8b5cf6_220deg_240deg,#ec4899_240deg_260deg,#22c55e_260deg_280deg,#f59e0b_280deg_300deg,#7c3aed_300deg_320deg,#ef4444_320deg_340deg,#3b82f6_340deg_360deg)] shadow-[0_20px_60px_rgba(0,0,0,.45)]">
                <div className="grid h-24 w-24 place-items-center rounded-full border-8 border-white/15 bg-[#120a25] text-center shadow-xl">
                  <span className="text-[10px] font-black text-violet-300">WYNIK</span>
                  <strong className="text-2xl font-black">500</strong>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[10px] font-black">
                <span className="rounded-xl bg-white/8 px-2 py-3">500</span>
                <span className="rounded-xl bg-red-500/20 px-2 py-3 text-red-200">BANKRUT</span>
                <span className="rounded-xl bg-white/8 px-2 py-3">1000</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="zasady" className="relative z-10 border-y border-white/8 bg-white/[.018]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="max-w-2xl">
            <span className="text-[10px] font-black uppercase tracking-[.26em] text-fuchsia-300">ZASADY</span>
            <h2 className="mt-2 text-4xl font-black tracking-[-.055em]">Proste do wyjaśnienia. Trudniejsze do wygrania.</h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {rules.map(([no, title, copy]) => (
              <article key={no} className="rounded-2xl border border-white/9 bg-black/20 p-5">
                <span className="text-xs font-black tracking-[.25em] text-violet-300">{no}</span>
                <h3 className="mt-3 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-5 px-5 py-14 sm:px-8 lg:grid-cols-3">
        <article className="rounded-3xl border border-white/9 bg-white/[.025] p-6">
          <span className="text-3xl">💥</span>
          <h3 className="mt-4 text-xl font-black">BANKRUT</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Tracisz punkty zdobyte w aktualnym haśle i kolejka przechodzi dalej.</p>
        </article>
        <article className="rounded-3xl border border-white/9 bg-white/[.025] p-6">
          <span className="text-3xl">↪️</span>
          <h3 className="mt-4 text-xl font-black">PAS</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Koło nie daje punktów. Następny gracz od razu przejmuje ruch.</p>
        </article>
        <article className="rounded-3xl border border-white/9 bg-white/[.025] p-6">
          <span className="text-3xl">🔥</span>
          <h3 className="mt-4 text-xl font-black">Rosnąca trudność</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Pierwsze 2 hasła są łatwe, kolejne 2 średnie, a ostatnie 2 najtrudniejsze.</p>
        </article>
      </section>
    </main>
  );
}
