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

## Bezpieczne uruchomienie, dopiero po przygotowaniu klucza i poświadczeń

1. Zainstaluj Docker Desktop, oficjalny Supabase CLI, `age` i narzędzie `shasum`. Uruchom Docker i sprawdź wersje poleceniami `--help`.
2. Utwórz **osobisty klucz age** na zaufanym, szyfrowanym urządzeniu, np. `age-keygen -o identity.agekey`. Klucza prywatnego NIE wklejaj do ChatGPT, GitHub, Vercel, CI ani logów. Zabezpiecz drugą kopię klucza poza urządzeniem. Z `age-keygen -y identity.agekey` pobierz wyłącznie publiczny identyfikator `age1...`.
3. Przygotuj dwa URL-e połączenia `postgresql://` w panelach **odpowiednich** baz Supabase, użyj zalecanego Session Pooler. Nie zapisuj ich w repo ani komendzie utrwalanej w historii terminala, nie wklejaj ich do rozmowy.
4. Wybierz szyfrowany dysk/lokalizację i dedykowany katalog bezpośrednio poza Git, np. `$HOME/secure/zagraj-backups`. Ten katalog i jego rodzic powinny być prywatne. Tymczasowe pliki SQL istnieją tylko do czasu zaszyfrowania, usunięcie nie gwarantuje bezpiecznego nadpisania na SSD, dlatego dysk tymczasowy musi być szyfrowany.
5. Ustaw zmienne **w swojej lokalnej powłoce**: `ZAGRAJ_BACKUP_ROOT`, `ZAGRAJ_BACKUP_RECIPIENT`, `ZAGRAJ_PLATFORM_DB_URL`, `ZAGRAJ_POLOWANIE_DB_URL`. Nie używaj prefiksu `NEXT_PUBLIC_`. Pierwsze dwie są ścieżką i publicznym odbiorcą szyfrowania, pozostałe to sekrety.
6. Wykonaj `bash scripts/backup-supabase.sh --check`; dopiero potem `bash scripts/backup-supabase.sh --run`.

Skrypt eksportuje `roles`, `schema` i `data` dla **obu** projektów za pomocą poleceń dokumentowanych przez Supabase. Każdy plik jest od razu szyfrowany do `*.sql.age`. W katalogach `platform` i `polowanie` powstaje `SHA256SUMS`. Nie przenosi niekompletnego backupu pod finalną nazwę i nie wrzuca SQL do repozytorium.

**Nie jest to automatyczna usługa tworzenia kopii.** Skrypt działa tylko po świadomym uruchomieniu z poprawnymi poświadczeniami. Samo dodanie go do GitHub nie zabezpiecza danych.

## Sprawdzenie kopii i odtworzenia, wyłącznie w izolacji

1. Skopiuj zaszyfrowany pakiet off-site, np. na własny szyfrowany dysk, i sprawdź `(cd platform && shasum -a 256 -c SHA256SUMS)`, analogicznie dla Polowania. To wykrywa naruszenie plików, ale nie dowodzi możliwości odtworzenia.
2. Przygotuj **osobny, pusty projekt/instancję testową** z odpowiednią wersją PostgreSQL i potrzebnymi rozszerzeniami. Nowy projekt Supabase może kosztować, nie tworzyć go automatycznie bez zgody na cenę. Nigdy nie odtwarzaj do produkcyjnego URL-a.
3. W prywatnym folderze na szyfrowanym dysku odszyfruj osobno `roles.sql.age`, `schema.sql.age`, `data.sql.age` za pomocą swojego `age -d -i /ścieżka/do/identity.agekey -o roles.sql roles.sql.age` (odpowiednio dla pozostałych). Nie udostępniaj plików SQL.
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

**W obecnym stanie te kryteria nadal pozostają otwarte.**
