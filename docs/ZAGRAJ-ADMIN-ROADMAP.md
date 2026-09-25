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
II.3 [~] Edytor dodatkowych sekcji informacyjnych podstron wszystkich 7 gier wewnętrznych: tekst, instrukcja, ważna informacja, kolejność i lista punktów; szkic i publikacja właścicielska. Pozostałe istniejące sekcje, media, SEO i pełna edycja layoutu są kolejnymi podetapami.
II.4 [~] Biblioteka obrazów JPG, PNG i WebP, maks. 5 MB, scoped admin uploads, immutability, wybór grafiki karty i sekcji. Audio/wideo, kadrowanie i pełne zarządzanie kolekcjami w dalszych etapach.
II.5 [~] Workflow kart: szkic → do zatwierdzenia → publikacja wyłącznie przez właściciela, audyt i rewizje. Historia opublikowanych wersji i przywracanie jako nowy szkic z ochroną przed konfliktem rewizji są przygotowane w oddzielnym podetapie; nadal wymagane są test sesji właściciela i pełny rollback wersji silników gier.
II.6 [~] Świeżość publikacji: no-store dla publicznego RPC, odświeżanie po powrocie do karty, bfcache i sygnale publikacji; testy kontraktu kart, zakresów silnika i opublikowanych snapshotów. Do potwierdzenia: scenariusz publikacji na rzeczywistej sesji właściciela i kontrola w 2 otwartych kartach.

## III. Edycja istniejących gier
III.1 Inwentaryzacja typowanych zasobów i flag bezpiecznych do edycji.
III.2 Adaptery dla CO LUDZIE POWIEDZĄ, Pod Przykrywką, Akta Nocy, Zakręcone Hasło, TYLKO MY, SZYFR, VA BANQUE.
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
