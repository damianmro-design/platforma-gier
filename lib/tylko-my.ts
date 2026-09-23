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

export const TYLKO_MY_QUESTIONS: TmQuestion[] = [
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
    id: "same-wave-screen",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Wieczór filmowy. Co ma największą szansę wygrać?",
    options: [
      option("comedy", "Komedia"),
      option("thriller", "Thriller"),
      option("reality", "Reality / teleturniej"),
      option("doc", "Dokument"),
    ],
    points: 1,
  },
  {
    id: "same-wave-delay",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Macie 2 godziny opóźnienia w podróży. Co robicie?",
    options: [
      option("talk", "Gadamy i nadrabiamy rozmowy"),
      option("snacks", "Polujemy na jedzenie"),
      option("game", "Odpalamy grę"),
      option("plan", "Układamy plan B"),
    ],
    points: 1,
  },
  {
    id: "same-wave-souvenir",
    round: 1,
    roundLabel: "NA TEJ SAMEJ FALI",
    eyebrow: "Wspólny wybór",
    type: "sync",
    prompt: "Z wyjazdu możecie przywieźć tylko 1 rzecz. Co wybieracie?",
    options: [
      option("food", "Coś lokalnego do jedzenia"),
      option("photo", "Jedno świetne zdjęcie"),
      option("object", "Małą pamiątkę"),
      option("story", "Po prostu dobrą historię"),
    ],
    points: 1,
  },

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
    id: "mind-broken-a",
    round: 2,
    roundLabel: "CZYTAM CI W MYŚLACH",
    eyebrow: "Przewidź odpowiedź",
    type: "predict",
    prompt: "Coś w domu przestaje działać. Pierwszy odruch?",
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
      option("90s", "Hit z lat 90."),
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
];

export const TYLKO_MY_MAX_SCORE = TYLKO_MY_QUESTIONS.reduce(
  (sum, question) => sum + question.points,
  0,
);

export function getTylkoMyQuestion(index: number) {
  return TYLKO_MY_QUESTIONS[index] ?? null;
}

export function getTylkoMyRoundRange(round: number) {
  const indices = TYLKO_MY_QUESTIONS
    .map((question, index) => ({ question, index }))
    .filter((item) => item.question.round === round)
    .map((item) => item.index);

  if (!indices.length) return { first: 0, last: 0, current: 0, total: 0 };

  return {
    first: indices[0],
    last: indices[indices.length - 1],
    current: 0,
    total: indices.length,
  };
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
    copy: "Nie wszystkie odpowiedzi się spotkały — i właśnie dlatego było ciekawie. Najlepsze były momenty zaskoczenia.",
  };
}
