"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

type Status = "loading" | "unauthorized" | "ready";
type SecurityState = {
  currentLevel: string;
  nextLevel: string;
  factors: { id: string; friendly_name?: string }[];
};
type Enrollment = { id: string; qrCode: string; secret: string };
const box = "rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7";

export default function AdminSecurityPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [state, setState] = useState<SecurityState | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshState() {
    const auth = createPartyPlayAuthClient();
    const [levels, factors] = await Promise.all([
      auth.auth.mfa.getAuthenticatorAssuranceLevel(),
      auth.auth.mfa.listFactors(),
    ]);
    if (levels.error) throw new Error(levels.error.message);
    if (factors.error) throw new Error(factors.error.message);
    const verifiedFactors = (factors.data?.totp ?? []).filter((factor) => factor.status === "verified");
    setState({
      currentLevel: levels.data?.currentLevel ?? "aal1",
      nextLevel: levels.data?.nextLevel ?? "aal1",
      factors: verifiedFactors.map(({ id, friendly_name }) => ({ id, friendly_name })),
    });
    setFactorId((old) => verifiedFactors.some((factor) => factor.id === old) ? old : (verifiedFactors[0]?.id ?? ""));
  }

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const auth = createPartyPlayAuthClient();
        const { data: { session } } = await auth.auth.getSession();
        if (!session?.access_token) throw new Error("Zaloguj się, aby uzyskać dostęp do ustawień administracyjnych.");
        const response = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("To konto nie ma uprawnień administratora.");
        if (!live) return;
        await refreshState();
        if (live) setStatus("ready");
      } catch (err) {
        if (live) {
          setError(err instanceof Error ? err.message : "Nie można pobrać ustawień bezpieczeństwa.");
          setStatus("unauthorized");
        }
      }
    })();
    return () => { live = false; };
  }, []);

  async function beginEnrollment() {
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: enrollError } = await createPartyPlayAuthClient().auth.mfa.enroll({
        factorType: "totp", friendlyName: "zaGRAj Admin",
      });
      if (enrollError) throw enrollError;
      if (!data?.totp?.secret || !data.totp.qr_code || !data.id) {
        throw new Error("Nie udało się przygotować kodu QR. Spróbuj ponownie.");
      }
      setEnrollment({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się rozpocząć konfiguracji.");
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6,8}$/.test(code.trim())) { setError("Wpisz kod z aplikacji uwierzytelniającej."); return; }
    const id = enrollment?.id ?? factorId;
    if (!id) { setError("Najpierw dodaj metodę weryfikacji."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const auth = createPartyPlayAuthClient();
      const { error: verifyError } = await auth.auth.mfa.challengeAndVerify({
        factorId: id, code: code.trim(),
      });
      if (verifyError) throw verifyError;
      setCode("");
      setEnrollment(null);
      await refreshState();
      setMessage("Weryfikacja zakończona. Możesz teraz zatwierdzać publikacje i zarządzać rolami.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się potwierdzić kodu.");
    } finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#050713] px-4 pb-20 text-white sm:px-8">
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-white/10 py-6">
        <Link href="/admin" className="text-xs font-bold text-violet-300 hover:text-white">← Pulpit administratora</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[.2em] text-violet-300">Bezpieczeństwo zaGRAj</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Weryfikacja 2-etapowa</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">Zmiana uprawnień i zatwierdzanie publikacji wymagają dodatkowego kodu z aplikacji uwierzytelniającej. Edycja szkiców nie jest blokowana.</p>
      </header>

      {error && <div role="alert" className="mt-6 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
      {message && <div role="status" className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200">{message}</div>}

      {status === "loading" && <p className="mt-8 text-zinc-300">Sprawdzam poziom zabezpieczenia…</p>}
      {status === "unauthorized" && <div className={box+" mt-8"}>
        <h2 className="text-xl font-black">Nie można otworzyć ustawień.</h2>
        <Link href="/login?next=%2Fadmin%2Fbezpieczenstwo" className="mt-5 inline-block rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold">Zaloguj się</Link>
      </div>}

      {status === "ready" && state && <div className="mt-7 space-y-5">
        <section className={box}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Status tej sesji</h2>
            <span className={`rounded-full px-3 py-2 text-xs font-black ${state.currentLevel === "aal2" ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
              {state.currentLevel === "aal2" ? "Zweryfikowana, AAL2" : "Wymaga potwierdzenia"}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{state.currentLevel === "aal2"
            ? "Możesz zatwierdzać publikacje i zmieniać uprawnienia zespołu."
            : state.factors.length ? "Metoda weryfikacji jest dodana. Wpisz kod, aby potwierdzić tę sesję."
              : "Nie masz jeszcze skonfigurowanego drugiego składnika. Połącz aplikację i potwierdź kod."}</p>
        </section>

        {state.currentLevel !== "aal2" && !state.factors.length && <section className={box}>
          <h2 className="text-xl font-black">1. Dodaj aplikację uwierzytelniającą</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Możesz użyć aplikacji generującej kody TOTP. Kod zmienia się co około 30 sekund. Nie wysyłaj nikomu sekretu ani kodów.</p>
          {!enrollment ? <button onClick={() => void beginEnrollment()} disabled={busy} className="mt-5 rounded-xl bg-violet-500 px-5 py-3 text-sm font-black disabled:opacity-40">Wygeneruj kod QR</button> :
            <div className="mt-5 space-y-4">
              <div className="inline-block rounded-2xl bg-white p-3"><img src={enrollment.qrCode} alt="Kod QR konfiguracji TOTP zaGRAj" width={220} height={220}/></div>
              <div><p className="text-xs text-zinc-400">Możesz też ręcznie wpisać klucz w aplikacji:</p>
                <code className="mt-2 block break-all rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-violet-200">{enrollment.secret}</code>
              </div>
              <p className="text-xs text-amber-200">Wprowadź kod z aplikacji poniżej, aby ukończyć aktywację. Do tego momentu ochrona nie jest jeszcze aktywna.</p>
            </div>}
        </section>}

        {state.currentLevel !== "aal2" && (enrollment || state.factors.length>0) && <section className={box}>
          <h2 className="text-xl font-black">{enrollment ? "2. Potwierdź nową metodę" : "Potwierdź tę sesję"}</h2>
          <form onSubmit={(e)=>void verify(e)} className="mt-5 space-y-4">
            {!enrollment && state.factors.length>1 && <label className="block text-sm text-zinc-300">Metoda weryfikacji
              <select value={factorId} onChange={(e)=>setFactorId(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#090d1d] p-3">
                {state.factors.map((factor)=><option key={factor.id} value={factor.id}>{factor.friendly_name ?? "Aplikacja uwierzytelniająca"}</option>)}
              </select>
            </label>}
            <label className="block text-sm font-bold text-zinc-300">Kod jednorazowy
              <input value={code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}" maxLength={8}
                onChange={(e)=>setCode(e.target.value.replace(/\D/g,""))} placeholder="000000" required
                className="mt-2 w-full rounded-xl border border-white/15 bg-[#090d1d] px-4 py-3 text-xl tracking-[.3em] outline-none focus:border-violet-400"/>
            </label>
            <button type="submit" disabled={busy} className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-black disabled:opacity-40">
              {busy ? "Sprawdzam…" : "Potwierdź kod"}
            </button>
          </form>
        </section>}

        {state.currentLevel === "aal2" && <section className={box}>
          <h2 className="text-lg font-black">Dostęp do operacji krytycznych jest aktywny</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/admin/gry" className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-black">Przejdź do katalogu</Link>
            <Link href="/admin" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-black">Zespół administratorów</Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">Podczas następnego logowania możesz ponownie zostać poproszony o kod.</p>
        </section>}
      </div>}
    </div>
  </main>;
}
