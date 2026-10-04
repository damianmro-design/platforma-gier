import { getGamePlaySetup } from "@/lib/game-play-setup";

const items = [
  ["👥", "GRACZE", "players"],
  ["🎤", "PROWADZĄCY", "host"],
  ["📺", "WSPÓLNY EKRAN", "screen"],
  ["📱", "TELEFONY", "phones"],
  ["🔒", "PRYWATNE INFORMACJE", "privacy"],
  ["⏱", "CZAS", "time"],
] as const;

export default function GamePlaySetup({ slug }: { slug: string }) {
  const setup = getGamePlaySetup(slug);
  if (!setup) return null;

  return (
    <section
      aria-labelledby={`game-setup-${slug}`}
      className="relative z-10 mx-auto max-w-7xl px-5 pb-14 sm:px-8"
    >
      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/20 shadow-[0_24px_80px_rgba(0,0,0,.18)] backdrop-blur-sm">
        <div className="border-b border-white/8 px-5 py-6 sm:px-7">
          <span className="text-[10px] font-black uppercase tracking-[.24em] text-violet-300">
            ZANIM ZACZNIECIE
          </span>
          <h2 id={`game-setup-${slug}`} className="mt-2 text-3xl font-black tracking-[-.045em] text-white">
            Jak gramy?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Najważniejsze informacje o urządzeniach, rolach i tym, kto steruje rozgrywką.
          </p>
        </div>

        <div className="grid gap-px bg-white/8 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(([icon, label, key]) => (
            <div key={key} className="bg-[#09090b]/92 p-5">
              <div className="flex items-start gap-3">
                <span className="text-xl" aria-hidden="true">{icon}</span>
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-[.18em] text-zinc-500">
                    {label}
                  </span>
                  <strong className="mt-1 block text-sm leading-5 text-zinc-100">
                    {setup[key]}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 border-t border-white/8 px-5 py-6 sm:px-7 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <span className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">
              KTO PROWADZI DALEJ?
            </span>
            <p className="mt-2 text-sm font-black leading-6 text-white">{setup.control}</p>
          </div>
          <div>
            <span className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">
              PRZYGOTOWANIE
            </span>
            <ol className="mt-3 space-y-2">
              {setup.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-6 text-zinc-300">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.04] text-[10px] font-black text-white">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
