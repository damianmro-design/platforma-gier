export type OstatniKursEvidence = {
  id: string;
  no: string;
  title: string;
  source: string;
  time?: string;
  summary: string;
  details: string[];
  question: string;
  function: "potwierdza" | "wyklucza" | "podważa" | "czerwony_trop" | "łączy";
};

export type OstatniKursCarriage = {
  key: string;
  short: string;
  title: string;
  copy: string;
  accent: string;
};

export type OstatniKursInterrogation = {
  roleKey: string;
  headline: string;
  prompts: string[];
  pressurePoint: string;
};

export const OSTATNI_KURS_CASE = {
  key: "ostatni-kurs",
  number: "002",
  title: "Ostatni Kurs",
  train: "Nocny ekspres N417 „Orion”",
  route: "fikcyjna trasa nocna przez Polskę",
  players: "5–12",
  duration: "85–115 min",
  difficulty: "średnio trudna",
  premise:
    "Adrian Socha znika z nocnego pociągu między dwoma stacjami. Telefon i bagaż zostają w przedziale, nikt nie widzi go opuszczającego skład, a mimo to kamera peronowa rejestruje postać w jego charakterystycznym płaszczu.",
  hook:
    "W pociągu nie ma miejsca, w którym można zniknąć. Chyba że wszyscy patrzą na niewłaściwe drzwi.",
} as const;

export const OSTATNI_KURS_PHASES = [
  { no: "00", title: "Akta osobowe", copy: "Każdy poznaje swoją rolę, sekret, trasę i to, czego nie chce powiedzieć od razu." },
  { no: "01", title: "Ostatni raz widziany", copy: "Gracze składają krótkie pierwsze zeznania: gdzie byli i kiedy ostatni raz widzieli Adriana." },
  { no: "02", title: "Paczka dowodowa A", copy: "Mapa składu, manifest, kadr z peronu, brak klucza serwisowego i pozornie mocne alibi." },
  { no: "03", title: "Pierwsza rekonstrukcja", copy: "Na interaktywnej mapie zaznaczacie możliwe przejścia między wagonami i testujecie alibi." },
  { no: "04", title: "Przesłuchania", copy: "System prowadzi pytania do konkretnych osób i zmusza grupę do doprecyzowania czasu." },
  { no: "05", title: "Paczka dowodowa B", copy: "Nowe logi obalają część alibi i przesuwają uwagę z peronu z powrotem do pociągu." },
  { no: "06", title: "Nowy trop", copy: "Drugi kąt kamery zmienia znaczenie wcześniejszego nagrania z peronu." },
  { no: "07", title: "Rekonstrukcja Ostatniego Kursu", copy: "Układacie prawdziwą sekwencję zdarzeń i trasę osoby odpowiedzialnej." },
  { no: "08", title: "Akt oskarżenia", copy: "Każdy prywatnie wskazuje osobę, motyw, sposób upozorowania zniknięcia i kluczowy dowód." },
  { no: "09", title: "Ujawnienie", copy: "Gra odsłania prawdziwą trasę, kłamstwa, czerwone śledzie i osobę odpowiedzialną." },
  { no: "10", title: "Sprawa zamknięta", copy: "Wyniki grupy, pełna chronologia i powrót do zaGRAj." },
] as const;

export const OSTATNI_KURS_CARRIAGES: OstatniKursCarriage[] = [
  { key: "w1", short: "W1", title: "Wagon siedzący", copy: "Miejsca 1–36. Najwięcej przypadkowych pasażerów.", accent: "#64748b" },
  { key: "w2", short: "W2", title: "Wagon sypialny", copy: "Przedziały 1–6. Cichy korytarz i jedna toaleta.", accent: "#0f766e" },
  { key: "w3", short: "W3", title: "Wagon restauracyjny", copy: "Bar, stoliki, biurko obsługi i ładowarki przy stolikach.", accent: "#b45309" },
  { key: "w4", short: "W4", title: "Kuszetka", copy: "Przedziały 7–12. Łącznik W3↔W4 przechodzi reset bezpieczeństwa.", accent: "#7c3aed" },
  { key: "w5", short: "W5", title: "Wagon sypialny", copy: "Przedział Adriana: nr 7, miejsce 42. Korytarz prowadzi dalej do strefy serwisowej.", accent: "#be123c" },
  { key: "w6", short: "W6", title: "Wagon bagażowo-serwisowy", copy: "Magazyn, szafa bielizny S-3 i tylne drzwi serwisowe na peron.", accent: "#991b1b" },
] as const;

