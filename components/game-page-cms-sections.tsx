import type { CatalogPageSection } from "@/lib/zagraj-catalog-defaults";
import { getPublishedGameCard } from "@/lib/zagraj-public-catalog-server";
import { gameMediaUrl } from "@/lib/zagraj-media";
import GamePageCatalogRefresh from "@/components/game-page-catalog-refresh";

// A public, server-rendered block area. It never reads draft data or runs administrator input as code.
export default async function GamePageCmsSections({ slug }: { slug: string }) {
  const card = await getPublishedGameCard(slug);
  const sections: CatalogPageSection[] = Array.isArray(card?.pageSections)
    ? card.pageSections.filter((section) =>
        section && typeof section.title === "string" &&
        ["info", "notice", "steps"].includes(section.kind)
      )
    : [];

  return (
    <>
    <GamePageCatalogRefresh />
    {sections.length > 0 && <section aria-label="Informacje o grze" className="relative z-10 mx-auto max-w-7xl px-5 py-12 text-white sm:px-8 lg:py-16">
      <div className="mb-7">
        <p className="text-[10px] font-black uppercase tracking-[.25em] text-violet-300">Dodatkowe informacje</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Warto wiedzieć przed grą</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => {
          const ListTag = section.kind === "steps" ? "ol" : "ul";
          return <article key={section.id}
            className={`rounded-3xl border p-6 sm:p-7 ${section.kind === "notice"
              ? "border-amber-300/20 bg-amber-300/[.055]"
              : "border-white/10 bg-white/[.035]"}`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">
              {section.kind === "steps" ? "Krok po kroku" : section.kind === "notice" ? "Ważna informacja" : "Informacja"}
            </p>
            <h3 className="mt-3 text-xl font-black tracking-tight">{section.title}</h3>
            {gameMediaUrl(section.imagePath) && <img src={gameMediaUrl(section.imagePath)!} alt={section.title} loading="lazy" className="mt-4 aspect-video w-full rounded-2xl object-cover"/>}
            {section.body && <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-300">{section.body}</p>}
            {!!section.bullets?.length && <ListTag className={`mt-4 space-y-2 pl-5 text-sm leading-6 text-zinc-300 ${section.kind === "steps" ? "list-decimal" : "list-disc"}`}>
              {section.bullets.map((line,index)=><li key={index}>{line}</li>)}
            </ListTag>}
          </article>;
        })}
      </div>
    </section>}
    </>
  );
}
