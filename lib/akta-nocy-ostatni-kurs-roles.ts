import "server-only";

export type OstatniKursRole = {
  id: string;
  name: string;
  shortLabel: string;
  publicBio: string;
  travelReason: string;
  privateSecret: string;
  privateKnowledge: string[];
  timeline: string[];
  objective: string;
  mayShare: string[];
  wantsToHide: string[];
  whyNotEarlier: string;
  core: boolean;
  isCulprit: boolean;
  culpritBriefing?: string;
};

export const OSTATNI_KURS_ROLES: OstatniKursRole[] = [
  {
    id: "ok_manager",
    name: "Marta Szulc",
    shortLabel: "Kierowniczka pociągu",
    publicBio:
      "Odpowiadasz za bezpieczeństwo i obsługę nocnego ekspresu N417 „Orion”. Znasz procedury, klucze i układ całego składu.",
    travelReason: "Jesteś na służbie od początku trasy.",
    privateSecret:
      "O 00:31 zauważyłaś, że klucza serwisowego M-1 nie ma na tablicy. Nie zgłosiłaś tego od razu, bo wcześniej zostawiłaś biurko bez nadzoru, łamiąc procedurę.",
    privateKnowledge: [
      "M-1 otwiera W5↔W6, szafy serwisowe i tylne drzwi W6.",
      "Klucz wrócił na tablicę około 01:02 bez podpisanego pobrania.",
      "Reset łącznika W3↔W4 był prawdziwym automatycznym zdarzeniem technicznym, nie Twoją decyzją.",
    ],
    timeline: [
      "00:28–00:35, jesteś między biurkiem obsługi W3 a początkiem W2.",
      "00:31, zauważasz brak M-1, ale nie ogłaszasz alarmu.",
      "00:46–00:54, koordynujesz reset łącznika W3↔W4 z Radosławem.",
      "01:02, widzisz klucz M-1 z powrotem na tablicy.",
    ],
    objective:
      "Pomóż rozwiązać sprawę, ale nie przyznawaj od razu, że Twoje zaniedbanie umożliwiło kradzież klucza.",
    mayShare: [
      "Znaczenie klucza M-1.",
      "Czas resetu W3↔W4.",
      "Fakt, że klucz wrócił po 01:00.",
    ],
    wantsToHide: ["Zostawiłaś klucz bez właściwego nadzoru."],
    whyNotEarlier:
      "Bałaś się, że utrata klucza zostanie uznana za poważne naruszenie procedur i stracisz pracę.",
    core: true,
    isCulprit: false,
  },
  {
    id: "ok_fixer",
    name: "Kamil Drzewiecki",
    shortLabel: "Konsultant",
    publicBio:
      "Przedstawiasz się jako konsultant ds. procesów biznesowych. Większość podróży spędzasz w wagonie restauracyjnym, choć rezerwację masz w W2.",
    travelReason:
      "Oficjalnie jedziesz na poranne spotkanie z klientem.",
    privateSecret:
      "Naprawdę pracujesz dla Vektor Cargo przy zarządzaniu kryzysowym. Adrian odkrył, że Northbridge Consulting, firma powiązana z Tobą, służyła do wyprowadzania pieniędzy z Vektora.",
    privateKnowledge: [
      "Wiedziałeś, że Adrian ma kopie przelewów i kartę pamięci z oryginalnymi dokumentami.",
      "Wiedziałeś o spotkaniu z Adrianem około 00:40 w W5.",
      "Zostawiłeś telefon przy ładowarce w W3, zanim poszedłeś do Adriana.",
    ],
    timeline: [
      "00:34:12, zamawiasz kawę i wodę przy stoliku 4 w W3.",
      "00:36, zostawiasz telefon na ładowarce i idziesz przez W4 w stronę W5.",
      "00:39–00:43, rozmawiasz z Adrianem w przedziale 7.",
      "00:45–00:47, używasz skradzionego M-1 i przenosisz Adriana do W6.",
      "00:52–00:53, w płaszczu Adriana wychodzisz na peron i wracasz do W6.",
      "00:56, wracasz do W3 po telefon.",
    ],
    objective:
      "Nie daj grupie połączyć Twojej prawdziwej pracy, Northbridge, braku telefonu przy Tobie i trasy przez W5/W6.",
    mayShare: [
      "Zamówiłeś coś w W3 przed północą.",
      "Znałeś Adriana zawodowo, jeśli grupa już odkryje plik Northbridge.",
      "Możesz przyznać, że opuściłeś stolik na chwilę, ale próbuj minimalizować czas.",
    ],
    wantsToHide: [
      "Pracę dla Vektor Cargo.",
      "Spotkanie z Adrianem w W5.",
      "Kradzież M-1.",
      "Pozostawienie telefonu jako cyfrowego alibi.",
    ],
    whyNotEarlier:
      "Każde przyznanie się do prawdziwej relacji z Adrianem łączy Cię z materiałami o Northbridge.",
    core: true,
    isCulprit: true,
    culpritBriefing:
      "JESTEŚ ODPOWIEDZIALNY ZA TO, CO SIĘ WYDARZYŁO. Przyszedłeś do Adriana, żeby odebrać dowody Northbridge. Rozmowa zmieniła się w szarpaninę. Adrian upadł i doznał śmiertelnego urazu. Spanikałeś. Użyłeś wcześniej skradzionego M-1, przeniosłeś ciało do szafy S-3 w W6 i zabrałeś kartę pamięci. Potem założyłeś camelowy płaszcz Adriana, wyszedłeś na peron w Brzezinach i po kilkudziesięciu sekundach wróciłeś tylnymi drzwiami W6, żeby stworzyć wrażenie, że Adrian wysiadł. Telefon zostawiłeś wcześniej przy stoliku w W3. Możesz kłamać o swojej trasie, motywie i spotkaniu, ale nie wymyślaj nowych zdarzeń, nie twórz dodatkowych świadków i nie neguj dowodów, które zostały już ujawnione.",
  },
  {
    id: "ok_podcaster",
    name: "Nina Radecka",
    shortLabel: "Podcasterka śledcza",
    publicBio:
      "Prowadzisz popularny podcast o aferach gospodarczych. Adrian miał być Twoim źródłem, ale oficjalnie twierdzisz, że spotkaliście się przypadkiem.",
    travelReason:
      "Wracasz z nagrania i planujesz rano pracę w studiu.",
    privateSecret:
      "Miałaś potajemnie nagrać rozmowę z Adrianem o 01:00. Już wcześniej włączyłaś dyktafon, łamiąc jego wyraźną prośbę o brak nagrań.",
    privateKnowledge: [
      "Około 00:36 widziałaś Kamila opuszczającego W3 w stronę W4.",
      "Adrian napisał Ci wcześniej: „01:00, restauracyjny. Mam dokumenty, których nie mogę wysłać”.",
      "Twój dyktafon zarejestrował fragment rozmowy z okolicy W5 o 00:41.",
    ],
    timeline: [
      "00:30–00:36, siedzisz w W3 i obserwujesz Adriana oraz osoby, które się nim interesują.",
      "00:36, widzisz Kamila idącego w stronę W4.",
      "00:39–00:44, jesteś w W4 i potajemnie nagrywasz korytarz w stronę W5.",
      "01:00, czekasz na Adriana przy ustalonym stoliku.",
      "01:04, zgłaszasz, że Adrian zniknął.",
    ],
    objective:
      "Dostarcz grupie ważne obserwacje, ale nie przyznawaj się od razu do nieautoryzowanego nagrania.",
    mayShare: [
      "Miałaś spotkać się z Adrianem o 01:00.",
      "Widziałaś Kamila idącego w stronę W4.",
      "Adrian obawiał się, że ktoś próbuje odzyskać dokumenty.",
    ],
    wantsToHide: ["Nagrywałaś ludzi bez zgody."],
    whyNotEarlier:
      "Bałaś się, że nagranie zostanie zabezpieczone, a Ty sama narazisz źródła i projekt podcastu.",
    core: true,
    isCulprit: false,
  },
  {
    id: "ok_railfan",
    name: "Filip Gajda",
    shortLabel: "Miłośnik kolei",
    publicBio:
      "Studiujesz transport i dokumentujesz nocne składy. Znasz rozkład wagonów lepiej niż większość pasażerów.",
    travelReason:
      "Jedziesz na spotkanie koła naukowego i robisz materiał o N417.",
    privateSecret:
      "Wszedłeś do oznaczonego jako służbowe przedsionka W4, żeby sfotografować panel diagnostyczny.",
    privateKnowledge: [
      "O 00:46 panel pokazał automatyczną blokadę przejścia W3↔W4.",
      "Blokada została zdjęta dopiero o 00:54:20.",
      "W tym czasie nie dało się przejść wnętrzem składu z W5 do W3.",
    ],
    timeline: [
      "00:37–00:45, fotografujesz wnętrze W4.",
      "00:46, widzisz czerwony status łącznika W3↔W4.",
      "00:50–00:54, jesteś przy oknie W4 i obserwujesz postój w Brzezinach.",
      "00:54:20, widzisz zmianę statusu łącznika na zielony.",
    ],
    objective:
      "Pomóż grupie zrozumieć mapę i fizyczne ograniczenia składu, ale nie zaczynaj od przyznania się do wejścia w strefę służbową.",
    mayShare: [
      "Czas blokady W3↔W4.",
      "Układ przejść i orientacyjny czas przejścia wagonu.",
    ],
    wantsToHide: ["Nielegalnie fotografowałeś panel techniczny."],
    whyNotEarlier:
      "Nie chciałeś dostać zakazu podróżowania ani problemów za wejście w strefę służbową.",
    core: true,
    isCulprit: false,
  },
  {
    id: "ok_partner",
    name: "Zofia Rudzka",
    shortLabel: "Była wspólniczka",
    publicBio:
      "Przez kilka lat prowadziłaś z Adrianem firmę doradczą. Rozstaliście się w złych relacjach.",
    travelReason:
      "Jedziesz na rozprawę dotyczącą dawnej spółki.",
    privateSecret:
      "Kilka lat temu podpisałaś w imieniu Adriana dokument kosztowy bez jego zgody. Adrian niedawno odnalazł kopię i zagroził, że ujawni sprawę.",
    privateKnowledge: [
      "Adrian od kilku dni analizował przelewy Vektor Cargo.",
      "Wspominał nazwę Northbridge, ale nie wyjaśnił Ci jej znaczenia.",
      "Od 00:42 do 00:53 prowadzisz prywatną wideorozmowę z prawnikiem z przedziału W2.",
    ],
    timeline: [
      "00:29, krótko rozmawiasz z Adrianem w W3 i kłócicie się.",
      "00:38, wracasz do W2.",
      "00:42–00:53, jesteś na wideorozmowie w przedziale 5.",
      "00:57, wychodzisz po wodę.",
    ],
    objective:
      "Bronisz się przed oczywistym motywem finansowym. Możesz ujawnić swoje alibi, ale sekret starego podpisu zostaw na moment, gdy grupa naprawdę Cię przyciśnie.",
    mayShare: [
      "Adrian badał Vektor Cargo.",
      "Masz wideorozmowę obejmującą kluczowy przedział.",
    ],
    wantsToHide: ["Sfałszowany podpis i powód waszego konfliktu."],
    whyNotEarlier:
      "Bałaś się, że dochodzenie w sprawie Adriana otworzy również starą sprawę dokumentów.",
    core: true,
    isCulprit: false,
  },
  {
    id: "ok_attendant",
    name: "Ola Bednarek",
    shortLabel: "Stewardka wagonu sypialnego",
    publicBio:
      "Obsługujesz W5 i W4. Znasz pasażerów, roznosisz wodę i sprawdzasz korytarze.",
    travelReason: "Jesteś na nocnej zmianie.",
    privateSecret:
      "Około 00:39 paliłaś w niedozwolonej strefie przy końcu W5, dlatego nie zgłosiłaś od razu wszystkiego, co widziałaś.",
    privateKnowledge: [
      "Widzisz Kamila stojącego kilka metrów od przedziału 7 około 00:39.",
      "Adrian wrócił wcześniej do przedziału w camelowym płaszczu.",
      "Po 01:04 w przedziale Adriana nie ma płaszcza.",
    ],
    timeline: [
      "00:35, kończysz obchód W5.",
      "00:39, jesteś przy końcu korytarza i widzisz Kamila.",
      "00:44, wracasz w stronę W4.",
      "01:07, pomagasz w pierwszym przeszukaniu przedziału Adriana.",
    ],
    objective:
      "Przekaż obserwację Kamila, kiedy grupa zacznie pytać o W5, ale możesz zwlekać z wyjaśnieniem, dlaczego sama tam byłaś.",
    mayShare: [
      "Kamil był w W5 około 00:39.",
      "Płaszcz Adriana później zniknął.",
    ],
    wantsToHide: ["Paliłaś w niedozwolonym miejscu."],
    whyNotEarlier:
      "Nie chciałaś stracić pracy przez własne naruszenie zasad.",
    core: false,
    isCulprit: false,
  },
  {
    id: "ok_lawyer",
    name: "Iga Wolska",
    shortLabel: "Prawniczka Vektor Cargo",
    publicBio:
      "Jesteś radczynią prawną dużej firmy logistycznej. Twierdzisz, że obecność Adriana w tym samym pociągu jest przypadkiem.",
    travelReason:
      "Jedziesz na poranne negocjacje biznesowe.",
    privateSecret:
      "Przed podróżą dostałaś polecenie, żeby przekonać Adriana do podpisania ugody i wycofania części zarzutów wobec Vektora.",
    privateKnowledge: [
      "Wiesz, że Kamil pracuje dla Vektora, choć publicznie przedstawia się inaczej.",
      "Nie znałaś szczegółów Northbridge, ale wiedziałaś, że dyrekcja bardzo boi się dokumentów Adriana.",
      "O 00:35 wysłałaś Kamilowi: „Nie naciskaj go. Czekamy do rana”.",
    ],
    timeline: [
      "00:25–00:35, jesteś w W3.",
      "00:35, wysyłasz wiadomość do Kamila.",
      "00:42–00:55, wracasz do W1 i rozmawiasz przez telefon z kancelarią.",
    ],
    objective:
      "Ukryj fakt, że reprezentujesz interesy Vektora wobec Adriana, ale nie kłam o wiadomości, jeśli zostanie ujawniona.",
    mayShare: [
      "Znasz Kamila zawodowo.",
      "Próbowałaś doprowadzić do ugody.",
    ],
    wantsToHide: ["Presję na Adriana i prawdziwą relację zawodową z Kamilem."],
    whyNotEarlier:
      "Obowiązuje Cię tajemnica zawodowa, a ujawnienie celu podróży mogłoby zaszkodzić klientowi.",
    core: false,
    isCulprit: false,
  },
  {
    id: "ok_courier",
    name: "Damian Sowa",
    shortLabel: "Kurier specjalny",
    publicBio:
      "Przewozisz zaplombowaną przesyłkę i prawie nie rozstajesz się z metalową walizką.",
    travelReason:
      "Masz dostarczyć przesyłkę do magazynu następnego ranka.",
    privateSecret:
      "W walizce są prototypowe podzespoły elektroniczne przewożone bez wymaganej dokumentacji celnej. Wcześniej korzystałeś z W6, żeby ukryć przesyłkę przed przypadkową kontrolą.",
    privateKnowledge: [
      "Byłeś w W6 przed 00:20, ale nie po 00:30.",
      "Szafa S-3 była wtedy zaplombowana i pusta poza pakietami bielizny.",
      "Zauważyłeś, że tylne drzwi W6 da się otworzyć podczas postoju M-1.",
    ],
    timeline: [
      "00:12–00:18, chowasz walizkę w W6 i wracasz do W1.",
      "00:30–00:58, pozostajesz w W1 przy swoim miejscu.",
      "01:06, przyznajesz obsłudze, że wcześniej byłeś w W6.",
    ],
    objective:
      "Broń się przed podejrzeniem wynikającym z dostępu do W6, jednocześnie nie ujawniając od razu nielegalnej zawartości przesyłki.",
    mayShare: [
      "S-3 była nienaruszona przed 00:20.",
      "W6 można otworzyć M-1.",
    ],
    wantsToHide: ["Nieprawidłowo zadeklarowaną przesyłkę."],
    whyNotEarlier:
      "Bałeś się kontroli przesyłki i konsekwencji zawodowych.",
    core: false,
    isCulprit: false,
  },
  {
    id: "ok_vlogger",
    name: "Julia Banas",
    shortLabel: "Vloggerka podróżnicza",
    publicBio:
      "Nagrywasz serię o nocnych pociągach. Masz kamerę, gimbal i dużo materiału z wagonów oraz peronów.",
    travelReason:
      "Tworzysz sponsorowany odcinek o podróży N417.",
    privateSecret:
      "Usunęłaś z montażu fragment, na którym widać wejście do zamkniętej strefy serwisowej. Sponsor zabronił Ci filmować zaplecze.",
    privateKnowledge: [
      "Twoja kamera pracowała przez cały postój w Brzezinach.",
      "Pierwszy kadr wygląda, jakby Adrian wychodził, ale dalsze sekundy pokazują powrót tej samej postaci.",
      "Surowego materiału nie skasowałaś — tylko ukryłaś go przed obsługą.",
    ],
    timeline: [
      "00:48–00:51, nagrywasz W4 i W5.",
      "00:52:10, wychodzisz na peron z drzwi W5.",
      "00:52:31–00:53:21, kamera obejmuje tylną część pociągu i słup zasłaniający postać.",
      "00:54, wracasz do W5.",
    ],
    objective:
      "Nie chcesz przyznać, że złamałaś zasady sponsora, ale Twój surowy materiał może całkowicie zmienić śledztwo.",
    mayShare: [
      "Masz nagranie z całego postoju.",
      "Postać w płaszczu pojawia się w więcej niż jednym ujęciu.",
    ],
    wantsToHide: ["Filmowałaś strefę serwisową mimo zakazu."],
    whyNotEarlier:
      "Bałaś się zerwania kontraktu sponsorskiego i usunięcia całego materiału.",
    core: false,
    isCulprit: false,
  },
  {
    id: "ok_steward",
    name: "Jan Pióro",
    shortLabel: "Steward restauracyjny",
    publicBio:
      "Obsługujesz bar i stoliki w W3. Pamiętasz część zamówień, ale noc jest intensywna.",
    travelReason: "Jesteś na służbie.",
    privateSecret:
      "Terminal POS-3 od kilku tygodni gubił synchronizację, a Ty odkładałeś zgłoszenie usterki, żeby nie komplikować zmiany.",
    privateKnowledge: [
      "Kamil zamówił kawę około 00:34, nie 00:49.",
      "Jego telefon został przy stoliku 4 na ładowarce bez właściciela.",
      "Kamil wrócił po telefon dopiero około 00:56.",
    ],
    timeline: [
      "00:34, obsługujesz Kamila przy stoliku 4.",
      "00:36–00:55, pracujesz za barem i przy kasie.",
      "00:49, terminal sam drukuje zaległy paragon.",
      "00:56, widzisz Kamila wracającego do stolika.",
    ],
    objective:
      "Wyjaśnij działanie paragonu, ale możesz początkowo minimalizować problem z terminalem.",
    mayShare: [
      "Prawdziwy czas zamówienia Kamila.",
      "Telefon był sam przy ładowarce.",
      "Kamil wrócił około 00:56.",
    ],
    wantsToHide: ["Ignorowałeś usterkę terminala POS-3."],
    whyNotEarlier:
      "Bałeś się odpowiedzialności za niesprawny sprzęt i błędne rozliczenia.",
    core: false,
    isCulprit: false,
  },
  {
    id: "ok_engineer",
    name: "Radosław Kruk",
    shortLabel: "Technik pokładowy",
    publicBio:
      "Odpowiadasz za drobne usterki elektryczne i systemy drzwi w składzie.",
    travelReason: "Jesteś na dyżurze technicznym.",
    privateSecret:
      "Reset W3↔W4 uruchomiłeś ręcznie po wcześniejszym błędzie diagnostycznym. Bałeś się, że blokada okaże się przyczyną zniknięcia.",
    privateKnowledge: [
      "Reset rozpoczął się o 00:46:00 i zakończył o 00:54:20.",
      "Blokady nie dało się ominąć od środka bez zatrzymania procedury.",
      "Reset nie dotyczył W5↔W6 ani klucza M-1.",
    ],
    timeline: [
      "00:44, dostajesz alarm o łączniku.",
      "00:46, uruchamiasz reset.",
      "00:46–00:54:20, jesteś przy panelu technicznym W3.",
      "00:54:20, potwierdzasz przywrócenie przejścia.",
    ],
    objective:
      "Nie pozwól grupie uznać usterki za plan sprawcy. To prawdziwy przypadek, który przypadkiem utrudnił trasę.",
    mayShare: [
      "Dokładny czas resetu.",
      "Brak związku z W6.",
    ],
    wantsToHide: ["Wcześniejszy błąd diagnostyczny, przez który potrzebny był reset."],
    whyNotEarlier:
      "Bałeś się, że odpowiesz za opóźnienie procedury i zostaniesz obciążony zniknięciem.",
    core: false,
    isCulprit: false,
  },
  {
    id: "ok_sister",
    name: "Agnieszka Socha",
    shortLabel: "Siostra Adriana",
    publicBio:
      "Jesteś starszą siostrą Adriana. Wasze relacje ostatnio były napięte, ale znasz jego przyzwyczajenia lepiej niż ktokolwiek w pociągu.",
    travelReason:
      "Jedziecie tym samym pociągiem na rodzinne spotkanie, choć osobno.",
    privateSecret:
      "Pokłóciliście się o spadek po ojcu. W wiadomościach napisałaś Adrianowi, że jeśli nie podpisze dokumentów, „pożałuje”.",
    privateKnowledge: [
      "Camelowy płaszcz naprawdę należy do Adriana.",
      "Adrian lekko utyka na prawą nogę po dawnej kontuzji.",
      "Postać z pierwszego nagrania peronowego idzie równym krokiem, bez charakterystycznego utykania.",
    ],
    timeline: [
      "00:20, krótko rozmawiasz z Adrianem w W5.",
      "00:28, wracasz do W2.",
      "00:40–00:55, czytasz w swoim przedziale.",
      "01:06, rozpoznajesz brak jego płaszcza.",
    ],
    objective:
      "Nie chcesz pokazywać gróźb z rodzinnej kłótni, ale Twoja wiedza o sposobie poruszania się Adriana podważa najprostsze wyjaśnienie kadru z peronu.",
    mayShare: [
      "Płaszcz należał do Adriana.",
      "Adrian lekko utykał.",
    ],
    wantsToHide: ["Groźnie brzmiące wiadomości o spadku."],
    whyNotEarlier:
      "Twoje wiadomości wyglądają jak motyw, mimo że dotyczyły wyłącznie rodzinnego konfliktu.",
    core: false,
    isCulprit: false,
  },
];

export function getOstatniKursRoles(playerCount: number) {
  return OSTATNI_KURS_ROLES.slice(0, Math.max(5, Math.min(12, playerCount)));
}

export function getOstatniKursRoleByKey(roleKey: string) {
  return OSTATNI_KURS_ROLES.find((role) => role.id === roleKey) ?? null;
}
