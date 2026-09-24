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

  // A suspended sole proprietorship must not silently be treated as an active
  // service operator. This flag is a release-process gate, not legal advice.
  const basis = String(env.BETA_OPERATOR_BASIS ?? "").trim();
  if (!["active-business", "independent-noncommercial-reviewed"].includes(basis)) {
    errors.push(
      "BETA_OPERATOR_BASIS: potwierdź aktywną działalność albo niezależny, prawnie zweryfikowany projekt niekomercyjny.",
    );
  }
  if (String(env.BETA_LEGAL_REVIEW_CONFIRMED ?? "").trim() !== "true") {
    errors.push(
      "BETA_LEGAL_REVIEW_CONFIRMED: wymagany zakończony przegląd statusu operatora i dokumentów przed publicznym startem.",
    );
  }

  // Public beta must not expose unrestricted room creation via publishable key.
  // This is only a structural check. Verify actual database grants separately.
  if (String(env.ZAGRAJ_ROOM_CREATION_MODE ?? "").trim() !== "server-only") {
    errors.push("ZAGRAJ_ROOM_CREATION_MODE: require server-only before public beta.");
  }
  const creatorKey = String(env.SUPABASE_ROOM_CREATE_SECRET_KEY ?? "").trim();
  if (!creatorKey || creatorKey.startsWith("sb_publishable_") || creatorKey.length < 30) {
    errors.push("SUPABASE_ROOM_CREATE_SECRET_KEY: configure a server-only secret key.");
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
