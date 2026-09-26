# zaGRAj, etap III.1: inwentaryzacja treści i silników

Stan audytu: 2026-09-26. Podstawa: kod `main` `44a50460d054b96181336c7384d2e60369a24557` i **odczyt metadanych** produkcyjnej bazy rozgrywek. Ustrukturyzowany rejestr: [engine-content-inventory.json](./engine-content-inventory.json).

## Decyzja techniczna

**Etap III.1 jest audytem, a nie uruchomieniem edytora rozgrywki.** Dotychczasowy CMS zarządza wyłącznie publikacją metadanych katalogu, SEO, opisów i objaśnień podstron. Nie wolno na jego podstawie zapisywać bezpośrednio pytań, odpowiedzi, fabuły, punktacji ani flag aktywnych pokojów.

Źródła są rozdzielone:

1. CMS i uprawnienia administratorów: baza Auth zaGRAj; publiczne RPC katalogu zwraca zatwierdzoną publikację, nie szkice.
2. Właściwe rozgrywki: osobna baza, tabele `app_private`, kontrolowane funkcje `public` i adaptery serwerowych API `app/api/gra/*`.
3. Część danych jest trzymana w kodzie TypeScript aplikacji, a nie w bazie. Szczególnie: TYLKO MY i 2 odrębne scenariusze Akta Nocy.
4. `app_private` ma w badanych tabelach RLS; bezpośrednie `SELECT` oraz `UPDATE` dla `anon` i `authenticated` nie są przyznane. Uprawnienie `USAGE` na schemacie nie jest prawem odczytu tabel. Dostęp ma przechodzić przez jawne RPC i API, z rozdzieleniem hosta, gracza i informacji tajnych.

Przegląd kolumn `platform_rooms`, `clp_game_state`, `pp_game_missions`, `pp_game_state`, `akta_nocy_room_config`, `szyfr_games`, `tylko_my_games`, `va_banque_games` oraz `zh_game_state` wykazał **brak pola wersji definicji lub pełnego snapshotu treści**. Niektóre pokoje utrwalają ID/klucze wybranych zadań, ale w trakcie gry nadal czytają współdzielony bank pytań. To nie chroni rozpoczętej rozgrywki przed edycją treści banku.

## Mapa zasobów, weryfikacja faktycznych źródeł

Liczby rekordów są odczytem na dzień audytu, nie limitami wymaganymi przez grę. Nie utrwalać ich jako magicznych stałych walidatora.

| Gra | Obecne zasoby | Referencje pokoju i ryzyko |
| --- | --- | --- |
| CO LUDZIE POWIEDZĄ | `lib/co-ludzie-powiedza.ts`: 6 pytań rozgrzewkowych; w `app_private` banki `clp_round1_questions` (3), `clp_round3_questions` (3), `clp_round4_questions` (3), `clp_round5_questions` (3), `clp_round6_questions` (3), `clp_round7_questions` (5), `clp_final_questions` (5). Runda 2 bazuje na odpowiedziach z rozgrzewki. | `clp_game_state` zapisuje indeksy etapów, ale pytania i zależności ankiet są czytane z banków. Nie zmieniać opcji bez zgodności z istniejącymi odpowiedziami i odnośnikami rundy 6. |
| Pod Przykrywką | `pp_missions` (30), `pp_hot_seat_questions` (10), `pp_interrogation_questions` (10), `pp_secret_orders` (8), `lib/pod-przykrywka.ts` typuje stan gry. | `pp_game_missions` zapisuje wylosowane ID misji, nie niezmienne kopie pól. Osobne widoki agenta i Oszusta, niejawne role, ankiety i rozkazy. |
| Akta Nocy, Apartament 214 | `lib/akta-nocy.ts`, `lib/akta-nocy-solution.ts`, przypisania i rekonstrukcje w `app_private`. | `akta_nocy_room_config.case_key` i klucze ról wskazują na dane z aktualnego kodu. Scenariusz, dowody i rozwiązanie są pakietem wzajemnie zależnym. |
| Akta Nocy, Ostatni Kurs | `lib/akta-nocy-ostatni-kurs.ts`, `-roles.ts`, `-solution.ts`; osobny route API i formularze rekonstrukcji. | Wspólna tabela konfiguracji, ale inna lista faz, mapa, role, rekonstrukcja i odpowiedzi. Wymaga **osobnej definicji scenariusza**, nie wspólnego formularza bez walidacji. |
| Zakręcone Hasło | `zh_puzzles` (54), `lib/zakrecone-haslo.ts` definiuje alfabet, samogłoski i segmenty koła. | `zh_game_state.puzzle_keys` zapisuje klucze hasła, natomiast odczyt pobiera aktualną frazę z globalnego banku. Zmiana starego klucza wpłynęłaby na aktywną rundę. |
| TYLKO MY | Pytania i warianty w `lib/tylko-my.ts`, 5 pul; `getTylkoMySequence(code)` losuje deterministycznie 20 pozycji na podstawie kodu pokoju. | `tylko_my_games` zachowuje indeks i wynik, ale nie listę 20 pytań. Kod liczy wynik według punktów z bieżącego pliku; nawet zmiana kolejności lub opcji puli wpływa na rozpoczęty pokój. Stałe 20 pytań i maksimum 34 pkt. |
| SZYFR | `szyfr_puzzles` (28), pola m.in. `step_key`, misja, wariant, `clues` (6), `hints` (2), odpowiedź kanoniczna i fragment finału. | `szyfr_games.step_plan` zapamiętuje klucze, nie treść. Dane są zależne od gracza i fazy; nie publikować prawidłowych odpowiedzi ani przyszłych wskazówek w publicznym stanie. |
| VA BANQUE | `va_banque_questions` (96): kategoria, pytanie, 4 opcje, `correct_index` 0–3, trudność i wyjaśnienie; logika licytacji w SQL. | `va_banque_games.question_id` oraz `used_question_ids` wskazują na bank globalny. Poprawna odpowiedź i licytacje muszą pozostać ukryte do właściwej fazy. |

