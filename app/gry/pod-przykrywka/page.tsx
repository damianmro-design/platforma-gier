import GamePageCmsSections from "@/components/game-page-cms-sections";
import GamePageCmsIntro from "@/components/game-page-cms-intro";
import { getPublishedPageRules } from "@/lib/zagraj-public-page-rules";
import type { Metadata } from "next";
import Link from "next/link";
import { createRoom } from "../../room-actions";
import TestGameButton from "@/components/test-game-button";

export const metadata: Metadata = {
  title: "Pod Przykrywką — zaGRAj",
  description:
    "Gra dedukcyjna dla 6–14 osób. Agenci znają tajne hasła, a Oszust widzi tylko kategorię i musi blefować.",
};


export const dynamic = "force-dynamic";

export default async function PodPrzykrywkaPage() {
  const flow = await getPublishedPageRules("pod-przykrywka");
  return (
    <main className="min-h-screen overflow-hidden bg-[#041019] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(34,211,238,.20),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(14,116,144,.18),transparent_25%),radial-gradient(circle_at_50%_95%,rgba(59,130,246,.12),transparent_32%)]" />

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
          <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] font-black uppercase tracking-[.24em] text-cyan-200">
            DEDUKCJA I BLEF
          </span>

          <h1 className="mt-6 text-6xl font-black leading-[.84] tracking-[-.075em] sm:text-7xl">
            POD
            <span className="block bg-gradient-to-r from-cyan-200 via-sky-300 to-blue-400 bg-clip-text text-transparent">PRZYKRYWKĄ</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-zinc-400">
            <GamePageCmsIntro slug="pod-przykrywka" />
          </p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-black">
            {["👥 6–14 graczy", "⏱ 45–75 min", "🕵️ 1 Oszust", "📱 telefon każdego gracza", "🎤 wymagany prowadzący"].map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-zinc-300">{item}</span>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <form action={createRoom}>
              <input type="hidden" name="gameSlug" value="pod-przykrywka" />
              <button
                type="submit"
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 px-7 py-4 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(34,211,238,.18)] transition hover:brightness-110 sm:w-auto"
              >
                Utwórz pokój →
              </button>
            </form>
            <a href="#zasady" className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-white/[.04] px-7 py-4 text-sm font-black text-zinc-300">
              Jak gramy?
            </a>
          </div>
          <TestGameButton gameSlug="pod-przykrywka" className="mt-4" />
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-8 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/12 bg-black/30 p-5 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[1.6rem] border border-cyan-300/15 bg-[radial-gradient(circle_at_50%_28%,rgba(34,211,238,.25),transparent_35%),linear-gradient(145deg,#06151e,#07324a_58%,#02070b)] p-6">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-[10px] font-black text-cyan-100">MISJA 3/5</span>
                <span className="text-xs font-black text-cyan-200">6/8 odpowiedzi</span>
              </div>

              <div className="mx-auto mt-10 max-w-sm text-center">
                <div className="mx-auto h-16 w-24 rounded-t-full bg-black/80 shadow-[0_0_48px_rgba(34,211,238,.38)]" />
                <div className="mx-auto -mt-1 h-24 w-28 rounded-[50%_50%_18%_18%] bg-black/90" />
                <div className="mx-auto -mt-[58px] h-2 w-14 rounded-full bg-cyan-300/70" />
                <p className="mt-20 text-[10px] font-black uppercase tracking-[.28em] text-cyan-300">KTO GRA PODWÓJNĄ GRĘ?</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-.05em]">Każda odpowiedź zostawia ślad.</h2>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-2">
                {["🦊 2", "🐼 1", "🦁 3"].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[.04] px-3 py-4 text-center text-sm font-black">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="zasady" className="relative z-10 border-y border-white/8 bg-white/[.018]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="max-w-3xl">
            <span className="text-[10px] font-black uppercase tracking-[.26em] text-cyan-300">PRZEBIEG GRY</span>
            <h2 className="mt-2 text-4xl font-black tracking-[-.055em]">Nie wystarczy mieć rację. Trzeba jeszcze przekonać innych.</h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {flow.map(([no, title, copy]) => (
              <article key={no} className="rounded-2xl border border-white/9 bg-black/20 p-5">
                <span className="text-xs font-black tracking-[.25em] text-cyan-300">{no}</span>
                <h3 className="mt-3 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-7xl gap-5 px-5 py-14 sm:px-8 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-white/9 bg-white/[.025] p-6">
          <span className="text-3xl">🕵️</span>
          <h3 className="mt-4 text-xl font-black">Oszust nie zna hasła</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Widzi tylko kategorię i pytanie. Musi wymyślić odpowiedź, która pasuje do nieznanego hasła. Po punkcie kontrolnym dostaje też tajny rozkaz do dyskusji.</p>
        </article>
        <article className="rounded-3xl border border-white/9 bg-white/[.025] p-6">
          <span className="text-3xl">🎲</span>
          <h3 className="mt-4 text-xl font-black">Reguły potrafią się zmienić</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">3 rundy dostają losowy twist: anonimowe odpowiedzi, głosowanie bez dyskusji albo 30 sekund na gorącym krześle.</p>
        </article>
        <article className="rounded-3xl border border-white/9 bg-white/[.025] p-6">
          <span className="text-3xl">🔎</span>
          <h3 className="mt-4 text-xl font-black">Podejrzenia narastają</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Po każdej misji widzicie poziom podejrzeń. Nie wiecie jednak, kto na kogo głosował.</p>
        </article>
        <article className="rounded-3xl border border-white/9 bg-white/[.025] p-6">
          <span className="text-3xl">🎯</span>
          <h3 className="mt-4 text-xl font-black">Finał z obroną</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">2 najbardziej podejrzane osoby dostają ostatnią szansę przekonania grupy. Dopiero potem otwiera się tajne finałowe głosowanie.</p>
        </article>
      </section>
      <GamePageCmsSections slug="pod-przykrywka" />
    </main>
  );
}
