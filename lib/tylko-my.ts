export type TmSeat = "A" | "B";
export type TmQuestionType = "sync" | "predict" | "who" | "final";

export type TmOption = {
  value: string;
  label: string;
};

export type TmQuestion = {
  id: string;
  round: 1 | 2 | 3 | 4;
  roundLabel: string;
  eyebrow: string;
  type: TmQuestionType;
  prompt: string;
  options?: TmOption[];
  subject?: TmSeat;
  points: number;
};

const option = (value: string, label: string): TmOption => ({ value, label });

const ROUND_1_POOL: TmQuestion[] = [
  {
    id: "same-wave-evening",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Macie wolny wieczór i zero planów. Co brzmi najlepiej?",
    options: [
      option("serial", "Coś dobrego do jedzenia i serial"),
      option("city", "Spontaniczne wyjście na miasto"),
      option("game", "Gra albo mały domowy challenge"),
      option("walk", "Spacer i długa rozmowa"),
    ],
    points: 1,
  },
  {
    id: "same-wave-weekend",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Dostajecie niespodziewanie wolny weekend. Gdzie najchętniej znikacie?",
    options: [
      option("sea", "Nad morze"),
      option("mountains", "W góry"),
      option("citybreak", "Na city break"),
      option("cabin", "Do domku z dala od ludzi"),
    ],
    points: 1,
  },
  {
    id: "same-wave-food",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Macie zamówić jedną rzecz do wspólnego dzielenia. Co wygrywa?",
    options: [
      option("pizza", "Pizza"),
      option("sushi", "Sushi"),
      option("burger", "Burgery i frytki"),
      option("dessert", "Duży deser"),
    ],
    points: 1,
  },
  {
    id: "same-wave-money",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Dostajecie 500 zł tylko na wspólną przyjemność. Na co je wydajecie?",
    options: [
      option("trip", "Mały wyjazd"),
      option("food", "Dobra kolacja"),
      option("event", "Koncert albo wydarzenie"),
      option("thing", "Jedna rzecz, którą oboje chcecie"),
    ],
    points: 1,
  },
  {
    id: "same-wave-party",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Wpadacie na imprezę, na której prawie nikogo nie znacie. Jaki plan?",
    options: [
      option("mingle", "Poznajemy ludzi"),
      option("together", "Trzymamy się razem"),
      option("dance", "Idziemy tańczyć"),
      option("escape", "Dajemy jej godzinę i oceniamy"),
    ],
    points: 1,
  },
  {
    id: "same-wave-photo",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Macie zachować tylko jedno wspólne zdjęcie z całego roku. Jakie?",
    options: [
      option("trip", "Z podróży"),
      option("party", "Z imprezy"),
      option("random", "Zwykłe, przypadkowe"),
      option("beautiful", "Najładniejsze"),
    ],
    points: 1,
  },
  {
    id: "same-wave-rain",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Cały dzień leje i wszystkie plany odpadają. Co robicie?",
    options: [
      option("cook", "Gotujemy coś razem"),
      option("movies", "Maraton filmów"),
      option("games", "Gry i rywalizacja"),
      option("out", "I tak wychodzimy"),
    ],
    points: 1,
  },
  {
    id: "same-wave-song",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Macie wybrać jedną piosenkę, która natychmiast poprawia Wam humor. Jaki klimat?",
    options: [
      option("90s", "Hit z lat 90./2000"),
      option("dance", "Coś do tańczenia"),
      option("rock", "Głośny rock"),
      option("chill", "Spokojny chill"),
    ],
    points: 1,
  },
  {
    id: "same-wave-hotel",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Możecie dostać darmowy nocleg w jednym miejscu. Co wybieracie?",
    options: [
      option("luxury", "Luksusowy hotel"),
      option("villa", "Willa z basenem"),
      option("cabin", "Domek w naturze"),
      option("city", "Apartament w centrum"),
    ],
    points: 1,
  },
  {
    id: "same-wave-gift",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Ktoś chce Wam dać wspólny prezent. Co najbardziej Was ucieszy?",
    options: [
      option("experience", "Jakieś przeżycie"),
      option("food", "Kolacja"),
      option("tech", "Gadżet"),
      option("travel", "Voucher na wyjazd"),
    ],
    points: 1,
  },
  {
    id: "same-wave-queue",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Do miejsca, które chcecie zobaczyć, jest 90 minut kolejki. Co robicie?",
    options: [
      option("wait", "Czekamy"),
      option("later", "Wracamy później"),
      option("other", "Szukamy czegoś innego"),
      option("snack", "Jedno stoi, drugie organizuje jedzenie"),
    ],
    points: 1,
  },
  {
    id: "same-wave-lost",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Gubicie drogę w nowym mieście. Co robicie jako pierwsze?",
    options: [
      option("maps", "Odpalamy mapę"),
      option("ask", "Pytamy kogoś"),
      option("walk", "Idziemy intuicyjnie"),
      option("coffee", "Najpierw kawa, potem problem"),
    ],
    points: 1,
  },
];

