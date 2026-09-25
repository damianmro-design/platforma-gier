"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import GameMediaPicker from "@/components/game-media-picker";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";
import { gameMediaUrl } from "@/lib/zagraj-media";

type CatalogRow = { slug: string; published: { title: string } };

export default function AdminMediaPage() {
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [slug, setSlug] = useState("");
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data: { session } } = await createPartyPlayAuthClient().auth.getSession();
        if (!session?.access_token) throw new Error("Zaloguj się na konto administratora.");
        const response = await fetch("/api/admin/catalog", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error(data.error ?? "Brak dostępu do katalogu.");
        if (!live) return;
        setRows(data as CatalogRow[]);
        setSlug(data[0]?.slug ?? "");
        setStatus("ready");
      } catch (cause) {
        if (live) {
          setError(cause instanceof Error ? cause.message : "Nie można wczytać biblioteki.");
          setStatus("error");
        }
      }
    })();
    return () => { live = false; };
  }, []);

  return <main className="min-h-screen bg-[#050713] px-5 pb-24 text-white sm:px-8">
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-white/10 py-7">
        <Link href="/admin" className="text-xs font-bold text-violet-300">← Panel administratora</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-widest text-violet-300">zaGRAj CMS</p>
        <h1 className="mt-2 text-4xl font-black">Biblioteka mediów</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Dodaj i przeglądaj grafiki poszczególnych gier. Wybór grafiki do opublikowania odbywa się w edytorze danej gry.</p>
      </header>
      {status === "loading" && <p className="mt-8 text-zinc-300">Wczytuję katalog…</p>}
      {status === "error" && <p role="alert" className="mt-8 rounded-xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
      {status === "ready" && <section className="mt-7 rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7">
        <label className="block text-xs font-bold text-zinc-300">Wybierz grę
          <select value={slug} onChange={(event)=>{setSlug(event.target.value);setSelected("");}}
            className="mt-2 w-full rounded-xl border border-white/15 bg-[#090d1d] px-4 py-3 text-sm">
            {rows.map((row)=><option key={row.slug} value={row.slug}>{row.published.title}</option>)}
          </select>
        </label>
        {slug && <div className="mt-7">
          <GameMediaPicker key={slug} slug={slug} selectedPath={selected} onSelect={setSelected} title="Grafiki gry"/>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
            <p className="text-xs text-zinc-400">{selected && gameMediaUrl(selected) ? "Grafika przesłana. Przejdź do edytora, aby przypisać ją do karty lub sekcji." : "Dodane pliki pozostają w bibliotece i mogą zostać ponownie użyte."}</p>
            <Link href="/admin/gry" className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-black">Otwórz edytor gry ↗</Link>
          </div>
        </div>}
      </section>}
    </div>
  </main>;
}
