import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// The values are public business/contact details, not private secrets.
// Do not print their contents to CI logs.
export function validateReleaseEnv(env) {
  const errors = [];
  const requirements = [
    ["NEXT_PUBLIC_LEGAL_OPERATOR_NAME", "rzeczywista nazwa / imię i nazwisko usługodawcy"],
    ["NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS", "adres usługodawcy"],
    ["NEXT_PUBLIC_LEGAL_OPERATOR_COUNTRY", "kraj usługodawcy"],
    ["NEXT_PUBLIC_CONTACT_EMAIL", "działający adres e-mail do kontaktu i zgłoszeń"],
    ["NEXT_PUBLIC_PLATFORM_URL", "publiczny adres serwisu HTTPS"],
  ];

  for (const [key, description] of requirements) {
    const value = String(env[key] ?? "").trim();
    if (!value || /^\[|uzupełnij|placeholder|^(todo|test|example)$/i.test(value)) {
      errors.push(`${key}: uzupełnij ${description}.`);
    }
  }

  const email = String(env.NEXT_PUBLIC_CONTACT_EMAIL ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("NEXT_PUBLIC_CONTACT_EMAIL: nieprawidłowy format adresu.");
  }

  const url = String(env.NEXT_PUBLIC_PLATFORM_URL ?? "").trim();
  try {
    if (url) {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || !parsed.hostname.includes(".")) {
        errors.push("NEXT_PUBLIC_PLATFORM_URL: wymagany publiczny adres HTTPS.");
      }
    }
  } catch {
    errors.push("NEXT_PUBLIC_PLATFORM_URL: nieprawidłowy URL.");
  }

  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = validateReleaseEnv(process.env);
  if (errors.length) {
    console.error("BETA PREFLIGHT: BLOCKED. Brak kompletnej konfiguracji:");
    for (const error of errors) console.error(` - ${error}`);
    process.exitCode = 1;
  } else {
    console.log("BETA PREFLIGHT: konfiguracja danych publicznych poprawna.");
    console.log("UWAGA: to nie zatwierdza legalności, praw do materiałów ani wydajności.");
    console.log("Przed publicznym startem wykonaj checklistę docs/release/free-beta-runbook.md.");
  }
}