const ROUND_2_A_POOL: TmQuestion[] = [
  {
    id: "mind-alarm-a",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Budzik dzwoni rano. Jaki jest pierwszy odruch?",
    subject: "A",
    options: [
      option("up", "Wstaję od razu"),
      option("snooze", "Jeszcze 1 drzemka"),
      option("phone", "Najpierw telefon"),
      option("negotiate", "Negocjuję ze sobą sens wstawania"),
    ],
    points: 2,
  },
  {
    id: "mind-free-day-a",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Nagle wpada wolny dzień bez żadnych obowiązków. Co wygrywa?",
    subject: "A",
    options: [
      option("rest", "Nicnierobienie bez wyrzutów"),
      option("trip", "Mały spontaniczny wypad"),
      option("people", "Spotkanie z ludźmi"),
      option("project", "Własny projekt albo hobby"),
    ],
    points: 2,
  },
  {
    id: "mind-broken-a",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Coś w domu przestaje działać. Jaki jest pierwszy odruch?",
    subject: "A",
    options: [
      option("fix", "Próbuję naprawić samodzielnie"),
      option("tutorial", "Szukam tutorialu"),
      option("help", "Pytam kogoś, kto się zna"),
      option("later", "Odkładam temat na później"),
    ],
    points: 2,
  },
  {
    id: "mind-message-a",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Dostajesz wiadomość: „musimy pogadać”. Co dzieje się w głowie?",
    subject: "A",
    options: [
      option("calm", "Nic. Czekam spokojnie"),
      option("analyse", "Analizuję ostatnie 7 dni"),
      option("ask", "Od razu pytam: o co chodzi?"),
      option("panic", "Zakładam najgorszy scenariusz"),
    ],
    points: 2,
  },
  {
    id: "mind-menu-a",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "W restauracji karta ma 20 pozycji. Jak najczęściej wybierasz?",
    subject: "A",
    options: [
      option("known", "Biorę coś sprawdzonego"),
      option("new", "Testuję coś nowego"),
      option("ask", "Pytam, co biorą inni"),
      option("last", "Decyduję w ostatniej sekundzie"),
    ],
    points: 2,
  },
  {
    id: "mind-compliment-a",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Ktoś prawi Ci niespodziewany komplement. Co robisz?",
    subject: "A",
    options: [
      option("thanks", "Po prostu dziękuję"),
      option("joke", "Obracam to w żart"),
      option("deny", "Od razu umniejszam"),
      option("remember", "Pamiętam to przez tydzień"),
    ],
    points: 2,
  },
  {
    id: "mind-shopping-a",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Widzisz coś, czego nie potrzebujesz, ale bardzo Ci się podoba. Co robisz?",
    subject: "A",
    options: [
      option("buy", "Biorę"),
      option("wait", "Czekam 24 godziny"),
      option("photo", "Robię zdjęcie i odchodzę"),
      option("research", "Sprawdzam 12 opinii"),
    ],
    points: 2,
  },
  {
    id: "mind-late-a",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Wiesz, że spóźnisz się 10 minut. Co robisz?",
    subject: "A",
    options: [
      option("write", "Od razu piszę"),
      option("run", "Próbuję nadrobić i nic nie mówię"),
      option("estimate", "Podaję dokładne ETA"),
      option("normal", "10 minut to jeszcze nie spóźnienie"),
    ],
    points: 2,
  },
];