Nazwy tabel, kolumn oraz liczności banków zostały sprawdzone w bazie. Nie eksportowano treści tajnych, odpowiedzi ani danych graczy.

## Klasy danych i decyzje redakcyjne

| Klasa | Status w III.1 | Warunek przejścia do edytora |
| --- | --- | --- |
| Karta katalogu, opis podstrony, zatwierdzone opisy zasad i SEO | **Już dostępne** w dotychczasowym CMS | Dotychczasowe zakresy ról, walidacja, historia publikacji, właściciel i AAL2. Nie zmieniają silnika. |
| Publiczne pytanie, prompt, wyjaśnienie, opis misji, etykieta odpowiedzi | **Kandydat na treść typowaną** | Konkretny schemat per gra, poprawne ID, limity, powiązania i wersja przypięta do pokoju. |
| Opcje i poprawna odpowiedź, ankietowe rozkłady, rozwiązania i powiązania | **Pakiet atomowy, nie osobne dowolne pola** | Walidator zgodności: komplet opcji, indeks poprawnej, odnośniki do pytań, wyników i zależności między etapami. |
| Prywatne role, sekrety, tajne hasła, fragmenty SZYFRU, finał, głosy | **Dostęp tylko w uprawnionym podglądzie/serwerze** | Izolacja host/gracz, brak przedwczesnego ujawnienia i brak publikacji przez publiczny katalog. |
| Punkty, kolejność i liczba etapów, limity, typy i progi, timery, prawa akcji, losowania, żetony i XP | **Zablokowane** | Oddzielna migracja silnika, model parametryczny i testy E2E; żadnego dowolnego JS/SQL ani pól wpływających na rozgrywkę z formularza treści. |
| Aktualny stan pokoju, indywidualne odpowiedzi, przydział ról, log wyników | **Nigdy jako treść redakcyjna** | Stan użytkowników i rozgrywek pozostaje w bazie gry. |

### Szczególne zależności

**CO LUDZIE POWIEDZĄ:** nie przesuwać identyfikatorów rozgrzewki ani wartości opcji po oddaniu odpowiedzi. Runda 6 ma `source_question_key` i `source_answer_value`; runda 3 ma `correct_order`; finał ma `multiplier`. Redakcja pytań musi walidować cały łańcuch, nie tylko zdanie.

**Pod Przykrywką:** wewnętrzne klucze typu `saboteur` są kontraktem protokołu; tekst wyświetlany graczowi używa „Oszust”. Nie zmieniać ich przez edytor etykiet. `response_mode`, `options`, prompty ról i tajne rozkazy muszą być zgodne.

**Akta Nocy:** rozwiązania zawierają klucze winnego, motywu i dowodów oraz przebieg ujawnienia. Osobne scenariusze nie mogą używać po cichu tych samych pól, gdy mają inne rodzaje rekonstrukcji i reguły ujawniania. Nie wystawiać danych z `*-solution.ts` do przeglądarki przed zakończeniem odpowiedniej fazy.

