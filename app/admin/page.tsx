"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

type Access = {
  authorized: boolean;
  email: string;
  role: string;
  permissions: string[];
  gameSlugs: string[];
};

type Event = {
  id: number;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
};

type Dashboard = {
  staffTotal: number;
  staffByRole: Record<string, number>;
  auditTotal: number;
  recentEvents: Event[];
};

type Staff = {
  userId: string;
  email: string;
  role: string;
  active: boolean;
  permissions: string[];
  gameSlugs: string[];
  createdAt: string;
};

const ROLES = [
  { value: "admin", label: "Administrator" },
  { value: "editor", label: "Redaktor gier" },
  { value: "author", label: "Autor" },
  { value: "moderator", label: "Moderator" },
  { value: "analyst", label: "Analityk" },
  { value: "support", label: "Obsługa użytkowników" },
];

const PERMISSIONS = [
  ["games.read", "Przeglądanie gier"],
  ["games.create", "Tworzenie szkiców"],
  ["games.edit", "Edycja treści i konfiguracji"],
  ["games.publish", "Publikacja (po zatwierdzeniu przez właściciela)"],
  ["games.manage", "Zarządzanie katalogiem"],
  ["media.manage", "Biblioteka mediów"],
  ["users.read", "Podgląd użytkowników"],
  ["users.moderate", "Moderacja"],
  ["analytics.read", "Statystyki"],
  ["progress.manage", "XP i odznaki"],
  ["admin.read", "Podgląd zespołu"],
  ["admin.manage", "Zarządzanie administratorami"],
  ["settings.manage", "Ustawienia platformy"],
  ["audit.read", "Dziennik zmian"],
] as const;

const ROLE_LABELS: Record<string, string> = {
  owner: "Właściciel", admin: "Administrator", editor: "Redaktor gier",
  author: "Autor", moderator: "Moderator", analyst: "Analityk", support: "Obsługa",
};

const EMPTY_FORM = {
  email: "", role: "editor", permissions: ["games.read", "games.create", "games.edit"] as string[],
  gameSlugs: "", active: true,
};