const ROUND_2_B_POOL: TmQuestion[] = [
  {
    id: "mind-menu-b",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "W restauracji karta ma 20 pozycji. Jak najczęściej wybierasz?",
    subject: "B",
    options: [
      option("known", "Biorę coś sprawdzonego"),
      option("new", "Testuję coś nowego"),
      option("ask", "Pytam, co biorą inni"),
      option("last", "Decyduję w ostatniej sekundzie"),
    ],
    points: 2,
  },
  {
    id: "mind-packing-b",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Pakowanie na wyjazd. Kiedy naprawdę się zaczyna?",
    subject: "B",
    options: [
      option("days", "Kilka dni wcześniej"),
      option("day", "Dzień wcześniej"),
      option("hours", "Parę godzin przed wyjazdem"),
      option("chaos", "Wtedy, kiedy już jest za późno"),
    ],
    points: 2,
  },
  {
    id: "mind-battery-b",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Telefon ma 5% baterii tuż przed wyjściem. Co robisz?",
    subject: "B",
    options: [
      option("charge", "Ładuję, choćby przez 10 minut"),
      option("powerbank", "Biorę powerbank"),
      option("save", "Włączam tryb oszczędny"),
      option("risk", "Ryzykuję. Jakoś to będzie"),
    ],
    points: 2,
  },
  {
    id: "mind-plan-b",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Plan na wieczór odpada w ostatniej chwili. Co robisz?",
    subject: "B",
    options: [
      option("new", "Od razu wymyślam plan B"),
      option("home", "Cieszę się, że mogę zostać w domu"),
      option("ask", "Pytam innych, co robią"),
      option("mood", "Humor siada mi na chwilę"),
    ],
    points: 2,
  },
  {
    id: "mind-photo-b",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Ktoś robi Ci zdjęcie bez ostrzeżenia. Reakcja?",
    subject: "B",
    options: [
      option("fine", "Nie obchodzi mnie to"),
      option("check", "Muszę zobaczyć"),
      option("again", "Robimy jeszcze raz"),
      option("delete", "Usuń to natychmiast"),
    ],
    points: 2,
  },
  {
    id: "mind-series-b",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Serial naprawdę wciąga, ale jutro trzeba wcześnie wstać. Co robisz?",
    subject: "B",
    options: [
      option("sleep", "Wyłączam i idę spać"),
      option("one", "Jeszcze jeden odcinek"),
      option("many", "Kończę sezon"),
      option("fast", "Przewijam, żeby wiedzieć, co się stanie"),
    ],
    points: 2,
  },
  {
    id: "mind-money-b",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Znajdujesz 100 zł w kieszeni kurtki. Co robisz z nimi najchętniej?",
    subject: "B",
    options: [
      option("save", "Odkładam"),
      option("food", "Kupuję coś dobrego"),
      option("thing", "Sprawiam sobie drobiazg"),
      option("treat", "Traktuję to jak darmowe pieniądze"),
    ],
    points: 2,
  },
  {
    id: "mind-direction-b",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Nie wiesz, gdzie iść, ale ktoś obok wygląda na pewnego siebie. Co robisz?",
    subject: "B",
    options: [
      option("follow", "Idę za nim"),
      option("maps", "Sprawdzam mapę"),
      option("ask", "Pytam o drogę"),
      option("guess", "Wybieram intuicyjnie"),
    ],
    points: 2,
  },
];

