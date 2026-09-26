# zaGRAj Admin + Game Builder — roadmap kanoniczna

Zatwierdzone decyzje (2026-09-25):
1. Redaktor przygotowuje projekt, właściciel zatwierdza publikację.
2. Kreator łączy szablony i własne układanie gry z modułów.
3. Floor Party i Polowanie na Milionera są integrowane stopniowo.
4. XP i odznaki edytuje właściciel lub uprawniony administrator.

## Zasady przekrojowe
- Zwykły użytkownik nie ma dostępu do danych administracyjnych. Autoryzacja po stronie serwera i bazy.
- Źródło tożsamości: Supabase Auth zaGRAj; rozgrywki: odrębny Supabase platformy.
- Nie zmieniać identyfikatorów technicznych bez migracji. Nie nadpisywać zmian równoległych prac.
- Zero dowolnego JS/SQL przesyłanego przez edytor; wyłącznie wersjonowane typowane bloki.
- Publikacja atomowa, poprzednie wersje możliwe do przywrócenia. Pokoje przypięte do wersji gry.
- Testy i boty nie naliczają produkcyjnego XP; żaden panel nie umożliwia obchodzenia tego warunku.

## I. Fundament administracyjny
I.1 [x] Audyt tożsamości, repozytorium i miejsc integracji.
I.2 [x] Model ról, granularnych uprawnień i zakresów per gra.
I.3 [x] Właściciel przypięty do potwierdzonego konta przez immutable auth UUID.
I.4 [x] SQL SECURITY DEFINER, izolacja tabel i log audytowy, brak publicznego zapisu.
I.5 [x] Serwerowe API /api/admin/me, /dashboard, /staff.
I.6 [x] /admin, pulpit pierwszej wersji, nadawanie / odbieranie ról, autoryzacja po stronie API.
I.7 [~] Testy SQL i RPC: nadanie roli w transakcji, uprawnienia redaktora, odmowa dla anonimowego, rollback; test rzeczywistą sesją użytkownika nadal do wykonania.
I.8 [x] TOTP i AAL2 dla nadawania ról i publikacji. SMS świadomie odłożony decyzją właściciela.
I.9 [ ] Rozszerzenie analityki pulpitu o rzeczywiste metryki gry po bezpiecznym połączeniu obu baz.

## II. CMS katalogu i mediów
II.1 [x] Centralny schemat katalogu, wersje i migracja 9 istniejących kart. Źródło publikacji: projekt Auth, bez zmiany baz rozgrywek.
II.2 [~] Edytor istniejących kart: tytuł, opisy, status, kolejność, widoczność, kategorie, czas, bezpieczny zakres liczby graczy, tagi, kolory i dostępne motywy. Nowe gry dopiero z Builderem.
II.3 [~] Edytor dodatkowych sekcji i opisów otwierających wszystkie 7 gier wewnętrznych, a także określone istniejące karty z zasadami / przebiegiem: Akta Nocy (4 kroki wprowadzenia), CO LUDZIE POWIEDZĄ (9 kart etapów), Pod Przykrywką (6), SZYFR (3 kroki współpracy), TYLKO MY (4 rundy), VA BANQUE (6) i Zakręcone Hasło (4). Numeracja, tytuły i kolejność zamrożone w kodzie. Szkic, publikacja właścicielska, historia i przywracanie obejmują teksty i SEO (tytuł oraz opis, odrębne od treści strony). Pozostałe treści specyficzne dla silnika i pełna edycja layoutu czekają na kolejne podetapy.
II.4 [~] Biblioteka obrazów JPG, PNG i WebP, maks. 5 MB, scoped admin uploads, immutability, wybór grafiki karty i sekcji. Audio/wideo, kadrowanie i pełne zarządzanie kolekcjami w dalszych etapach.
II.5 [~] Workflow kart: szkic → do zatwierdzenia → publikacja wyłącznie przez właściciela, audyt i rewizje. Historia opublikowanych wersji i przywracanie jako nowy szkic z ochroną przed konfliktem rewizji są przygotowane w oddzielnym podetapie; nadal wymagane są test sesji właściciela i pełny rollback wersji silników gier.
II.6 [~] Świeżość publikacji: no-store dla publicznego RPC, odświeżanie po powrocie do karty, bfcache i sygnale publikacji; testy kontraktu kart, zakresów silnika i opublikowanych snapshotów. Do potwierdzenia: scenariusz publikacji na rzeczywistej sesji właściciela i kontrola w 2 otwartych kartach.

