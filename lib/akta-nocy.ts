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
  openingStatement: string;
  privateKnowledge: string[];
  timeline: string[];
  core: boolean;
  isCulprit: boolean;
  culpritBriefing?: string;
};

export const APARTAMENT_214_ROLES: AktaNocyRole[] = [
  {
    id: "manager",
    name: "Nora Kwiecień",
    shortLabel: "Menedżerka hotelu",
    publicBio: "Odpowiadasz za Hotel Nocturne i przebieg zamkniętej gali. Zależy Ci, żeby skandal nie zniszczył reputacji obiektu.",
    privateSecret: "Od kilku dni wiedziałaś, że zamek w apartamencie 214 czasami nie zapisuje poprawnie każdego otwarcia. Nie zgłosiłaś tego właścicielom.",
    objective: "Chroń hotel przed skandalem, ale nie blokuj śledztwa, jeśli ktoś przedstawi twardy dowód.",
    openingStatement: "Powiedz, że około 22:40 widziałaś Marka żywego i zdenerwowanego. Nie wspominaj od razu o usterce zamka.",
    privateKnowledge: [
      "Apartament 214 miał wcześniej problem z rejestrem zamka elektronicznego.",
      "O 22:52 ktoś z obsługi zgłosił Ci, że na 2 piętrze przez chwilę nie działał podgląd kamer.",
      "Marek wcześniej pytał Cię, kto może wejść do strefy VIP bez wpisywania się na listę.",
    ],
    timeline: [
      "22:40, mijasz Marka przy windzie, jest wyraźnie zdenerwowany.",
      "22:46, schodzisz do recepcji.",
      "22:52, odbierasz telefon od obsługi dotyczący problemu z monitoringiem.",
      "23:05, słyszysz o znalezieniu Marka w apartamencie 214.",
    ],
    core: true,
    isCulprit: false,
  },
  {
    id: "technician",
    name: "Paweł Lis",
    shortLabel: "Technik monitoringu",
    publicBio: "Obsługujesz monitoring, zamki elektroniczne i zaplecze techniczne hotelu.",
    privateSecret: "To Ty ręcznie usunąłeś fragment nagrania z korytarza między 22:48 a 22:56, ale zrobiłeś to, żeby ukryć własne złamanie regulaminu, nie zbrodnię.",
    objective: "Jak najdłużej ukrywaj fakt skasowania nagrania. Jeśli dowody zaczną wskazywać, że luka była celowa, możesz przyznać się do prawdziwego powodu.",
    openingStatement: "Twierdzisz, że awaria monitoringu była przypadkowa i zajmowałeś się serwerownią.",
    privateKnowledge: [
      "Usunięty materiał obejmuje dokładnie korytarz prowadzący do apartamentu 214.",
      "Nie wiesz, kto w tym czasie przechodził korytarzem.",
      "System zamków odnotował nietypowy błąd synchronizacji w pokoju 214.",
    ],
    timeline: [
      "22:44, opuszczasz stanowisko monitoringu.",
      "22:48, zaczynasz ręcznie usuwać fragment zapisu.",
      "22:56, monitoring znowu zapisuje obraz normalnie.",
      "23:03, wracasz do stanowiska technicznego.",
    ],
    core: true,
    isCulprit: false,
  },
  {
    id: "partner",
    name: "Lena Brzoza",
    shortLabel: "Partnerka ofiary",
    publicBio: "Przyjechałaś na galę z Markiem. W ostatnich tygodniach Wasza relacja była napięta.",
    privateSecret: "Przed galą odkryłaś, że Marek przechowuje na pendrivie materiały dotyczące także Ciebie. Chciałaś go zabrać, zanim tekst trafi do publikacji.",
    objective: "Nie pozwól, by grupa uznała próbę zdobycia pendrive'a za dowód morderstwa.",
    openingStatement: "Przyznaj, że pokłóciliście się o pracę Marka, ale utrzymuj, że po 22:35 już do niego nie wracałaś.",
    privateKnowledge: [
      "Marek powiedział Ci: „Jeżeli Wicher dowie się, co mam, będzie po wszystkim”.",
      "Po kłótni zauważyłaś Maksa Wichra idącego w stronę wind.",
      "Pendrive, którego szukałaś, zniknął z torby Marka.",
    ],
    timeline: [
      "22:35, kończy się Wasza głośna kłótnia.",
      "22:39, schodzisz na dół i rozmawiasz z gośćmi gali.",
      "22:47, widzisz z daleka Maksa przy windzie.",
      "23:04, dowiadujesz się, że Marek nie odpowiada.",
    ],
    core: true,
    isCulprit: false,
  },
  {
    id: "reporter",
    name: "Maks Wicher",
    shortLabel: "Młody reporter",
    publicBio: "Od miesięcy próbujesz wejść do zespołu Marka. Publicznie przedstawiasz go jako swojego mentora.",
    privateSecret: "Marek odkrył, że w poprzednim materiale złamałeś zasady pracy dziennikarskiej i zamierzał ujawnić to redakcji.",
    objective: "Nie dopuść, aby grupa połączyła Cię z chwilą śmierci Marka ani z wiadomością wysłaną później z jego konta.",
    openingStatement: "Mów, że około 22:50 czekałeś przy windzie, ale nie wszedłeś do apartamentu Marka.",
    privateKnowledge: [
      "Wiedziałeś, że Marek ma przygotowany materiał, który mógł zakończyć Twoją karierę.",
      "Wiadomość wysłana po śmierci Marka nie dowodzi, że wtedy żył.",
      "Pendrive z roboczymi materiałami Marka nie znajdował się już w apartamencie, gdy odkryto ciało.",
    ],
    timeline: [
      "22:47, idziesz na 2 piętro, żeby porozmawiać z Markiem.",
      "22:50–22:54, jesteś w apartamencie 214.",
      "22:55, opuszczasz korytarz w czasie luki monitoringu.",
      "22:58, wysyłasz ze swojego telefonu wiadomość mającą stworzyć Ci alibi.",
    ],
    core: true,
    isCulprit: true,
    culpritBriefing: "TO TY DOPROWADZIŁEŚ DO ŚMIERCI MARKA. Konfrontacja wymknęła się spod kontroli. Po zdarzeniu próbowałeś przesunąć domniemany czas śmierci, korzystając z urządzenia Marka, i zabrałeś pendrive z materiałem na swój temat. Nie planowałeś wcześniej luki w monitoringu i nie wiesz, dlaczego nagranie zniknęło. Możesz kłamać, przemilczać fakty i kierować podejrzenia na innych, ale nie wymyślaj informacji, których nie ma w Twoich aktach.",
  },
  {
    id: "investor",
    name: "Igor Serafin",
    shortLabel: "Sponsor gali",
    publicBio: "Jesteś wpływowym inwestorem i głównym sponsorem wydarzenia. Marek od miesięcy interesował się Twoimi interesami.",
    privateSecret: "Wiedziałeś, że Marek przygotowuje publikację mogącą uderzyć w Twoją firmę. Próbowałeś ją zatrzymać za pośrednictwem prawniczki.",
    objective: "Broń się przed oczywistym motywem finansowym, ale nie zaprzeczaj rzeczom, które mogą zostać potwierdzone dokumentami.",
    openingStatement: "Przyznaj, że rozmawiałeś z Markiem, ale przedstaw rozmowę jako zawodowy spór bez gróźb.",
    privateKnowledge: [
      "Marek miał dwa różne materiały, jeden dotyczący Twojej firmy, drugi kogoś z branży medialnej.",
      "Adriana Falk próbowała negocjować z Markiem przed galą.",
      "Po 22:47 byłeś w lobby przy stoliku sponsora i kilka osób mogło Cię widzieć.",
    ],
    timeline: [
      "22:43, kończysz krótką, napiętą rozmowę z Markiem.",
      "22:47, schodzisz do lobby.",
      "22:50–23:00, rozmawiasz z partnerami biznesowymi.",
      "23:06, ochrona prosi wszystkich o pozostanie w hotelu.",
    ],
    core: true,
    isCulprit: false,
  },
  {
    id: "waitress",
    name: "Sara Milewska",
    shortLabel: "Kelnerka nocnej zmiany",
    publicBio: "Obsługiwałaś strefę VIP na 2 piętrze i wielokrotnie przechodziłaś obok apartamentu 214.",
    privateSecret: "W czasie śledztwa zataiłaś, że podczas luki monitoringu widziałaś młodego mężczyznę szybko opuszczającego korytarz.",
    objective: "Zdecyduj, kiedy ujawnić to, co widziałaś. Boisz się, że zostaniesz oskarżona o wcześniejsze zatajenie informacji.",
    openingStatement: "Powiedz tylko, że około 22:48 zanosiłaś lód na 2 piętro.",
    privateKnowledge: [
      "Około 22:55 widziałaś Maksa Wichra przy wyjściu z korytarza.",
      "Nie wyglądał, jakby spokojnie czekał na windę.",
      "Kilka minut wcześniej drzwi 214 były zamknięte.",
    ],
    timeline: [
      "22:48, wchodzisz na 2 piętro z wiaderkiem lodu.",
      "22:51, obsługujesz gościa po drugiej stronie korytarza.",
      "22:55, widzisz Maksa opuszczającego strefę.",
      "23:02, wracasz do zaplecza.",
    ],
    core: false,
    isCulprit: false,
  },
  {
    id: "security",
    name: "Hubert Cichy",
    shortLabel: "Ochroniarz",
    publicBio: "Pilnujesz przejścia do części VIP. Tej nocy to Ty odpowiadałeś za kontrolę dostępu.",
    privateSecret: "Na kilka minut opuściłeś posterunek bez wpisu do raportu, żeby załatwić prywatną sprawę.",
    objective: "Nie przyznawaj się od razu do zaniedbania, bo może kosztować Cię pracę.",
    openingStatement: "Twierdzisz, że ruch do strefy VIP był przez całą noc kontrolowany.",
    privateKnowledge: [
      "Między 22:46 a 22:53 nie było Cię na posterunku.",
      "Maks Wicher miał identyfikator pozwalający wejść do strefy VIP.",
      "Igor Serafin po 22:47 wracał do lobby, nie w stronę apartamentów.",
    ],
    timeline: [
      "22:42, jesteś przy wejściu VIP.",
      "22:46, opuszczasz stanowisko.",
      "22:53, wracasz na posterunek.",
      "23:05, dostajesz wezwanie do apartamentu 214.",
    ],
    core: false,
    isCulprit: false,
  },
  {
    id: "lawyer",
    name: "Adriana Falk",
    shortLabel: "Prawniczka sponsora",
    publicBio: "Reprezentujesz interesy Igora Serafina i jego firmy. Z Markiem kontaktowałaś się już przed galą.",
    privateSecret: "Próbowałaś nakłonić Marka do wstrzymania jednej z publikacji i zaoferowałaś formalne porozumienie, którego nie chciał podpisać.",
    objective: "Nie dopuść, by negocjacje zostały przedstawione jako groźba lub zlecenie uciszenia Marka.",
    openingStatement: "Powiedz, że kontakt z Markiem dotyczył zwykłej sprawy prawnej.",
    privateKnowledge: [
      "Draft dotyczący Igora nie był materiałem, którego Marek najbardziej pilnował tej nocy.",
      "W jednej rozmowie Marek powiedział: „Największy problem mam teraz we własnym środowisku”.",
      "O 22:51 Igor wysłał Ci wiadomość z lobby.",
    ],
    timeline: [
      "22:41, wysyłasz Markowi 2 wiadomości.",
      "22:49, jesteś na sali głównej.",
      "22:51, dostajesz wiadomość od Igora.",
      "23:07, prosisz organizatorów, by nikt nie rozmawiał z mediami.",
    ],
    core: false,
    isCulprit: false,
  },
  {
    id: "photographer",
    name: "Tomasz Rey",
    shortLabel: "Fotograf gali",
    publicBio: "Dokumentujesz galę i przemieszczasz się między lobby, schodami i strefą VIP.",
    privateSecret: "Masz zdjęcie zrobione przypadkiem przy schodach. W odbiciu lustra widać fragment korytarza i osobę, której początkowo nie zauważyłeś.",
    objective: "Nie ujawniaj zdjęcia bez potrzeby, bo sam wszedłeś wtedy do strefy, w której nie powinieneś fotografować.",
    openingStatement: "Powiedz, że między 22:45 a 22:50 robiłeś zdjęcia przy schodach.",
    privateKnowledge: [
      "Na zdjęciu z 22:49 w odbiciu widać osobę z identyfikatorem prasowym.",
      "Zdjęcie zostało wykonane jeszcze przed końcem luki monitoringu.",
      "Nie potrafisz z samego odbicia rozpoznać twarzy.",
    ],
    timeline: [
      "22:45, kończysz zdjęcia w lobby.",
      "22:49, robisz serię zdjęć przy schodach.",
      "22:54, wracasz na salę główną.",
      "23:03, zgrywasz część zdjęć na laptop.",
    ],
    core: false,
    isCulprit: false,
  },
  {
    id: "doctor",
    name: "Julia Narew",
    shortLabel: "Lekarka, gościni gali",
    publicBio: "Nie jesteś związana z hotelem. Po odnalezieniu Marka jako pierwsza sprawdziłaś jego stan.",
    privateSecret: "Twoja pierwsza ocena wskazuje, że Marek prawdopodobnie nie żył już wtedy, gdy z jego konta wysłano późniejszą wiadomość.",
    objective: "Oddzielaj obserwacje medyczne od domysłów i nie pozwól grupie traktować czasu wysłania wiadomości jako pewnego czasu zgonu.",
    openingStatement: "Powiedz, że weszłaś do pokoju dopiero po wezwaniu pomocy.",
    privateKnowledge: [
      "Stan ciała sugerował, że śmierć nastąpiła przed wiadomością wysłaną o 23:02.",
      "Nie możesz podać dokładnej minuty śmierci.",
      "Układ miejsca zdarzenia nie pasował Ci do pierwszego opisu wypadku.",
    ],
    timeline: [
      "22:50–23:03, jesteś na sali głównej.",
      "23:06, zostajesz wezwana do apartamentu 214.",
      "23:07, stwierdzasz brak oznak życia.",
      "23:09, prosisz, by nikt niczego nie dotykał.",
    ],
    core: false,
    isCulprit: false,
  },
  {
    id: "assistant",
    name: "Oskar Dębski",
    shortLabel: "Asystent ofiary",
    publicBio: "Znasz kalendarz Marka, jego źródła i sposób pracy lepiej niż ktokolwiek na gali.",
    privateSecret: "Bez zgody Marka skopiowałeś wcześniej część jego plików, bo bałeś się, że stracisz dostęp do ważnego śledztwa.",
    objective: "Ukryj nieautoryzowane kopiowanie danych, ale pomagaj grupie rozumieć sposób pracy Marka.",
    openingStatement: "Powiedz, że przed 22:32 Marek wysłał Cię po dokumenty i długo nie było Cię na 2 piętrze.",
    privateKnowledge: [
      "Marek korzystał na laptopie z tej samej aplikacji wiadomości co na telefonie.",
      "Jeden z najnowszych plików roboczych miał w nazwie słowo „WICHER”.",
      "Marek zawsze nosił ważne materiały na niewielkim czarnym pendrivie.",
    ],
    timeline: [
      "22:32, Marek wysyła Cię po dokumenty do samochodu.",
      "22:38, wychodzisz z hotelu.",
      "22:58, wracasz do lobby.",
      "23:04, próbujesz dodzwonić się do Marka.",
    ],
    core: false,
    isCulprit: false,
  },
  {
    id: "guest",
    name: "Mira Solska",
    shortLabel: "Gościni gali",
    publicBio: "Relacjonujesz wydarzenie w mediach społecznościowych i nagrywasz krótkie materiały zza kulis.",
    privateSecret: "Nagrałaś film w strefie, w której organizator zabronił nagrywania. W tle słychać fragment ostrej rozmowy z korytarza.",
    objective: "Ukryj złamanie zasad gali, dopóki nagranie nie stanie się naprawdę ważne dla śledztwa.",
    openingStatement: "Powiedz, że około 22:49 nagrywałaś relację przy końcu korytarza.",
    privateKnowledge: [
      "Na nagraniu słychać męski głos mówiący: „Nie zniszczysz mi kariery”.",
      "Nagranie powstało około 22:51.",
      "Nie widać rozmówców, bo kamera była skierowana w przeciwną stronę.",
    ],
    timeline: [
      "22:48, wchodzisz na 2 piętro.",
      "22:51, nagrywasz krótką relację.",
      "22:53, schodzisz na salę główną.",
      "23:00, publikujesz inną relację z gali.",
    ],
    core: false,
    isCulprit: false,
  },
];

export function getAktaNocyRoles(playerCount: number) {
  const safeCount = Math.max(5, Math.min(12, playerCount));
  const core = APARTAMENT_214_ROLES.filter((role) => role.core);
  const optional = APARTAMENT_214_ROLES.filter((role) => !role.core);
  return [...core, ...optional.slice(0, safeCount - core.length)];
}

export function getAktaNocyRoleByKey(roleKey: string) {
  return APARTAMENT_214_ROLES.find((role) => role.id === roleKey) ?? null;
}
