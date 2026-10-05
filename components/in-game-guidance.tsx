type Props = {
  now: string;
  who: string;
  where: string;
  next: string;
  compact?: boolean;
};

const items = [
  ["TERAZ", "now"],
  ["KTO", "who"],
  ["GDZIE", "where"],
  ["NASTĘPNIE", "next"],
] as const;

export default function InGameGuidance({ now, who, where, next, compact = false }: Props) {
  const values = { now, who, where, next };

  return (
    <section
      aria-label="Co robić teraz"
      className={
        "overflow-hidden rounded-2xl border border-white/10 bg-black/25 shadow-[0_16px_50px_rgba(0,0,0,.18)] backdrop-blur-sm " +
        (compact ? "" : "mb-3")
      }
    >
      <div className="grid gap-px bg-white/8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([label, key]) => (
          <div key={key} className="bg-[#08090b]/92 px-3.5 py-3">
            <span className="block text-[8px] font-black uppercase tracking-[.18em] text-cyan-300/65">
              {label}
            </span>
            <strong className="mt-1 block text-[11px] leading-4 text-zinc-100">
              {values[key]}
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