const ROUND_3_POOL: TmQuestion[] = [
  {
    id: "who-food",
    round: 3,
    roundLabel: "KTO Z NAS?",
    eyebrow: "Jedno pytanie, 2 perspektywy",
    type: "who",
    prompt: "Kto częściej pierwszy rzuca: „zamawiamy coś do jedzenia”?",
    points: 1,
  },
  {
    id: "who-keys",
    round: 3,
    roundLabel: "KTO Z NAS?",
    eyebrow: "Jedno pytanie, 2 perspektywy",
    type: "who",
    prompt: "Kto ma większą szansę przez 5 minut szukać rzeczy, którą ma przed sobą?",
    points: 1,
  },
  {
    id: "who-stranger",
    round: 3,
    roundLabel: "KTO Z NAS?",
    eyebrow: "Jedno pytanie, 2 perspektywy",
    type: "who",
    prompt: "Kto szybciej zacznie przypadkową rozmowę z obcą osobą?",
    points: 1,
  },
  {
    id: "who-ready",
    round: 3,
    roundLabel: "KTO Z NAS?",
    eyebrow: "Jedno pytanie, 2 perspektywy",
    type: "who",
    prompt: "Kto częściej mówi „już idę”, a nadal nie jest gotowy?",
    points: 1,
  },
  {
    id: "who-detail",
    round: 3,
    roundLabel: "KTO Z NAS?",
    eyebrow: "Jedno pytanie, 2 perspektywy",
    type: "who",
    prompt: "Kto szybciej wyłapie literówkę, szczegół albo coś, co „nie pasuje”?",
    points: 1,
  },
  {
    id: "who-plan",
    round: 3,
    roundLabel: "KTO Z NAS?",
    eyebrow: "Jedno pytanie, 2 perspektywy",
    type: "who",
    prompt: "Kto częściej ma plan, zanim druga osoba zdąży zapytać „co robimy?”?",
    points: 1,
  },
  {
    id: "who-meme",
    round: 3,
    roundLabel: "KTO Z NAS?",
    eyebrow: "Jedno pytanie, 2 perspektywy",
    type: "who",
    prompt: "Kto częściej wysyła drugiej osobie mema bez żadnego komentarza?",
    points: 1,
  },
  {
    id: "who-laugh",
    round: 3,
    roundLabel: "KTO Z NAS?",
    eyebrow: "Jedno pytanie, 2 perspektywy",
    type: "who",
    prompt: "Kto łatwiej zaczyna się śmiać w momencie, kiedy absolutnie nie powinien?",
    points: 1,
  },
  {
    id: "who-photo",
    round: 3,
    roundLabel: "KTO Z NAS?",
    eyebrow: "Jedno pytanie, 2 perspektywy",
    type: "who",
    prompt: "Kto częściej mówi „zrób mi zdjęcie”, a potem odrzuca pierwsze 7 ujęć?",
    points: 1,
  },
  {
    id: "who-risk",
    round: 3,
    roundLabel: "KTO Z NAS?",
    eyebrow: "Jedno pytanie, 2 perspektywy",
    type: "who",
    prompt: "Kto szybciej powie „dobra, robimy to” przy spontanicznym pomyśle?",
    points: 1,
  },
  {
    id: "who-navigation",
    round: 3,
    roundLabel: "KTO Z NAS?",
    eyebrow: "Jedno pytanie, 2 perspektywy",
    type: "who",
    prompt: "Komu bardziej można zaufać z nawigacją w nieznanym miejscu?",
    points: 1,
  },
  {
    id: "who-late",
    round: 3,
    roundLabel: "KTO Z NAS?",
    eyebrow: "Jedno pytanie, 2 perspektywy",
    type: "who",
    prompt: "Kto ma większy talent do niedoszacowania, ile czasu zajmie wyjście z domu?",
    points: 1,
  },
];

