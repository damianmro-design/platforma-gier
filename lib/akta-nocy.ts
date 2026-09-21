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

export type AktaNocyRole = {
  id: string;
  name: string;
  shortLabel: string;
  publicBio: string;
  privateSecret: string;
  objective: string;
  timeline: string;
  core: boolean;
};

export const APARTAMENT_214_ROLES: AktaNocyRole[] = [
  {
    id: "manager",
    name: "Nora Kwiecień",
    shortLabel: "Menedżerka hotelu",
    publicBio: "Dba o wizerunek hotelu i przebieg zamkniętej gali.",
    privateSecret: "Wie o usterce jednego z zamków i zataiła ten fakt po zdarzeniu.",
    objective: "Nie dopuścić, by śledztwo ujawniło zaniedbania hotelu.",
    timeline: "22:40 widziała ofiarę żywą, 22:52 odebrała niepokojący telefon.",
    core: true,
  },
  {
    id: "technician",
    name: "Paweł Lis",
    shortLabel: "Technik monitoringu",
    publicBio: "Odpowiada za kamery, zamki elektroniczne i system wejść.",
    privateSecret: "Usunął fragment nagrania, ale z powodu niezwiązanego bezpośrednio ze zbrodnią.",
    objective: "Nie przyznać się zbyt wcześnie do manipulacji nagraniem.",
    timeline: "22:47 był przy serwerowni, 22:55 wrócił na 2 piętro.",
    core: true,
  },
  {
    id: "partner",
    name: "Lena Brzoza",
    shortLabel: "Partnerka ofiary",
    publicBio: "Przyjechała na galę z Markiem. Wieczorem doszło między nimi do kłótni.",
    privateSecret: "Chciała odzyskać pendrive zawierający kompromitujące materiały.",
    objective: "Ukryć prawdziwy powód swojej ostatniej rozmowy z Markiem.",
    timeline: "22:35 pokłóciła się z ofiarą, później twierdzi, że już do niego nie wracała.",
    core: true,
  },
  {
    id: "reporter",
    name: "Maks Wicher",
    shortLabel: "Młody reporter",
    publicBio: "Podziwiał Marka i od miesięcy próbował wejść do jego zespołu.",
    privateSecret: "Przeszukiwał rzeczy ofiary, gdy sądził, że nikt go nie widzi.",
    objective: "Nie dopuścić, by grupa odkryła, czego naprawdę szukał.",
    timeline: "22:50 był widziany przy windzie, 22:58 wysłał nerwową wiadomość.",
    core: true,
  },
  {
    id: "investor",
    name: "Igor Serafin",
    shortLabel: "Sponsor gali",
    publicBio: "Wpływowy inwestor i główny sponsor wydarzenia.",
    privateSecret: "Marek posiadał materiały, które mogły zniszczyć jego reputację i interesy.",
    objective: "Odepchnąć podejrzenia od finansowego motywu konfliktu.",
    timeline: "22:43 rozmawiał z Markiem, potem twierdzi, że zszedł do lobby.",
    core: true,
  },
  {
    id: "waitress",
    name: "Sara Milewska",
    shortLabel: "Kelnerka nocnej zmiany",
    publicBio: "Obsługiwała 2 piętro i zamkniętą część VIP.",
    privateSecret: "Widziała osobę opuszczającą korytarz w czasie, którego nie podała ochronie.",
    objective: "Nie zostać wciągnięta w skandal i zachować pracę.",
    timeline: "22:48 zanosiła lód na 2 piętro.",
    core: false,
  },
  {
    id: "security",
    name: "Hubert Cichy",
    shortLabel: "Ochroniarz",
    publicBio: "Pilnował wejścia do części hotelu przeznaczonej dla gości VIP.",
    privateSecret: "Na kilka minut opuścił posterunek bez wpisu w raporcie.",
    objective: "Ukryć zaniedbanie, które mogło ułatwić komuś przejście.",
    timeline: "22:45 znika z miejsca pracy na kilka minut.",
    core: false,
  },
  {
    id: "lawyer",
    name: "Adriana Falk",
    shortLabel: "Prawniczka sponsora",
    publicBio: "Pojawiła się na gali jako doradczyni prawna jednego z najważniejszych gości.",
    privateSecret: "Próbowała powstrzymać publikację materiału przygotowywanego przez Marka.",
    objective: "Nie ujawniać całej treści rozmów dotyczących przygotowywanego tekstu.",
    timeline: "22:41 wysłała 2 wiadomości do ofiary.",
    core: false,
  },
  {
    id: "photographer",
    name: "Tomasz Rey",
    shortLabel: "Fotograf gali",
    publicBio: "Dokumentował wydarzenie i poruszał się po hotelu z aparatem.",
    privateSecret: "Ma zdjęcie wykonane przypadkiem w chwili, której oficjalnie nie pamięta.",
    objective: "Zdecydować, kiedy ujawnić fotografię, żeby nie obciążyć siebie.",
    timeline: "22:46 fotografował przy schodach prowadzących na 2 piętro.",
    core: false,
  },
  {
    id: "doctor",
    name: "Julia Narew",
    shortLabel: "Lekarka i gość gali",
    publicBio: "Jako pierwsza sprawdziła stan ofiary po jej odnalezieniu.",
    privateSecret: "Zauważyła szczegół medyczny, który nie pasuje do pierwszej wersji zdarzeń.",
    objective: "Ustalić, czy obserwacja jest ważna, zanim oskarży niewłaściwą osobę.",
    timeline: "23:06 weszła do apartamentu po wezwaniu pomocy.",
    core: false,
  },
  {
    id: "assistant",
    name: "Oskar Dębski",
    shortLabel: "Asystent ofiary",
    publicBio: "Znał kalendarz Marka, jego kontakty i planowaną publikację.",
    privateSecret: "Skopiował część plików Marka bez jego zgody.",
    objective: "Ukryć kradzież danych, ale pomóc odnaleźć właściwy motyw.",
    timeline: "22:32 dostał polecenie przyniesienia dokumentów, wrócił po 23:00.",
    core: false,
  },
  {
    id: "guest",
    name: "Mira Solska",
    shortLabel: "Gościni gali",
    publicBio: "Influencerka zaproszona do relacjonowania wydarzenia w social mediach.",
    privateSecret: "Nagrała krótki film, na którym w tle słychać rozmowę z korytarza.",
    objective: "Nie przyznać się od razu, że nagrywała w strefie, gdzie było to zabronione.",
    timeline: "22:49 publikowała relację z końca korytarza.",
    core: false,
  },
];

export function getAktaNocyRoles(playerCount: number) {
  const safeCount = Math.max(5, Math.min(12, playerCount));
  const core = APARTAMENT_214_ROLES.filter((role) => role.core);
  const optional = APARTAMENT_214_ROLES.filter((role) => !role.core);
  return [...core, ...optional.slice(0, safeCount - core.length)];
}
