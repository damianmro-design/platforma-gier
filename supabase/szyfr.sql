-- SZYFR database schema and content. Applied to platforma-gier Supabase.

-- Migration: add_szyfr_full_game

-- SZYFR: complete cooperative game backend for zaGRAj.
-- Content is private. Clients receive only public puzzle data and their own clue subset.

alter table app_private.platform_rooms
  drop constraint if exists platform_rooms_game_slug_check;

alter table app_private.platform_rooms
  add constraint platform_rooms_game_slug_check
  check (game_slug in (
    'co-ludzie-powiedza',
    'zakrecone-haslo',
    'pod-przykrywka',
    'akta-nocy',
    'tylko-my',
    'va-banque',
    'szyfr'
  ));

create table if not exists app_private.szyfr_puzzles (
  step_key text primary key,
  mission_index integer not null check (mission_index between 0 and 5),
  mission_name text not null,
  stage_index integer not null check (stage_index between 1 and 2),
  variant integer not null check (variant between 0 and 3),
  title text not null,
  prompt text not null,
  answer_type text not null check (answer_type in ('number','text','choice','order')),
  answer_format text not null,
  canonical_answer text null,
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options)='array'),
  clues jsonb not null check (jsonb_typeof(clues)='array' and jsonb_array_length(clues)=6),
  hints jsonb not null check (jsonb_typeof(hints)='array' and jsonb_array_length(hints)=2),
  fragment_digit integer null check (fragment_digit between 0 and 9)
);

alter table app_private.szyfr_puzzles enable row level security;
revoke all on app_private.szyfr_puzzles from public, anon, authenticated;
drop policy if exists "deny direct client access" on app_private.szyfr_puzzles;
create policy "deny direct client access"
  on app_private.szyfr_puzzles
  for all to anon, authenticated
  using (false) with check (false);