## III. Edycja istniejących gier
III.1 [x] Audyt źródeł 7 silników i 2 scenariuszy Akta Nocy, typowanych banków, sekretnych danych oraz stanu pokojów; rejestr i plan blokady wersjonowania: `docs/admin/ENGINE-CONTENT-AUDIT-III1.md`.
III.2 [~] Wersjonowane adaptery zasobów dla 7 gier i 2 scenariuszy Akta Nocy. III.2a: pilotaż Zakręcone Hasło, niezmienne wersje hasła i przypięcie istniejących/nowych pokojów do jednej rewizji, bez edytora i bez uprawnień publicznego zapisu. III.2b–III.2c: typowany adapter publikacji oraz pozostałe gry.
III.3 Edytory pytań, odpowiedzi, grafik, komunikatów, etapów i parametrów w granicach silnika.
III.4 Migracje zawartości, snapshot konfiguracji pokoju, walidacja oraz rollback.
III.5 Wspólne testy regresji obecnych gier.

## IV. Game Builder
IV.1 Schemat definicji gry + typowany rejestr bloków.
IV.2 Szablony: quiz, drużynowa, 2 osoby, kooperacja, tajne role, dedukcja, zadania, ankiety, śledztwo, escape room.
IV.3 Kreator krok po kroku, edytor przepływu, warunki i przejścia.
IV.4 Moduły: pytania, głosowania, role, losowanie, czasomierz, punktacja, multimedia, finał.
IV.5 Wykonawczy silnik serwerowy, stabilna tożsamość rozgrywki, silne typowanie i ograniczenia.
IV.6 Podgląd każdego ekranu, boty, pełny test, raport walidacji.
IV.7 Publikacja zatwierdzana przez właściciela i atomowy rollback.

## V. Użytkownicy, progresja i analityka
V.1 Wyszukiwanie użytkowników z ograniczeniem dostępu, bez ekspozycji sekretów.
V.2 Panel XP, odznak, poziomów i Żetonów z wersjonowaniem zasad.
V.3 Dziennik ręcznych korekt, idempotencja i antynadużycia.
V.4 Metryki produkcyjne, błędy pokojów, ukończenia gier, aktywność, filtry.
V.5 Powiadomienia, kolejka zgłoszeń, moderacja.

## VI. Integracje i skalowanie
VI.1 Synchronizacja metadanych katalogowych Floor Party i Polowania.
VI.2 Stopniowe API edycji treści i flag, bez uszkadzania ich niezależnych silników.
VI.3 Ujednolicenie powiązania kont i progresji przy zachowaniu ochrony danych.
VI.4 Rozszerzenie biblioteki bloków i kontrolowany system dodatków.

## Kryteria bezpieczeństwa
- Ostatniego właściciela nie da się wyłączyć ani zdegradować.
- API zawsze sprawdza token i rolę; SQL nie pozwala gościowi odczytać tabel.
- Nikt poza właścicielem nie zarządza rolami; osobne uprawnienia dla XP.
- Przygotowanie i publikacja są odrębnymi akcjami.
- Każda zmiana uprawnień zapisuje aktora, stary i nowy stan.
- Każda zmiana gry sprawdza aktualną wersję i nie narusza aktywnego pokoju.

### Wdrożenie katalogu, zakres pierwszej wersji
- Publiczny RPC udostępnia tylko opublikowane karty, szkice są dostępne wyłącznie uprawnionym pracownikom.
- Pola techniczne, przekierowania i sposób logowania do osobnych aplikacji nie są edytowalne z formularza.
- Graczy można zawężać tylko w rzeczywistych granicach silnika; wyświetlany zakres jest generowany automatycznie.
- Podgląd, szkice i workflow działają w CMS; dodawanie grafik JPG/PNG/WebP do kart i dodatkowych sekcji działa. Nowy silnik gier, audio/wideo, SEO i edycja całej podstrony pozostają w roadmapie.
- Do wdrożenia przed operacjami krytycznymi: wymuszony MFA/step-up, bezpieczna migracja konfiguracji pokojów i publikowanie nowych silników.

