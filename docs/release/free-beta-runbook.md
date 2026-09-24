# zaGRAJ.fun — otwarcie bezpłatnej wersji beta

Stan: 24.09.2026. Ten dokument jest checklistą wdrożenia, **nie certyfikatem zgodności**.
Nie włączaj masowej promocji przed zaliczeniem wszystkich punktów oznaczonych BLOKER.
Nie publikuj danych osobowych operatora w repozytorium; dane wymagane do publicznej informacji ustaw jako zmienne środowiskowe Vercel.

## Zasady

- Bezpłatna beta: bez płatności, bez reklam i bez agresywnego trackingu.
- Gość dołącza bez kupowania i bez obowiązku zakładania konta.
- Nie obiecuj dostępności 100% ani obsługi nieograniczonej liczby użytkowników.
- Feature freeze: nowe gry i mechaniki poza zakresem aż do zakończenia testów.
- Każdą zmianę wykonuj na osobnej gałęzi z testami i bez nadpisywania innych równoległych prac.

## 1. Prawo i kontakt [BLOKER]

- [ ] Ustalić prawdziwego administratora danych / usługodawcę i właściwy kraj prowadzenia działalności (Polska/Grecja/inny). Nie wnioskować tego z języka strony ani miejsca pobytu autora.
- [ ] Ustawić publiczne: `NEXT_PUBLIC_LEGAL_OPERATOR_NAME`, `NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS`, `NEXT_PUBLIC_LEGAL_OPERATOR_COUNTRY`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_PLATFORM_URL` w Production na Vercel; nie zapisywać prywatnego adresu w git.
- [ ] Potwierdzić, że adres kontaktowy odbiera i wysyła wiadomości; sprawdzić reset hasła i wiadomości usługowe.
- [ ] Uruchomić `npm run beta:preflight` z konfiguracją docelową i uzyskać PASS; nie uznawać tego za opinię prawną.
- [ ] Zweryfikować regulamin dla faktycznego operatora, trybów gościa, wieku, treści wprowadzanych przez graczy i realnego kontaktu.
- [ ] Zweryfikować privacy: podstawy/cel, dostawcy, kraje transferu, retencja z konkretnymi kryteriami, uprawnienia, odpowiedzi na żądania, usuwanie konta.
- [ ] Ustalić, które technologie wykorzystują wyłącznie niezbędne cookies; każde niekonieczne śledzenie analityczne włączyć dopiero po właściwej obsłudze zgody.
- [ ] Wprowadzić i przetestować procedurę zgłoszeń bezprawnych treści i nadużyć (w razie potrzeby ocenić DSA dla faktycznej klasyfikacji usługi).
- [ ] Ocenić obowiązki dotyczące osób niepełnoletnich; nie zakładać, że zdanie w regulaminie jest wystarczającą weryfikacją wieku.
- [ ] Wykonać niezależny przegląd dokumentów przed publicznym otwarciem.

Podstawa: https://eli.gov.pl/api/acts/DU/2024/1513/text.html , https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en

## 2. Prawa do gier, nazw i mediów [BLOKER]

- [ ] Dla każdej publicznej gry osobny przegląd: nazwa, mechanika wyrażona w konkretnych materiałach, layout, teksty, pytania i odpowiedzi, grafiki, fonty, audio, SFX, zdjęcia, filmy.
- [ ] Zweryfikować licencje użycia w publicznej darmowej aplikacji ("za darmo" nie znaczy wolne od licencji).
- [ ] Udokumentować źródło i warunki dla każdego pliku; szablon: `docs/release/assets-license-register.csv`.
- [ ] Nie umieszczać VA BANQUE, Floor Party, Zakręconego Hasła i innych tytułów o możliwym podobieństwie do istniejących marek w otwartej becie bez indywidualnej analizy IP lub zmiany wizerunku/nazwy, jeśli trzeba.
- [ ] Zweryfikować treści zewnętrzne Polowania i innych osobnych wdrożeń, nie tylko pliki tej repozytorium.
- [ ] Wyłączyć/zastąpić każdy niezweryfikowany element przed promowaniem danej gry.

## 3. Bezpieczeństwo [BLOKER]

- [x] RLS na prywatnych tabelach platformy, walidacja host tokenu.
- [x] Podstawowy regresyjny test DB: null/losowe/cross-room tokeny i prywatne role, rollback.
- [ ] Potwierdzić w panelu Supabase, że `app_private` nie jest wystawiony jako API schema.
- [ ] Przejrzeć publiczne RPC, w tym all authenticated SECURITY DEFINER w Polowaniu. Nie odbierać EXECUTE hurtowo.
- [ ] Ograniczyć enumerację krótkich kodów i nadużycia funkcji tworzenia/dołączania/odzyskiwania pokoi. Sam limiter na Next.js nie wystarczy, bo istnieją RPC wywoływane bezpośrednio przez publishable key.
- [ ] Test przeglądarkowy: prawdziwy host, gracz, gość, osoba z innego pokoju, fałszywe cookie, odświeżenie, reconnect.
- [ ] Potwierdzić brak klucza service_role/secret w bundle przeglądarkowym i logach.
- [ ] Przejrzeć dane zwracane przez publiczne kody: publiczne etapy OK, tajne role, prywatne odpowiedzi i tokeny NIE.
- [ ] Włączyć ochronę przeciwko nadużyciom na warstwie frontu/hostingu i niezależnie na bezpośrednim API Supabase.

Raport: `docs/security/rpc-review-2026-09-24.md`.
Advisory: https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0028_anon_security_definer_function_executable

## 4. Stabilność, monitoring, kopie [BLOKER]

- [ ] Monitorować 5xx, błędy RPC, błędy JavaScript, deployment SHA, game_id i fazę; nie wysyłać do monitoringu haseł, tokenów ani tajnych odpowiedzi.
- [ ] Zaimplementować retention, redakcję danych w logach i kontrolę dostępu do logów.
- [ ] Zapewnić backup i PRZETESTOWAĆ odtworzenie. Na Supabase Free nie ma automatycznych backupów — użyć bezpiecznego eksportu off-site, bez publicznych plików.
- [ ] Zbudować recovery najczęstszych błędów, bez bezpośredniej ręcznej ingerencji w produkcyjną bazę.
- [ ] 5 kolejnych pełnych gier bez P0 i pomocy autora, potem szersza grupa.
- [ ] Powtórzyć E2E po każdej zmianie RPC, prawa dostępu, cookie i deployu.
- [ ] Zweryfikować zachowanie po pauzie/awarii Supabase, reconnect i powrót gracza.

## 5. Obciążenie i koszt [BLOKER przy szerokiej promocji]

- [ ] Ustalić liczby faktycznych zapytań na minutę/grę oraz szczytowy ruch, p95 odpowiedzi, wielkość bazy i transfer.
- [ ] Przeanalizować polling lobby (po zmianie: maksymalnie co 2500 ms w widocznej karcie; sprawdzić zachowanie po powrocie do karty) oraz zapis `last_seen_at` w Pod Przykrywką na odczycie; unikać nadmiarowych zapisów.
- [ ] Przeprowadzić autoryzowany, ograniczony test na odrębnym środowisku z osobną bazą/danymi syntetycznymi. NIE obciążać produkcji ani Vercel/Supabase bez zgodności z warunkami usług.
- [ ] Wprowadzić stopniowe fale: mała grupa → kilkanaście pokojów → szerszy ruch. Rozszerzać dopiero po przeglądzie metryk i limitów.
- [ ] Ustawić alerty wykorzystania i limity wydatków w Vercel/Supabase. Zostawić rezerwę, nie zakładać "nieskończonej" pojemności free tier.
- [ ] Sprawdzić warunki hostingu: Vercel Hobby jest planem niekomercyjnym. Dla celu komercyjnego potrzebna właściwa umowa/plan, nawet jeśli sama beta chwilowo nic nie kosztuje.
- [ ] Sprawdzić email deliverability/limity Auth po publikacji w social media.

Cenniki/dokumentacja: https://vercel.com/docs/plans/hobby , https://supabase.com/pricing , https://supabase.com/docs/guides/platform/backups

## 6. Kryterium GO / NO GO

GO dopiero przy: poprawnej tożsamości usługodawcy, dokumencie privacy/terms dostosowanym do realnych procesów, zgłoszonych i rozstrzygniętych licencjach każdego publikowanego tytułu, braku znanych P0, zweryfikowanych uprawnieniach i backupie, 5 pełnych grach bez pomocy, ograniczeniu nadużyć publicznych kodów, zaakceptowanym budżecie oraz przeprowadzonym testowym wdrożeniu i wycofaniu.

Jeżeli któryś warunek nie przechodzi, opublikować co najwyżej wąską zamkniętą betę, nie szeroki launch.
