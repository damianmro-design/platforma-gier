export type NightCase = {
  slug: string;
  number: string;
  title: string;
  setting: string;
  players: string;
  duration: string;
  difficulty: "łatwa" | "średnia" | "trudna";
  premise: string;
  hook: string;
  investigationMotifs: string[];
};

export const AKTA_NOCY_PHASES = [
  {
    no: "00",
    title: "Akta osobowe",
    copy: "Każdy dostaje postać, publiczną historię, prywatny sekret, fragment osi czasu i cel na rozgrywkę.",
  },
  {
    no: "01",
    title: "Pierwsze zeznania",
    copy: "Gracze po kolei opisują, gdzie byli i co robili. Nie każdy ma powód, żeby mówić całą prawdę.",
  },
  {
    no: "02",
    title: "Paczka dowodowa A",
    copy: "Na wspólnym ekranie pojawiają się pierwsze dokumenty, zdjęcia, logi i ślady, które można zestawić z zeznaniami.",
  },
  {
    no: "03",
    title: "Przesłuchania",
    copy: "System wskazuje osoby do przepytania i podsuwa pytania wynikające z ujawnionych sprzeczności.",
  },
  {
    no: "04",
    title: "Paczka dowodowa B",
    copy: "Dochodzi druga warstwa śledztwa: dane z telefonu, monitoring, finanse, ślady cyfrowe i nowe zeznania.",
  },
  {
    no: "05",
    title: "Rekonstrukcja nocy",
    copy: "Grupa układa najważniejsze wydarzenia w kolejności i musi wskazać, które elementy historii zostały upozorowane.",
  },
  {
    no: "06",
    title: "Akt oskarżenia",
    copy: "Każdy prywatnie wskazuje sprawcę, motyw i najważniejszy dowód. Odpowiedzi pozostają tajne do końca.",
  },
  {
    no: "07",
    title: "Ujawnienie",
    copy: "Gra odtwarza prawdziwy przebieg wydarzeń, pokazuje kłamstwa, fałszywe tropy i dowody, które prowadziły do rozwiązania.",
  },
] as const;

export const AKTA_NOCY_CASES: NightCase[] = [
  {
    slug: "apartament-214",
    number: "001",
    title: "Apartament 214",
    setting: "Hotel Nocturne, noc po zamkniętej gali",
    players: "5–12 graczy",
    duration: "75–105 min",
    difficulty: "średnia",
    premise:
      "Znany dziennikarz śledczy zostaje znaleziony martwy w zamkniętym apartamencie. Kilkanaście minut wcześniej z jego telefonu wyszła wiadomość, a korytarzowy monitoring ma dokładnie 8 minut luki.",
    hook:
      "Każda osoba obecna tej nocy coś ukrywa. Tylko jedna ukrywa samą zbrodnię.",
    investigationMotifs: [
      "upozorowane miejsce zdarzenia",
      "sprzeczna oś czasu",
      "mylący znacznik czasu wiadomości",
      "logi wejść i monitoring",
      "sekret finansowy",
      "fałszywe alibi",
    ],
  },
];