export const OSTATNI_KURS_MAP_RULES = [
  "Przejście pasażerskie W3↔W4 było automatycznie zablokowane od 00:46:00 do 00:54:20.",
  "W5↔W6 można otworzyć wyłącznie kluczem serwisowym albo od strony W6 przyciskiem obsługi.",
  "Podczas postoju w Brzezinach Północnych 00:52:10–00:54:03 otwarte były drzwi pasażerskie W1, W3 i W5 oraz tylne drzwi serwisowe W6.",
  "Przejście całego wagonu zajmuje około 35–50 sekund. Nie trzeba liczyć sekund, ale niemożliwe trasy powinny być widoczne.",
] as const;

export const OSTATNI_KURS_EVIDENCE_A: OstatniKursEvidence[] = [
  {
    id: "train-map",
    no: "A-01",
    title: "Plan składu N417 „Orion”",
    source: "Dokument operacyjny pociągu",
    time: "00:30–01:10",
    summary:
      "Skład ma 6 wagonów. Adrian podróżował w W5. Jedyna strefa niedostępna zwykłym pasażerom znajduje się za jego wagonem, w W6.",
    details: [
      "W3 to wagon restauracyjny, w którym kilka osób deklaruje alibi.",
      "W5 zawiera przedział 7, miejsce 42 należące do Adriana.",
      "W6 jest wagonem bagażowo-serwisowym z zamykanymi schowkami.",
      "Łącznik W3↔W4 został zamknięty przez reset bezpieczeństwa o 00:46 i otwarty dopiero o 00:54:20.",
    ],
    question:
      "Które deklarowane trasy są możliwe, a które przestają się zgadzać po 00:46?",
    function: "łączy",
  },
  {
    id: "manifest",
    no: "A-02",
    title: "Manifest pasażerów i rezerwacji",
    source: "System rezerwacyjny N417",
    time: "23:58",
    summary:
      "Adrian Socha ma miejsce 42 w W5. Kilka osób z grupy siedzi w innych wagonach niż te, w których twierdzą, że spędziły całą noc.",
    details: [
      "Adrian Socha — W5, przedział 7, miejsce 42.",
      "Kamil Drzewiecki — W2, przedział 3, miejsce 18.",
      "Nina Radecka — W4, przedział 10, miejsce 31.",
      "Zofia Rudzka — W2, przedział 5, miejsce 27.",
      "Filip Gajda — W1, miejsce 12.",
      "Rezerwacja nie jest dowodem obecności w danym miejscu, tylko punktem odniesienia.",
    ],
    question:
      "Kto miał naturalny powód znaleźć się w W5, a kto musiałby celowo przejść przez kilka wagonów?",
    function: "łączy",
  },
  {
    id: "platform-coat",
    no: "A-03",
    title: "Postać w płaszczu na peronie",
    source: "Kamera peronowa P-2 · Brzeziny Północne",
    time: "00:52:31",
    summary:
      "Krótko po otwarciu drzwi W6 kamera rejestruje postać w jasnym, camelowym płaszczu bardzo podobnym do płaszcza Adriana.",
    details: [
      "Twarz jest zasłonięta przez kaptur i słup peronowy.",
      "Postać wychodzi z okolicy tylnych drzwi serwisowych W6, nie z drzwi pasażerskich W5.",
      "Płaszcz odpowiada opisowi rzeczy Adriana, której nie znaleziono później w jego przedziale.",
      "Kadr urywa się, zanim postać dochodzi do końca peronu.",
    ],
    question:
      "Czy to dowód, że Adrian wysiadł, czy tylko że ktoś miał jego płaszcz?",
    function: "czerwony_trop",
  },
  {
    id: "master-key",
    no: "A-04",
    title: "Brak klucza serwisowego M-1",
    source: "Notatka kierowniczki pociągu",
    time: "00:31–01:02",
    summary:
      "Klucz M-1 otwierający W6 oraz szafy serwisowe zniknął z biurka obsługi i wrócił na miejsce bez podpisanego pobrania.",
    details: [
      "O 00:31 Marta zauważyła brak klucza na tablicy.",
      "Żaden pracownik nie potwierdził formalnego pobrania M-1.",
      "O 01:02 klucz znów wisiał na haczyku.",
      "M-1 otwiera drzwi W5↔W6, schowki bagażowe i szafę bielizny S-3.",
    ],
    question:
      "Kto mógł zabrać klucz bez wiedzy obsługi i po co potrzebował dostępu do W6?",
    function: "czerwony_trop",
  },
  {
    id: "restaurant-receipt",
    no: "A-05",
    title: "Paragon z wagonu restauracyjnego",
    source: "Terminal POS-3 · stolik 4",
    time: "00:49:03",
    summary:
      "Na rachunku przypisanym do Kamila widnieje kawa i woda z godziną 00:49:03. Na pierwszy rzut oka daje mu to bardzo mocne alibi w W3.",
    details: [
      "Rachunek jest przypisany do karty lojalnościowej Kamila.",
      "Wydruk zawiera godzinę 00:49:03.",
      "Obsługa nie pamięta, czy Kamil był przy stoliku dokładnie w chwili wydruku.",
      "Terminal podczas tej części trasy miał niestabilne połączenie z siecią.",
    ],
    question:
      "Czy godzina na paragonie mówi, kiedy Kamil zamawiał, czy kiedy terminal zsynchronizował transakcję?",
    function: "czerwony_trop",
  },
];

