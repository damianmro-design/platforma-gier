// Fixed ordering, numbering and titles match the existing game pages.
// Only the explanatory copy (tuple item 2) may be overridden in the CMS.
// A future mechanical rules change must explicitly bump the schema version.
export const PAGE_RULE_COPY_SCHEMA = 1 as const;

export const GAME_PAGE_RULES = {
  "akta-nocy": [
    ["1","Każdy ma telefon","Prywatne akta, sekrety i odpowiedzi nigdy nie muszą być drukowane."],
    ["2","Wybieracie tryb","W Ostatnim Kursie może prowadzić jedna osoba albo system może prowadzić wszystkich automatycznie."],
    ["3","Rozmawiacie naprawdę","Aplikacja daje fakty i pytania, ale śledztwo odbywa się między Wami przy jednym stole."],
    ["4","Oskarżacie prywatnie","Na końcu każdy wskazuje osobę, motyw, sposób i kluczowy dowód, zanim prawda zostanie ujawniona."],
  ],
  "co-ludzie-powiedza": [
    ["00","Poznajmy tłum","Każdy odpowiada prywatnie na 6 krótkich pytań. Te odpowiedzi wrócą później w rundach o Waszej własnej ekipie."],
    ["01","Co powiedzieli ludzie?","Drużyna próbuje odkrywać odpowiedzi z tablicy. Po 2 błędach rywale dostają próbę przejęcia części puli."],
    ["02","Wasza ekipa powiedziała","Przewidujecie odpowiedzi osób z tego pokoju. Do 60 pkt zależy od udziału wskazanej odpowiedzi, a 40 pkt to bonus za trafienie nr 1."],
    ["03","Top 5","Ułóżcie 5 odpowiedzi od najpopularniejszej do najmniej popularnej. 15 pkt za każdą idealną pozycję i 25 pkt bonusu za 5/5."],
    ["04","Mniejszość","Wskażcie odpowiedź, którą wybrało najmniej ludzi. Najmniej popularna daje 60 pkt, 2. najmniej popularna 20 pkt."],
    ["05","Jeden z Was","Najpierw cała ekipa głosuje tajnie na osoby z pokoju, później drużyny przewidują wynik. 80 pkt za 1. miejsce, 30 pkt za 2."],
    ["06","Ile osób?","Obstawcie, ile osób z ekipy wybrało konkretną odpowiedź wcześniej. Idealne trafienie daje 70 pkt, pomyłka o 1 daje 30 pkt."],
    ["07","Pojedynek","5 szybkich starć. Z 2 odpowiedzi wybieracie tę popularniejszą. Każdy poprawny typ to 50 pkt."],
    ["08","Finał","Wynik wcześniejszych rund daje liderowi 50 pkt przewagi. Potem 5 pytań finałowych, a ostatnie liczy się ×3. Remis uruchamia dogrywkę."],
  ],
  "pod-przykrywka": [
    ["01","Tajne role","Każdy na telefonie poznaje swoją rolę. Jedna osoba jest Oszustem."],
    ["02","Tajne hasła","W każdej z 5 misji Agenci poznają tajne hasło i pytanie. Oszust zna tylko kategorię oraz to samo pytanie i musi odpowiedzieć tak, jakby znał hasło."],
    ["03","Dowody i dyskusja","Odpowiedzi trafiają na wspólny ekran. Agenci nie mogą zdradzić hasła wprost. Szukacie osoby, której odpowiedzi są zbyt ogólne albo wyglądają na zgadywanie."],
    ["04","Podejrzenia","Po każdej misji każdy anonimowo wskazuje osobę, która wydaje mu się najbardziej podejrzana."],
    ["05","Punkt kontrolny","Po 3 misjach najbardziej podejrzana osoba trafia na przesłuchanie i dostaje 30 sekund ostatniego słowa."],
    ["06","Obrona i finał","Po 5 misjach 2 najbardziej podejrzane osoby mają po 30 sekund obrony. Potem każdy głosuje na dowolnego gracza. Jeśli Oszust jest jednoznacznie najczęściej wskazany, grupa wygrywa."],
  ],
  "szyfr": [
    ["01","Własny telefon","Każdy widzi inne informacje. Nie pokazujcie sobie ekranów."],
    ["02","Rozmowa","Możecie mówić o wszystkim, co widzicie. To jest główny mechanizm gry."],
    ["03","Wspólna odpowiedź","Gdy jesteście pewni, dowolny gracz wysyła kod lub wybór dla całej drużyny."],
  ],
  "tylko-my": [
    ["01","Na tej samej fali","Oboje odpowiadacie na to samo pytanie. Taki sam wybór daje 1 punkt."],
    ["02","Czytam Ci w myślach","Jedna osoba odpowiada o sobie, druga próbuje przewidzieć jej wybór. Trafienie daje 2 punkty."],
    ["03","Kto z nas?","Wskazujecie: Ty, ja albo oboje. Punkt wpada wtedy, gdy widzicie sytuację tak samo."],
    ["04","Telepatia","Finałowe pytania są warte 3 punkty. Tutaj jeden wspólny wybór potrafi mocno zmienić wynik."],
  ],
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
