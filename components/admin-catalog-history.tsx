"use client";

import { useEffect, useState } from "react";
import { gameMediaUrl } from "@/lib/zagraj-media";
import type { CatalogGame } from "@/lib/zagraj-catalog-defaults";

type Snapshot = { revision: number; publishedAt: string; payload: CatalogGame };
type Props = {
  slug: string;
  token: string;
  currentRevision: number;
  draftState: string;
  isOwner: boolean;
  pendingChanges: boolean;
  disabled: boolean;
  onRestored: () => Promise<void>;
};

export default function AdminCatalogHistory({
  slug, token, currentRevision, draftState, isOwner, pendingChanges, disabled, onRestored,
}: Props) {
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setNotice(""); setHistory([]); setSelected(null);
    async function load() {
      try {
        const response = await fetch(`/api/admin/catalog/history?slug=${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal,
        });
        const data: unknown = await response.json();
        if (!response.ok) {
          const detail = data && typeof data === "object" && "error" in data ? String(data.error) : "Nie można wczytać historii.";
          throw new Error(detail);
        }
        if (!Array.isArray(data)) throw new Error("Nieprawidłowe dane historii.");
        if (!controller.signal.aborted) {
          setHistory(data as Snapshot[]);
          setSelected((data as Snapshot[])[0]?.revision ?? null);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Błąd historii.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [slug, token, currentRevision]);

  const snapshot = history.find((entry) => entry.revision === selected);
  const canRestore = isOwner && !disabled && !pendingChanges && !restoring;

  async function restore() {
    if (!snapshot || !canRestore) return;
    const existing = draftState !== "published" ?
      "Obecny szkic lub projekt oczekujący na publikację zostanie zastąpiony. " : "";
    if (!window.confirm(`${existing}Przywrócić opublikowaną wersję ${snapshot.revision} jako NOWY SZKIC? Publiczna strona nie zmieni się do czasu osobnej publikacji przez właściciela.`)) return;
    setError(""); setNotice(""); setRestoring(true);
    try {
      const response = await fetch("/api/admin/catalog/history", {
        method: "POST", cache: "no-store",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ slug, publishedRevision: snapshot.revision, expectedRevision: currentRevision }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const detail = result && typeof result === "object" && "error" in result ? String(result.error) : "Przywracanie nie powiodło się.";
        throw new Error(detail);
      }
      await onRestored();
      setNotice(`Wersja ${snapshot.revision} została skopiowana do szkicu. Sprawdź ją i prześlij do zatwierdzenia. Publiczna wersja pozostała bez zmian.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Przywracanie nie powiodło się.");
    } finally { setRestoring(false); }
  }

  return <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-lg font-black">Historia opublikowanych wersji</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-400">Podgląd archiwalnych kart i sekcji. Przywrócenie tworzy szkic, nie zmienia od razu strony głównej.</p>
      </div>
      <span className="rounded-full bg-white/10 px-3 py-2 text-xs text-zinc-300">{history.length} wersji</span>
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs text-red-200">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-200">{notice}</p>}
    {loading ? <p className="mt-4 text-xs text-zinc-400">Wczytuję historię…</p> : <>
      <div className="mt-4 flex flex-wrap gap-2">
        {history.map((entry) => <button type="button" key={entry.revision}
          onClick={() => setSelected(entry.revision)}
          aria-pressed={selected === entry.revision}
          className={`rounded-xl border px-3 py-2 text-xs font-bold ${selected === entry.revision ?
            "border-violet-400 bg-violet-500/15 text-white" : "border-white/15 text-zinc-300 hover:border-white/40"}`}>
          Wersja {entry.revision}
        </button>)}
      </div>
      {snapshot ? <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-[11px] text-zinc-400">Publikacja: {new Date(snapshot.publishedAt).toLocaleString("pl-PL")}</p>
        {gameMediaUrl(snapshot.payload.coverPath) && <img
          src={gameMediaUrl(snapshot.payload.coverPath)!}
          alt="Archiwalna grafika karty" className="mt-3 aspect-video w-full max-w-sm rounded-lg object-cover"/>}
        <h4 className="mt-3 text-base font-black">{snapshot.payload.title}</h4>
        <p className="mt-1 text-xs text-violet-300">{snapshot.payload.eyebrow}</p>
        <p className="mt-2 text-xs leading-5 text-zinc-400">{snapshot.payload.description}</p>
        <p className="mt-2 text-[11px] text-zinc-500">Sekcje informacyjne: {snapshot.payload.pageSections?.length ?? 0} · Widoczność: {snapshot.payload.isVisible ? "widoczna" : "ukryta"}</p>
        {isOwner && <div className="mt-4 border-t border-white/10 pt-4">
          <button type="button" disabled={!canRestore} onClick={() => void restore()}
            className="rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-3 text-xs font-black text-amber-200 disabled:opacity-40">
            {restoring ? "Przywracam…" : "Przywróć tę wersję do szkicu"}
          </button>
          {pendingChanges && <p className="mt-2 text-xs text-amber-300">Najpierw zapisz lub odrzuć lokalne zmiany, aby nie utracić swojej pracy.</p>}
        </div>}
      </div> : <p className="mt-4 text-xs text-zinc-500">Brak historii publikacji dla tej gry.</p>}
    </>}
  </section>;
}
