export type GamePlaySetup = {
  players: string;
  time: string;
  host: string;
  screen: string;
  phones: string;
  privacy: string;
  control: string;
  steps: string[];
};

export const GAME_PLAY_SETUP: Record<string, GamePlaySetup> = {
  "co-ludzie-powiedza": {
    players: "4–14 graczy",
    time: "45–75 min",
    host: "Wymagany, osobna osoba prowadzi teleturniej",
    screen: "Zalecany wspólny ekran widoczny dla całej grupy",
    phones: "Każdy gracz potrzebuje własnego telefonu",
    privacy: "Tak, część odpowiedzi i głosowań jest prywatna",
    control: "Prowadzący uruchamia kolejne etapy",
    steps: [
      "Jedna osoba tworzy pokój i zostaje prowadzącym.",
      "Pozostali dołączają telefonami i oznaczają gotowość.",
      "Podzielcie graczy na 2 drużyny.",
      "W rundach prywatnych patrzcie tylko na własne telefony, a w pozostałych momentach śledźcie wspólny ekran.",
    ],
  },
  "pod-przykrywka": {
    players: "6–14 graczy",
    time: "45–75 min",
    host: "Wymagany, prowadzący nie zna tożsamości Oszusta",
    screen: "Zalecany wspólny ekran dla odpowiedzi, dyskusji i werdyktu",
    phones: "Każdy gracz potrzebuje własnego telefonu",
    privacy: "Tak, role, hasła i głosy są prywatne",
    control: "Prowadzący steruje tempem i kolejnymi fazami",
    steps: [
      "Jedna osoba tworzy pokój i prowadzi grę.",
      "Każdy gracz dołącza na własnym telefonie.",
      "Po starcie nie pokazujcie ekranów innym, każdy dostaje prywatne informacje.",
      "Gdy gra prosi o dyskusję lub werdykt, odłóżcie telefony i patrzcie na wspólny ekran.",
    ],
  },
  "akta-nocy": {
    players: "5–12 graczy",
    time: "75–105 min",
    host: "Zależnie od sprawy i trybu, prowadzący albo prowadzenie automatyczne",
    screen: "Zależnie od trybu, w grze z prowadzącym przydaje się wspólny ekran",
    phones: "Każdy gracz potrzebuje własnego telefonu",
    privacy: "Tak, postacie, sekrety i część odpowiedzi są prywatne",
    control: "Prowadzący albo system prowadzi kolejne etapy",
    steps: [
      "Najpierw wybierzcie sprawę i dostępny dla niej tryb prowadzenia.",
      "Każdy uczestnik dołącza na własnym telefonie.",
      "Prywatne akta czytajcie bez pokazywania telefonu innym.",
      "W trybie automatycznym system prowadzi grupę krok po kroku, w trybie z prowadzącym kolejne etapy uruchamia prowadzący.",
    ],
  },
  "zakrecone-haslo": {
    players: "3–12 graczy",
    time: "20–35 min",
    host: "Niepotrzebny",
    screen: "Wymagany ekran główny, najlepiej TV, laptop lub projektor",
    phones: "Każdy gracz steruje swoją turą z telefonu",
    privacy: "Nie, kluczowe informacje są wspólne",
    control: "Gra prowadzi rundy automatycznie, aktywny gracz steruje ruchem",
    steps: [
      "Jedna osoba tworzy pokój, ale może normalnie grać.",
      "Otwórzcie osobny „Ekran główny” na TV, laptopie lub projektorze.",
      "Każdy gracz dołącza telefonem i klika „Gotowy”.",
      "Podczas rozgrywki patrzcie na ekran główny, a osoba w swojej turze wykonuje akcje na telefonie.",
    ],
  },
  "tylko-my": {
    players: "Dokładnie 2 graczy",
    time: "20–30 min",
    host: "Niepotrzebny",
    screen: "Niepotrzebny, bez TV i bez wspólnego ekranu",
    phones: "Dokładnie 2 telefony, po 1 dla każdej osoby",
    privacy: "Tak, odpowiedzi pozostają ukryte do wspólnego odkrycia",
    control: "Gra przechodzi dalej automatycznie",
    steps: [
      "Osoba 1 tworzy pokój na swoim telefonie.",
      "Osoba 2 dołącza kodem, linkiem lub QR.",
      "Oboje klikacie „Gotowy”, gra rozpocznie się automatycznie.",
      "Odpowiadajcie osobno i nie pokazujcie sobie ekranów przed odkryciem wyniku.",
    ],
  },
  "szyfr": {
    players: "2–6 graczy",
    time: "30–45 min",
    host: "Niepotrzebny",
    screen: "Niepotrzebny, bez telewizora",
    phones: "Każdy gracz potrzebuje własnego telefonu",
    privacy: "Tak, każdy widzi inne fragmenty informacji",
    control: "Dowolny gracz może zatwierdzić wspólną odpowiedź",
    steps: [
      "Jedna osoba tworzy operację, pozostali dołączają telefonami.",
      "Każdy patrzy tylko na swój ekran, nie pokazujcie telefonów innym.",
      "Możecie swobodnie opisywać i czytać sobie informacje na głos.",
      "Gdy uzgodnicie rozwiązanie, dowolna osoba wysyła odpowiedź całej drużyny.",
    ],
  },
  "va-banque": {
    players: "2–8 graczy",
    time: "30–45 min",
    host: "Niepotrzebny, twórca pokoju również jest graczem",
    screen: "Niepotrzebny, każdy gra na swoim telefonie",
    phones: "Każdy gracz potrzebuje własnego telefonu",
    privacy: "Tak, stawki i część odpowiedzi są prywatne",
    control: "Twórca pokoju uruchamia start, dalej rundy prowadzi system",
    steps: [
      "Jedna osoba tworzy pokój i również dołącza jako gracz.",
      "Pozostali wpisują kod na swoich telefonach.",
      "Gdy wszyscy są gotowi, twórca pokoju uruchamia grę.",
      "Licytujcie i odpowiadajcie na własnych ekranach, nie pokazujcie prywatnych stawek innym.",
    ],
  },
};

export function getGamePlaySetup(slug: string) {
  return GAME_PLAY_SETUP[slug] ?? null;
}
