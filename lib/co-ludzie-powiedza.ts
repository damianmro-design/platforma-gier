export const CLP_WARMUP_QUESTIONS = [
  {
    key: "wakacje",
    eyebrow: "WAKACJE",
    question: "Co wybierasz na idealny wyjazd?",
    options: ["Morze", "Góry"],
  },
  {
    key: "dziesiec_tysiecy",
    eyebrow: "10 000 ZŁ",
    question: "Gdybyś dostał dziś 10 000 zł, co zrobiłbyś najpierw?",
    options: ["Wakacje", "Oszczędności", "Zakupy", "Spłata zobowiązań", "Coś dla bliskich"],
  },
  {
    key: "fast_food",
    eyebrow: "JEDZENIE",
    question: "Który szybki wybór wygrywa u Ciebie?",
    options: ["Pizza", "Burger", "Kebab", "Sushi", "Frytki"],
  },
  {
    key: "poranek",
    eyebrow: "RANO",
    question: "Co robisz najpierw po przebudzeniu?",
    options: ["Telefon", "Kawa lub herbata", "Łazienka", "Śniadanie", "Drzemka"],
  },
  {
    key: "najgorszy_dzien",
    eyebrow: "TYDZIEŃ",
    question: "Który dzień tygodnia lubisz najmniej?",
    options: ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"],
  },
  {
    key: "wieczor",
    eyebrow: "WIECZÓR",
    question: "Jak najchętniej spędzasz wolny wieczór?",
    options: ["Domówka", "Klub", "Planszówki", "Serial lub film", "Kolacja na mieście", "Wieczór samemu"],
  },
] as const;

export const CLP_WARMUP_TOTAL = CLP_WARMUP_QUESTIONS.length;