export const OSTATNI_KURS_EVIDENCE_B: OstatniKursEvidence[] = [
  {
    id: "receipt-metadata",
    no: "B-01",
    title: "Metadane transakcji POS-3",
    source: "Log terminala restauracyjnego",
    time: "00:34:12 → 00:49:03",
    summary:
      "Paragon Kamila został wydrukowany o 00:49, ale zamówienie utworzono i autoryzowano prawie 15 minut wcześniej.",
    details: [
      "Utworzenie zamówienia: 00:34:12.",
      "Autoryzacja płatności offline: 00:34:19.",
      "Synchronizacja i wydruk: 00:49:03.",
      "Godzina 00:49 nie potwierdza obecności Kamila w W3.",
    ],
    question:
      "Jeżeli paragon nie jest alibi, gdzie Kamil mógł być między 00:36 a 00:54?",
    function: "podważa",
  },
  {
    id: "service-door-log",
    no: "B-02",
    title: "Log drzwi W5↔W6 i szafy S-3",
    source: "Sterownik strefy serwisowej",
    time: "00:45:12–00:54:37",
    summary:
      "W czasie, gdy Adrian przestaje być widziany, ktoś używa zaginionego klucza M-1 przy przejściu do W6 i narusza plombę elektroniczną szafy S-3.",
    details: [
      "00:45:12 — M-1 otwiera przejście W5→W6.",
      "00:47:05 — plomba szafy S-3 zmienia stan z „zamknięta” na „naruszona”.",
      "00:54:37 — M-1 ponownie otwiera przejście W6→W5.",
      "Brak jakiegokolwiek zaplanowanego zadania obsługi w W6 w tym przedziale.",
    ],
    question:
      "Co zostało przeniesione do W6 przed postojem i dlaczego ktoś wracał stamtąd po odjeździe?",
    function: "łączy",
  },
  {
    id: "northbridge-file",
    no: "B-03",
    title: "Plik „NORTHBRIDGE / do przekazania”",
    source: "Zaszyfrowany katalog Adriana · kopia robocza",
    time: "ostatnia edycja 23:41",
    summary:
      "Adrian przygotował zestaw przelewów wskazujących, że firma Northbridge Consulting była wykorzystywana do wyprowadzania pieniędzy z Vektor Cargo.",
    details: [
      "W metadanych dokumentu pojawiają się inicjały „K.D.” jako osoba zatwierdzająca część przelewów.",
      "Adrian dopisał: „Kamil — rozmowa 00:40, W5. Ostatnia szansa na wyjaśnienie”.",
      "Plik miał trafić rano do zewnętrznej kancelarii i organów ścigania.",
      "Część oryginalnych potwierdzeń znajdowała się na małej karcie pamięci, której nie znaleziono przy bagażu.",
    ],
    question:
      "Kto miał osobisty interes w zatrzymaniu materiałów jeszcze przed końcem podróży?",
    function: "łączy",
  },
  {
    id: "phone-wifi",
    no: "B-04",
    title: "Telefon Kamila w sieci wagonu W3",
    source: "Log punktu Wi-Fi ORION-W3",
    time: "00:36:08–00:56:02",
    summary:
      "Telefon Kamila przez cały kluczowy przedział pozostaje połączony z punktem dostępowym W3. To wygląda jak alibi, dopóki nie oddzieli się urządzenia od człowieka.",
    details: [
      "Urządzenie nie przełącza się na punkty dostępowe W4 ani W5.",
      "Połączenie jest stabilne i wskazuje, że telefon pozostał w W3.",
      "Przy stoliku 4 znajduje się ogólnodostępna ładowarka.",
      "Świadek z obsługi pamięta telefon pozostawiony przy stoliku bez właściciela.",
    ],
    question:
      "Czy log sieci pokazuje lokalizację Kamila, czy wyłącznie jego telefonu?",
    function: "podważa",
  },
  {
    id: "corridor-audio",
    no: "B-05",
    title: "Nagranie z korytarza W5",
    source: "Prywatny dyktafon Niny Radeckiej",
    time: "00:41:38",
    summary:
      "W tle nieautoryzowanego nagrania słychać fragment ostrej rozmowy dochodzącej z okolicy przedziału 7.",
    details: [
      "Męski głos mówi: „Nie zabierzesz tego rano dalej”.",
      "Drugi męski głos odpowiada: „To już nie jest do cofnięcia”.",
      "Po około 40 sekundach słychać uderzenie i przesunięcie ciężkiego przedmiotu.",
      "Nagranie nie daje wiarygodnej identyfikacji głosu.",
    ],
    question:
      "Z czym rozmówca nie chciał pozwolić Adrianowi dotrzeć do końca podróży?",
    function: "potwierdza",
  },
];

