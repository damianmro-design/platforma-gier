"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { createPartyPlayAuthClient } from "@/lib/partyplay-auth";

type Status = "loading" | "unauthorized" | "ready";
type FactorInfo = {
  id: string;
  type: "totp" | "phone";
  label: string;
  phoneMasked?: string;
};
type SecurityState = {
  currentLevel: string;
  nextLevel: string;
  factors: FactorInfo[];
};
type TotpEnrollment = { id: string; qrCode: string; secret: string };
type PhoneEnrollment = { factorId: string; phoneMasked: string; challengeId: string };
type SmsChallenge = { factorId: string; challengeId: string };

const panel = "rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-7";
const inputClass = "mt-2 w-full rounded-xl border border-white/15 bg-[#090d1d] px-4 py-3 text-sm text-white outline-none focus:border-violet-400 disabled:opacity-50";

function maskPhone(value: string) {
  if (!value) return "zapisany numer";
  return value.length <= 6 ? "••••" : value.slice(0, 3) + " ••• •• " + value.slice(-3);
}

export default function AdminSecurityPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [state, setState] = useState<SecurityState | null>(null);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [totpEnrollment, setTotpEnrollment] = useState<TotpEnrollment | null>(null);
  const [phoneEnrollment, setPhoneEnrollment] = useState<PhoneEnrollment | null>(null);
  const [challenge, setChallenge] = useState<SmsChallenge | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [clock, setClock] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - clock) / 1000));

  async function refreshState() {
    const auth = createPartyPlayAuthClient();
    const [levels, factors] = await Promise.all([
      auth.auth.mfa.getAuthenticatorAssuranceLevel(),
      auth.auth.mfa.listFactors(),
    ]);
    if (levels.error) throw levels.error;
    if (factors.error) throw factors.error;
    const totp = (factors.data?.totp ?? [])
      .filter((factor) => factor.status === "verified")
      .map((factor): FactorInfo => ({
        id: factor.id, type: "totp",
        label: factor.friendly_name ?? "Aplikacja uwierzytelniająca",
      }));
    const phones = (factors.data?.phone ?? [])
      .filter((factor) => factor.status === "verified")
      .map((factor): FactorInfo => {
        const number = "phone" in factor && typeof factor.phone === "string" ? factor.phone : "";
        return {
          id: factor.id, type: "phone", label: "Kod SMS",
          phoneMasked: maskPhone(number),
        };
      });
    const verified = [...totp, ...phones];
    setState({
      currentLevel: levels.data?.currentLevel ?? "aal1",
      nextLevel: levels.data?.nextLevel ?? "aal1",
      factors: verified,
    });
    setSelectedFactorId((previous) =>
      verified.some((factor) => factor.id === previous) ? previous : (verified[0]?.id ?? ""));
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const auth = createPartyPlayAuthClient();
        const { data: { session } } = await auth.auth.getSession();
        if (!session?.access_token) throw new Error("Zaloguj się na konto administratora.");
        const response = await fetch("/api/admin/me", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("To konto nie ma uprawnień administratora.");
        const optionsResponse = await fetch("/api/admin/mfa-options", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (!optionsResponse.ok) throw new Error("Nie można sprawdzić dostępnych metod weryfikacji.");
        const options = await optionsResponse.json() as { smsEnabled: boolean };
        if (!active) return;
        setSmsEnabled(options.smsEnabled === true);
        await refreshState();
        if (active) setStatus("ready");
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Nie udało się załadować ustawień.");
          setStatus("unauthorized");
        }
      }
    })();
    return () => { active = false; };
  }, []);

  async function enrollTotp() {
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: enrollError } = await createPartyPlayAuthClient().auth.mfa.enroll({
        factorType: "totp", friendlyName: "zaGRAj Admin",
      });
      if (enrollError) throw enrollError;
      if (!data?.totp?.secret || !data.totp.qr_code || !data.id) {
        throw new Error("Nie można wygenerować kodu QR.");
      }
      setTotpEnrollment({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      setCode("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nie udało się rozpocząć konfiguracji.");
    } finally { setBusy(false); }
  }

  async function sendSms(factorId: string) {
    // Called only from an explicit button click or the first, user-triggered enrollment.
    const { data, error: challengeError } = await createPartyPlayAuthClient().auth.mfa.challenge({
      factorId,
    });
    if (challengeError) throw challengeError;
    if (!data?.id) throw new Error("Nie udało się rozpocząć weryfikacji SMS.");
    setChallenge({ factorId, challengeId: data.id });
    setPhoneEnrollment((previous) => previous?.factorId === factorId
      ? { ...previous, challengeId: data.id } : previous);
    setCooldownUntil(Date.now() + 60000);
    setClock(Date.now());
    setCode("");
  }

  async function enrollPhone() {
    if (!smsEnabled) return;
    const value = phone.trim();
    if (!/^\+[1-9]\d{7,14}$/.test(value)) {
      setError("Podaj numer w formacie międzynarodowym, np. +48XXXXXXXXX.");
      return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const { data, error: enrollError } = await createPartyPlayAuthClient().auth.mfa.enroll({
        factorType: "phone", phone: value,
      });
      if (enrollError) throw enrollError;
      if (!data?.id) throw new Error("Nie udało się dodać numeru.");
      setPhoneEnrollment({ factorId: data.id, phoneMasked: maskPhone(value), challengeId: "" });
      setSelectedFactorId(data.id);
      setPhone("");
      await sendSms(data.id);
      setMessage("Wysłano kod na wskazany numer. Wpisz go poniżej, aby aktywować metodę SMS.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nie udało się wysłać SMS. Sprawdź konfigurację dostawcy.");
    } finally { setBusy(false); }
  }

  async function requestSms(factorId: string) {
    if (!smsEnabled || busy || cooldown > 0) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await sendSms(factorId);
      setMessage("Wysłano nowy kod SMS.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wysyłka SMS jest chwilowo niedostępna.");
    } finally { setBusy(false); }
  }

  const selected = state?.factors.find((factor) => factor.id === selectedFactorId);
  const currentMethod = phoneEnrollment ? "phone" : totpEnrollment ? "totp" : selected?.type;

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6,8}$/.test(code.trim())) {
      setError("Wprowadź prawidłowy kod jednorazowy.");
      return;
    }
    const factorId = phoneEnrollment?.factorId ?? totpEnrollment?.id ?? selectedFactorId;
    if (!factorId) { setError("Najpierw wybierz lub dodaj metodę weryfikacji."); return; }
    if (currentMethod === "phone" && (!smsEnabled || !challenge || challenge.factorId !== factorId)) {
      setError("Najpierw wyślij kod SMS na zweryfikowany numer."); return;
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const auth = createPartyPlayAuthClient();
      const response = currentMethod === "phone"
        ? await auth.auth.mfa.verify({
            factorId, challengeId: challenge!.challengeId, code: code.trim(),
          })
        : await auth.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
      if (response.error) throw response.error;
      setCode("");
      setTotpEnrollment(null);
      setPhoneEnrollment(null);
      setChallenge(null);
      setCooldownUntil(0);
      setSelectedFactorId(factorId);
      await refreshState();
      setMessage("Weryfikacja zakończona. Możesz zatwierdzać publikacje i zarządzać rolami.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Kod nie został zaakceptowany.");
    } finally { setBusy(false); }
  }

  const hasTotp = Boolean(state?.factors.some((factor) => factor.type === "totp"));
  const hasPhone = Boolean(state?.factors.some((factor) => factor.type === "phone"));
  const pendingEnrollment = Boolean(totpEnrollment || phoneEnrollment);
  const needsChallenge = state?.currentLevel !== "aal2" || pendingEnrollment;
  const readyForCode = currentMethod === "totp" ||
    (currentMethod === "phone" && Boolean(challenge?.factorId === (phoneEnrollment?.factorId ?? selectedFactorId)));

  return <main className="min-h-screen bg-[#050713] px-4 pb-20 text-white sm:px-8">
    <div className="mx-auto max-w-3xl">
      <header className="border-b border-white/10 py-6">
        <Link href="/admin" className="text-xs font-bold text-violet-300 hover:text-white">← Pulpit administratora</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[.2em] text-violet-300">Bezpieczeństwo zaGRAj</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Weryfikacja 2-etapowa</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">Wybierz metodę: aplikację uwierzytelniającą albo, po aktywacji usługi SMS, wiadomość na telefon. Publikacja i zmiana uprawnień wymagają potwierdzonej sesji.</p>
      </header>

      {error && <div role="alert" className="mt-6 rounded-xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
      {message && <div role="status" className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-200">{message}</div>}
      {status === "loading" && <p className="mt-8 text-zinc-300">Sprawdzam zabezpieczenia konta…</p>}
      {status === "unauthorized" && <div className={panel+" mt-8"}>
        <h2 className="text-xl font-black">Nie można otworzyć ustawień.</h2>
        <Link href="/login?next=%2Fadmin%2Fbezpieczenstwo" className="mt-5 inline-block rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold">Zaloguj się</Link>
      </div>}

      {status === "ready" && state && <div className="mt-7 space-y-5">
        <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Status tej sesji</h2>
            <span className={`rounded-full px-3 py-2 text-xs font-black ${state.currentLevel === "aal2" ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
              {state.currentLevel === "aal2" ? "Zweryfikowana, AAL2" : "Wymaga potwierdzenia"}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{state.currentLevel === "aal2"
            ? "Operacje krytyczne są odblokowane. Możesz też dodać zapasową metodę."
            : state.factors.length
              ? "Wybierz istniejącą metodę i potwierdź tę sesję."
              : "Dodaj pierwszą metodę weryfikacji, aby odblokować zatwierdzanie zmian."}</p>
        </section>

        {!pendingEnrollment && needsChallenge && !!state.factors.length && <section className={panel}>
          <h2 className="text-xl font-black">Potwierdź tożsamość</h2>
          <p className="mt-2 text-sm text-zinc-400">Wybierz jedną z aktywnych metod.</p>
          <div className="mt-5 space-y-3">
            {state.factors.map((factor) => <label key={factor.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
              <input type="radio" name="mfa-method" checked={selectedFactorId === factor.id}
                disabled={factor.type === "phone" && !smsEnabled}
                onChange={() => { setSelectedFactorId(factor.id); setChallenge(null); setCode(""); setError(""); }}
                className="accent-violet-400"/>
              <span className="text-sm font-bold">{factor.type === "phone" ? `SMS, ${factor.phoneMasked}` : factor.label}</span>
              {factor.type === "phone" && !smsEnabled && <span className="ml-auto text-xs text-amber-300">Niedostępne</span>}
            </label>)}
          </div>
        </section>}

        {!hasTotp && !phoneEnrollment && !totpEnrollment && <section className={panel}>
          <h2 className="text-xl font-black">Aplikacja uwierzytelniająca</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Bez dodatkowych opłat za SMS, działa bez zasięgu. Zalecana również jako metoda zapasowa.</p>
          <button type="button" onClick={() => void enrollTotp()} disabled={busy}
            className="mt-5 rounded-xl bg-violet-500 px-5 py-3 text-sm font-black disabled:opacity-40">Dodaj aplikację i wygeneruj kod QR</button>
        </section>}

        {totpEnrollment && <section className={panel}>
          <h2 className="text-xl font-black">Skonfiguruj aplikację</h2>
          <p className="mt-3 text-sm text-zinc-400">Zeskanuj kod QR, a potem wpisz wygenerowany kod poniżej. Nie udostępniaj sekretu.</p>
          <div className="mt-5 inline-block rounded-2xl bg-white p-3">
            <img src={totpEnrollment.qrCode} alt="Kod QR konfiguracji aplikacji uwierzytelniającej" width={220} height={220}/>
          </div>
          <p className="mt-4 text-xs text-zinc-400">Klucz do ręcznego wpisania:</p>
          <code className="mt-2 block break-all rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-violet-200">{totpEnrollment.secret}</code>
        </section>}

        {!hasPhone && !totpEnrollment && !phoneEnrollment && <section className={panel}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Kod SMS</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${smsEnabled ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>
              {smsEnabled ? "Usługa skonfigurowana" : "Czeka na aktywację usługi"}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Numer wpisujesz wyłącznie tutaj, nie w rozmowie. Kod jest wysyłany przez skonfigurowanego dostawcę SMS i weryfikowany przez Supabase Auth.</p>
          {smsEnabled ? <div className="mt-5">
            <label className="text-xs font-bold text-zinc-300">Numer w formacie międzynarodowym
              <input className={inputClass} type="tel" inputMode="tel" autoComplete="tel"
                placeholder="+48XXXXXXXXX" maxLength={16} value={phone} onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <button type="button" disabled={busy} onClick={() => void enrollPhone()}
              className="mt-4 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-black disabled:opacity-40">
              Dodaj numer i wyślij kod
            </button>
          </div> : <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[.045] p-4 text-xs leading-6 text-amber-100">
            Wysyłanie jest celowo wyłączone do czasu potwierdzenia płatnego dodatku Supabase Phone MFA i konfiguracji dostawcy wiadomości. Nie naliczymy kosztów SMS z tego panelu przed aktywacją.
          </div>}
        </section>}

        {phoneEnrollment && <section className={panel}>
          <h2 className="text-xl font-black">Aktywuj numer SMS</h2>
          <p className="mt-3 text-sm text-zinc-300">Numer: {phoneEnrollment.phoneMasked}. Wpisz kod wysłany przez Supabase, aby zakończyć konfigurację.</p>
        </section>}

        {needsChallenge && currentMethod === "phone" && smsEnabled && <section className={panel}>
          <h2 className="text-lg font-black">Wiadomość SMS</h2>
          <p className="mt-2 text-sm text-zinc-400">Kod zostanie wysłany na zapisany numer. Po każdym wysłaniu obowiązuje odstęp przed ponowieniem.</p>
          <button type="button" disabled={busy || cooldown>0}
            onClick={() => void requestSms(phoneEnrollment?.factorId ?? selectedFactorId)}
            className="mt-4 rounded-xl border border-cyan-400/35 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-200 disabled:opacity-40">
            {cooldown>0 ? `Wyślij ponownie za ${cooldown} s` : challenge ? "Wyślij kod ponownie" : "Wyślij kod SMS"}
          </button>
        </section>}

        {needsChallenge && readyForCode && <section className={panel}>
          <h2 className="text-xl font-black">{pendingEnrollment ? "Potwierdź nową metodę" : "Potwierdź tę sesję"}</h2>
          <form onSubmit={(e) => void verify(e)} className="mt-5 space-y-4">
            <label className="block text-sm font-bold text-zinc-300">Kod jednorazowy
              <input value={code} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,8}"
                maxLength={8} required onChange={(e) => setCode(e.target.value.replace(/\D/g,""))}
                placeholder="000000" className={inputClass+" text-xl tracking-[.3em]"}/>
            </label>
            <button type="submit" disabled={busy}
              className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-black text-black disabled:opacity-40">
              {busy ? "Sprawdzam…" : "Potwierdź kod"}
            </button>
          </form>
        </section>}

        {state.currentLevel === "aal2" && !pendingEnrollment && <section className={panel}>
          <h2 className="text-lg font-black">Dostęp do operacji krytycznych jest aktywny</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/admin/gry" className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-black">Katalog gier</Link>
            <Link href="/admin" className="rounded-xl border border-white/15 px-5 py-3 text-sm font-black">Pulpit administratora</Link>
          </div>
        </section>}
      </div>}
    </div>
  </main>;
}
