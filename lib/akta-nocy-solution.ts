import "server-only";

export const AKTA_NOCY_SOLUTION = {
  culpritRoleKey: "reporter",
  culpritName: "Maks Wicher",
  motiveKey: "career",
  motiveLabel: "Kariera i reputacja zawodowa",
  decisiveEvidenceIds: [
    "scheduled-message",
    "mirror-photo",
    "hallway-audio",
    "medical-window",
    "wicher-file",
  ],
  reveal: {
    step1: {
      eyebrow: "UJAWNIENIE · CZĘŚĆ 1",
      title: "Najbardziej podejrzane ślady nie były planem sprawcy.",
      body:
        "Luka monitoringu naprawdę była celowa, ale nie stworzył jej zabójca. Paweł Lis usunął fragment zapisu, żeby ukryć własne naruszenie procedur. Usterka zamka również była prawdziwa, lecz nie była potrzebna do wejścia ani wyjścia sprawcy. Te dwa fakty przypadkiem stworzyły idealną zasłonę.",
      bullets: [
        "Paweł odpowiadał za brak nagrania, ale nie za śmierć Marka.",
        "Igor miał mocny motyw finansowy, lecz po 22:47 jego obecność w lobby potwierdzają inne dane.",
        "Lena szukała pendrive'a, ale nie wróciła do 214 w kluczowym przedziale.",
      ],
    },
    step2: {
      eyebrow: "UJAWNIENIE · CZĘŚĆ 2",
      title: "Prawdziwy przebieg najważniejszych minut.",
      body:
        "Wszystkie najważniejsze dowody zbiegają się między 22:47 a 22:55. Zdjęcie, nagranie audio, log drzwi, metadane wiadomości i czas śmierci tworzą jedną spójną sekwencję.",
      timeline: [
        { time: "22:47", text: "Marek wraca do apartamentu 214." },
        { time: "22:49", text: "W odbiciu lustra pojawia się osoba z identyfikatorem prasowym." },
        { time: "22:51", text: "Nagranie Miry rejestruje słowa: „Nie zniszczysz mi kariery”." },
        { time: "22:52", text: "Konfrontacja w pokoju kończy się śmiertelnym upadkiem Marka." },
        { time: "22:53", text: "Na laptopie Marka zostaje ustawiona wiadomość do wysłania o 23:02." },
        { time: "22:54", text: "Z pokoju znika pendrive, drzwi otwierają się od środka." },
        { time: "22:55", text: "Sara widzi Maksa opuszczającego strefę 2 piętra." },
        { time: "23:02", text: "Zaplanowana wiadomość wysyła się automatycznie." },
      ],
    },
    step3: {
      eyebrow: "UJAWNIENIE · SPRAWCA",
      title: "Maks Wicher",
      subtitle: "Młody reporter",
      body:
        "Marek odkrył, że Maks wcześniej poważnie naruszył zasady pracy dziennikarskiej i zamierzał przekazać sprawę redakcji. Maks przyszedł do 214, żeby go powstrzymać. W trakcie gwałtownej konfrontacji Marek upadł i zmarł. Maks spanikował, zabrał pendrive z materiałami na swój temat i wykorzystał odblokowany laptop, żeby ustawić wiadomość na 23:02. Nie planował luki monitoringu, po prostu wykorzystał zbieg okoliczności.",
      whyItFits: [
        "Motyw dotyczył bezpośrednio kariery, dokładnie tak jak na nagraniu z 22:51.",
        "Osoba z identyfikatorem prasowym była na korytarzu podczas luki monitoringu.",
        "Maks nie miał wiarygodnego alibi na 22:50–22:55.",
        "Plik „WICHER_notatki_redakcyjne” wyjaśniał, czego naprawdę się obawiał.",
        "Zaplanowana wiadomość tłumaczy próbę przesunięcia czasu śmierci.",
      ],
    },
    step4: {
      eyebrow: "UJAWNIENIE · PEŁNE AKTA",
      title: "Każdy kłamał. Tylko jedna osoba kłamała o zbrodni.",
      body:
        "Sekrety pozostałych postaci były prawdziwe i miały tworzyć wiarygodne alternatywne tropy. To dlatego pojedynczy dowód nie wystarczał. Rozwiązanie powstawało dopiero po połączeniu czasu, możliwości wejścia, nagrania, metadanych i motywu.",
      redHerrings: [
        { name: "Nora Kwiecień", truth: "Ukrywała usterkę zamka, żeby chronić hotel." },
        { name: "Paweł Lis", truth: "Usunął nagranie z kamery, ale z własnego, niezwiązanego ze śmiercią powodu." },
        { name: "Lena Brzoza", truth: "Chciała zdobyć pendrive i zatajała prawdziwy powód kłótni." },
        { name: "Igor Serafin", truth: "Miał finansowy motyw, ale kluczowe minuty spędził w lobby." },
        { name: "Pozostali", truth: "Ukrywali naruszenia zasad, niewygodne obserwacje albo nieautoryzowany dostęp do informacji." },
      ],
    },
  },
} as const;