export const OSTATNI_KURS_TWIST_EVIDENCE: OstatniKursEvidence = {
  id: "platform-return",
  no: "T-01",
  title: "Drugi kąt kamery peronowej",
  source: "Kamera P-4 · Brzeziny Północne",
  time: "00:53:06",
  summary:
    "Postać w camelowym płaszczu nie opuszcza stacji. Po przejściu za słupem zawraca i ponownie wchodzi do W6 na 57 sekund przed odjazdem.",
  details: [
    "00:52:31 — postać wychodzi z W6.",
    "00:53:06 — kamera P-4 rejestruje tę samą osobę zawracającą.",
    "00:53:21 — tylne drzwi W6 zamykają się.",
    "Pociąg odjeżdża o 00:54:03.",
    "Adrian nie mógł zniknąć poprzez wyjście na peron — wyjście zostało upozorowane.",
  ],
  question:
    "Jeżeli Adrian nie wysiadł, kto założył jego płaszcz i co w tym czasie znajdowało się w W6?",
  function: "wyklucza",
};

export const OSTATNI_KURS_ALL_EVIDENCE = [
  ...OSTATNI_KURS_EVIDENCE_A,
  ...OSTATNI_KURS_EVIDENCE_B,
  OSTATNI_KURS_TWIST_EVIDENCE,
];