const ROUND_4_POOL: TmQuestion[] = [
  {
    id: "final-superpower",
    round: 4,
    roundLabel: "TELEPATIA",
    eyebrow: "Finał za 3 punkty",
    type: "final",
    prompt: "Gdyby Wasz duet miał 1 wspólną supermoc, co wybieracie?",
    options: [
      option("teleport", "Teleportacja"),
      option("time", "Zatrzymywanie czasu"),
      option("luck", "Nieskończone szczęście"),
      option("mind", "Czytanie sobie w myślach"),
    ],
    points: 3,
  },
  {
    id: "final-soundtrack",
    round: 4,
    roundLabel: "TELEPATIA",
    eyebrow: "Finał za 3 punkty",
    type: "final",
    prompt: "Jaki soundtrack najlepiej pasowałby do filmu o Waszym duecie?",
    options: [
      option("90s", "Hit z lat 90./2000"),
      option("cinema", "Wielka muzyka filmowa"),
      option("dance", "Taneczny banger"),
      option("chill", "Spokojny chill"),
    ],
    points: 3,
  },
  {
    id: "final-now",
    round: 4,
    roundLabel: "TELEPATIA",
    eyebrow: "Finał za 3 punkty",
    type: "final",
    prompt: "Ktoś daje Wam 1 spontaniczny plan na teraz. Co bierzecie?",
    options: [
      option("road", "Nocny road trip"),
      option("karaoke", "Karaoke"),
      option("cook", "Kulinarny challenge"),
      option("sunrise", "Spacer aż do wschodu słońca"),
    ],
    points: 3,
  },
  {
    id: "final-button",
    round: 4,
    roundLabel: "TELEPATIA",
    eyebrow: "Ostatni sygnał",
    type: "final",
    prompt: "Macie magiczny przycisk, który zmienia dzisiejszy wieczór. Co uruchamia?",
    options: [
      option("trip", "Natychmiastowy miniwyjazd"),
      option("snacks", "Idealny domowy wieczór"),
      option("mission", "Miejską misję z zadaniami"),
      option("offline", "Zero telefonów i coś tylko we dwoje"),
    ],
    points: 3,
  },
  {
    id: "final-million",
    round: 4,
    roundLabel: "TELEPATIA",
    eyebrow: "Finał za 3 punkty",
    type: "final",
    prompt: "Wygrywacie razem milion. Jaka jest pierwsza wspólna decyzja?",
    options: [
      option("travel", "Długa podróż"),
      option("home", "Dom albo mieszkanie"),
      option("invest", "Inwestujemy większość"),
      option("party", "Najpierw świętujemy"),
    ],
    points: 3,
  },
  {
    id: "final-show",
    round: 4,
    roundLabel: "TELEPATIA",
    eyebrow: "Finał za 3 punkty",
    type: "final",
    prompt: "Macie wystąpić razem w jednym programie. Który wybieracie?",
    options: [
      option("quiz", "Teleturniej wiedzy"),
      option("travel", "Travel reality show"),
      option("cooking", "Program kulinarny"),
      option("survival", "Survival"),
    ],
    points: 3,
  },
  {
    id: "final-island",
    round: 4,
    roundLabel: "TELEPATIA",
    eyebrow: "Finał za 3 punkty",
    type: "final",
    prompt: "Na bezludną wyspę możecie zabrać jedną wygodę. Co wybieracie?",
    options: [
      option("phone", "Telefon z internetem"),
      option("food", "Niekończące się jedzenie"),
      option("bed", "Wygodne łóżko"),
      option("shower", "Normalny prysznic"),
    ],
    points: 3,
  },
  {
    id: "final-time",
    round: 4,
    roundLabel: "TELEPATIA",
    eyebrow: "Finał za 3 punkty",
    type: "final",
    prompt: "Możecie razem przenieść się na 24 godziny do jednej epoki. Gdzie?",
    options: [
      option("past", "Lata 90."),
      option("ancient", "Starożytność"),
      option("future", "100 lat w przyszłość"),
      option("now", "Zostajemy tu, gdzie jest Wi-Fi"),
    ],
    points: 3,
  },
  {
    id: "final-business",
    round: 4,
    roundLabel: "TELEPATIA",
    eyebrow: "Finał za 3 punkty",
    type: "final",
    prompt: "Macie wspólnie otworzyć absurdalny biznes. Co ma największą szansę?",
    options: [
      option("cafe", "Kawiarnia z dziwnym motywem"),
      option("travel", "Biuro spontanicznych podróży"),
      option("games", "Bar z grami"),
      option("pets", "Hotel dla rozpieszczonych zwierząt"),
    ],
    points: 3,
  },
  {
    id: "final-perfect-day",
    round: 4,
    roundLabel: "TELEPATIA",
    eyebrow: "Finał za 3 punkty",
    type: "final",
    prompt: "Macie zaprojektować idealny wspólny dzień. Co musi być jego głównym punktem?",
    options: [
      option("food", "Świetne jedzenie"),
      option("place", "Nowe miejsce"),
      option("people", "Spotkanie z ludźmi"),
      option("nothing", "Brak planu i pełny luz"),
    ],
    points: 3,
  },
];

