# zaGRAJ — kopia i odtworzenie 2 baz Supabase

Stan: 2026-09-24. To instrukcja operacyjna, **nie potwierdzenie wykonania backupu ani skutecznego odtworzenia**.

## Co trzeba zachować

| Projekt | Rola | Baza |
| --- | --- | --- |
| platforma-gier | wspólne pokoje, wyniki, progresja i logika gier | osobna baza |
| polowanie-na-milionera | gra Premium i jej konta Auth | osobna baza |

Snapshot metadanych w dniu audytu: ok. 16 MB oraz 19 MB; Polowanie miało 44 rekordy Auth. Oba projekty miały 0 obiektów Storage. Liczby szybko się dezaktualizują. **Dump repozytorium nie odtwarza tych danych**.

Plan Free nie zawiera automatycznych backupów Supabase. Oficjalna procedura:
https://supabase.com/docs/guides/platform/backups
https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore

## Uruchomienie na Macu, krok po kroku

**Dla właściciela, bez wysyłania żadnych haseł do rozmowy.** Użyj lokalnie repozytorium zaGRAJ z gałęzi `main`, a potem otwórz Terminal w folderze projektu.

1. Uruchom Docker Desktop i włącz FileVault w ustawieniach macOS. Zainstaluj z oficjalnych źródeł narzędzia Docker Desktop, Supabase CLI, Node.js 22 i `age`. Supabase CLI można zainstalować przez Homebrew. Sprawdź: `supabase --version`, `docker info`, `node --version`, `age --version`.
2. `bash scripts/backup-mac.sh --check`, bez odczytu danych i bez pytania o hasła.
3. `bash scripts/backup-mac.sh --setup`, zapisze osobisty klucz szyfrowania w chronionym katalogu użytkownika Maca, nie w repozytorium. **Koniecznie wykonaj drugą kopię prywatnego klucza na odrębnym zaszyfrowanym nośniku**. Utrata klucza oznacza utratę możliwości odszyfrowania kopii.
4. W Supabase dla każdego z 2 projektów otwórz `Connect → Session pooler`, skopiuj kompletny `postgresql://` URL z właściwym hasłem bazy. Nie korzystaj z `Transaction pooler` ani klucza API. Nie zapisuj adresów z hasłami w plikach repo, historii poleceń ani w tej rozmowie.
5. `bash scripts/backup-mac.sh --run`. Skrypt zapyta bez wyświetlania znaków o adres PLATFORMY, potem POLowania. Weryfikuje identyfikatory obu projektów i tryb połączenia, zanim wykona eksport. Żaden URL ani hasło nie pojawiają się w normalnym wyniku programu.
6. Po sukcesie w `~/secure/zagraj-backups/zagraj-<czas-UTC>` pojawi się 2 katalogi zawierające po **5 zaszyfrowanych plików SQL** i `SHA256SUMS`. Bezpiecznie skopiuj katalog poza komputer. Przeprowadź kontrolę sum i osobną próbę odtworzenia.

**Nie uruchamiaj polecenia `--run` w Vercel ani GitHub Actions.** To kopia operatora zawierająca dane użytkowników. Skrypt nadal tworzy *przejściowe*, niezaszyfrowane SQL na dysku lokalnym przed natychmiastowym zaszyfrowaniem; FileVault ogranicza ryzyko odczytu poza zalogowanym urządzeniem, ale nie eliminuje zagrożeń ze strony złośliwego oprogramowania uruchomionego w sesji.

## Bezpieczne uruchomienie, dopiero po przygotowaniu klucza i poświadczeń

1. Zainstaluj Docker Desktop, oficjalny Supabase CLI, `age` i narzędzie `shasum`. Uruchom Docker i sprawdź wersje poleceniami `--help`.
2. Utwórz **osobisty klucz age** na zaufanym, szyfrowanym urządzeniu, np. `age-keygen -o identity.agekey`. Klucza prywatnego NIE wklejaj do ChatGPT, GitHub, Vercel, CI ani logów. Zabezpiecz drugą kopię klucza poza urządzeniem. Z `age-keygen -y identity.agekey` pobierz wyłącznie publiczny identyfikator `age1...`.
3. Przygotuj dwa URL-e połączenia `postgresql://` w panelach **odpowiednich** baz Supabase, użyj zalecanego Session Pooler. Nie zapisuj ich w repo ani komendzie utrwalanej w historii terminala, nie wklejaj ich do rozmowy.
4. Wybierz szyfrowany dysk/lokalizację i dedykowany katalog bezpośrednio poza Git, np. `$HOME/secure/zagraj-backups`. Ten katalog i jego rodzic powinny być prywatne. Tymczasowe pliki SQL istnieją tylko do czasu zaszyfrowania, usunięcie nie gwarantuje bezpiecznego nadpisania na SSD, dlatego dysk tymczasowy musi być szyfrowany.
5. Ustaw zmienne **w swojej lokalnej powłoce**: `ZAGRAJ_BACKUP_ROOT`, `ZAGRAJ_BACKUP_RECIPIENT`, `ZAGRAJ_PLATFORM_DB_URL`, `ZAGRAJ_POLOWANIE_DB_URL`. Nie używaj prefiksu `NEXT_PUBLIC_`. Pierwsze dwie są ścieżką i publicznym odbiorcą szyfrowania, pozostałe to sekrety.
6. Wykonaj `bash scripts/backup-supabase.sh --check`; dopiero potem `bash scripts/backup-supabase.sh --run`.

