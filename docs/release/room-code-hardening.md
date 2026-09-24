# Krótkie kody pokojów — wdrożenie etapowe

Stan: 24.09.2026. Issue #19. Nie jest to ukończona ochrona przed brute-force.

## Stwierdzone problemy

- Aktywna baza nadal przydziela 4-znakowe kody z ograniczonego alfabetu. Są to publiczne zaproszenia, a nie sekret uwierzytelniający do prywatnej roli.
- Wcześniej część endpointów ucinała wejściowe kody do 4 znaków; nadmiarowe znaki mogły wskazać inny pokój. W tej gałęzi wejście jest sprawdzane w całości.
- Wywołania `lookup_platform_room` i utworzenia/dołączenia do pokoju są dostępne również jako bezpośrednie Supabase RPC, z pominięciem Next.js. Limit na samej stronie niczego tu nie rozwiązuje.
- Wciąż istnieją stare, działające pokoje. Migracja nie może wyłączyć ich dołączenia ani uszkodzić pamiętanych ciasteczek.

## Wdrożenie bez przerwy w rozgrywkach

1. **Faza kompatybilności, ta gałąź:** `cleanRoomCode` akceptuje wyłącznie dokładne 4 lub 6 znaków, bez obcinania; pola formularzy mieszczą 6, lecz dotychczasowe pokoje dalej działają. Nowa generacja kodów pozostaje jeszcze na 4 znakach.
2. Przed zastosowaniem migracji wykonaj REALNY backup obu baz, test odzyskania na izolowanym środowisku i potwierdź wdrożenie zgodności frontendu. Przeprowadź testy dołączania i powrotu z urządzeń mobilnych.
3. **Faza serwera:** `supabase/staged-create-six-character-room-codes.sql` zmienia wyłącznie generator NOWYCH kodów. Nie dotyka zapisanych kodów starych pokojów. Wdrażaj po testach na oddzielnym projekcie.
4. Na staging sprawdź 6-znakowy kod we wszystkich grach, host cookie, player cookie, QR / link, przygotowanie testowego pokoju, reconnect oraz stary 4-znakowy kod aż do wygaśnięcia.
5. Kontynuuj ochronę przed masową enumeracją: kontrolowany limiter na bezpośrednim PostgREST `create`, `join`, `recover`, `lookup`, także dla połączeń omijających Next. Supabase dokumentuje `pgrst.db_pre_request`; nie należy bez testu kopiować logiki zapisującej liczniki na odczytach wykonywanych w transakcjach READ ONLY. Nie polegaj wyłącznie na nagłówku IP dostarczonym przez przeglądarkę. Nie stosuj wspólnego limitu dla 14 znajomych za jednym routerem, który uniemożliwi grę. Wymagane osobne środowisko i mierzenie normalnego pollingu.

## Weryfikacja przed startem

- [ ] Build + testy modułu walidacji i wszystkich tras.
- [ ] Vercel Preview i przejście testowe starego pokoju (4 znaki).
- [ ] Kopia i próba odtworzenia obu baz.
- [ ] Oddzielny staging po migracji: wszystkie gry działają z 6 znakami.
- [ ] Direct-RPC rate limits bez blokowania normalnego ruchu.
- [ ] Metryki 429, fałszywe blokady i procedura cofnięcia.

**Nie stosować migracji w produkcji tylko dlatego, że kod źródłowy jest przygotowany.**
