// Exact SEO copy previously shipped with the seven public game pages.
// This stays the safe fallback until the owner publishes an approved override.
export const GAME_PAGE_SEO_FALLBACK = {
  "akta-nocy": {
    "title": "Akta Nocy — zaGRAj",
    "description": "Interaktywna gra śledcza: fikcyjne sprawy, tajne role, dowody, rekonstrukcje i tryb z prowadzącym lub bez."
  },
  "co-ludzie-powiedza": {
    "title": "CO LUDZIE POWIEDZĄ — zaGRAj",
    "description": "Drużynowy teleturniej imprezowy oparty na ankietach, przewidywaniu większości i znajomości własnej ekipy."
  },
  "pod-przykrywka": {
    "title": "Pod Przykrywką — zaGRAj",
    "description": "Gra dedukcyjna dla 6–14 osób. Agenci znają tajne hasła, a Oszust widzi tylko kategorię i musi blefować."
  },
  "szyfr": {
    "title": "SZYFR — zaGRAj",
    "description": "Kooperacyjna misja dla 2–6 osób. Każdy widzi inne informacje, a zespół musi połączyć tropy i odszyfrować kod."
  },
  "tylko-my": {
    "title": "TYLKO MY — zaGRAj",
    "description": "Lekka gra dla 2 osób o przewidywaniu swoich wyborów, zgodności i momentach telepatii."
  },
  "va-banque": {
    "title": "VA BANQUE — zaGRAj",
    "description": "Quiz imprezowy z licytacją, ryzykiem i przejmowaniem pytań. 2–8 graczy, każdy na swoim telefonie."
  },
  "zakrecone-haslo": {
    "title": "Zakręcone Hasło — zaGRAj",
    "description": "Szybki teleturniej słowny z kołem ryzyka, literami, punktami i hasłami o rosnącym poziomie trudności."
  }
} as const;

export type GamePageSeoSlug = keyof typeof GAME_PAGE_SEO_FALLBACK;
export type GamePageSeoCopy = { title: string; description: string };

export function getPageSeoFallback(slug: string): GamePageSeoCopy | null {
  return GAME_PAGE_SEO_FALLBACK[slug as GamePageSeoSlug] ?? null;
}
