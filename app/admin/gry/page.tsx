"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";
import type { CatalogGame } from "@/lib/zagraj-catalog-defaults";

type Row = {
  slug: string; published: CatalogGame; draft: CatalogGame | null;
  draftState: "published" | "draft" | "submitted"; revision: number;
  engineMinPlayers: number; engineMaxPlayers: number; updatedAt: string;
};
type Access = { role: string; permissions: string[] };

const ACCENTS: CatalogGame["accent"][] = ["gold","pink","yellow","cyan","red","violet"];
const ARTS: CatalogGame["art"][] = ["millionaire","floor","people","agent","crime","word","duo","cipher","auction"];
const CATEGORY_OPTIONS = [
  ["funny", "Rozrywkowa"], ["strategic", "Strategiczna"], ["team", "Drużynowa"],
] as const;
const MOOD_OPTIONS = [
  ["laugh", "Śmiech"], ["think", "Myślenie"], ["compete", "Rywalizacja"], ["cooperate", "Współpraca"],
] as const;
const STATUS_OPTIONS = [
  ["hit", "Dostępna"], ["new", "Nowość"], ["soon", "Wkrótce"],
] as const;

async function adminApi<T>(path: string, token: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body ? "POST" : "GET", cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Błąd komunikacji z panelem.");
  return data as T;
}

