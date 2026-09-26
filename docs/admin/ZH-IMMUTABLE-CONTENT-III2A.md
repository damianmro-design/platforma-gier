# III.2a, Zakręcone Hasło: niezmienne wersje zawartości przypięte do pokoju

Data: 2026-09-26. Projekt: **baza rozgrywek** `glcjetxskjnlbeegirln`, schemat `app_private`. Pliki: `supabase/zh-immutable-content-revisions.sql`, `supabase/tests/zh-immutable-content-revisions.sql`, `scripts/tests/zh-content-revision.test.mjs`.

## Cel i granice pilotażu

To **techniczny adapter i ochrona działających pokojów, bez edytora pytań**. Szkice, zatwierdzanie redaktora/właściciela i przyciski publikacji z CMS pozostają wyłącznie dla strony marketingowej. Nie ma jeszcze ścieżki pozwalającej redaktorowi, przeglądarce lub właścicielowi przez formularz zmienić hasła w silniku. Nie dodano RPC do zarządzania bankiem. Pozostałe 6 gier czeka na własne adaptery.

### Nowy model

1. `zh_content_versions`: identyfikator wersji, numer schematu, etykieta źródła, data utworzenia.
2. `zh_content_puzzles`: wiersze `(version_id,puzzle_key,category,phrase,difficulty)`, unikatowe w obrębie wersji. **INSERT nowej wersji zamiast UPDATE starej**. Trigger zabrania modyfikacji, usunięcia i TRUNCATE zapisanych rewizji; RLS i brak grantów dla `anon` i `authenticated`.
3. `zh_content_active`: 1 rekord wskazujący wersję wybieraną dla **nowych** pokojów. Trigger odmówi aktywacji wersji bez 2 odrębnych kategorii na każdym z 3 poziomów trudności. Zmiana wskaźnika jest obecnie możliwa wyłącznie z uprawnionej migracji/SQL bazy gry, **nie** z przeglądarki ani publicznego RPC.
4. `zh_game_state.content_version_id NOT NULL`: przypięta wersja. Trigger odrzuca jej podmianę w istniejącym stanie; pilnuje kompletnej listy co najmniej 6 różnych kluczy, poprawnego indeksu i istnienia każdego klucza w tej samej wersji.
5. `initialize_zh_game_internal` czyta wskaźnik bieżącej wersji z blokadą `FOR SHARE`, wybiera 2 hasła dla każdego poziomu z nowego banku, po czym zapisuje identyfikator rewizji wraz z kluczami w tej samej transakcji.
6. `get_zh_state_internal`, `submit_zh_letter_internal`, `submit_zh_vowel_internal` i `submit_zh_solve_internal` czytają kategorię i frazę tylko przez `(content_version_id,puzzle_key)`. Gdy przypięty rekord nie istnieje, zgłaszają błąd zamiast domyślnie podłączać nowy bank. Zasady koła, zakup samogłoski, wyniki, bonus, maskowanie hasła, etapy i API pozostają bez zmian.

### Migracja istniejących pokojów

W momencie audytu w bazie znajdowało się 54 haseł, po 18 na poziom, oraz 5 stanów pokoi. Migracja atomowo kopiuje aktualny bank jako wersję 1, weryfikuje, że wszystkie klucze istnieją, a następnie przypina historyczne stany do wersji 1. **Nie zmienia żadnej frazy, przypisanej kolejności, punktów ani stanu rozgrywki.** W razie braku klucza przerywa się przed wdrożeniem.

Ponieważ przed migracją brakowało zapisanej wersji historycznej, nie sposób odtworzyć zmian banku, które zaszły wcześniej. Wersja 1 jest dokładną kopią bazy w momencie migracji; od tej chwili nowa publikacja nie może zmienić tych przypiętych treści.

### Testy i kryteria wdrożenia

- Suchy przebieg migracji i pełnego testu wykonujemy w jednym `BEGIN ... ROLLBACK`; po nim nowy schemat musi nadal nie istnieć.
- Po wdrożeniu test w transakcji tworzy 2 syntetyczne pokoje `is_test=true`, z pierwszym na wersji 1. Wstawia kopię banku z odmiennymi frazami jako wersję 2 i przełącza wskaźnik dla nowych pokojów. Sprawdza niezmienność publicznego stanu pierwszego pokoju, rozstrzygnięcie hasła z oryginalnej wersji oraz właściwą wersję i wynik drugiego pokoju.
- Dodatkowo odrzuca modyfikację i usunięcie historycznej wersji, podmianę wersji trwającego pokoju, niekompletną wersję oraz bezpośrednie uprawnienia klienta. Wszystkie dane syntetyczne są cofane przez `ROLLBACK`, także wskaźnik aktywnej wersji. Nie nalicza się produkcyjnego XP.
- Po uruchomieniu sprawdzamy, że aktywną wersją produkcyjną nadal jest 1, wszystkie historyczne stany są przypięte, bank podstawowy ma nadal 54 hasła, a publiczne RPC / API gry działa bez zmiany formatu.
- Testy JS pilnują migracji, źródeł odczytu, grantów i treści roadmapy.

### Otwarte przed edytorem i kolejnymi grami

**III.2b**: typowany format nowych pakietów, walidacja jakości i semantyki hasła, audytowany most publikacji Auth → gameplay, wersja w rejestrze CMS, wstępny podgląd tylko dla uprawnionych, brak udostępniania niepublikowanych rozwiązań. **III.2c+**: analogiczne adaptery dla pozostałych silników, uwzględniające ich osobne zależności. **III.3**: dopiero wtedy formularze. **III.4**: testy migracji treści, historycznych pokojów, rewanżu i rollbacku. Sam pilotaż III.2a nie kończy III.2, III.3 ani III.4.
