// Fixed ordering, numbering and titles match the existing game pages.
// Only the explanatory copy (tuple item 2) may be overridden in the CMS.
// A future mechanical rules change must explicitly bump the schema version.
export const PAGE_RULE_COPY_SCHEMA = 1 as const;

export const GAME_PAGE_RULES = {
  "va-banque": [
  ["01", "Poznaj kategorię", "Najpierw widzisz tylko kategorię. Pytanie pozostaje ukryte do końca licytacji."],
  ["02", "Zalicytuj albo spasuj", "W zwykłej rundzie stawiasz maksymalnie 50% kapitału. PAS oznacza stawkę 0 pkt. Nie możesz stracić ostatnich 100 pkt przed finałem."],
  ["03", "Odpowiedz za swoją stawkę", "Najwyższa oferta przejmuje pytanie. Dobra odpowiedź dodaje stawkę, zła odejmuje ją od kapitału."],
  ["04", "Poluj na błąd", "Po złej odpowiedzi pierwszy z pozostałych graczy może przejąć pytanie. Ryzyko to zwykle połowa poprzedniej stawki, minimum 50 pkt i nigdy więcej niż posiadany kapitał."],
  ["05", "Rozstrzygnij remis", "Jeśli najwyższe oferty są równe, tylko remisujący podbijają albo pasują. Gdy nadal nie ma rozstrzygnięcia, wybiera serwer."],
  ["06", "Zagraj finał", "Każdy prywatnie stawia od 0 do 100% swojego kapitału, a potem wszyscy odpowiadają na to samo finałowe pytanie."],
],
  "zakrecone-haslo": [
  ["01", "Zakręć kołem", "Wartość z koła określa punkty za każdą trafioną spółgłoskę. BANKRUT zeruje punkty z rundy, a PAS oddaje kolejkę."],
  ["02", "Wybierz literę", "Trafiona spółgłoska odkrywa wszystkie jej wystąpienia i grasz dalej. Pudło przekazuje ruch następnej osobie."],
  ["03", "Kup samogłoskę", "Za 200 pkt z bieżącej rundy możesz wybrać samogłoskę. Koszt płacisz zawsze, a nietrafiona samogłoska kończy Twoją kolejkę."],
  ["04", "Rozwiąż hasło", "W swojej kolejce możesz podać całe hasło. Poprawna odpowiedź daje 1000 pkt bonusu, błędna oddaje kolejkę."],
],
} as const;

export type PageRuleGameSlug = keyof typeof GAME_PAGE_RULES;

export function getPageRuleDefaults(slug: string): readonly (readonly [string, string, string])[] | null {
  return GAME_PAGE_RULES[slug as PageRuleGameSlug] ?? null;
}
