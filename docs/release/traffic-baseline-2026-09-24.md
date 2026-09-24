# Baza pomiarowa ruchu API — 24.09.2026

Źródło: zbiorcze logi Supabase projektu platforma-gier (`edge_logs`), domyślne ostatnie 24 godziny według panelu. Dane zagregowane wyłącznie wg ścieżki i statusu, bez IP, identyfikatorów pokoju, tokenów lub danych graczy.

Najliczniejsze wpisy ze statusem 200:
- `/rest/v1/rpc/lookup_platform_room`: 35 358 zdarzeń
- `/rest/v1/rpc/get_platform_player`: 34 582
- `/rest/v1/rpc/get_va_banque_state`: 31 834
- `/rest/v1/rpc/get_tm_state`: 1 383
- `/rest/v1/rpc/is_platform_room_host`: 1 282
- `/rest/v1/rpc/list_platform_lobby`: 1 078

To NIE są unikalni użytkownicy ani wiarygodny test maksymalnej pojemności. Profil może wynikać z jednego długo trwającego testu automatycznego i pollingu, nie ze wzrostu organicznego.

Wykonane w tej gałęzi:
- Poczekalnia: interwał 1400 ms → 2500 ms; brak polling w ukrytej karcie; brak nakładających się prób pollingu, natychmiastowy refresh po powrocie.
- VA BANQUE: dotychczasowe 700 ms zachowane w fazie `takeover_open`; 1200 ms w interaktywnych fazach; 2000 ms w pozostałych; osobny lokalny timer 150 ms bez dodatkowego RPC; brak pollingu ukrytych kart i nakładających się żądań.

Następny audyt: sprawdzić p95/p99, error rate, DB CPU i liczbę RPC na użytkownika, potem ograniczone E2E z co najmniej 2 urządzeniami, następnie test obciążenia w wydzielonym, autoryzowanym środowisku. Nie twierdzić, że testy maksymalnej pojemności zostały ukończone.

Dodatkowy etap: `get_va_banque_state_internal` zapisuje `last_seen_at` najwyżej raz na 4 sekundy dla aktywnego gracza, a `get_pp_state_internal` najwyżej raz na 3 sekundy. Nadal odczytują stan gry przy każdym żądaniu; to ogranicza tylko nadmiar zapisów obecności. Test syntetyczny starego i świeżego znacznika czasu przeszedł w transakcji zakończonej ROLLBACK.

W API `GET /api/gra/va-banque/[code]` usunięto dodatkowe `get_platform_player`: `get_va_banque_state_internal` już weryfikuje player token, odrzuca nieznanego gracza i zwraca jego `viewer`. Dzięki temu nie dublujemy autoryzacyjnego RPC w każdym odpytywaniu. Bez zmian w uprawnieniach hosta.