export default function AdminCatalogPage() {
  const [token, setToken] = useState("");
  const [access, setAccess] = useState<Access | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [form, setForm] = useState<CatalogGame | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (accessToken: string, keepSelection?: string) => {
    const [me, result] = await Promise.all([
      adminApi<Access>("/api/admin/me", accessToken),
      adminApi<Row[]>("/api/admin/catalog", accessToken),
    ]);
    setAccess(me);
    setRows(result);
    const match = result.find((item) => item.slug === keepSelection) ?? result[0];
    setSelectedSlug(match?.slug ?? "");
    setForm(match ? structuredClone(match.draft ?? match.published) : null);
    setPending(false);
  }, []);

  useEffect(() => {
    let live = true;
    async function init() {
      try {
        const { data: { session } } = await createPartyPlayAuthClient().auth.getSession();
        if (!session?.access_token) throw new Error("Zaloguj się na uprawnione konto.");
        if (!live) return;
        setToken(session.access_token);
        await load(session.access_token);
      } catch (e) {
        if (live) { setError(e instanceof Error ? e.message : "Brak dostępu."); setPending(false); }
      }
    }
    void init();
    return () => { live = false; };
  }, [load]);

  const chosen = rows.find((r) => r.slug === selectedSlug);
  const canEdit = access?.role === "owner" || access?.permissions?.includes("games.edit");
  const canPublish = access?.role === "owner";
  const changed = Boolean(form && chosen && JSON.stringify(form) !== JSON.stringify(chosen.draft ?? chosen.published));

  function choose(row: Row) {
    if (changed && !window.confirm("Masz niezapisane zmiany. Przejść do innej gry?")) return;
    setSelectedSlug(row.slug);
    setForm(structuredClone(row.draft ?? row.published));
    setError(""); setNotice("");
  }

  function setField<K extends keyof CatalogGame>(key: K, value: CatalogGame[K]) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  function toggleValue(key: "categories" | "moods", value: string) {
    if (!form) return;
    const existing = form[key] as string[];
    setForm({ ...form, [key]: existing.includes(value) ?
      existing.filter((item) => item !== value) : [...existing, value] });
  }

  async function action(kind: "save" | "submit" | "publish") {
    if (!chosen || !form || !token || busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const data = kind === "save" ? form : undefined;
      await adminApi("/api/admin/catalog", token, {
        action: kind, slug: chosen.slug, expectedRevision: chosen.revision, data,
      });
      await load(token, chosen.slug);
      setNotice(kind === "save" ? "Szkic zapisany. Strona główna jeszcze się nie zmieniła." :
        kind === "submit" ? "Projekt przesłany do zatwierdzenia przez właściciela." :
        "Opublikowano. Karta na stronie głównej została zaktualizowana.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operacja nie powiodła się.");
    } finally { setBusy(false); }
  }

  const field = "mt-1 w-full rounded-xl border border-white/15 bg-[#090d1d] px-3 py-3 text-sm text-white outline-none focus:border-violet-400 disabled:opacity-50";
  const label = "block text-xs font-bold text-zinc-300";

  if (pending) return <main className="grid min-h-screen place-items-center bg-[#050713] text-white">Wczytuję katalog gier…</main>;
  if (!access) return <main className="grid min-h-screen place-items-center bg-[#050713] px-5 text-center text-white"><div>
    <h1 className="text-2xl font-black">Brak dostępu do katalogu</h1>
    <p className="mt-3 text-sm text-red-300">{error}</p>
    <Link href="/admin" className="mt-5 inline-block text-violet-300">Wróć do panelu</Link>
  </div></main>;

  return <main className="min-h-screen bg-[#050713] px-4 pb-24 text-white sm:px-8">
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-6">
        <div>
          <Link href="/admin" className="text-xs font-bold text-violet-300 hover:text-white">← Panel administratora</Link>
          <h1 className="mt-3 text-3xl font-black">Katalog gier</h1>
          <p className="mt-2 text-sm text-zinc-400">Szkic → zatwierdzenie właściciela → publikacja. Trwających gier ta edycja nie zmienia.</p>
        </div>
        <Link href="/" className="text-xs text-zinc-400 hover:text-white">Otwórz stronę główną ↗</Link>
      </header>

      {error && <p role="alert" className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</p>}

      <div className="mt-7 grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-white/10 bg-white/[.03] p-3">
          <h2 className="px-3 pb-3 pt-2 text-xs font-black uppercase tracking-widest text-zinc-400">Obecne gry</h2>
          <div className="space-y-2">
            {rows.map((row) => <button key={row.slug} type="button" onClick={() => choose(row)}
              className={`w-full rounded-xl border p-3 text-left transition ${selectedSlug === row.slug
                ? "border-violet-400/50 bg-violet-500/15" : "border-white/5 bg-black/20 hover:border-white/20"}`}>
              <span className="block text-sm font-black">{row.published.title}</span>
              <span className="mt-1 block text-xs text-zinc-400">{
                row.draftState === "submitted" ? "Oczekuje na zatwierdzenie" :
                row.draftState === "draft" ? "Szkic" : "Opublikowana"
              }</span>
            </button>)}
          </div>
          <p className="mt-4 px-3 text-xs leading-5 text-zinc-500">Tworzenie zupełnie nowych gier uruchomimy w kreatorze. Tutaj edytujesz karty obecnych gier.</p>
        </aside>
        {chosen && form && <section className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-xs text-violet-300">Karta: {chosen.slug}</p><h2 className="mt-1 text-xl font-black">{form.title}</h2></div>
              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold">Wersja {chosen.revision} · {chosen.draftState}</span>
            </div>
            <p className="mt-3 text-xs text-zinc-400">Zmiany tekstu, ustawień katalogu i grafiki z dostępnych motywów. Granice liczby graczy są zabezpieczone zgodnie z aktualną mechaniką gry.</p>
          </div>
          <form className="space-y-5" onSubmit={(event: FormEvent) => { event.preventDefault(); void action("save"); }}>
            <fieldset disabled={!canEdit || busy} className="grid gap-5 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:grid-cols-2">
              <legend className="px-2 text-sm font-black">Teksty</legend>
              <label className={label}>Tytuł
                <input className={field} value={form.title} maxLength={80} required onChange={(e) => setField("title",e.target.value)}/>
              </label>
              <label className={label}>Nadtytuł
                <input className={field} value={form.eyebrow} maxLength={90} required onChange={(e) => setField("eyebrow",e.target.value)}/>
              </label>
              <label className={label+" sm:col-span-2"}>Opis na stronie głównej
                <textarea className={field+" min-h-28"} value={form.description} maxLength={600} required onChange={(e) => setField("description",e.target.value)}/>
              </label>
              <label className={label+" sm:col-span-2"}>Tagi (oddzielone przecinkiem, maks. 8)
                <input className={field} value={form.tags.join(", ")} onChange={(e) => setField("tags",e.target.value.split(",").map(x=>x.trim()).filter(Boolean))}/>
              </label>
            </fieldset>
            <fieldset disabled={!canEdit || busy} className="grid gap-5 rounded-2xl border border-white/10 bg-white/[.03] p-5 sm:grid-cols-2">
              <legend className="px-2 text-sm font-black">Parametry i widoczność</legend>
              {([
                ["minPlayers","Minimalna liczba graczy",chosen.engineMinPlayers,chosen.engineMaxPlayers],
                ["maxPlayers","Maksymalna liczba graczy",chosen.engineMinPlayers,chosen.engineMaxPlayers],
                ["minTime","Czas minimalny (min)",5,240],["maxTime","Czas maksymalny (min)",5,240],
                ["sortOrder","Kolejność na stronie",0,99],
              ] as const).map(([key,text,min,max])=><label key={key} className={label}>{text}
                <input type="number" min={min} max={max} className={field} value={form[key]} onChange={(e) => setField(key,Number(e.target.value))}/>
              </label>)}
              <label className={label}>Status karty
                <select className={field} value={form.status} onChange={(e) => setField("status",e.target.value as CatalogGame["status"])}>
                  {STATUS_OPTIONS.map(([key,value])=><option key={key} value={key}>{value}</option>)}
                </select>
              </label>
              <label className={label}>Kolor akcentu
                <select className={field} value={form.accent} onChange={(e) => setField("accent",e.target.value as CatalogGame["accent"])}>
                  {ACCENTS.map(value=><option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className={label}>Motyw grafiki
                <select className={field} value={form.art} onChange={(e) => setField("art",e.target.value as CatalogGame["art"])}>
                  {ARTS.map(value=><option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-3 text-sm sm:col-span-2">
                <input type="checkbox" checked={form.isVisible} onChange={(e)=>setField("isVisible",e.target.checked)} className="accent-violet-400"/>
                Karta widoczna w katalogu
              </label>
              <fieldset className="sm:col-span-2"><legend className="text-xs font-bold text-zinc-300">Kategorie</legend>
                <div className="mt-2 flex flex-wrap gap-4">{CATEGORY_OPTIONS.map(([key,value])=><label key={key} className="flex items-center gap-2 text-sm text-zinc-300">
                  <input type="checkbox" checked={form.categories.includes(key)} onChange={()=>toggleValue("categories",key)} className="accent-violet-400"/>{value}
                </label>)}</div>
              </fieldset>
              <fieldset className="sm:col-span-2"><legend className="text-xs font-bold text-zinc-300">Klimat</legend>
                <div className="mt-2 flex flex-wrap gap-4">{MOOD_OPTIONS.map(([key,value])=><label key={key} className="flex items-center gap-2 text-sm text-zinc-300">
                  <input type="checkbox" checked={form.moods.includes(key)} onChange={()=>toggleValue("moods",key)} className="accent-violet-400"/>{value}
                </label>)}</div>
              </fieldset>
            </fieldset>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Podgląd treści karty</p>
              <h3 className="mt-3 text-2xl font-black">{form.title}</h3>
              <p className="mt-2 text-xs font-bold uppercase text-violet-300">{form.eyebrow}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{form.description}</p>
              <p className="mt-3 text-xs text-zinc-400">{form.minPlayers}–{form.maxPlayers} graczy · {form.minTime}–{form.maxTime} min</p>
              <p className="mt-2 text-xs text-zinc-500">{form.tags.join(" · ")}</p>
              {!form.isVisible && <p className="mt-3 text-xs text-amber-300">Po publikacji karta będzie ukryta na stronie głównej.</p>}
            </div>
            <div className="flex flex-wrap gap-3">
              {canEdit && <button type="submit" disabled={busy || !changed} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-black disabled:opacity-40">
                {busy ? "Trwa zapisywanie…" : "Zapisz szkic"}
              </button>}
              {canEdit && chosen.draftState === "draft" && !changed && <button type="button" disabled={busy} onClick={()=>void action("submit")} className="rounded-xl border border-cyan-400/35 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-200 disabled:opacity-40">Prześlij do zatwierdzenia</button>}
              {canPublish && chosen.draftState === "submitted" && !changed && <button type="button" disabled={busy} onClick={()=>{ if (window.confirm("Opublikować zatwierdzony szkic? Zmiany staną się widoczne na stronie głównej.")) void action("publish"); }} className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-black disabled:opacity-40">Zatwierdź i opublikuj</button>}
              <button type="button" disabled={busy} onClick={()=>choose(chosen)} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-black text-zinc-300">Odrzuć lokalne zmiany</button>
            </div>
            {changed && <p className="text-xs text-amber-300">Masz niezapisane zmiany. Zapisz je, zanim prześlesz projekt do zatwierdzenia.</p>}
            {chosen.draftState === "submitted" && <p className="text-xs text-cyan-300">Wersja oczekuje na decyzję właściciela. Zmiana pól przywróci status szkicu.</p>}
          </form>
        </section>}
      </div>
    </div>
  </main>;
}