**Zakręcone Hasło:** kategoria, fraza i trudność są jedną wersją hasła. Koło, normalizacja liter, koszt samogłoski i rozliczanie wyniku to mechanika, nie pole tekstowe CMS.

**TYLKO MY:** zachować niezmienne wartości opcji, `id` pytania, typ `sync/predict/who/final`, osobę A/B i wagi punktów. Zmiana samej etykiety może być redakcyjna po snapshotowaniu, ale kolejność wybranych 20 pytań musi być zamrożona przy starcie.

**SZYFR:** zachować spójność `step_key`, `canonical_answer`, `answer_type`, `answer_format`, 6 wskazówek, 2 podpowiedzi i `fragment_digit`. Zadanie jest atomowym pakietem z poprawną odpowiedzią i rolami widokowymi.

**VA BANQUE:** 4 odpowiedzi i ich `correct_index` są nierozdzielne. Zmiana kolejności opcji wymaga aktualizacji indeksu w tej samej wersji. Nie zmieniać progów licytacji, dogrywki remisowej, przejęcia i finału przez CMS.

## Blokada architektoniczna przed III.2/III.3

**Brak wersji treści pokoju jest krytycznym warunkiem kolejnego etapu.** Sam `question_id`, `mission_id`, `step_key`, `puzzle_key` albo kod pokoju nie gwarantuje, że stary uczestnik zobaczy ten sam zestaw po publikacji edycji.

Plan techniczny, zachowujący kanoniczną kolejność roadmapy:

1. III.2, stworzyć **adapter definicji** dla każdej gry, z typem i numerem schematu. Na początek pilot Zakręcone Hasło (jedna tabela zagadek), dopiero po przejściu testów pozostałe. Akta Nocy ma 2 oddzielne definicje.
2. Przygotować niezmienne, zatwierdzone rewizje treści w bazie rozgrywek. Publikację wolno propagować z bazy administracyjnej tylko zaufaną, audytowaną ścieżką serwerową; nie nadajemy redaktorowi ani przeglądarce prawa zapisu do `app_private`.
3. Przypiąć identyfikator rewizji i zawartość lub odnośnik do **niezmiennych wierszy** atomowo przy uruchomieniu pokoju. Wszystkie odczyty, odpowiedzi, ujawnienia, przejścia faz i oceny muszą korzystać z tej samej wersji aż do końca. Rewanż ma jawną politykę: nowa wersja tylko przy nowej rozgrywce.
4. Istniejącym pokojom zapewnić zgodność starej ścieżki albo migrację z zachowaniem dokładnej zawartości; nie przełączać aktywnych pokoi na nowy bank. Osobno testować publikację przy dwóch równoległych pokojach na starej i nowej rewizji.
5. III.3, dopiero wtedy otwierać typowane formularze treści, walidować tajne i publiczne projekcje, semantykę odpowiedzi, kompletność scenariuszy, brak przecieku szkicu, przywracanie wersji, rewanż i anonimowy brak uprawnień.
6. III.4–III.5, testy pełnej gry, błędnych odpowiedzi, zgodności wyniku i stanu, przypadków remisowych i ujawniania danych. Tryb testowy i boty nie mogą naliczać produkcyjnego XP.

Dodatkowy wymóg: nie modyfikować globalnych banków `UPDATE` w miejscu po publikacji. Rewizje powinny być niemodyfikowalne, z unikalnymi stabilnymi identyfikatorami. Wycofanie publikacji zmienia jedynie wskazanie dla **nowych** pokojów.

## Kryteria zakończenia III.1

- [x] Zlokalizowano dane kodowe, prywatne banki SQL, funkcje API i struktury pokojów dla wszystkich 7 gier oraz obu wariantów Akta Nocy.
- [x] Sprawdzono brak room-level content version / snapshot i oddzielono stan uczestników od zasobów redakcyjnych.
- [x] Zidentyfikowano treści tajne, kontrakty poprawnych odpowiedzi i nieedytowalne parametry silnika.
- [x] Przygotowano rejestr strukturalny i test jego zgodności z repozytorium; ten rejestr nie umożliwia żadnej edycji gry.
- [ ] Blokada edycji banków znika dopiero po wdrożeniu i weryfikacji przypinania wersji w III.2/III.4.
- [ ] Test publikacji rzeczywistą sesją właściciela jest oddzielnym, nadal otwartym punktem CMS.