### Weryfikacja publikacji i bezpieczeństwa, 2026-09-25
- Operacje nadawania ról i publikacji wymagają AAL2 w aktualnym JWT, egzekwowane również w SQL; sesję do AAL2 podnosi TOTP, SMS jest odłożony.
- Własna strona /admin/bezpieczenstwo pozwala dodać i potwierdzić czynnik oraz podnieść AAL istniejącej sesji.
- Publiczna część podstron odczytuje wyłącznie opublikowane typowane sekcje; 8 sekcji maks., brak kodu HTML/JS i dowolnych linków.
- Treści fabuły, pytania, właściwa punktacja i silniki pozostają nienaruszone.
- W pierwszej wersji biblioteki mediów działają walidacja MIME i wielkości pliku, kontrola uprawnień i publiczne tylko grafiki marketingowe. Dalej: kadrowanie, audio/wideo i mobilne warianty.


### II.4 Galeria obrazów, pierwsza wersja
- Publiczny bucket przechowuje wyłącznie zasoby marketingowe gier, nie dane graczy; draft ma niepubliczną listę w CMS, ale sama grafika pod znanym URL jest publiczna.
- Upload tylko właściciel i redaktor z uprawnieniem media.manage oraz poprawnym zakresem gry; rejestracja musi potwierdzić właściciela obiektu Storage.
- Nie ma usuwania i nadpisywania, żeby nie uszkodzić historii publikacji.
- Ścieżki w opublikowanej karcie i sekcji są walidowane względem rejestru i dokładnie tej samej gry.
- Media nie wpływają na silniki rozgrywek ani XP; brak audio/wideo w tej wersji.

### II.5 Historia publikacji, bezpieczne przywrócenie
- Historyczne snapshoty są niemodyfikowalne i widoczne tylko w obrębie przydzielonego katalogu gier.
- Przywrócenie starszej publikacji jest akcją wyłącznie właściciela i tworzy nowy szkic, nie publikuje automatycznie.
- Nadpisanie istniejącego szkicu wymaga potwierdzenia; konflikt rewizji jest wykrywany atomowo w bazie.
- Aktualna walidacja karty, grafiki i limitów silnika obowiązuje także przy odtwarzaniu wersji historycznej.
- Publikacja odzyskanego szkicu nadal wymaga oddzielnego zatwierdzenia i TOTP/AAL2.
- Zmiany rozgrywek, pokojów, punktacji i obecnej opublikowanej wersji pozostają nietknięte do publikacji.

### II.6 Spójność katalogu i podstron
- Nie przechowujemy publicznej listy w cache serwera ani przeglądarki: endpoint `/api/games/catalog` i odczyt sekcji używają no-store.
- Otwarta karta strony głównej odświeża listę po ponownym wyświetleniu, focusie i powrocie z bfcache; równoległe odpowiedzi są anulowane, aby stary odczyt nie nadpisał nowszego.
- Po udanej publikacji sygnalizujemy zmianę innym kartom przez storage event i bieżącej karcie przez własne zdarzenie; w storage nie zapisujemy treści gier ani danych logowania.
- Podstrony gier odświeżają tylko warstwę informacyjną (RSC), nie silnik aktywnego pokoju; odbudowanie sekcji działa także, gdy poprzednio lista była pusta.
- SQL sprawdza publiczną listę vs opublikowane i widoczne rekordy, zakresy silnika oraz ostatni snapshot. Stare snapshoty bez pustego `pageSections` pozostają nienaruszone.
- Opisy i pełne, dotąd zakodowane układy podstron nadal wymagają osobnego etapu II.3. Nie deklarujemy ich pełnej edytowalności.