export const OSTATNI_KURS_INTERROGATIONS: OstatniKursInterrogation[] = [
  {
    roleKey: "ok_manager",
    headline: "Klucz M-1 i procedury obsługi",
    prompts: [
      "Kiedy dokładnie zauważyłaś, że klucza M-1 nie ma na tablicy?",
      "Kto mógł wejść do biurka obsługi w W3 bez zwracania uwagi?",
      "Dlaczego nie zgłosiłaś braku klucza od razu?",
    ],
    pressurePoint: "Oddziel zaniedbanie procedury od samego zniknięcia Adriana.",
  },
  {
    roleKey: "ok_fixer",
    headline: "Alibi w wagonie restauracyjnym",
    prompts: [
      "Kiedy dokładnie zamówiłeś kawę i kiedy ostatni raz widział Cię ktoś przy stoliku?",
      "Czy zostawiłeś telefon przy ładowarce w W3?",
      "Czy znałeś Adriana przed tą podróżą i czy miałeś z nim umówioną rozmowę?",
    ],
    pressurePoint: "Nie uznawaj paragonu ani telefonu za dowód obecności człowieka.",
  },
  {
    roleKey: "ok_podcaster",
    headline: "Spotkanie z Adrianem i tajne nagranie",
    prompts: [
      "Dlaczego miałaś spotkać się z Adrianem o 01:00?",
      "Kogo widziałaś opuszczającego W3 około 00:36?",
      "Dlaczego nagrywałaś korytarz W5 bez zgody innych osób?",
    ],
    pressurePoint: "Jej zatajenie dotyczy sposobu zdobywania materiału, nie motywu zabójstwa.",
  },
  {
    roleKey: "ok_railfan",
    headline: "Łącznik W3↔W4",
    prompts: [
      "Skąd wiesz, że przejście było zamknięte od 00:46 do 00:54:20?",
      "Czy dało się wtedy wrócić z W5 do W3 wnętrzem pociągu?",
      "Dlaczego robiłeś zdjęcia panelu technicznego?",
    ],
    pressurePoint: "To ważne dla oceny tras, ale samo naruszenie regulaminu nie czyni go sprawcą.",
  },
  {
    roleKey: "ok_partner",
    headline: "Konflikt finansowy z Adrianem",
    prompts: [
      "Dlaczego Adrian zakończył z Tobą współpracę?",
      "Czy miał dokumenty, które mogły zaszkodzić również Tobie?",
      "Kto może potwierdzić, gdzie byłaś od 00:42 do 00:53?",
    ],
    pressurePoint: "Ma wiarygodny motyw poboczny, więc wymagaj też realnej możliwości działania.",
  },
  {
    roleKey: "ok_attendant",
    headline: "Korytarz W5",
    prompts: [
      "Kogo widziałaś w pobliżu przedziału 7 około 00:39?",
      "Czy Adrian miał na sobie camelowy płaszcz, kiedy wrócił do przedziału?",
      "Dlaczego nie powiedziałaś od razu, że byłaś w strefie serwisowej?",
    ],
    pressurePoint: "Jej własne złamanie zakazu palenia tłumaczy początkowe milczenie.",
  },
  {
    roleKey: "ok_lawyer",
    headline: "Oferta dla Adriana",
    prompts: [
      "Czy reprezentowałaś Vektor Cargo podczas tej podróży?",
      "Co proponowałaś Adrianowi w zamian za wstrzymanie materiałów?",
      "Czy znałaś Northbridge Consulting?",
    ],
    pressurePoint: "Jej działania wyglądają źle, ale nie umieszczaj jej automatycznie w W5.",
  },
  {
    roleKey: "ok_courier",
    headline: "Dostęp do W6",
    prompts: [
      "Dlaczego byłeś wcześniej w wagonie bagażowym?",
      "Co znajdowało się w Twojej przesyłce?",
      "Czy korzystałeś z klucza M-1 po północy?",
    ],
    pressurePoint: "Ma powód, by ukrywać wizyty w W6, ale godziny muszą się zgadzać.",
  },
  {
    roleKey: "ok_vlogger",
    headline: "Nagranie z peronu",
    prompts: [
      "Dlaczego usunęłaś część materiału z Brzezin Północnych?",
      "Czy kamera nagrywała również moment po przejściu postaci za słup?",
      "Czy postać w płaszczu rzeczywiście opuściła peron?",
    ],
    pressurePoint: "Jej surowy materiał staje się ważniejszy niż pierwsza stopklatka.",
  },
  {
    roleKey: "ok_steward",
    headline: "Telefon i paragon Kamila",
    prompts: [
      "Kiedy Kamil faktycznie zamawiał przy stoliku 4?",
      "Czy widziałeś jego telefon pozostawiony przy ładowarce?",
      "Dlaczego terminal wydrukował paragon dopiero o 00:49?",
    ],
    pressurePoint: "Pokaż różnicę między czasem zamówienia a czasem synchronizacji.",
  },
  {
    roleKey: "ok_engineer",
    headline: "Reset łącznika",
    prompts: [
      "Co spowodowało blokadę W3↔W4?",
      "Czy można było obejść blokadę wnętrzem składu?",
      "Czy reset miał cokolwiek wspólnego z kluczem M-1?",
    ],
    pressurePoint: "Awaria jest prawdziwa, ale nie była zaplanowaną częścią przestępstwa.",
  },
  {
    roleKey: "ok_sister",
    headline: "Płaszcz i zachowanie Adriana",
    prompts: [
      "Czy Adrian rzeczywiście miał tej nocy camelowy płaszcz?",
      "Czy sposób poruszania się osoby z kamery przypomina Ci Adriana?",
      "O co pokłóciliście się przed podróżą?",
    ],
    pressurePoint: "Rodzinny konflikt tworzy motyw emocjonalny, ale jej obserwacja płaszcza jest ważniejsza.",
  },
];

