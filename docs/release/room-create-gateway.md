# Ochrona tworzenia pokojów, etap serwerowy

Stan: 2026-09-24. **Kod i migracja są STAGED, nie włączono ograniczenia w bazie produkcyjnej.**
Ten etap rozwiązuje wyłącznie publiczny bypass tworzenia pokoi. Nie stanowi kompletnego limitera żądań dla lookup, join, recover ani stanu gry.

## Dotychczasowy problem

Publiczny klucz Supabase jest przeznaczony do klienta. Funkcję `public.create_platform_room(text)` mógł wywołać każdy posiadacz tego klucza, nawet bez wejścia na zaGRAJ. Ograniczenie `POST /api/pokoj` i Server Action nie chroni tego bezpośredniego RPC.

## Docelowy przepływ

- Host wybiera grę i wysyła formularz do Next.js Server Action, lub właściciel uruchamia dozwolony tryb testowy przez `/api/test-room`.
- Wyłącznie serwer korzysta z `SUPABASE_ROOM_CREATE_SECRET_KEY` w `lib/platform-room-create.ts` do wykonania istniejącej funkcji `create_platform_room`.
- Gość otrzymuje zwykły kod zaproszenia, host otrzymuje własne HTTP-only cookie. Zasady gier i join/reconnect pozostają bez zmian.
- Bez publicznego EXECUTE dla anon/authenticated klucz publishable nie może tworzyć pokojów bezpośrednio. To NIE zabezpiecza przed floodem Server Action; na tej ścieżce nadal potrzebny jest limiter/WAF.

## Warunki przed włączeniem w produkcji

- [ ] Rzeczywisty zaszyfrowany backup **obu** baz + potwierdzony isolated restore, zadanie #20.
- [ ] Działające Vercel Preview i pełne testy na staging, bez produkcyjnych danych.
- [ ] Zainstalowany sekret serwerowy projektu PLATFORMY w Vercel `SUPABASE_ROOM_CREATE_SECRET_KEY`. Nie stosować klucza bazy Polowania. Nie stosować prefiksu `NEXT_PUBLIC_`. Nie wklejać wartości do repo, logów, komentarzy lub rozmów.
- [ ] Nowy kod Next.js wdrożony na produkcję ze starym domyślnym trybem `public`, przed zmianą uprawnień bazy.
- [ ] Zmienić w produkcji `ZAGRAJ_ROOM_CREATION_MODE=server-only`, uruchomić nowy deploy, sprawdzić utworzenie pokoju i tryb właściciela. **Dopiero potem** wykonać przygotowaną migrację: `supabase/staged-restrict-room-creation-to-server.sql`.
- [ ] Po migracji potwierdzić testy uprawnień:
  `has_function_privilege('anon','public.create_platform_room(text)','EXECUTE') = false`,
  analogicznie `authenticated=false` i `service_role=true`;
  sprawdzić także `app_private.create_platform_room_internal(text)`.
- [ ] Sprawdzić przez prawdziwy POST na publiczny endpoint Supabase z kluczem publishable, że bezpośrednie tworzenie dostaje błąd uprawnień. Nie logować kluczy i nie ujawniać tokenów.
- [ ] Przeprowadzić pełny test tworzenia, wejścia gościa, zamknięcia, reconnect oraz trybu testowego na oddzielnych urządzeniach.
- [ ] Dołożyć limiter/WAF serwerowego formularza i operacji lookup/join/recover, ponieważ sam sekret serwera nie blokuje wywoływania publicznej strony przez bota.

**Kolejność jest obowiązkowa.** Nie wolno uruchamiać SQL zanim wdrożenie trybu server-only jest sprawdzone. Zmienne środowiskowe Vercel zwykle wymagają nowego deploymentu, aby trafiły do funkcji.

## Bezpieczny rollback

Jeżeli nowy backend nie tworzy pokojów, zatrzymać rollout przed SQL. Jeśli SQL jest już zastosowany, najpierw (po sprawdzeniu bieżących ACL i bez zbiorowego resetowania pozostałych funkcji) przywrócić dotychczasowy dostęp wyłącznie tym 2 funkcjom:

```sql
GRANT EXECUTE ON FUNCTION public.create_platform_room(text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.create_platform_room_internal(text)
  TO anon, authenticated;
```

Jeżeli brakuje sekretu na serwerze, dopiero po przywróceniu RPC przełączyć `ZAGRAJ_ROOM_CREATION_MODE=public` i wykonać nowy deploy. Nie wykonywać rollbacku w ciemno; potwierdzić bieżące grants. Ograniczanie roli `service_role` i `app_private` dopiero po upewnieniu się, że inne serwerowe operacje nie korzystają z tych grants.

## Kontrola trybu przed publicznym otwarciem

`npm run beta:preflight` blokuje brak trybu `server-only` oraz brak niepublicznego klucza. Jest to kontrola struktury konfiguracji, a nie dowód rzeczywistej poprawności ACL, bezpiecznego przechowywania sekretu czy legalności projektu.

## Odrębne zagadnienie

Dłuższe kody z PR #22 i ograniczanie ich zgadywania pozostają osobnym zadaniem. Na bazie nadal generowane są stare kody 4-znakowe do czasu spełnienia gate backupu, staging i deploy.