### II.3a Istniejący opis otwierający podstronę
- Każda z 7 wewnętrznych gier odczytuje opcjonalny `pageIntro` z zatwierdzonej publikacji.
- Jeśli nie ma nadpisania, oryginalny tekst pozostaje widoczny. Nie zmieniamy domyślnej treści, koncepcji ani zasad istniejącej gry.
- Jest to zwykły tekst, bez HTML, JS i URL, maks. 600 znaków. Brak pola i pusty tekst oznaczają fallback.
- Edytor umożliwia wczytanie oryginalnej treści, jej zmianę oraz przywrócenie domyślnego opisu.
- Zapis korzysta z aktualnej funkcji walidacji karty, sprawdzania rewizji, uprawnień, powiązania mediów i audytu.
- Publikacja nadal wymaga wysłania do zatwierdzenia, właściciela i AAL2/TOTP. Odtworzenie historycznej wersji resetuje opis, jeśli wcześniejszy snapshot go nie zawierał.
- Przed publikacją weryfikować opis pod kątem zgodności ze stanem silnika. Reguły, pytania, fabuła, pokoje i XP nadal poza tym edytorem.

### II.3b Opisy istniejących kart zasad, VA BANQUE i Zakręcone Hasło
- Edytujemy wyłącznie tekst objaśniający istniejącą, numerowaną kartę. Stałe z kodu: numer, tytuł, kolejność i liczba kart (VA BANQUE 6, Zakręcone Hasło 4).
- Dane CMS są wersjonowane jako `pageRules: { schema: 1, items: string[] }`. Puste/nieobecne pole oznacza dokładne oryginalne opisy. Pełna lista ma odpowiednio 6 lub 4 teksty po 1–360 znaków.
- Kontrola backendu blokuje inne gry, błędną wersję, zmianę liczby kart, dodatkowe klucze, HTML i odnośniki; renderer w razie niezgodności lub awarii CMS pokazuje tekst oryginalny.
- Historyczne przywrócenie resetuje nowsze teksty, jeśli stary snapshot ich nie miał; nie dotyka publicznej wersji do osobnej publikacji przez właściciela z AAL2.
- Redaktor powinien zachowywać zgodność treści z rzeczywistym silnikiem. Walidacja strukturalna nie potrafi automatycznie potwierdzić merytorycznej prawdziwości zdań, dlatego zatwierdzenie właściciela jest obowiązkowe.
- Nie zmieniamy aktywnych pokojów, pytań, liczb punktów, rozstrzygnięć, rozdzielania ról, XP ani definicji etapów.
- Dalszy krok: analogiczna inwentaryzacja i mapowanie kart zasad pozostałych 5 gier, z niezależnymi definicjami dla każdej.

### II.3c Pozostałe 5 adapterów objaśnień
- Rozszerzono istniejące `pageRules.schema = 1`, bez naruszania dotychczasowych 2 adapterów. Dopuszczalne gry i rozmiary to: Akta Nocy 4 wstępne kroki, CO LUDZIE POWIEDZĄ 9 etapów, Pod Przykrywką 6 kroków, SZYFR 3 kroki współpracy i TYLKO MY 4 opisy rund; nadal VA BANQUE 6 i Zakręcone Hasło 4.
- W Akta Nocy odrębne fazy spraw Apartament 214 i Ostatni Kurs oraz ich szczegóły pozostają kodem silnika. W SZYFRZE opisy konkretnych misji i parametry czasu również pozostają poza CMS. Inne stałe gier zachowują oryginalne wartości.
- Karty na stronach zachowują obecny styl, nagłówki, kolejność, numerację, dekoracje i liczbę pozycji. Jedynie zatwierdzony tekst opisu jest pobierany z katalogu publicznego.
- SQL egzekwuje 1–360 znaków na pozycję, dokładną liczbę opisów na podstawie `slug`, poprawną wersję oraz zakaz HTML/URL i innych pól. Podczas awarii lub niezgodności schematu strona wyświetla oryginalny tekst.
- Testy transakcyjne obejmują wszystkie 7 adapterów, brak przecieku szkicu, przywrócenie wersji historycznej, niedozwoloną grę zewnętrzną i próbę publikacji wraz z widocznością oraz historią. Każda próba zapisu danych testowych kończy się rollback.
- Pełna kontrola zgodności treści z zasadami gry nie jest możliwa na podstawie samej walidacji strukturalnej. Redaktor przygotowuje, a właściciel weryfikuje opis względem gry przed publikacją.
- Dalsze podetapy II.3: SEO, wybrane pozostałe bloki podstron i teksty specyficzne dla silników po inwentaryzacji III.1–III.2.

