# zaGRAj Admin — SMS jako opcjonalny drugi składnik

Kod i UI obsługują MFA typu phone (SMS) obok TOTP. **Wysyłka jest domyślnie wyłączona**; nie aktywować bez zgody właściciela na koszty.

## Koszty

Supabase Advanced MFA Phone jest osobno płatnym dodatkiem: około **75 USD/mies. za pierwszy projekt przy ciągłym włączeniu**, rozliczany godzinowo. Dodatkowo dostawca (np. Twilio) pobiera opłatę za wiadomości. Dodatek nie jest objęty Spend Cap.

Dokumentacja: https://supabase.com/docs/guides/platform/manage-your-usage/advanced-mfa-phone i https://supabase.com/docs/guides/auth/auth-mfa/phone

## Aktywacja po osobnym potwierdzeniu przez właściciela

1. W projekcie Supabase Auth zaGRAj (tym samym, z którego logują się gracze) skonfiguruj komercyjnego dostawcę wiadomości SMS, np. Twilio, w Authentication → Providers → Phone. Skontroluj też ustawienia rejestracji numerem oraz limity, tak aby SMS MFA nie uruchamiało niezamierzonej metody logowania i kosztów dla całej platformy.
2. W Supabase Authentication → MFA włącz Phone MFA. Sprawdź koszty i zabezpieczenia limitów. **Samo włączenie tego dodatku zaczyna naliczanie opłaty godzinowej.**
3. Na Vercel ustaw dla właściwego środowiska `ZAGRAJ_ADMIN_SMS_MFA_ENABLED=true` i wykonaj deployment.
4. Zaloguj się na swoje konto administratora; otwórz `/admin/bezpieczenstwo`, dodaj numer w formacie E.164, np. +48…, wyślij i potwierdź kod.
5. Wyloguj się, zaloguj ponownie i potwierdź sesję kodem SMS. Zweryfikuj AAL2 i dostęp do publikacji. Zachowaj TOTP jako metodę zapasową.

## Zasady implementacji

- Telefon trafia bezpośrednio z przeglądarki do Supabase Auth. Nie zapisujemy go w CMS ani we własnej tabeli i nie logujemy numeru.
- Pełny numer nie jest wyświetlany po dodaniu; interfejs maskuje go.
- Sekret dostawcy SMS musi pozostać wyłącznie w ustawieniach Supabase. Nie wpisuj go w czacie ani w kodzie repozytorium.
- UI pozwala ponowić wysyłkę nie częściej niż raz na 60 sekund; Supabase ma dodatkowe serwerowe limity.
- SQL dla publikacji i nadawania ról nadal wymaga AAL2; samo posiadanie numeru nie nadaje uprawnień.
- Zmienna `ZAGRAJ_ADMIN_SMS_MFA_ENABLED` dotyczy interfejsu zaGRAj, a nie globalnej konfiguracji Supabase. Przed aktywacją należy sprawdzić ochronę endpointów Auth i limity wysyłania.
