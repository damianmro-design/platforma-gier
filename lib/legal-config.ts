export const LEGAL_CONFIG = {
  serviceName: "zaGRAj",
  serviceUrl:
    process.env.NEXT_PUBLIC_PLATFORM_URL ??
    "https://zagraj.fun",
  operatorName:
    process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME ??
    "[UZUPEŁNIJ: imię i nazwisko albo nazwa firmy]",
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ??
    "hej@zagraj.fun",
  effectiveDate: "22 września 2026",
  country: "Polska",
} as const;

export function hasLegalContactConfigured() {
  return (
    !LEGAL_CONFIG.operatorName.startsWith("[UZUPEŁNIJ") &&
    !LEGAL_CONFIG.contactEmail.startsWith("[UZUPEŁNIJ")
  );
}