### II.3d SEO publicznych podstron gier
- Każda z 7 wewnętrznych podstron używa `generateMetadata()`, odczytującego jedynie widoczne i opublikowane karty. Oryginalny title i description są niezmiennym fallbackiem. Brak nowego pola oznacza dotychczasowy tekst.
- CMS pozwala zmienić tylko `pageSeo: { title, description }`, title 1–70, description 1–180 znaków. `null` przywraca oryginał, niepełny obiekt, HTML, URL i dodatkowe klucze są odrzucane przez SQL.
- Canonical `/gry/<slug>`, nazwa strony, Open Graph, Twitter summary i ścieżka wynikają wyłącznie z kodu. Redaktor nie może zmieniać przekierowań, robots, URL ani hosta.
- Tytuły i opisy wyświetlane na podstronie są oddzielne od SEO. Zapis i przywracanie działają w dotychczasowym workflow z kontrolą rewizji i audytem. Publikacja wymaga decyzji właściciela i AAL2.
- `/sitemap.xml` obejmuje stronę główną oraz tylko 7 wewnętrznych gier widocznych w publicznym katalogu. Niewidoczne karty, szkice i zewnętrzne serwisy nie są dodawane, a brak dostępu do katalogu nie zamienia sitemap w listę defaultów.
- `robots.txt` wskazuje sitemap i zachowuje wykluczenie API oraz routingu pokoi i rozgrywek.
- Test transakcyjny symuluje szkice i publikację z historią, odtwarza stare snapshoty, sprawdza izolację publicznych danych i cofa wszystkie zmiany. Weryfikacja rzeczywistą sesją właściciela nadal osobna.

### III.1 Inwentaryzacja silników, 2026-09-26
- Wynik: `docs/admin/ENGINE-CONTENT-AUDIT-III1.md`; rejestr do walidacji: `docs/admin/engine-content-inventory.json`.
- Sprawdzono 7 gier, Akta Nocy jako 2 odrębne definicje, rzeczywiste źródła TS, banki `app_private`, RPC, RLS i brak bezpośredniego uprawnienia odczytu/zapisu tabel przez role klienta.
- Obecne pokoje zapisują identyfikatory wybranych zadań lub indeksy, nie pełny, niezmienny snapshot treści. Otwieranie edytora silników bez wersji pokoju byłoby błędem, dlatego praca III.2 rozpoczyna się od definicji i przypinania treści.
- W tym podetapie nie zmieniano mechaniki, pokojów, treści banków, uprawnień ani publicznego API. Test kontraktu rejestru jest częścią `npm run test:beta`.
- III.3 pozostaje zablokowany do czasu ochrony wersji pokojów; III.4 to pełna migracja, walidacja i rollback rozgrywki, nie sam rollback kart katalogu.

### III.2a Adapter wersjonowanych haseł Zakręcone Hasło
- Techniczna migracja i weryfikacja: `supabase/zh-immutable-content-revisions.sql`, `supabase/tests/zh-immutable-content-revisions.sql` oraz `docs/admin/ZH-IMMUTABLE-CONTENT-III2A.md`.
- Historyczny bank 54 haseł jest kopiowany do niemodyfikowalnej rewizji 1, dotychczasowe stany pokoi zachowują kolejność i punkty oraz dostają `content_version_id`. Nowy pokój atomowo utrwala aktywną rewizję. Odczyt i sprawdzenie odpowiedzi nigdy nie pobierają nowej publikacji dla rozpoczętego pokoju.
- Wariant testowy rewizji 2 istnieje tylko wewnątrz transakcji z rollback; nie publikujemy nowych haseł i nie otwieramy redaktorom uprawnień do bazy rozgrywek. Etap III.2 jako całość pozostaje otwarty.