Skrypt eksportuje `roles`, `schema`, `data`, `history_schema` i `history_data` dla **obu** projektów za pomocą poleceń dokumentowanych przez Supabase. Przy eksporcie Polowania wymaga obecności sekcji `auth.users` w zrzucie danych, inaczej przerywa pracę bez publikowania kopii. Dane kont są wrażliwe również wtedy, gdy są zaszyfrowane. Każdy plik jest od razu szyfrowany do `*.sql.age`. W katalogach `platform` i `polowanie` powstaje `SHA256SUMS`. Nie przenosi niekompletnego backupu pod finalną nazwę i nie wrzuca SQL do repozytorium.

**Nie jest to automatyczna usługa tworzenia kopii.** Skrypt działa tylko po świadomym uruchomieniu z poprawnymi poświadczeniami. Samo dodanie go do GitHub nie zabezpiecza danych.

Kolejne zrzuty obu baz powstają jeden po drugim i nie mają wspólnej transakcyjnej migawki. Przed procedurą awaryjnego odtwarzania wspólnych danych (konto / progresja / pokój) oceń spójność relacji między bazami. Ponadto kopia `supabase_migrations` służy do kontroli historii; nie odtwarzaj jej bez przeglądu na istniejący projekt, aby nie rozjechać rejestru migracji.

## Sprawdzenie kopii i odtworzenia, wyłącznie w izolacji

1. Skopiuj zaszyfrowany pakiet off-site, np. na własny szyfrowany dysk, i sprawdź `(cd platform && shasum -a 256 -c SHA256SUMS)`, analogicznie dla Polowania. To wykrywa naruszenie plików, ale nie dowodzi możliwości odtworzenia.
2. Przygotuj **osobny, pusty projekt/instancję testową** z odpowiednią wersją PostgreSQL i potrzebnymi rozszerzeniami. Nowy projekt Supabase może kosztować, nie tworzyć go automatycznie bez zgody na cenę. Nigdy nie odtwarzaj do produkcyjnego URL-a.
3. W prywatnym folderze na szyfrowanym dysku odszyfruj osobno `roles.sql.age`, `schema.sql.age`, `data.sql.age` za pomocą swojego `age -d -i /ścieżka/do/identity.agekey -o roles.sql roles.sql.age` (odpowiednio dla pozostałych). Pakiet zawiera także `history_schema.sql.age` i `history_data.sql.age`, które są materiałem do świadomego odtworzenia historii migracji zgodnie z oficjalną dokumentacją, **nie uruchamiaj ich automatycznie na produkcji**. Nie udostępniaj plików SQL.
4. Zweryfikuj **identyfikator docelowego projektu i hostname**, a następnie zastosuj oficjalną kolejność:
   `psql --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql --file schema.sql --command 'SET session_replication_role = replica' --file data.sql --dbname "$TEST_DB_URL"`.
   Takiej komendy **nigdy nie wykonuj**, jeśli URL wskazuje bazę produkcyjną.
5. Porównaj liczbę kluczowych tabel, rekordów gier i kont Auth, sprawdź RLS/GRANT/RPC, a potem utwórz i ukończ *testową* rozgrywkę. Sprawdź logowanie i dostęp gościa. Nie korzystaj z prawdziwych adresów e-mail do wysyłki testowych wiadomości.
6. Storage, ustawienia Auth/OAuth/SMTP, secrets, zewnętrzne media i konfiguracja Vercel wymagają osobnych kopii/odtworzenia; eksport samej bazy nie wystarcza. Jeżeli później pojawią się pliki w Storage, dołącz procedurę ich eksportu.
7. Zanotuj datę kopii, czas odtworzenia, kontrolne liczby rekordów, błędy i wynik GO/NO GO **bez ujawniania użytkowników i tokenów**. Po teście bezpiecznie usuń kopie plaintext z folderu roboczego.

## Warunki startu szerokiej bety

- Co najmniej 1 realna, zaszyfrowana kopia obu baz, zachowana off-site.
- Co najmniej 1 udany test odtworzenia na izolowanej instancji.
- Potwierdzone weryfikacja Auth i działanie krytycznych gier.
- Przyjęty harmonogram powtórzeń i odpowiedzialność za monitoring (nie opierać bezpieczeństwa na pojedynczej ręcznej kopii).
- Bezpieczna procedura awaryjna i kontrola dostępu do klucza prywatnego.

**W obecnym stanie te kryteria nadal pozostają otwarte.** Realny backup i izolowany restore wykonuje operator na własnym urządzeniu, a do raportu projektu przekazujemy tylko wynik bez identyfikatorów użytkowników, adresów i kluczy.
