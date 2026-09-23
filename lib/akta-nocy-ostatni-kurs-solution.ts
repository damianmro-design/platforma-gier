import "server-only";

export const OSTATNI_KURS_SOLUTION = {
  culpritRoleKey: "ok_fixer",
  culpritName: "Kamil Drzewiecki",
  motiveKey: "embezzlement",
  motiveLabel: "Ukrycie wyprowadzania pieniędzy z Vektor Cargo",
  disappearanceKey: "staged_exit",
  disappearanceLabel: "Upozorowane wysiadanie w płaszczu Adriana",
  correctRoute: ["w3", "w5", "w6", "platform", "w6", "w3"],
  correctEventOrder: [
    "phone_left",
    "meeting_w5",
    "fatal_conflict",
    "move_w6",
    "locker_s3",
    "receipt_sync",
    "coat_exit",
    "coat_return",
    "return_w3",
  ],
  decisiveEvidenceIds: [
    "receipt-metadata",
    "service-door-log",
    "northbridge-file",
    "platform-return",
  ],
  reveal: {
    step1: {
      eyebrow: "UJAWNIENIE · CZĘŚĆ 1",
      title: "Najmocniejsze alibi było tylko alibi telefonu.",
      body:
        "Paragon z 00:49 i połączenie telefonu z Wi‑Fi W3 wyglądały jak dwa niezależne potwierdzenia obecności Kamila w restauracyjnym. W rzeczywistości oba dotyczyły rzeczy pozostawionych przy stoliku. Zamówienie powstało o 00:34, a telefon ładował się bez właściciela.",
      bullets: [
        "Paragon został wydrukowany dopiero podczas późniejszej synchronizacji terminala.",
        "Telefon pozostał połączony z ORION-W3, ale urządzenie nie jest człowiekiem.",
        "Jan widział Kamila wracającego do stolika dopiero około 00:56.",
      ],
    },
    step2: {
      eyebrow: "UJAWNIENIE · CZĘŚĆ 2",
      title: "Adrian nie wysiadł w Brzezinach.",
      body:
        "Pierwsza kamera pokazywała tylko osobę w jego płaszczu. Drugi kąt ujawnił, że postać zawróciła za słupem i wróciła tylnymi drzwiami W6. Zniknięcie zostało upozorowane.",
      bullets: [
        "00:52:31 — postać wychodzi z W6.",
        "00:53:06 — kamera P-4 rejestruje jej powrót.",
        "00:53:21 — tylne drzwi W6 zamykają się.",
        "00:54:03 — N417 odjeżdża z Brzezin Północnych.",
      ],
    },
    step3: {
      eyebrow: "UJAWNIENIE · CZĘŚĆ 3",
      title: "W6 było miejscem ukrycia, nie drogą ucieczki.",
      body:
        "Kradzież M-1 i log strefy serwisowej wyjaśniają, po co ktoś potrzebował wagonu W6. O 00:45 otwarto przejście z W5, o 00:47 naruszono plombę szafy S-3, a po odjeździe klucz ponownie otworzył przejście w stronę W5.",
      bullets: [
        "Brak klucza Marty był prawdziwym zaniedbaniem, ale nie dowodem jej udziału.",
        "Damian korzystał z W6 wcześniej, lecz nie w kluczowym przedziale.",
        "Reset W3↔W4 przypadkiem utrudnił powrót sprawcy do wagonu restauracyjnego.",
      ],
    },
    step4: {
      eyebrow: "UJAWNIENIE · OSOBA ODPOWIEDZIALNA",
      title: "Kamil Drzewiecki",
      subtitle: "Konsultant / człowiek Vektor Cargo",
      body:
        "Adrian odkrył, że Northbridge Consulting było wykorzystywane do wyprowadzania pieniędzy z Vektor Cargo, a część przelewów prowadziła do Kamila. Kamil spotkał się z nim w W5, żeby odzyskać dokumenty. Podczas gwałtownej konfrontacji Adrian doznał śmiertelnego urazu. Kamil zabrał kartę pamięci, przeniósł ciało do S-3 w W6 i stworzył fałszywy obraz wysiadania w Brzezinach.",
      whyItFits: [
        "Adrian miał zapisane spotkanie: „Kamil — 00:40, W5”.",
        "Nina widziała Kamila opuszczającego W3 około 00:36.",
        "Paragon z 00:49 nie był dowodem jego obecności.",
        "Telefon pozostał w W3, kiedy Kamil mógł przejść do W5.",
        "Drugi kąt kamery pokazuje powrót osoby w płaszczu do W6.",
      ],
    },
    step5: {
      eyebrow: "UJAWNIENIE · PEŁNA CHRONOLOGIA",
      title: "Ostatni Kurs, minuta po minucie.",
      timeline: [
        { time: "00:34", text: "Kamil zamawia kawę przy stoliku 4 w W3." },
        { time: "00:36", text: "Zostawia telefon na ładowarce i idzie w stronę W5." },
        { time: "00:39", text: "Adrian wpuszcza Kamila do przedziału 7." },
        { time: "00:43", text: "Konfrontacja kończy się śmiertelnym urazem Adriana." },
        { time: "00:45", text: "Kamil używa skradzionego M-1 i przenosi Adriana do W6." },
        { time: "00:47", text: "Plomba szafy S-3 zostaje naruszona." },
        { time: "00:49", text: "Terminal drukuje zaległy paragon, tworząc pozorne alibi." },
        { time: "00:52", text: "Kamil w płaszczu Adriana wychodzi tylnymi drzwiami W6." },
        { time: "00:53", text: "Za słupem zawraca i wraca do W6." },
        { time: "00:54", text: "Pociąg odjeżdża, a łącznik W3↔W4 kończy reset." },
        { time: "00:56", text: "Kamil wraca do W3 po telefon." },
        { time: "01:04", text: "Nina zgłasza zaginięcie Adriana." },
      ],
      redHerrings: [
        { name: "Marta Szulc", truth: "Ukrywała utratę klucza M-1, bo sama złamała procedurę." },
        { name: "Zofia Rudzka", truth: "Miała finansowy konflikt z Adrianem, ale wideorozmowa obejmowała kluczowe minuty." },
        { name: "Damian Sowa", truth: "Korzystał wcześniej z W6, żeby ukryć nieprawidłowo zadeklarowaną przesyłkę." },
        { name: "Radosław Kruk", truth: "Reset W3↔W4 był wynikiem błędu technicznego, nie częścią planu." },
        { name: "Iga Wolska", truth: "Próbowała zatrzymać materiały prawnie, ale nie uczestniczyła w zniknięciu." },
      ],
    },
  },
} as const;
