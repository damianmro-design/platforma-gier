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
I.7 [ ] Testy rzeczywistego logowania, odmowy dla gościa i redaktora, nadania/revokacji; powtórka na produkcji.
I.8 [ ] MFA / ponowne uwierzytelnienie dla operacji krytycznych (przed rozszerzeniem o publikacje i ekonomię).
I.9 [ ] Rozszerzenie analityki pulpitu o rzeczywiste metryki gry po bezpiecznym połączeniu obu baz.

## II. CMS katalogu i mediów
II.1 Centralny schemat danych katalogu + wersje, migracja wszystkich aktualnych kart.
II.2 Edytor listy gier: tytuł, status, kolejność, widoczność, kategorie, czas, liczba graczy i tagi.
II.3 Edytor podstrony blokowej, SEO, wariant mobilny i podgląd.
II.4 Biblioteka mediów z walidacją, storage i referencjami.
II.5 Workflow szkic → do zatwierdzenia → publikacja wyłącznie przez właściciela.
II.6 Caching i unieważnianie po publikacji, testy spójności strony głównej z logiką gry.

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
