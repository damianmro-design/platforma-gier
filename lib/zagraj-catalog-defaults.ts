export type CatalogPageSection = {
  id: string;
  kind: "info" | "steps" | "notice";
  title: string;
  body: string;
  bullets: string[];
  imagePath?: string;
};

export type CatalogPageRules = {
  schema: 1;
  items: string[];
};

export type CatalogGame = {
  slug: string;
  title: string; eyebrow: string; description: string; players: string; time: string; tags: string[];
  accent: "gold" | "pink" | "yellow" | "cyan" | "red" | "violet";
  art: "millionaire" | "floor" | "people" | "agent" | "crime" | "word" | "duo" | "cipher" | "auction";
  href?: string; external?: boolean; authHandoff?: "polowanie";
  status: "hit" | "new" | "soon"; minPlayers: number; maxPlayers: number; minTime: number; maxTime: number;
  categories: Array<"funny" | "strategic" | "team">;
  moods: Array<"laugh" | "think" | "compete" | "cooperate">;
  sortOrder: number; isVisible: boolean; pageSections?: CatalogPageSection[]; coverPath?: string; pageIntro?: string; pageRules?: CatalogPageRules | null;
};

// Bootstrap and outage fallback. Post-publication truth lives in the catalog database.
export const DEFAULT_GAME_CARDS: CatalogGame[] = [
  {
    "title": "Polowanie na Milionera",
    "eyebrow": "Duża gra wieczoru",
    "description": "Tajne role, zadania, blef, eliminacje i milion, który może zmieniać właściciela.",
    "players": "6–14 graczy",
    "time": "60–120 min",
    "accent": "gold",
    "art": "millionaire",
    "href": "https://polowanienamilionera.pl",
    "status": "hit",
    "authHandoff": "polowanie",
    "minPlayers": 6,
    "maxPlayers": 14,
    "minTime": 60,
    "maxTime": 120,
    "categories": [
      "strategic"
    ],
    "moods": [
      "think",
      "compete"
    ],
    "tags": [
      "strategia",
      "reality show",
      "ekran lub prowadzący"
    ],
    "external": true,
    "slug": "polowanie-na-milionera",
    "sortOrder": 0,
    "isVisible": true
  },
  {
    "title": "Floor Party",
    "eyebrow": "Obroń swoją podłogę",
    "description": "Zgaduj obrazy i hasła w pojedynkach, broń swojego pola i przejmuj terytorium rywali, aż cały Floor będzie należał do 1 gracza.",
    "players": "6–20 graczy",
    "time": "25–60 min",
    "accent": "pink",
    "art": "floor",
    "href": "https://floor-party.vercel.app",
    "status": "hit",
    "minPlayers": 6,
    "maxPlayers": 20,
    "minTime": 25,
    "maxTime": 60,
    "categories": [
      "funny",
      "strategic"
    ],
    "moods": [
      "laugh",
      "think",
      "compete"
    ],
    "tags": [
      "zgadywanie",
      "pojedynki",
      "wymagany prowadzący"
    ],
    "external": true,
    "slug": "floor-party",
    "sortOrder": 1,
    "isVisible": true
  },
  {
    "title": "CO LUDZIE POWIEDZĄ",
    "eyebrow": "Grywalna beta",
    "description": "Przewiduj najpopularniejsze odpowiedzi i sprawdź, czy naprawdę znasz swoją ekipę. Najlepiej działa przy 6–10 osobach.",
    "players": "4–14 graczy",
    "time": "45–75 min",
    "accent": "yellow",
    "art": "people",
    "href": "/gry/co-ludzie-powiedza",
    "status": "new",
    "minPlayers": 4,
    "maxPlayers": 14,
    "minTime": 45,
    "maxTime": 75,
    "categories": [
      "funny",
      "team"
    ],
    "moods": [
      "laugh",
      "compete",
      "cooperate"
    ],
    "tags": [
      "ankiety",
      "drużynowa",
      "wymagany prowadzący"
    ],
    "external": false,
    "slug": "co-ludzie-powiedza",
    "sortOrder": 2,
    "isVisible": true
  },
  {
    "title": "Pod Przykrywką",
    "eyebrow": "Dedukcja i blef",
    "description": "Jedna osoba działa przeciw grupie. Obserwuj, zbieraj tropy i odkryj, kto gra podwójną grę.",
    "players": "6–14 graczy",
    "time": "45–75 min",
    "accent": "cyan",
    "art": "agent",
    "href": "/gry/pod-przykrywka",
    "status": "new",
    "minPlayers": 6,
    "maxPlayers": 14,
    "minTime": 45,
    "maxTime": 75,
    "categories": [
      "strategic"
    ],
    "moods": [
      "think",
      "compete"
    ],
    "tags": [
      "psychologiczna",
      "tajna rola",
      "wymagany prowadzący"
    ],
    "external": false,
    "slug": "pod-przykrywka",
    "sortOrder": 3,
    "isVisible": true
  },
  {
    "title": "Akta Nocy",
    "eyebrow": "Interaktywne śledztwo",
    "description": "Role, sekrety, dowody i przesłuchania. Odtwórz przebieg zbrodni i wskaż sprawcę.",
    "players": "5–12 graczy",
    "time": "75–105 min",
    "accent": "red",
    "art": "crime",
    "href": "/gry/akta-nocy",
    "status": "new",
    "minPlayers": 5,
    "maxPlayers": 12,
    "minTime": 75,
    "maxTime": 105,
    "categories": [
      "strategic",
      "team"
    ],
    "moods": [
      "think",
      "cooperate"
    ],
    "tags": [
      "murder mystery",
      "dedukcja",
      "wymagany prowadzący"
    ],
    "external": false,
    "slug": "akta-nocy",
    "sortOrder": 4,
    "isVisible": true
  },
  {
    "title": "Zakręcone Hasło",
    "eyebrow": "Lekki teleturniej",
    "description": "Hasła, litery, koło ryzyka i zwroty akcji. Krótka gra, którą łatwo odpalić na każdej imprezie.",
    "players": "3–12 graczy",
    "time": "20–35 min",
    "accent": "violet",
    "art": "word",
    "href": "/gry/zakrecone-haslo",
    "status": "new",
    "minPlayers": 3,
    "maxPlayers": 12,
    "minTime": 20,
    "maxTime": 35,
    "categories": [
      "funny"
    ],
    "moods": [
      "laugh",
      "compete"
    ],
    "tags": [
      "słowna",
      "szybka",
      "bez prowadzącego"
    ],
    "external": false,
    "slug": "zakrecone-haslo",
    "sortOrder": 5,
    "isVisible": true
  },
  {
    "title": "TYLKO MY",
    "eyebrow": "Gra dla 2 osób",
    "description": "Gra dla 2 osób na 2 telefonach. Przewidujcie swoje wybory, szukajcie zgodności i sprawdzajcie momenty telepatii, bez wspólnego ekranu.",
    "players": "2 graczy",
    "time": "20–30 min",
    "accent": "pink",
    "art": "duo",
    "href": "/gry/tylko-my",
    "status": "new",
    "minPlayers": 2,
    "maxPlayers": 2,
    "minTime": 20,
    "maxTime": 30,
    "categories": [
      "funny"
    ],
    "moods": [
      "laugh",
      "cooperate"
    ],
    "tags": [
      "dla dwojga",
      "2 telefony",
      "telepatia"
    ],
    "external": false,
    "slug": "tylko-my",
    "sortOrder": 6,
    "isVisible": true
  },
  {
    "title": "SZYFR",
    "eyebrow": "Kooperacyjna misja",
    "description": "Każdy widzi inne informacje. Rozmawiajcie, łączcie tropy i rozwiązujcie kody, zanim skończy się czas.",
    "players": "2–6 graczy",
    "time": "30–45 min",
    "accent": "cyan",
    "art": "cipher",
    "href": "/gry/szyfr",
    "status": "new",
    "minPlayers": 2,
    "maxPlayers": 6,
    "minTime": 30,
    "maxTime": 45,
    "categories": [
      "strategic",
      "team"
    ],
    "moods": [
      "think",
      "cooperate"
    ],
    "tags": [
      "kooperacyjna",
      "escape room",
      "komunikacja"
    ],
    "external": false,
    "slug": "szyfr",
    "sortOrder": 7,
    "isVisible": true
  },
  {
    "title": "VA BANQUE",
    "eyebrow": "Licytacja i ryzyko",
    "description": "Licytuj kategorię, przejmuj pytania i decyduj, ile jesteś gotów postawić. Wiedza to dopiero połowa gry.",
    "players": "2–8 graczy",
    "time": "30–45 min",
    "accent": "gold",
    "art": "auction",
    "href": "/gry/va-banque",
    "status": "new",
    "minPlayers": 2,
    "maxPlayers": 8,
    "minTime": 30,
    "maxTime": 45,
    "categories": [
      "strategic"
    ],
    "moods": [
      "think",
      "compete"
    ],
    "tags": [
      "licytacja",
      "quiz",
      "ryzyko"
    ],
    "external": false,
    "slug": "va-banque",
    "sortOrder": 8,
    "isVisible": true
  }
];
