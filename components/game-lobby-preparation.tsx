import { getGamePlaySetup } from "@/lib/game-play-setup";

type Props = {
  slug: string;
  aktaMode?: "host" | "auto" | null;
  aktaCase?: "apartament-214" | "ostatni-kurs" | null;
};

export default function GameLobbyPreparation({ slug, aktaMode, aktaCase }: Props) {
  const base = getGamePlaySetup(slug);
  if (!base) return null;

  const host =
    slug === "akta-nocy"
      ? aktaMode === "auto"
        ? "Bez prowadzącego, kolejne etapy prowadzi system"
        : "Prowadzący steruje kolejnymi etapami"
      : base.host;

  const screen =
    slug === "akta-nocy" && aktaCase === "ostatni-kurs" && aktaMode === "auto"
      ? "Wspólny ekran nie jest wymagany"
      : base.screen;

  return (
    <section className="mb-4 rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
      <div className="mb-4">
        <span className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">
          PRZYGOTUJCIE GRĘ
        </span>
        <h2 className="mt-1 text-lg font-black text-white">Zanim wszyscy klikną „Gotowy”</h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <small className="block text-[8px] font-black uppercase tracking-[.16em] text-zinc-500">PROWADZENIE</small>
          <strong className="mt-1 block text-xs leading-5 text-zinc-100">{host}</strong>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <small className="block text-[8px] font-black uppercase tracking-[.16em] text-zinc-500">EKRAN</small>
          <strong className="mt-1 block text-xs leading-5 text-zinc-100">{screen}</strong>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/20 p-3">
          <small className="block text-[8px] font-black uppercase tracking-[.16em] text-zinc-500">TELEFONY</small>
          <strong className="mt-1 block text-xs leading-5 text-zinc-100">{base.phones}</strong>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[.035] px-4 py-3">
        <small className="block text-[8px] font-black uppercase tracking-[.16em] text-cyan-300/70">WAŻNE</small>
        <p className="mt-1 text-xs font-bold leading-5 text-zinc-300">{base.privacy}</p>
      </div>
    </section>
  );
}