async function api<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Wystąpił błąd.");
  return data as T;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [access, setAccess] = useState<Access | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [status, setStatus] = useState<"loading" | "unauthorized" | "ready">("loading");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async (accessToken: string) => {
    const me = await api<Access>("/api/admin/me", accessToken);
    const [stats, members] = await Promise.all([
      api<Dashboard>("/api/admin/dashboard", accessToken),
      me.role === "owner" ? api<Staff[]>("/api/admin/staff", accessToken) : Promise.resolve([]),
    ]);
    setAccess(me);
    setDashboard(stats);
    setStaff(members);
    setStatus("ready");
  }, []);

  useEffect(() => {
    let active = true;
    const auth = createPartyPlayAuthClient();
    async function init() {
      try {
        const { data: { session } } = await auth.auth.getSession();
        if (!active) return;
        if (!session?.access_token) { setStatus("unauthorized"); return; }
        setToken(session.access_token);
        await load(session.access_token);
      } catch {
        if (active) setStatus("unauthorized");
      }
    }
    void init();
    return () => { active = false; };
  }, [load]);

  async function saveStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || access?.role !== "owner") return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api("/api/admin/staff", token, {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          role: form.role,
          permissions: form.permissions,
          gameSlugs: form.gameSlugs.split(",").map((s) => s.trim()).filter(Boolean),
          active: form.active,
        }),
      });
      setMessage("Uprawnienia zapisane. Zmiana została dodana do dziennika.");
      setForm(EMPTY_FORM);
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać.");
    } finally {
      setSaving(false);
    }
  }

  const panel = "rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6";

  if (status === "loading") {
    return <main className="grid min-h-screen place-items-center bg-[#050713] text-white"><p>Sprawdzam dostęp do panelu…</p></main>;
  }

  if (status === "unauthorized") {
    return <main className="grid min-h-screen place-items-center bg-[#050713] px-5 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[.04] p-8 text-center">
        <p className="text-xs font-black uppercase tracking-[.25em] text-violet-300">zaGRAj / panel administracyjny</p>
        <h1 className="mt-4 text-3xl font-black">Brak dostępu</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">Panel jest dostępny wyłącznie dla uprawnionych kont. Zaloguj się na konto z przyznaną rolą.</p>
        <Link href="/login?next=%2Fadmin" className="mt-6 inline-flex rounded-xl bg-violet-500 px-6 py-3 text-sm font-bold text-white">Przejdź do logowania</Link>
        <div className="mt-4"><Link href="/" className="text-sm text-zinc-400 hover:text-white">Wróć na zaGRAj</Link></div>
      </section>
    </main>;
  }

  return <main className="min-h-screen bg-[#050713] text-white">
    <div className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 py-6">
        <div className="flex items-center gap-4">
          <Link href="/" aria-label="zaGRAj, strona główna"><img src="/zagraj-logo.webp" alt="zaGRAj" className="h-9 w-auto" /></Link>
          <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-violet-200">ADMIN</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-300">
          <span>{access?.email}</span><span className="rounded-full bg-white/10 px-3 py-2 font-bold">{ROLE_LABELS[access?.role ?? ""] ?? access?.role}</span>
          <Link href="/profil" className="text-violet-300 hover:text-white">Profil gracza ↗</Link>
        </div>
      </header>

      <section className="py-10">
        <p className="text-xs font-black uppercase tracking-[.25em] text-violet-300">Centrum zarządzania</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Pulpit administratora</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Zarządzanie zespołem, uprawnieniami oraz edycja kart gier. Właściciel zatwierdza publikację, a kreator mechanik będzie rozwijany etapami.</p>
      </section>

      {message && <p role="status" className="mb-5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</p>}
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className={panel}><p className="text-xs text-zinc-400">Aktywni administratorzy</p><strong className="mt-3 block text-4xl">{dashboard?.staffTotal ?? "—"}</strong></div>
        <div className={panel}><p className="text-xs text-zinc-400">Zarejestrowane działania</p><strong className="mt-3 block text-4xl">{dashboard?.auditTotal ?? "—"}</strong></div>
        <div className={panel}><p className="text-xs text-zinc-400">Tryb publikacji</p><strong className="mt-3 block text-lg">Zatwierdza właściciel</strong></div>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <div className={panel}>
          <h2 className="text-xl font-black">Moduły administracyjne</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Gry i katalog", "Edycja kart ze szkicem i zatwierdzeniem", "OTWÓRZ"],
              ["Kreator gier", "Szablony i bloki mechaniki", "Etap IV"],
              ["Biblioteka mediów", "Grafiki, audio i wideo", "Etap II"],
              ["XP i odznaki", "Tylko osoby z uprawnieniem", "Etap V"],
              ["Statystyki", "Rzeczywiste dane platformy", "Etap V"],
              ["Integracje", "Floor Party i Polowanie", "Etap VI"],
            ].map(([title, description, phase]) =>
              title === "Gry i katalog" ? <Link key={title} href="/admin/gry" className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 transition hover:border-violet-300/70">
                <div className="flex items-start justify-between gap-2"><strong className="text-sm">{title}</strong><span className="whitespace-nowrap text-[10px] text-violet-200">{phase} ↗</span></div>
                <p className="mt-2 text-xs leading-5 text-zinc-400">{description}</p>
              </Link> : <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-2"><strong className="text-sm">{title}</strong><span className="whitespace-nowrap text-[10px] text-violet-300">{phase}</span></div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{description}</p>
              </div>)}
          </div>
        </div>
        <div className={panel}>
          <h2 className="text-xl font-black">Ostatnie działania</h2>
          <div className="mt-5 space-y-3">
            {dashboard?.recentEvents?.length ? dashboard.recentEvents.map((event) =>
              <div className="rounded-xl border border-white/8 bg-black/20 p-3" key={event.id}>
                <p className="text-sm font-semibold">{event.action}</p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(event.createdAt).toLocaleString("pl-PL")}</p>
              </div>) : <p className="text-sm text-zinc-500">Nie ma jeszcze zarejestrowanych działań.</p>}
          </div>
        </div>
      </section>

      {access?.role === "owner" && <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className={panel}>
          <h2 className="text-xl font-black">Zespół i uprawnienia</h2>
          <p className="mt-2 text-sm text-zinc-400">Tylko właściciel może nadawać dostęp. Konto musi być wcześniej zarejestrowane i potwierdzone.</p>
          <div className="mt-5 space-y-3">
            {staff.map((person) =>
              <div key={person.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div><strong className="text-sm">{person.email}</strong><p className="mt-1 text-xs text-zinc-500">{ROLE_LABELS[person.role] ?? person.role} · {person.active ? "aktywny" : "wyłączony"}</p></div>
                {person.role !== "owner" && <button type="button" onClick={() => { setForm({ email: person.email, role: person.role, permissions: person.permissions, gameSlugs: person.gameSlugs.join(", "), active: person.active }); setMessage(""); setError(""); }} className="rounded-xl border border-violet-400/30 px-4 py-2 text-xs font-bold text-violet-200 hover:bg-violet-400/10">Edytuj</button>}
              </div>)}
          </div>
        </div>
        <form className={panel} onSubmit={(event) => void saveStaff(event)}>
          <h2 className="text-xl font-black">Nadaj lub zmień dostęp</h2>
          <label className="mt-5 block text-xs font-bold text-zinc-300">E-mail istniejącego konta</label>
          <input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="osoba@example.com" className="mt-2 w-full rounded-xl border border-white/15 bg-[#090d1d] px-4 py-3 text-sm outline-none focus:border-violet-400" />
          <label className="mt-4 block text-xs font-bold text-zinc-300">Rola</label>
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-2 w-full rounded-xl border border-white/15 bg-[#090d1d] px-4 py-3 text-sm">
            {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <fieldset className="mt-5"><legend className="text-xs font-bold text-zinc-300">Szczegółowe uprawnienia</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{PERMISSIONS.map(([permission, label]) =>
              <label key={permission} className="flex cursor-pointer items-start gap-2 text-xs text-zinc-300">
                <input type="checkbox" checked={form.permissions.includes(permission)} onChange={(event) => setForm({ ...form, permissions: event.target.checked ? [...form.permissions, permission] : form.permissions.filter((v) => v !== permission) })} className="mt-0.5 accent-violet-400" />{label}
              </label>)}</div>
          </fieldset>
          <label className="mt-5 block text-xs font-bold text-zinc-300">Ograniczenie do gier (opcjonalne)</label>
          <input value={form.gameSlugs} onChange={(event) => setForm({ ...form, gameSlugs: event.target.value })} placeholder="np. szyfr, akta-nocy" className="mt-2 w-full rounded-xl border border-white/15 bg-[#090d1d] px-4 py-3 text-sm outline-none focus:border-violet-400" />
          <p className="mt-1 text-[11px] text-zinc-500">Puste pole oznacza brak ograniczenia do konkretnych gier.</p>
          <label className="mt-4 flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="accent-violet-400" /> Dostęp aktywny</label>
          <button disabled={saving} type="submit" className="mt-5 w-full rounded-xl bg-violet-500 px-5 py-3 text-sm font-black transition hover:bg-violet-400 disabled:opacity-50">{saving ? "Zapisuję…" : "Zapisz uprawnienia"}</button>
        </form>
      </section>}
    </div>
  </main>;
}
