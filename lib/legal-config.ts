export const LEGAL_CONFIG = {
  serviceName: "zaGRAj",
  serviceUrl:
    process.env.NEXT_PUBLIC_PLATFORM_URL ??
    "https://zagraj.fun",
  operatorName:
    process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME ??
    "Damian Mrożek",
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ??
    "hej@zagraj.fun",
  operatorAddress:
    process.env.NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS ??
    "Krakowska 84/5, 50-426 Wrocław",
  effectiveDate: "24 września 2026",
  country:
    process.env.NEXT_PUBLIC_LEGAL_OPERATOR_COUNTRY ??
    "Polska",
} as const;

export function hasLegalContactConfigured() {
  return (
    !LEGAL_CONFIG.operatorName.startsWith("[UZUPEŁNIJ") &&
    !LEGAL_CONFIG.operatorAddress.startsWith("[UZUPEŁNIJ") &&
    !LEGAL_CONFIG.country.startsWith("[UZUPEŁNIJ") &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(LEGAL_CONFIG.contactEmail)
  );
}