create table if not exists app_private.szyfr_games (
  room_id uuid primary key references app_private.platform_rooms(id) on delete cascade,
  step_plan text[] not null,
  step_index integer not null default 1 check (step_index >= 1),
  phase text not null default 'tutorial'
    check (phase in ('tutorial','playing','final','finished','failed')),
  main_started_at timestamptz null,
  ends_at timestamptz null,
  finished_at timestamptz null,
  wrong_attempts integer not null default 0 check (wrong_attempts >= 0),
  hints_used integer not null default 0 check (hints_used >= 0),
  hint_level integer not null default 0 check (hint_level between 0 and 2),
  fragment_digits integer[] not null default '{}'::integer[],
  final_order integer[] not null,
  scenario_signature text not null,
  score integer null,
  last_event jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_private.szyfr_games enable row level security;
revoke all on app_private.szyfr_games from public, anon, authenticated;
drop policy if exists "deny direct client access" on app_private.szyfr_games;
create policy "deny direct client access"
  on app_private.szyfr_games
  for all to anon, authenticated
  using (false) with check (false);

insert into app_private.szyfr_puzzles
(step_key,mission_index,mission_name,stage_index,variant,title,prompt,answer_type,answer_format,canonical_answer,options,clues,hints,fragment_digit)
values
(
 'tutorial',0,'TRENING',1,0,'Pierwszy fragment',
 'Ustalcie wspólnie 1 cyfrę testowego klucza. Każdy widzi tylko część warunków.',
 'number','Wpisz 1 cyfrę','4','[]',
 jsonb_build_array(
  'Cyfra jest większa od 3.',
  'Cyfra jest parzysta i mniejsza od 6.',
  'To nie jest 2.',
  'Cyfra jest mniejsza od 5.',
  'Szukacie dokładnie jednej cyfry.',
  'To nie jest 0.'
 ),
 jsonb_build_array(
  'Połączcie ograniczenia „większa od 3” oraz „parzysta i mniejsza od 6”.',
  'Szukana cyfra to jedyna parzysta liczba pomiędzy 3 a 6.'
 ),null
),
(
 'm1-v1-s1',1,'PRZECHWYCONA TRANSMISJA',1,1,'Nagłówek transmisji',
 'Odtwórzcie 3-cyfrowy identyfikator przechwyconej transmisji.',
 'number','Wpisz 3 cyfry','472','[]',
 jsonb_build_array(
  'Pierwsza cyfra jest parzysta i większa od 2.',
  'Pierwsza cyfra jest mniejsza od 6.',
  'Druga cyfra jest nieparzysta.',
  'Druga cyfra jest o 3 większa od pierwszej.',
  'Trzecia cyfra jest o 2 mniejsza od pierwszej.',
  'Suma wszystkich cyfr wynosi 13.'
 ),
 jsonb_build_array(
  'Najpierw ustalcie pierwszą cyfrę. Dopiero potem relacje wskażą kolejne.',
  'Pierwsza cyfra to 4. Użyjcie relacji +3 i −2.'
 ),null
),
(
 'm1-v1-s2',1,'PRZECHWYCONA TRANSMISJA',2,1,'Kanał wiadomości',
 'Na terminalu pojawił się zapis: ◆ ○ △ ◇. Odszyfrujcie 4-literowe hasło.',
 'text','Wpisz hasło','SIEC','[]',
 jsonb_build_array(
  '◆ oznacza literę S.',
  '○ oznacza literę I.',
  '△ oznacza literę E.',
  '◇ oznacza literę Ć.',
  'Każdy symbol odpowiada dokładnie jednej literze.',
  'Hasło dotyczy połączeń między urządzeniami.'
 ),
 jsonb_build_array(
  'Czytajcie symbole od lewej do prawej i połączcie fragmenty legendy.',
  'Pierwsze 3 litery to S, I, E.'
 ),7
),
(
 'm1-v2-s1',1,'PRZECHWYCONA TRANSMISJA',1,2,'Sygnatura pakietu',
 'Odtwórzcie 3-cyfrową sygnaturę pakietu danych.',
 'number','Wpisz 3 cyfry','638','[]',
 jsonb_build_array(
  'Pierwsza cyfra jest parzysta i większa od 4.',
  'Pierwsza cyfra jest mniejsza od 8.',
  'Druga cyfra jest nieparzysta i mniejsza od 5.',
  'Druga cyfra pomnożona przez 2 daje pierwszą.',
  'Suma wszystkich cyfr wynosi 17.',
  'Trzecia cyfra jest o 2 większa od pierwszej.'
 ),
 jsonb_build_array(
  'Relacja między 1. i 2. cyfrą mocno zawęża możliwości.',
  'Pierwsza cyfra to 6, druga to 3. Została trzecia.'
 ),null
),
(
 'm1-v2-s2',1,'PRZECHWYCONA TRANSMISJA',2,2,'Echo kanału',
 'Na terminalu pojawił się zapis: ⬡ ● ✦ □. Odszyfrujcie 4-literowe hasło.',
 'text','Wpisz hasło','ECHO','[]',
 jsonb_build_array(
  '⬡ oznacza literę E.',
  '● oznacza literę C.',
  '✦ oznacza literę H.',
  '□ oznacza literę O.',
  'Każdy symbol jest użyty dokładnie raz.',
  'Hasło opisuje sygnał, który wraca po odbiciu.'
 ),
 jsonb_build_array(
  'Połączcie wszystkie fragmenty legendy w kolejności symboli.',
  'Dwie pierwsze litery to E i C.'
 ),2
),
(
 'm1-v3-s1',1,'PRZECHWYCONA TRANSMISJA',1,3,'Numer nośnej',
 'Odtwórzcie 3-cyfrowy numer nośnej transmisji.',
 'number','Wpisz 3 cyfry','251','[]',
 jsonb_build_array(
  'Pierwsza cyfra jest parzysta i większa od 0.',
  'Pierwsza cyfra jest mniejsza od 5.',
  'Druga cyfra jest o 3 większa od pierwszej.',
  'Druga cyfra jest nieparzysta.',
  'Trzecia cyfra jest nieparzysta i mniejsza od 3.',
  'Suma wszystkich cyfr wynosi 8.'
 ),
 jsonb_build_array(
  'Ustalcie najpierw pierwszą i trzecią cyfrę.',
  'Trzecia cyfra to 1, a suma wszystkich wynosi 8.'
 ),null
),
(
 'm1-v3-s2',1,'PRZECHWYCONA TRANSMISJA',2,3,'Rytm sygnału',
 'Na terminalu pojawił się zapis: ✚ ◇ ○ △. Odszyfrujcie 4-literowe hasło.',
 'text','Wpisz hasło','PULS','[]',
 jsonb_build_array(
  '✚ oznacza literę P.',
  '◇ oznacza literę U.',
  '○ oznacza literę L.',
  '△ oznacza literę S.',
  'Każdy symbol odpowiada dokładnie jednej literze.',
  'Hasło opisuje regularny rytm sygnału.'
 ),
 jsonb_build_array(
  'Czytajcie symbole od lewej do prawej.',
  'Pierwsze 2 litery to P i U.'
 ),9
),
(
 'm2-v1-s1',2,'BAZA DANYCH',1,1,'Podejrzany terminal',
 'Jeden z terminali wysłał pakiet poza sieć. Wskażcie który.',
 'choice','Wybierz terminal','NODE7',
 jsonb_build_array('NODE-3','NODE-5','NODE-7','NODE-9','NODE-12'),
 jsonb_build_array(
  'Numer aktywnego terminala jest nieparzysty.',
  'Numer terminala jest większy niż 4.',
  'Numer terminala jest mniejszy niż 9.',
  'To nie był NODE-5.',
  'NODE-3 pracował wyłącznie jako kopia zapasowa.',
  'NODE-9 był odłączony od magistrali.'
 ),
 jsonb_build_array(
  'Zamiast szukać właściwego terminala, kolejno eliminujcie niemożliwe.',
  'Po zastosowaniu zakresu >4 i <9 zostają NODE-5 i NODE-7.'
 ),null
),
(
 'm2-v1-s2',2,'BAZA DANYCH',2,1,'Legenda rekordów',
 'Rekord ma postać ◇ △ ○ □. Odtwórzcie 4-cyfrowy kod z rozproszonej legendy.',
 'number','Wpisz 4 cyfry','7314','[]',
 jsonb_build_array(
  '◇ ma wartość 7.',
  '△ ma wartość 3.',
  '○ ma wartość 1.',
  '□ ma wartość 4.',
  'Każdy symbol reprezentuje inną cyfrę.',
  'Suma 4 cyfr kodu wynosi 15.'
 ),
 jsonb_build_array(
  'Kod powstaje przez podstawienie wartości symboli w podanej kolejności.',
  'Dwie pierwsze cyfry to 7 i 3.'
 ),4
),
(
 'm2-v2-s1',2,'BAZA DANYCH',1,2,'Archiwum dostępu',
 'Tylko 1 archiwum zawiera właściwy log. Wskażcie je.',
 'choice','Wybierz archiwum','ARCH4',
 jsonb_build_array('ARCH-2','ARCH-4','ARCH-6','ARCH-8','ARCH-10'),
 jsonb_build_array(
  'Szukany numer jest parzysty.',
  'Szukany numer jest większy od 2.',
  'Szukany numer jest mniejszy od 8.',
  'To nie jest ARCH-6.',
  'ARCH-2 zawiera log z poprzedniej zmiany.',
  'ARCH-10 zostało utworzone już po incydencie.'
 ),
 jsonb_build_array(
  'Połączcie zakres numerów z informacją o ARCH-6.',
  'Po warunkach >2 i <8 zostają ARCH-4 oraz ARCH-6.'
 ),null
),
(
 'm2-v2-s2',2,'BAZA DANYCH',2,2,'Indeks zasobu',
 'Indeks ma postać ● ✦ ◆ △. Odtwórzcie 4-cyfrowy kod.',
 'number','Wpisz 4 cyfry','9052','[]',
 jsonb_build_array(
  '● ma wartość 9.',
  '✦ ma wartość 0.',
  '◆ ma wartość 5.',
  '△ ma wartość 2.',
  'Każdy symbol ma stałą wartość w tym rekordzie.',
  'Pierwsza i trzecia cyfra są nieparzyste.'
 ),
 jsonb_build_array(
  'Podstawcie cyfry pod symbole dokładnie w kolejności rekordu.',
  'Pierwsze 2 cyfry to 9 i 0.'
 ),8
),
(
 'm2-v3-s1',2,'BAZA DANYCH',1,3,'Uszkodzony sektor',
 'Wskażcie sektor, w którym ukryto fragment klucza.',
 'choice','Wybierz sektor','SEKTORC',
 jsonb_build_array('SEKTOR-A','SEKTOR-B','SEKTOR-C','SEKTOR-D','SEKTOR-E'),
 jsonb_build_array(
  'Szukany sektor znajduje się po SEKTORZE-B.',
  'Szukany sektor znajduje się przed SEKTOR-em E.',
  'To nie jest SEKTOR-D.',
  'To nie jest SEKTOR-A.',
  'SEKTOR-B ma poprawną sumę kontrolną i nie wymaga odzysku.',
  'SEKTOR-E zawiera wyłącznie puste bloki.'
 ),
 jsonb_build_array(
  'Traktujcie litery sektorów jak kolejność A–E.',
  'Szukacie sektora po B, przed E i nie jest to D.'
 ),null
),
(
 'm2-v3-s2',2,'BAZA DANYCH',2,3,'Mapa bloków',
 'Mapa bloków ma postać △ □ ◇ ○. Odtwórzcie 4-cyfrowy kod.',
 'number','Wpisz 4 cyfry','4628','[]',
 jsonb_build_array(
  '△ ma wartość 4.',
  '□ ma wartość 6.',
  '◇ ma wartość 2.',
  '○ ma wartość 8.',
  'Wszystkie wartości są parzyste.',
  'Pierwsza wartość jest mniejsza od drugiej.'
 ),
 jsonb_build_array(
  'Zbierzcie wszystkie części legendy, potem czytajcie od lewej.',
  'Dwie pierwsze cyfry to 4 i 6.'
 ),3
),
(
 'm3-v1-s1',3,'SIEĆ KONTAKTÓW',1,1,'Kolejność połączeń',
 'Ustalcie kolejność 4 kryptonimów od pierwszego do ostatniego.',
 'order','Ustaw 4 kryptonimy we właściwej kolejności','ALFADELTASIGMAOMEGA',
 jsonb_build_array('ALFA','DELTA','SIGMA','OMEGA'),
 jsonb_build_array(
  'ALFA jest przed DELTĄ.',
  'DELTA jest bezpośrednio przed SIGMĄ.',
  'OMEGA nie jest pierwsza.',
  'OMEGA jest po SIGMIE.',
  'ALFA nie jest ostatnia.',
  'Między ALFĄ a SIGMĄ znajduje się dokładnie 1 kryptonim.'
 ),
 jsonb_build_array(
  'Zacznijcie od pary, która musi stać bezpośrednio obok siebie.',
  'DELTA–SIGMA tworzą blok. OMEGA musi być za nim.'
 ),null
),
(
 'm3-v1-s2',3,'SIEĆ KONTAKTÓW',2,1,'Źródło przekazu',
 'Jedna osoba przekazała właściwy fragment. Wyeliminujcie pozostałe kontakty.',
 'choice','Wybierz kontakt','ORBIT',
 jsonb_build_array('IRIS','NOVA','ORBIT','VESTA','ZENIT'),
 jsonb_build_array(
  'IRIS logowała się z innego miasta.',
  'NOVA była offline podczas transmisji.',
  'VESTA użyła klucza, który wygasł dzień wcześniej.',
  'ZENIT nie miał dostępu do kanału 4.',
  'Źródłem nie była osoba z pierwszych 2 wpisów listy.',
  'Źródłem nie była żadna z 2 ostatnich osób listy.'
 ),
 jsonb_build_array(
  'Każdy trop eliminuje kontakt. Szukajcie osoby, której nie wyklucza żaden.',
  'IRIS, NOVA, VESTA i ZENIT mają osobne alibi techniczne.'
 ),6
),
(
 'm3-v2-s1',3,'SIEĆ KONTAKTÓW',1,2,'Łańcuch przekaźników',
 'Ustalcie kolejność: KAPPA, OMEGA, ALFA, DELTA.',
 'order','Ustaw 4 kryptonimy we właściwej kolejności','KAPPAOMEGAALFADELTA',
 jsonb_build_array('KAPPA','OMEGA','ALFA','DELTA'),
 jsonb_build_array(
  'KAPPA jest przed OMEGĄ.',
  'OMEGA jest bezpośrednio przed ALFĄ.',
  'DELTA nie jest pierwsza.',
  'DELTA znajduje się po ALFIE.',
  'KAPPA nie jest ostatnia.',
  'Między KAPPĄ a ALFĄ znajduje się dokładnie 1 kryptonim.'
 ),
 jsonb_build_array(
  'OMEGA i ALFA muszą tworzyć nierozdzielną parę.',
  'DELTA jest za ALFĄ, więc para OMEGA–ALFA nie może kończyć listy.'
 ),null
),
(
 'm3-v2-s2',3,'SIEĆ KONTAKTÓW',2,2,'Kontakt awaryjny',
 'Wybierzcie kontakt, który faktycznie odebrał pakiet.',
 'choice','Wybierz kontakt','MIRA',
 jsonb_build_array('MIRA','NEXUS','POLAR','RAVEN','SOL'),
 jsonb_build_array(
  'NEXUS odrzucił pakiet z powodu błędnej sumy.',
  'POLAR nie był zalogowany.',
  'RAVEN miał wyłączony kanał awaryjny.',
  'SOL połączył się dopiero po zakończeniu transmisji.',
  'Odbiorcą nie był żaden z 2 środkowych wpisów listy.',
  'Odbiorcą nie był ostatni wpis listy.'
 ),
 jsonb_build_array(
  'Oddzielcie „kto mógł” od „kto na pewno nie mógł”.',
  'NEXUS, POLAR, RAVEN i SOL odpadają z niezależnych powodów.'
 ),1
),
(
 'm3-v3-s1',3,'SIEĆ KONTAKTÓW',1,3,'Trasa sygnału',
 'Ustalcie kolejność: SIGMA, ALFA, OMEGA, DELTA.',
 'order','Ustaw 4 kryptonimy we właściwej kolejności','SIGMAALFAOMEGADELTA',
 jsonb_build_array('SIGMA','ALFA','OMEGA','DELTA'),
 jsonb_build_array(
  'SIGMA jest przed ALFĄ.',
  'ALFA jest bezpośrednio przed OMEGĄ.',
  'DELTA nie jest pierwsza.',
  'DELTA jest po OMEDZE.',
  'SIGMA nie jest ostatnia.',
  'Między SIGMĄ a OMEGĄ znajduje się dokładnie 1 kryptonim.'
 ),
 jsonb_build_array(
  'ALFA–OMEGA to para, której nie można rozdzielić.',
  'DELTA musi znaleźć się za OMEGĄ.'
 ),null
),
(
 'm3-v3-s2',3,'SIEĆ KONTAKTÓW',2,3,'Operator kanału',
 'Wskażcie operatora, który miał jednocześnie aktywny kanał i właściwe uprawnienia.',
 'choice','Wybierz operatora','VECTOR',
 jsonb_build_array('AURORA','COMET','ION','VECTOR','WAVE'),
 jsonb_build_array(
  'AURORA nie miała uprawnień poziomu 3.',
  'COMET pracował na innym kanale.',
  'ION zakończył sesję przed incydentem.',
  'WAVE używał terminala tylko do odczytu.',
  'Operator nie był żadnym z 2 pierwszych wpisów listy.',
  'Operator nie był ostatnim wpisem listy.'
 ),
 jsonb_build_array(
  'Cztery osoby mają konkretny powód wykluczenia.',
  'Po wyeliminowaniu AURORY, COMETA, IONA i WAVE zostaje 1 operator.'
 ),5
),
(
 'm4-v1-s1',4,'KLUCZ DOSTĘPU',1,1,'Rdzeń klucza',
 'Odtwórzcie 4-cyfrowy rdzeń klucza dostępu.',
 'number','Wpisz 4 cyfry','3816','[]',
 jsonb_build_array(
  'Pierwsza cyfra jest nieparzysta i mniejsza od 5.',
  'Druga cyfra jest o 5 większa od pierwszej.',
  'Trzecia cyfra jest o 2 mniejsza od pierwszej.',
  'Czwarta cyfra jest o 2 mniejsza od drugiej.',
  'Suma wszystkich cyfr wynosi 18.',
  'Trzecia < pierwsza < czwarta < druga.'
 ),
 jsonb_build_array(
  'Relacje między cyframi są ważniejsze niż sama suma.',
  'Jeśli pierwsza to 3, pozostałe relacje wyznaczają 8, 1 i 6.'
 ),null
),
(
 'm4-v1-s2',4,'KLUCZ DOSTĘPU',2,1,'Fragment klucza słownego',
 'Wiadomość ma postać: 11 · 12 · 21 · 3 · 26. Odtwórzcie hasło literowe.',
 'text','Wpisz hasło','KLUCZ','[]',
 jsonb_build_array(
  'Pozycja 11 odpowiada literze K.',
  'Pozycja 12 odpowiada literze L.',
  'Pozycja 21 odpowiada literze U.',
  'Pozycja 3 odpowiada literze C.',
  'Pozycja 26 odpowiada literze Z.',
  'Czytajcie wartości dokładnie w kolejności wiadomości.'
 ),
 jsonb_build_array(
  'Każda liczba jest niezależnym odwołaniem do litery.',
  'Pierwsze 2 litery hasła to K i L.'
 ),2
),
(
 'm4-v2-s1',4,'KLUCZ DOSTĘPU',1,2,'Kod autoryzacji',
 'Odtwórzcie 4-cyfrowy kod autoryzacji.',
 'number','Wpisz 4 cyfry','5263','[]',
 jsonb_build_array(
  'Pierwsza cyfra jest nieparzysta, większa od 3 i mniejsza od 7.',
  'Druga cyfra jest o 3 mniejsza od pierwszej.',
  'Trzecia cyfra jest o 1 większa od pierwszej.',
  'Czwarta cyfra jest o 1 większa od drugiej.',
  'Suma wszystkich cyfr wynosi 16.',
  'Trzecia cyfra jest parzysta i większa od pierwszej.'
 ),
 jsonb_build_array(
  'Najpierw ustalcie pierwszą cyfrę z jej zakresu.',
  'Pierwsza cyfra to 5. Dalej użyjcie relacji −3, +1 i +1.'
 ),null
),
(
 'm4-v2-s2',4,'KLUCZ DOSTĘPU',2,2,'Słowo autoryzacyjne',
 'Odczytajcie 6 liter z indeksów: 4 · 15 · 19 · 20 · 5 · 16.',
 'text','Wpisz hasło','DOSTEP','[]',
 jsonb_build_array(
  '4 odpowiada literze D.',
  '15 odpowiada literze O.',
  '19 odpowiada literze S.',
  '20 odpowiada literze T.',
  '5 odpowiada literze E.',
  '16 odpowiada literze P.'
 ),
 jsonb_build_array(
  'Zbierzcie litery przypisane do wszystkich 6 indeksów.',
  'Pierwsze 3 litery to D, O, S.'
 ),7
),
(
 'm4-v3-s1',4,'KLUCZ DOSTĘPU',1,3,'Kod serwisowy',
 'Odtwórzcie 4-cyfrowy kod serwisowy.',
 'number','Wpisz 4 cyfry','7142','[]',
 jsonb_build_array(
  'Pierwsza cyfra jest nieparzysta, większa od 5 i mniejsza od 9.',
  'Druga cyfra jest o 6 mniejsza od pierwszej.',
  'Trzecia cyfra jest o 3 mniejsza od pierwszej.',
  'Czwarta cyfra pomnożona przez 2 daje trzecią.',
  'Suma wszystkich cyfr wynosi 14.',
  'Wszystkie 4 cyfry są różne.'
 ),
 jsonb_build_array(
  'Pierwsza cyfra ma tylko jedną możliwość.',
  'Pierwsza cyfra to 7. Z niej wynikają druga i trzecia.'
 ),null
),
(
 'm4-v3-s2',4,'KLUCZ DOSTĘPU',2,3,'Polecenie terminala',
 'Odczytajcie 6 liter z indeksów: 15 · 20 · 23 · 15 · 18 · 26.',
 'text','Wpisz hasło','OTWORZ','[]',
 jsonb_build_array(
  '15 odpowiada literze O.',
  '20 odpowiada literze T.',
  '23 odpowiada literze W.',
  '18 odpowiada literze R.',
  '26 odpowiada literze Z.',
  'Wartość 15 występuje 2 razy i za każdym razem oznacza tę samą literę.'
 ),
 jsonb_build_array(
  'Zwróćcie uwagę, że pierwsza i czwarta litera są takie same.',
  'Pierwsze 3 litery to O, T, W.'
 ),8
),
(
 'final-v1',5,'KOD GŁÓWNY',1,1,'Sekwencja końcowa',
 'Macie 4 odzyskane cyfry, po 1 z każdej misji. Ustalcie kolejność misji i wpiszcie cyfry w tej kolejności.',
 'number','Wpisz 4 cyfry',null,'[]',
 jsonb_build_array(
  'SIEĆ KONTAKTÓW jest pierwsza.',
  'PRZECHWYCONA TRANSMISJA jest przed KLUCZEM DOSTĘPU.',
  'BAZA DANYCH jest ostatnia.',
  'KLUCZ DOSTĘPU jest bezpośrednio przed BAZĄ DANYCH.',
  'PRZECHWYCONA TRANSMISJA nie jest pierwsza.',
  'SIEĆ KONTAKTÓW nie sąsiaduje z BAZĄ DANYCH.'
 ),
 jsonb_build_array(
  'Ułóżcie najpierw nazwy 4 misji, dopiero potem podstawcie odzyskane cyfry.',
  'Kolejność zaczyna SIEĆ KONTAKTÓW, a kończy BAZA DANYCH.'
 ),null
),
(
 'final-v2',5,'KOD GŁÓWNY',1,2,'Sekwencja końcowa',
 'Macie 4 odzyskane cyfry, po 1 z każdej misji. Ustalcie kolejność misji i wpiszcie cyfry w tej kolejności.',
 'number','Wpisz 4 cyfry',null,'[]',
 jsonb_build_array(
  'BAZA DANYCH jest pierwsza.',
  'KLUCZ DOSTĘPU jest bezpośrednio po BAZIE DANYCH.',
  'SIEĆ KONTAKTÓW jest ostatnia.',
  'PRZECHWYCONA TRANSMISJA znajduje się po KLUCZU DOSTĘPU.',
  'PRZECHWYCONA TRANSMISJA nie jest ostatnia.',
  'Między BAZĄ DANYCH a PRZECHWYCONĄ TRANSMISJĄ znajduje się dokładnie 1 misja.'
 ),
 jsonb_build_array(
  'Szukajcie relacji „bezpośrednio po” i „ostatnia”.',
  'Dwie pierwsze misje to BAZA DANYCH, potem KLUCZ DOSTĘPU.'
 ),null
),
(
 'final-v3',5,'KOD GŁÓWNY',1,3,'Sekwencja końcowa',
 'Macie 4 odzyskane cyfry, po 1 z każdej misji. Ustalcie kolejność misji i wpiszcie cyfry w tej kolejności.',
 'number','Wpisz 4 cyfry',null,'[]',
 jsonb_build_array(
  'KLUCZ DOSTĘPU jest pierwszy.',
  'BAZA DANYCH jest bezpośrednio po KLUCZU DOSTĘPU.',
  'PRZECHWYCONA TRANSMISJA jest ostatnia.',
  'SIEĆ KONTAKTÓW znajduje się przed PRZECHWYCONĄ TRANSMISJĄ.',
  'SIEĆ KONTAKTÓW nie jest pierwsza.',
  'Między KLUCZEM DOSTĘPU a SIECIĄ KONTAKTÓW znajduje się dokładnie 1 misja.'
 ),
 jsonb_build_array(
  'Najpierw ustawcie KLUCZ DOSTĘPU i BAZĘ DANYCH jako parę.',
  'Kolejność zaczyna KLUCZ DOSTĘPU → BAZA DANYCH, a kończy PRZECHWYCONA TRANSMISJA.'
 ),null
)
on conflict (step_key) do update set
 mission_index=excluded.mission_index,
 mission_name=excluded.mission_name,
 stage_index=excluded.stage_index,
 variant=excluded.variant,
 title=excluded.title,
 prompt=excluded.prompt,
 answer_type=excluded.answer_type,
 answer_format=excluded.answer_format,
 canonical_answer=excluded.canonical_answer,
 options=excluded.options,
 clues=excluded.clues,
 hints=excluded.hints,
 fragment_digit=excluded.fragment_digit;

create or replace function app_private.normalize_szyfr_answer(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    translate(
      upper(trim(coalesce(p_value,''))),
      'ĄĆĘŁŃÓŚŹŻ',
      'ACELNOSZZ'
    ),
    '[^A-Z0-9]+',
    '',
    'g'
  );
$$;

revoke all on function app_private.normalize_szyfr_answer(text) from public, anon, authenticated;

create or replace function app_private.initialize_szyfr_internal(
  p_room_id uuid,
  p_previous_signature text default null
)
returns boolean
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room app_private.platform_rooms%rowtype;
  player_count integer;
  v1 integer := 1 + floor(random()*3)::integer;
  v2 integer := 1 + floor(random()*3)::integer;
  v3 integer := 1 + floor(random()*3)::integer;
  v4 integer := 1 + floor(random()*3)::integer;
  vf integer := 1 + floor(random()*3)::integer;
  signature text;
  plan text[];
  final_sequence integer[];
begin
  select * into target_room
  from app_private.platform_rooms
  where id=p_room_id and game_slug='szyfr'
  limit 1;

  if target_room.id is null then return false; end if;

  select count(*) into player_count
  from app_private.room_players
  where room_id=p_room_id;

  if player_count < 2 or player_count > 6 then return false; end if;

  signature := concat(v1,'-',v2,'-',v3,'-',v4,'-',vf);
  if p_previous_signature is not null and signature=p_previous_signature then
    vf := (vf % 3) + 1;
    signature := concat(v1,'-',v2,'-',v3,'-',v4,'-',vf);
  end if;

  plan := array[
    'tutorial',
    format('m1-v%s-s1',v1), format('m1-v%s-s2',v1),
    format('m2-v%s-s1',v2), format('m2-v%s-s2',v2),
    format('m3-v%s-s1',v3), format('m3-v%s-s2',v3),
    format('m4-v%s-s1',v4), format('m4-v%s-s2',v4),
    format('final-v%s',vf)
  ];

  final_sequence := case vf
    when 1 then array[3,1,4,2]
    when 2 then array[2,4,1,3]
    else array[4,2,3,1]
  end;

  insert into app_private.szyfr_games(
    room_id,step_plan,step_index,phase,main_started_at,ends_at,finished_at,
    wrong_attempts,hints_used,hint_level,fragment_digits,final_order,
    scenario_signature,score,last_event,updated_at
  )
  values(
    p_room_id,plan,1,'tutorial',null,null,null,
    0,0,0,'{}'::integer[],final_sequence,
    signature,null,
    jsonb_build_object('type','game_initialized','eventId',gen_random_uuid()::text),
    now()
  )
  on conflict (room_id) do update set
    step_plan=excluded.step_plan,
    step_index=1,
    phase='tutorial',
    main_started_at=null,
    ends_at=null,
    finished_at=null,
    wrong_attempts=0,
    hints_used=0,
    hint_level=0,
    fragment_digits='{}'::integer[],
    final_order=excluded.final_order,
    scenario_signature=excluded.scenario_signature,
    score=null,
    last_event=excluded.last_event,
    updated_at=now();

  return true;
end;
$$;

revoke all on function app_private.initialize_szyfr_internal(uuid,text) from public, anon, authenticated;

create or replace function app_private.szyfr_fail_if_expired_internal(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  changed boolean := false;
begin
  update app_private.szyfr_games
  set
    phase='failed',
    finished_at=coalesce(finished_at,now()),
    last_event=jsonb_build_object(
      'type','time_expired',
      'eventId',gen_random_uuid()::text
    ),
    updated_at=now()
  where room_id=p_room_id
    and phase in ('playing','final')
    and ends_at is not null
    and ends_at <= now();

  changed := found;

  if changed then
    update app_private.platform_rooms
    set game_phase='failed'
    where id=p_room_id;
  end if;

  return changed;
end;
$$;

revoke all on function app_private.szyfr_fail_if_expired_internal(uuid) from public, anon, authenticated;

create or replace function app_private.get_szyfr_state_internal(
  p_code text,
  p_player_token uuid default null,
  p_host_token uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  r app_private.platform_rooms%rowtype;
  g app_private.szyfr_games%rowtype;
  p app_private.szyfr_puzzles%rowtype;
  viewer app_private.room_players%rowtype;
  player_count integer;
  player_index integer;
  private_clues jsonb := '[]'::jsonb;
  visible_hints jsonb := '[]'::jsonb;
  is_host boolean := false;
  expected_final text := null;
  elapsed_seconds integer := 0;
begin
  select * into r
  from app_private.platform_rooms
  where code=upper(trim(p_code))
    and game_slug='szyfr'
    and expires_at>now()
  limit 1;

  if r.id is null then return null; end if;

  perform app_private.szyfr_fail_if_expired_internal(r.id);

  select * into g
  from app_private.szyfr_games
  where room_id=r.id;

  if g.room_id is null then return null; end if;

  is_host := p_host_token is not null and r.host_token=p_host_token;

  if p_player_token is not null then
    select * into viewer
    from app_private.room_players
    where room_id=r.id and player_token=p_player_token
    limit 1;
  end if;

  select count(*) into player_count
  from app_private.room_players
  where room_id=r.id;

  select * into p
  from app_private.szyfr_puzzles
  where step_key=g.step_plan[g.step_index];

  if viewer.id is not null then
    select idx into player_index
    from (
      select rp.id, row_number() over(order by rp.joined_at,rp.id)::integer - 1 as idx
      from app_private.room_players rp
      where rp.room_id=r.id
    ) ranked
    where ranked.id=viewer.id;

    select coalesce(jsonb_agg(c.value order by c.ord),'[]'::jsonb)
    into private_clues
    from jsonb_array_elements(p.clues) with ordinality c(value,ord)
    where ((c.ord-1)::integer % greatest(player_count,1))=player_index;
  end if;

  if g.hint_level > 0 then
    select coalesce(jsonb_agg(h.value order by h.ord),'[]'::jsonb)
    into visible_hints
    from jsonb_array_elements(p.hints) with ordinality h(value,ord)
    where h.ord <= g.hint_level;
  end if;

  if g.main_started_at is not null then
    elapsed_seconds := greatest(
      0,
      floor(extract(epoch from (coalesce(g.finished_at,now()) - g.main_started_at)))::integer
    );
  end if;

  if p.mission_index=5 and array_length(g.fragment_digits,1)=4 then
    select string_agg(g.fragment_digits[o.mission_no]::text,'' order by o.ord)
    into expected_final
    from unnest(g.final_order) with ordinality o(mission_no,ord);
  end if;

  return jsonb_build_object(
    'serverNow',now(),
    'phase',g.phase,
    'endsAt',g.ends_at,
    'mainStartedAt',g.main_started_at,
    'finishedAt',g.finished_at,
    'stepIndex',g.step_index,
    'stepCount',array_length(g.step_plan,1),
    'wrongAttempts',g.wrong_attempts,
    'hintsUsed',g.hints_used,
    'hintLevel',g.hint_level,
    'hints',visible_hints,
    'fragments',to_jsonb(g.fragment_digits),
    'scenarioSignature',g.scenario_signature,
    'score',g.score,
    'elapsedSeconds',elapsed_seconds,
    'lastEvent',g.last_event,
    'isHost',is_host,
    'viewer',case when viewer.id is null then null else jsonb_build_object(
      'id',viewer.id,
      'name',viewer.display_name,
      'avatar',viewer.avatar
    ) end,
    'puzzle',jsonb_build_object(
      'stepKey',p.step_key,
      'missionIndex',p.mission_index,
      'missionName',p.mission_name,
      'stageIndex',p.stage_index,
      'title',p.title,
      'prompt',p.prompt,
      'answerType',p.answer_type,
      'answerFormat',p.answer_format,
      'options',p.options,
      'privateClues',private_clues,
      'totalClues',jsonb_array_length(p.clues),
      'viewerClues',jsonb_array_length(private_clues),
      'finalReady',case when p.mission_index=5 then expected_final is not null else true end
    )
  );
end;
$$;

revoke all on function app_private.get_szyfr_state_internal(text,uuid,uuid) from public, anon, authenticated;

create or replace function app_private.submit_szyfr_answer_internal(
  p_code text,
  p_player_token uuid,
  p_step_key text,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  r app_private.platform_rooms%rowtype;
  g app_private.szyfr_games%rowtype;
  p app_private.szyfr_puzzles%rowtype;
  viewer app_private.room_players%rowtype;
  current_key text;
  expected text;
  clean_answer text;
  clean_expected text;
  new_fragments integer[];
  next_key text;
  next_puzzle app_private.szyfr_puzzles%rowtype;
  event_id text := gen_random_uuid()::text;
  computed_score integer;
begin
  select * into r
  from app_private.platform_rooms
  where code=upper(trim(p_code)) and game_slug='szyfr' and expires_at>now()
  limit 1;
  if r.id is null then raise exception 'Game not found'; end if;

  select * into viewer
  from app_private.room_players
  where room_id=r.id and player_token=p_player_token
  limit 1;
  if viewer.id is null then raise exception 'Player not found'; end if;

  perform app_private.szyfr_fail_if_expired_internal(r.id);

  select * into g
  from app_private.szyfr_games
  where room_id=r.id
  for update;

  if g.phase in ('finished','failed') then raise exception 'Game closed'; end if;

  current_key := g.step_plan[g.step_index];
  if current_key is distinct from p_step_key then raise exception 'Step changed'; end if;

  select * into p
  from app_private.szyfr_puzzles
  where step_key=current_key;

  if p.mission_index=5 then
    if array_length(g.fragment_digits,1) <> 4 then raise exception 'Fragments missing'; end if;
    select string_agg(g.fragment_digits[o.mission_no]::text,'' order by o.ord)
    into expected
    from unnest(g.final_order) with ordinality o(mission_no,ord);
  else
    expected := p.canonical_answer;
  end if;

  clean_answer := app_private.normalize_szyfr_answer(p_answer);
  clean_expected := app_private.normalize_szyfr_answer(expected);

  if clean_answer is distinct from clean_expected then
    update app_private.szyfr_games
    set
      wrong_attempts=wrong_attempts+1,
      ends_at=case when phase='tutorial' or ends_at is null then ends_at else ends_at - interval '20 seconds' end,
      last_event=jsonb_build_object(
        'type','wrong_answer',
        'eventId',event_id,
        'penaltySeconds',case when phase='tutorial' then 0 else 20 end
      ),
      updated_at=now()
    where room_id=r.id;

    perform app_private.szyfr_fail_if_expired_internal(r.id);

    return jsonb_build_object('correct',false,'eventId',event_id);
  end if;

  if p.mission_index=0 then
    update app_private.szyfr_games
    set
      step_index=step_index+1,
      phase='playing',
      main_started_at=now(),
      ends_at=now()+interval '40 minutes',
      hint_level=0,
      last_event=jsonb_build_object(
        'type','tutorial_complete',
        'eventId',event_id
      ),
      updated_at=now()
    where room_id=r.id;

    update app_private.platform_rooms set game_phase='playing' where id=r.id;
    return jsonb_build_object('correct',true,'tutorialComplete',true,'eventId',event_id);
  end if;

  if p.mission_index=5 then
    computed_score := greatest(
      100,
      1200
      - g.wrong_attempts*45
      - g.hints_used*90
      - floor(extract(epoch from (now()-g.main_started_at))/30)::integer*5
    );

    update app_private.szyfr_games
    set
      phase='finished',
      finished_at=now(),
      score=computed_score,
      last_event=jsonb_build_object(
        'type','game_complete',
        'eventId',event_id,
        'score',computed_score
      ),
      updated_at=now()
    where room_id=r.id;

    update app_private.platform_rooms set game_phase='finished' where id=r.id;
    return jsonb_build_object('correct',true,'finished',true,'score',computed_score,'eventId',event_id);
  end if;

  new_fragments := g.fragment_digits;
  if p.fragment_digit is not null then
    new_fragments := array_append(new_fragments,p.fragment_digit);
  end if;

  next_key := g.step_plan[g.step_index+1];
  select * into next_puzzle
  from app_private.szyfr_puzzles
  where step_key=next_key;

  update app_private.szyfr_games
  set
    step_index=step_index+1,
    phase=case when next_puzzle.mission_index=5 then 'final' else 'playing' end,
    fragment_digits=new_fragments,
    hint_level=0,
    last_event=jsonb_build_object(
      'type',case when p.fragment_digit is not null then 'mission_complete' else 'stage_complete' end,
      'eventId',event_id,
      'missionIndex',p.mission_index,
      'fragmentDigit',p.fragment_digit
    ),
    updated_at=now()
  where room_id=r.id;

  update app_private.platform_rooms
  set game_phase=case when next_puzzle.mission_index=5 then 'final' else 'playing' end
  where id=r.id;

  return jsonb_build_object(
    'correct',true,
    'missionComplete',p.fragment_digit is not null,
    'fragmentDigit',p.fragment_digit,
    'eventId',event_id
  );
end;
$$;

revoke all on function app_private.submit_szyfr_answer_internal(text,uuid,text,text) from public, anon, authenticated;

create or replace function app_private.use_szyfr_hint_internal(
  p_code text,
  p_player_token uuid,
  p_step_key text
)
returns jsonb
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  r app_private.platform_rooms%rowtype;
  g app_private.szyfr_games%rowtype;
  viewer app_private.room_players%rowtype;
  current_key text;
  event_id text := gen_random_uuid()::text;
begin
  select * into r
  from app_private.platform_rooms
  where code=upper(trim(p_code)) and game_slug='szyfr' and expires_at>now()
  limit 1;
  if r.id is null then raise exception 'Game not found'; end if;

  select * into viewer
  from app_private.room_players
  where room_id=r.id and player_token=p_player_token
  limit 1;
  if viewer.id is null then raise exception 'Player not found'; end if;

  perform app_private.szyfr_fail_if_expired_internal(r.id);

  select * into g from app_private.szyfr_games where room_id=r.id for update;
  if g.phase not in ('playing','final') then raise exception 'Hint unavailable'; end if;

  current_key := g.step_plan[g.step_index];
  if current_key is distinct from p_step_key then raise exception 'Step changed'; end if;
  if g.hint_level>=2 then raise exception 'No more hints'; end if;

  update app_private.szyfr_games
  set
    hint_level=hint_level+1,
    hints_used=hints_used+1,
    ends_at=ends_at-interval '30 seconds',
    last_event=jsonb_build_object(
      'type','hint_used',
      'eventId',event_id,
      'penaltySeconds',30,
      'hintLevel',hint_level+1
    ),
    updated_at=now()
  where room_id=r.id;

  perform app_private.szyfr_fail_if_expired_internal(r.id);

  return jsonb_build_object('ok',true,'eventId',event_id);
end;
$$;

revoke all on function app_private.use_szyfr_hint_internal(text,uuid,text) from public, anon, authenticated;

create or replace function app_private.retry_szyfr_internal(p_code text,p_host_token uuid)
returns boolean
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  r app_private.platform_rooms%rowtype;
begin
  select * into r
  from app_private.platform_rooms
  where code=upper(trim(p_code)) and game_slug='szyfr' and host_token=p_host_token and expires_at>now()
  limit 1;
  if r.id is null then return false; end if;

  update app_private.szyfr_games
  set
    step_index=1,
    phase='tutorial',
    main_started_at=null,
    ends_at=null,
    finished_at=null,
    wrong_attempts=0,
    hints_used=0,
    hint_level=0,
    fragment_digits='{}'::integer[],
    score=null,
    last_event=jsonb_build_object('type','retry','eventId',gen_random_uuid()::text),
    updated_at=now()
  where room_id=r.id and phase in ('finished','failed');

  if not found then return false; end if;
  update app_private.platform_rooms set status='active',game_phase='tutorial' where id=r.id;
  return true;
end;
$$;

revoke all on function app_private.retry_szyfr_internal(text,uuid) from public, anon, authenticated;

create or replace function app_private.rematch_szyfr_internal(p_code text,p_host_token uuid)
returns boolean
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  r app_private.platform_rooms%rowtype;
  old_signature text;
begin
  select * into r
  from app_private.platform_rooms
  where code=upper(trim(p_code)) and game_slug='szyfr' and host_token=p_host_token and expires_at>now()
  limit 1;
  if r.id is null then return false; end if;

  select scenario_signature into old_signature
  from app_private.szyfr_games
  where room_id=r.id and phase in ('finished','failed');

  if old_signature is null then return false; end if;
  if not app_private.initialize_szyfr_internal(r.id,old_signature) then return false; end if;

  update app_private.platform_rooms set status='active',game_phase='tutorial' where id=r.id;
  return true;
end;
$$;

revoke all on function app_private.rematch_szyfr_internal(text,uuid) from public, anon, authenticated;

create or replace function public.get_szyfr_state(
  p_code text,
  p_player_token uuid default null,
  p_host_token uuid default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select app_private.get_szyfr_state_internal(p_code,p_player_token,p_host_token);
$$;

create or replace function public.submit_szyfr_answer(
  p_code text,
  p_player_token uuid,
  p_step_key text,
  p_answer text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select app_private.submit_szyfr_answer_internal(p_code,p_player_token,p_step_key,p_answer);
$$;

create or replace function public.use_szyfr_hint(
  p_code text,
  p_player_token uuid,
  p_step_key text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select app_private.use_szyfr_hint_internal(p_code,p_player_token,p_step_key);
$$;

create or replace function public.retry_szyfr(p_code text,p_host_token uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select app_private.retry_szyfr_internal(p_code,p_host_token);
$$;

create or replace function public.rematch_szyfr(p_code text,p_host_token uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select app_private.rematch_szyfr_internal(p_code,p_host_token);
$$;

revoke all on function public.get_szyfr_state(text,uuid,uuid) from public;
revoke all on function public.submit_szyfr_answer(text,uuid,text,text) from public;
revoke all on function public.use_szyfr_hint(text,uuid,text) from public;
revoke all on function public.retry_szyfr(text,uuid) from public;
revoke all on function public.rematch_szyfr(text,uuid) from public;

grant execute on function public.get_szyfr_state(text,uuid,uuid) to anon, authenticated;
grant execute on function public.submit_szyfr_answer(text,uuid,text,text) to anon, authenticated;
grant execute on function public.use_szyfr_hint(text,uuid,text) to anon, authenticated;
grant execute on function public.retry_szyfr(text,uuid) to anon, authenticated;
grant execute on function public.rematch_szyfr(text,uuid) to anon, authenticated;

-- Extend room creation with SZYFR.
create or replace function app_private.create_platform_room_internal(p_game_slug text)
returns table (
  id uuid,
  code text,
  game_slug text,
  status text,
  host_token uuid,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_code text;
  inserted_room app_private.platform_rooms%rowtype;
  attempt integer;
begin
  if p_game_slug not in (
    'co-ludzie-powiedza','zakrecone-haslo','pod-przykrywka',
    'akta-nocy','tylko-my','va-banque','szyfr'
  ) then
    raise exception 'Unsupported game';
  end if;

  for attempt in 1..20 loop
    select string_agg(
      substr(alphabet,1+floor(random()*length(alphabet))::integer,1),''
    )
    into generated_code
    from generate_series(1,4);

    begin
      insert into app_private.platform_rooms(code,game_slug)
      values(generated_code,p_game_slug)
      returning * into inserted_room;

      return query
      select inserted_room.id,inserted_room.code,inserted_room.game_slug,
             inserted_room.status,inserted_room.host_token,
             inserted_room.created_at,inserted_room.expires_at;
      return;
    exception when unique_violation then null;
    end;
  end loop;

  raise exception 'Could not allocate room code';
end;
$$;

-- Guest room limit for SZYFR = 6.
create or replace function app_private.join_platform_room_internal(
  p_code text,
  p_display_name text,
  p_avatar text
)
returns table (
  id uuid,
  player_token uuid,
  display_name text,
  avatar text,
  team text,
  ready boolean
)
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room app_private.platform_rooms%rowtype;
  inserted_player app_private.room_players%rowtype;
  player_count integer;
  room_limit integer;
  clean_name text := trim(p_display_name);
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_recovery text;
  attempt integer;
begin
  select * into target_room
  from app_private.platform_rooms
  where code=upper(trim(p_code)) and expires_at>now() and status='lobby'
  limit 1;

  if target_room.id is null then raise exception 'Room not found or not joinable'; end if;
  if char_length(clean_name)<1 or char_length(clean_name)>20 then raise exception 'Invalid name'; end if;

  if p_avatar not in (
    'avatar-01','avatar-02','avatar-03','avatar-04','avatar-05','avatar-06',
    'avatar-07','avatar-08','avatar-09','avatar-10','avatar-11','avatar-12',
    'avatar-13','avatar-14','avatar-15','avatar-16','avatar-17','avatar-18',
    'avatar-19','avatar-20','lion','fox','panda','tiger','koala','owl',
    'frog','penguin','bear','rabbit','monkey','cat'
  ) then raise exception 'Invalid avatar'; end if;

  room_limit:=case
    when target_room.game_slug='tylko-my' then 2
    when target_room.game_slug='szyfr' then 6
    when target_room.game_slug='va-banque' then 8
    when target_room.game_slug in ('zakrecone-haslo','akta-nocy') then 12
    else 14
  end;

  select count(*) into player_count
  from app_private.room_players where room_id=target_room.id;
  if player_count>=room_limit then raise exception 'Room is full'; end if;

  for attempt in 1..20 loop
    select string_agg(substr(alphabet,1+floor(random()*length(alphabet))::integer,1),'')
    into generated_recovery from generate_series(1,6);

    begin
      insert into app_private.room_players(room_id,display_name,avatar,recovery_code)
      values(target_room.id,clean_name,p_avatar,generated_recovery)
      returning * into inserted_player;

      return query
      select inserted_player.id,inserted_player.player_token,inserted_player.display_name,
             inserted_player.avatar,inserted_player.team,inserted_player.ready;
      return;
    exception when unique_violation then
      if exists(
        select 1 from app_private.room_players
        where room_id=target_room.id and lower(display_name)=lower(clean_name)
      ) then raise exception 'Name already taken'; end if;
    end;
  end loop;

  raise exception 'Could not allocate recovery code';
end;
$$;

-- Account room limit for SZYFR = 6.
create or replace function app_private.join_platform_room_account_internal(
  p_code text,
  p_display_name text,
  p_avatar text,
  p_partyplay_user_id uuid
)
returns table (
  id uuid,
  player_token uuid,
  display_name text,
  avatar text,
  team text,
  ready boolean
)
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room app_private.platform_rooms%rowtype;
  inserted_player app_private.room_players%rowtype;
  player_count integer;
  room_limit integer;
  clean_name text := trim(p_display_name);
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_recovery text;
  attempt integer;
begin
  if p_partyplay_user_id is null then raise exception 'PartyPlay account required'; end if;

  select * into target_room
  from app_private.platform_rooms
  where code=upper(trim(p_code)) and expires_at>now() and status='lobby'
  limit 1;

  if target_room.id is null then raise exception 'Room not found or not joinable'; end if;
  if char_length(clean_name)<1 or char_length(clean_name)>20 then raise exception 'Invalid name'; end if;

  if p_avatar not in (
    'avatar-01','avatar-02','avatar-03','avatar-04','avatar-05',
    'avatar-06','avatar-07','avatar-08','avatar-09','avatar-10',
    'avatar-11','avatar-12','avatar-13','avatar-14','avatar-15',
    'avatar-16','avatar-17','avatar-18','avatar-19','avatar-20',
    'lion','fox','panda','tiger','koala','owl','frog','penguin','bear','rabbit','monkey','cat'
  ) then raise exception 'Invalid avatar'; end if;

  if exists(
    select 1 from app_private.room_players
    where room_id=target_room.id and partyplay_user_id=p_partyplay_user_id
  ) then raise exception 'PartyPlay account already joined'; end if;

  room_limit:=case
    when target_room.game_slug='tylko-my' then 2
    when target_room.game_slug='szyfr' then 6
    when target_room.game_slug='va-banque' then 8
    when target_room.game_slug in ('zakrecone-haslo','akta-nocy') then 12
    else 14
  end;

  select count(*) into player_count
  from app_private.room_players where room_id=target_room.id;
  if player_count>=room_limit then raise exception 'Room is full'; end if;

  for attempt in 1..20 loop
    select string_agg(substr(alphabet,1+floor(random()*length(alphabet))::integer,1),'')
    into generated_recovery from generate_series(1,6);

    begin
      insert into app_private.room_players(
        room_id,display_name,avatar,recovery_code,partyplay_user_id
      )
      values(target_room.id,clean_name,p_avatar,generated_recovery,p_partyplay_user_id)
      returning * into inserted_player;

      return query
      select inserted_player.id,inserted_player.player_token,inserted_player.display_name,
             inserted_player.avatar,inserted_player.team,inserted_player.ready;
      return;
    exception when unique_violation then
      if exists(
        select 1 from app_private.room_players
        where room_id=target_room.id and lower(display_name)=lower(clean_name)
      ) then raise exception 'Name already taken'; end if;
      if exists(
        select 1 from app_private.room_players
        where room_id=target_room.id and partyplay_user_id=p_partyplay_user_id
      ) then raise exception 'PartyPlay account already joined'; end if;
    end;
  end loop;

  raise exception 'Could not allocate recovery code';
end;
$$;

-- Start SZYFR through the shared lobby state machine.
create or replace function app_private.start_platform_room_internal(
  p_code text,
  p_host_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room app_private.platform_rooms%rowtype;
  total_players integer;
  ready_players integer;
  unassigned_players integer;
begin
  select * into target_room
  from app_private.platform_rooms
  where code=upper(trim(p_code))
    and host_token=p_host_token
    and status='lobby'
    and expires_at>now()
  limit 1;

  if target_room.id is null then return false; end if;

  select count(*),count(*) filter(where ready),count(*) filter(where team is null)
  into total_players,ready_players,unassigned_players
  from app_private.room_players
  where room_id=target_room.id;

  if target_room.game_slug='szyfr' then
    if total_players<2 or total_players>6 or ready_players<>total_players then return false; end if;
    if not app_private.initialize_szyfr_internal(target_room.id,null) then
      raise exception 'Could not initialize SZYFR';
    end if;
    update app_private.platform_rooms
    set status='active',game_phase='tutorial'
    where id=target_room.id;
    return true;
  end if;

  if target_room.game_slug='va-banque' then
    if total_players<2 or total_players>8 or ready_players<>total_players then return false; end if;
    if not app_private.initialize_va_banque_internal(target_room.id) then
      raise exception 'Could not initialize VA BANQUE';
    end if;
    update app_private.platform_rooms
    set status='active',game_phase='playing'
    where id=target_room.id;
    return true;
  end if;

  if target_room.game_slug='tylko-my' then
    if total_players<>2 or ready_players<>total_players then return false; end if;
    if not app_private.initialize_tm_game_internal(target_room.id) then
      raise exception 'Could not initialize Tylko My';
    end if;
    update app_private.platform_rooms set status='active',game_phase='playing'
    where id=target_room.id;
    return true;
  end if;

  if target_room.game_slug='zakrecone-haslo' then
    if total_players<3 or total_players>12 or ready_players<>total_players then return false; end if;
    update app_private.platform_rooms set status='active',game_phase='playing'
    where id=target_room.id;
    if not app_private.initialize_zh_game_internal(target_room.id) then
      raise exception 'Could not initialize Zakrecone Haslo';
    end if;
    return true;
  end if;

  if target_room.game_slug='pod-przykrywka' then
    if total_players<6 or total_players>14 or ready_players<>total_players then return false; end if;
    update app_private.platform_rooms set status='active',game_phase='briefing'
    where id=target_room.id;
    if not app_private.initialize_pp_game_internal(target_room.id) then
      raise exception 'Could not initialize Pod Przykrywka';
    end if;
    return true;
  end if;

  if target_room.game_slug='akta-nocy' then
    if total_players<5 or total_players>12 or ready_players<>total_players then return false; end if;
    if not app_private.initialize_akta_nocy_internal(target_room.id) then
      raise exception 'Could not initialize Akta Nocy';
    end if;
    update app_private.platform_rooms set status='active',game_phase='akta_osobowe'
    where id=target_room.id;
    return true;
  end if;

  if total_players<4 or ready_players<>total_players or unassigned_players>0 then return false; end if;

  update app_private.platform_rooms
  set status='active',
      game_phase=case when target_room.game_slug='co-ludzie-powiedza'
                      then 'poznajmy_tlum' else game_phase end
  where id=target_room.id;
  return true;
end;
$$;


-- Migration: fix_szyfr_rpc_permissions
grant execute on function app_private.get_szyfr_state_internal(text,uuid,uuid) to anon, authenticated;
grant execute on function app_private.submit_szyfr_answer_internal(text,uuid,text,text) to anon, authenticated;
grant execute on function app_private.use_szyfr_hint_internal(text,uuid,text) to anon, authenticated;
grant execute on function app_private.retry_szyfr_internal(text,uuid) to anon, authenticated;
grant execute on function app_private.rematch_szyfr_internal(text,uuid) to anon, authenticated;