function hashSeed(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickDeterministic<T>(items: T[], count: number, seedText: string) {
  const copy = [...items];
  const random = randomFromSeed(hashSeed(seedText));

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }

  return copy.slice(0, count);
}

export const TYLKO_MY_QUESTION_COUNT = 20;
export const TYLKO_MY_MAX_SCORE = 34;

export function getTylkoMySequence(roomCode: string) {
  const code = roomCode.trim().toUpperCase() || "TYLKOMY";
  const round1 = pickDeterministic(ROUND_1_POOL, 5, `${code}:r1`);
  const round2A = pickDeterministic(ROUND_2_A_POOL, 3, `${code}:r2a`);
  const round2B = pickDeterministic(ROUND_2_B_POOL, 3, `${code}:r2b`);
  const round2 = [
    round2A[0],
    round2B[0],
    round2A[1],
    round2B[1],
    round2A[2],
    round2B[2],
  ];
  const round3 = pickDeterministic(ROUND_3_POOL, 5, `${code}:r3`);
  const round4 = pickDeterministic(ROUND_4_POOL, 4, `${code}:r4`);

  return [...round1, ...round2, ...round3, ...round4];
}

export function getTylkoMyQuestionForRoom(roomCode: string, index: number) {
  return getTylkoMySequence(roomCode)[index] ?? null;
}

export function getTylkoMyFinalCopy(score: number) {
  const percent = Math.round((score / TYLKO_MY_MAX_SCORE) * 100);

  if (percent >= 85) {
    return {
      title: "TELEPATIA: ON",
      copy: "Macie wyjątkowo dużo tych samych odruchów. Kilka odpowiedzi wyglądało jak wspólne Wi-Fi dla mózgu.",
    };
  }

  if (percent >= 65) {
    return {
      title: "TEN SAM SYGNAŁ",
      copy: "Dużo trafień, kilka zaskoczeń i bardzo solidny wspólny kod. To właśnie najlepsza mieszanka.",
    };
  }

  if (percent >= 40) {
    return {
      title: "MOCNY WSPÓLNY KOD",
      copy: "Często nadajecie podobnie, ale nadal potraficie się zaskoczyć. Dzięki temu gra miała co odkrywać.",
    };
  }

  return {
    title: "JESZCZE MACIE CO ODKRYWAĆ",
    copy: "Nie wszystkie odpowiedzi się spotkały i właśnie dlatego było ciekawie. Najlepsze były momenty zaskoczenia.",
  };
}
