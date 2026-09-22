import { LEGAL_CONFIG, hasLegalContactConfigured } from "@/lib/legal-config";
import LegalPageShell, { LegalSection } from "../legal-page-shell";

export const metadata = {
  title: "Kontakt | zaGRAj",
};

export default function ContactPage() {
  const configured = hasLegalContactConfigured();

  return (
    <LegalPageShell
      eyebrow="Pomoc i kontakt"
      title="Kontakt"
      intro="Masz problem z kontem zaGRAj, konkretną grą, chcesz zgłosić błąd, poprosić o usunięcie danych albo przesłać reklamację? Skontaktuj się z administratorem platformy."
    >
      <LegalSection title="Kontakt do administratora">
        <p>
          <strong className="text-zinc-200">{LEGAL_CONFIG.operatorName}</strong>
        </p>
        {configured ? (
          <p>
            E-mail:{" "}
            <a
              className="font-bold text-violet-300 underline decoration-violet-500/40 underline-offset-4"
              href={`mailto:${LEGAL_CONFIG.contactEmail}`}
            >
              {LEGAL_CONFIG.contactEmail}
            </a>
          </p>
        ) : (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-red-200">
            Przed publicznym udostępnieniem platformy uzupełnij
            NEXT_PUBLIC_LEGAL_OPERATOR_NAME i NEXT_PUBLIC_CONTACT_EMAIL w Vercel.
          </div>
        )}
      </LegalSection>

      <LegalSection title="W czym możemy pomóc">
        <ul className="list-disc space-y-2 pl-5">
          <li>logowanie, rejestracja i wspólne konto zaGRAj;</li>
          <li>problemy z utworzeniem pokoju lub przebiegiem gry;</li>
          <li>statystyki, historię, XP, poziomy i odznaki;</li>
          <li>zgłoszenie błędu technicznego;</li>
          <li>dostęp, sprostowanie lub usunięcie danych osobowych;</li>
          <li>usunięcie konta;</li>
          <li>reklamacje dotyczące działania platformy.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Co podać w zgłoszeniu">
        <p>
          Opisz możliwie dokładnie problem, podaj nazwę gry, przybliżony czas
          jego wystąpienia i, jeśli sprawa dotyczy rozgrywki, kod pokoju.
          Możesz dołączyć zrzut ekranu.
        </p>
        <p className="font-bold text-red-300">
          Nigdy nie przesyłaj hasła, tokenów, kluczy API ani kodów jednorazowych.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