export const OSTATNI_KURS_MOTIVE_OPTIONS = [
  { key: "embezzlement", label: "Ukrycie wyprowadzania pieniędzy z Vektor Cargo" },
  { key: "personal_debt", label: "Prywatny dług i konflikt finansowy" },
  { key: "legal_pressure", label: "Powstrzymanie procesu i ugody prawnej" },
  { key: "smuggling", label: "Ukrycie przemytu w wagonie bagażowym" },
] as const;

export const OSTATNI_KURS_DISAPPEARANCE_OPTIONS = [
  { key: "staged_exit", label: "Upozorowane wysiadanie w płaszczu Adriana" },
  { key: "real_exit", label: "Adrian naprawdę wysiadł w Brzezinach" },
  { key: "staff_conspiracy", label: "Obsługa wyprowadziła Adriana przejściem technicznym" },
  { key: "hidden_transfer", label: "Adriana przeniesiono do innego wagonu po odjeździe" },
] as const;

export const OSTATNI_KURS_RECONSTRUCTION_EVENTS = [
  { key: "phone_left", title: "Telefon zostaje w W3", time: "00:36", copy: "Kamil zostawia urządzenie przy ładowarce i znika ze stolika." },
  { key: "meeting_w5", title: "Spotkanie w przedziale 7", time: "00:39", copy: "Kamil dociera do W5 na umówioną rozmowę z Adrianem." },
  { key: "fatal_conflict", title: "Konfrontacja wymyka się spod kontroli", time: "00:43", copy: "Adrian doznaje śmiertelnego urazu podczas gwałtownej szarpaniny." },
  { key: "move_w6", title: "Przeniesienie do W6", time: "00:45", copy: "Zaginiony klucz M-1 otwiera strefę serwisową." },
  { key: "locker_s3", title: "Naruszenie szafy S-3", time: "00:47", copy: "Ciało zostaje ukryte w zamykanej szafie na zapasy bielizny." },
  { key: "receipt_sync", title: "Paragon drukuje się bez Kamila", time: "00:49", copy: "Terminal synchronizuje wcześniejszą transakcję i tworzy pozorne alibi." },
  { key: "coat_exit", title: "Postać w płaszczu wychodzi z W6", time: "00:52", copy: "Kamil zakłada płaszcz Adriana i wychodzi na peron." },
  { key: "coat_return", title: "Postać wraca do W6", time: "00:53", copy: "Druga kamera rejestruje powrót do pociągu." },
  { key: "return_w3", title: "Powrót do W3", time: "00:56", copy: "Po odblokowaniu łącznika Kamil wraca po pozostawiony telefon." },
  { key: "real_exit", title: "Adrian opuszcza pociąg", time: "00:52", copy: "Postać w płaszczu jest Adrianem i naprawdę zostaje na stacji." },
  { key: "manager_help", title: "Kierowniczka pomaga ukryć Adriana", time: "00:47", copy: "Marta świadomie wykorzystuje klucz M-1, aby pomóc sprawcy." },
] as const;

export function getOstatniKursEvidenceForPhase(phase: string | null | undefined) {
  if (!phase) return [] as OstatniKursEvidence[];
  if (phase.startsWith("ok_a_")) {
    const count = Math.max(0, Math.min(5, Number(phase.replace("ok_a_", "")) || 0));
    return OSTATNI_KURS_EVIDENCE_A.slice(0, count);
  }
  if (["ok_mapa","ok_przesluchania"].includes(phase)) return OSTATNI_KURS_EVIDENCE_A;
  if (phase.startsWith("ok_b_")) {
    const count = Math.max(0, Math.min(5, Number(phase.replace("ok_b_", "")) || 0));
    return [...OSTATNI_KURS_EVIDENCE_A, ...OSTATNI_KURS_EVIDENCE_B.slice(0, count)];
  }
  if (["ok_nowy_trop","ok_rekonstrukcja","ok_rekonstrukcja_wynik","ok_oskarzenie"].includes(phase) || phase.startsWith("ok_ujawnienie_")) {
    return OSTATNI_KURS_ALL_EVIDENCE;
  }
  return [];
}

export function getOstatniKursInterrogation(roleKey: string) {
  return OSTATNI_KURS_INTERROGATIONS.find((item) => item.roleKey === roleKey) ?? null;
}
