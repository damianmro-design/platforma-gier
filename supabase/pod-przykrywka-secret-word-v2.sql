-- Pod Przykrywką v2: tajne hasła zamiast abstrakcyjnych celów Oszusta.
-- Każdy Agent zna hasło. Oszust zna tylko kategorię i to samo pytanie.

update app_private.pp_missions set
  category='MIEJSCE',
  title='Co psuje dzień?',
  briefing='KATEGORIA: MIEJSCE. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: LOTNISKO
PYTANIE: Co tutaj może najbardziej zepsuć Ci dzień?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: MIEJSCE
PYTANIE: Co tutaj może najbardziej zepsuć Ci dzień?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='np. kolejka',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='trusted_trait';

update app_private.pp_missions set
  category='SYTUACJA',
  title='Co byłoby niezręczne?',
  briefing='KATEGORIA: SYTUACJA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: WESELE
PYTANIE: Co byłoby tutaj bardzo niezręczne, choć w innym miejscu mogłoby być normalne?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: SYTUACJA
PYTANIE: Co byłoby tutaj bardzo niezręczne, choć w innym miejscu mogłoby być normalne?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='thirty_seconds';

update app_private.pp_missions set
  category='MIEJSCE',
  title='Co tu pasuje?',
  briefing='KATEGORIA: MIEJSCE. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: CMENTARZ
PYTANIE: Co jest tutaj zupełnie normalne, ale w galerii handlowej byłoby bardzo dziwne?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: MIEJSCE
PYTANIE: Co jest tutaj zupełnie normalne, ale w galerii handlowej byłoby bardzo dziwne?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='lie_signal';

update app_private.pp_missions set
  category='MIEJSCE',
  title='Pierwszy raz',
  briefing='KATEGORIA: MIEJSCE. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: SIŁOWNIA
PYTANIE: Po czym najszybciej poznasz, że ktoś jest tutaj pierwszy raz?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: MIEJSCE
PYTANIE: Po czym najszybciej poznasz, że ktoś jest tutaj pierwszy raz?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='unclear_order';

update app_private.pp_missions set
  category='OSOBA',
  title='Dziwne zdanie',
  briefing='KATEGORIA: OSOBA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: NAUCZYCIEL
PYTANIE: Jakie zdanie byłoby dziwne usłyszeć od tej osoby podczas pracy?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: OSOBA
PYTANIE: Jakie zdanie byłoby dziwne usłyszeć od tej osoby podczas pracy?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='np. krótkie zdanie',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='agent_rule';

update app_private.pp_missions set
  category='MIEJSCE',
  title='Po co to brałeś?',
  briefing='KATEGORIA: MIEJSCE. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: PLAŻA
PYTANIE: Co ludzie często zabierają tutaj, a potem prawie z tego nie korzystają?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: MIEJSCE
PYTANIE: Co ludzie często zabierają tutaj, a potem prawie z tego nie korzystają?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='meeting_point';

update app_private.pp_missions set
  category='MIEJSCE',
  title='Najgorsze czekanie',
  briefing='KATEGORIA: MIEJSCE. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: SZPITAL
PYTANIE: Na co najbardziej nie chciałbyś tutaj długo czekać?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: MIEJSCE
PYTANIE: Na co najbardziej nie chciałbyś tutaj długo czekać?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='one_word_warning';

update app_private.pp_missions set
  category='MIEJSCE',
  title='Co przeszkadza?',
  briefing='KATEGORIA: MIEJSCE. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: KINO
PYTANIE: Co może najbardziej irytować Cię tutaj w zachowaniu innych ludzi?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: MIEJSCE
PYTANIE: Co może najbardziej irytować Cię tutaj w zachowaniu innych ludzi?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='missing_person';

update app_private.pp_missions set
  category='MIEJSCE',
  title='Pierwsze 5 minut',
  briefing='KATEGORIA: MIEJSCE. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: HOTEL
PYTANIE: Co sprawdziłbyś jako jedną z pierwszych rzeczy po przyjściu tutaj?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: MIEJSCE
PYTANIE: Co sprawdziłbyś jako jedną z pierwszych rzeczy po przyjściu tutaj?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='safe_channel';

update app_private.pp_missions set
  category='OSOBA',
  title='Pierwsze wrażenie',
  briefing='KATEGORIA: OSOBA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: KELNER
PYTANIE: Co ta osoba może zrobić, żeby od razu zrobić dobre pierwsze wrażenie?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: OSOBA
PYTANIE: Co ta osoba może zrobić, żeby od razu zrobić dobre pierwsze wrażenie?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='leader_choice';

update app_private.pp_missions set
  category='MIEJSCE',
  title='Zanim dostaniesz...',
  briefing='KATEGORIA: MIEJSCE. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: RESTAURACJA
PYTANIE: Co może popsuć doświadczenie, zanim jeszcze dostaniesz to, po co przyszedłeś?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: MIEJSCE
PYTANIE: Co może popsuć doświadczenie, zanim jeszcze dostaniesz to, po co przyszedłeś?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='plan_b';

update app_private.pp_missions set
  category='SYTUACJA',
  title='Czerwona flaga',
  briefing='KATEGORIA: SYTUACJA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: PIERWSZA RANDKA
PYTANIE: Co byłoby dla Ciebie największą czerwoną flagą?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: SYTUACJA
PYTANIE: Co byłoby dla Ciebie największą czerwoną flagą?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='silent_room';

update app_private.pp_missions set
  category='MIEJSCE',
  title='Co przeszkadza najbardziej?',
  briefing='KATEGORIA: MIEJSCE. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: KEMPING
PYTANIE: Co tutaj najłatwiej może popsuć plan?

Wybierz opcję, która najlepiej pasuje do hasła. Nie zdradzaj hasła na głos, dopóki trwa runda.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: MIEJSCE
PYTANIE: Co tutaj najłatwiej może popsuć plan?

Nie znasz hasła. Wybierz opcję, która może do niego pasować. Nie zdradzaj, że zgadujesz.',
  placeholder='Wpisz krótką odpowiedź',
  response_mode='choice',
  options='["Pogoda","Ludzie","Brak przygotowania","Sprzęt"]'::jsonb,
  discussion_prompts='["Kto mógł wybrać tę opcję nawet bez znajomości tajnego hasła?","Czy ktoś wybrał odpowiedź tylko dlatego, że była najbezpieczniejsza?","Kto po usłyszeniu innych zbyt szybko dopasowuje swoje uzasadnienie?"]'::jsonb
where code='route_choice';

update app_private.pp_missions set
  category='PRZEDMIOT',
  title='Co najczęściej zawodzi?',
  briefing='KATEGORIA: PRZEDMIOT. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: PARASOL
PYTANIE: Co najczęściej sprawia, że ten przedmiot zawodzi?

Wybierz opcję, która najlepiej pasuje do hasła. Nie zdradzaj hasła na głos, dopóki trwa runda.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: PRZEDMIOT
PYTANIE: Co najczęściej sprawia, że ten przedmiot zawodzi?

Nie znasz hasła. Wybierz opcję, która może do niego pasować. Nie zdradzaj, że zgadujesz.',
  placeholder='Wpisz krótką odpowiedź',
  response_mode='choice',
  options='["Rozmiar","Materiał","Mechanizm","Sposób użycia"]'::jsonb,
  discussion_prompts='["Kto mógł wybrać tę opcję nawet bez znajomości tajnego hasła?","Czy ktoś wybrał odpowiedź tylko dlatego, że była najbezpieczniejsza?","Kto po usłyszeniu innych zbyt szybko dopasowuje swoje uzasadnienie?"]'::jsonb
where code='source_choice';

update app_private.pp_missions set
  category='PRZEDMIOT',
  title='Co decyduje o wygodzie?',
  briefing='KATEGORIA: PRZEDMIOT. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: WALIZKA
PYTANIE: Co najbardziej decyduje, czy ten przedmiot jest wygodny?

Wybierz opcję, która najlepiej pasuje do hasła. Nie zdradzaj hasła na głos, dopóki trwa runda.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: PRZEDMIOT
PYTANIE: Co najbardziej decyduje, czy ten przedmiot jest wygodny?

Nie znasz hasła. Wybierz opcję, która może do niego pasować. Nie zdradzaj, że zgadujesz.',
  placeholder='Wpisz krótką odpowiedź',
  response_mode='choice',
  options='["Rozmiar","Waga","Wytrzymałość","Sposób otwierania"]'::jsonb,
  discussion_prompts='["Kto mógł wybrać tę opcję nawet bez znajomości tajnego hasła?","Czy ktoś wybrał odpowiedź tylko dlatego, że była najbezpieczniejsza?","Kto po usłyszeniu innych zbyt szybko dopasowuje swoje uzasadnienie?"]'::jsonb
where code='split_choice';

update app_private.pp_missions set
  category='PRZEDMIOT',
  title='Typowy problem',
  briefing='KATEGORIA: PRZEDMIOT. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: MIKROFALÓWKA
PYTANIE: Który problem zdarza się przy tym przedmiocie najczęściej?

Wybierz opcję, która najlepiej pasuje do hasła. Nie zdradzaj hasła na głos, dopóki trwa runda.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: PRZEDMIOT
PYTANIE: Który problem zdarza się przy tym przedmiocie najczęściej?

Nie znasz hasła. Wybierz opcję, która może do niego pasować. Nie zdradzaj, że zgadujesz.',
  placeholder='Wpisz krótką odpowiedź',
  response_mode='choice',
  options='["Za długo","Za krótko","Złe ustawienie","Nierówno"]'::jsonb,
  discussion_prompts='["Kto mógł wybrać tę opcję nawet bez znajomości tajnego hasła?","Czy ktoś wybrał odpowiedź tylko dlatego, że była najbezpieczniejsza?","Kto po usłyszeniu innych zbyt szybko dopasowuje swoje uzasadnienie?"]'::jsonb
where code='delay_choice';

update app_private.pp_missions set
  category='PRZEDMIOT',
  title='Co powoduje problem?',
  briefing='KATEGORIA: PRZEDMIOT. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: PILOT DO TELEWIZORA
PYTANIE: Co najczęściej powoduje problem z tym przedmiotem?

Wybierz opcję, która najlepiej pasuje do hasła. Nie zdradzaj hasła na głos, dopóki trwa runda.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: PRZEDMIOT
PYTANIE: Co najczęściej powoduje problem z tym przedmiotem?

Nie znasz hasła. Wybierz opcję, która może do niego pasować. Nie zdradzaj, że zgadujesz.',
  placeholder='Wpisz krótką odpowiedź',
  response_mode='choice',
  options='["Bateria","Zasięg","Przycisk","Użytkownik"]'::jsonb,
  discussion_prompts='["Kto mógł wybrać tę opcję nawet bez znajomości tajnego hasła?","Czy ktoś wybrał odpowiedź tylko dlatego, że była najbezpieczniejsza?","Kto po usłyszeniu innych zbyt szybko dopasowuje swoje uzasadnienie?"]'::jsonb
where code='unknown_object';

update app_private.pp_missions set
  category='PRZEDMIOT',
  title='Co jest najważniejsze?',
  briefing='KATEGORIA: PRZEDMIOT. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: BUDZIK
PYTANIE: Co jest w nim najważniejsze?

Wybierz opcję, która najlepiej pasuje do hasła. Nie zdradzaj hasła na głos, dopóki trwa runda.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: PRZEDMIOT
PYTANIE: Co jest w nim najważniejsze?

Nie znasz hasła. Wybierz opcję, która może do niego pasować. Nie zdradzaj, że zgadujesz.',
  placeholder='Wpisz krótką odpowiedź',
  response_mode='choice',
  options='["Głośność","Dokładność","Łatwość obsługi","Wygląd"]'::jsonb,
  discussion_prompts='["Kto mógł wybrać tę opcję nawet bez znajomości tajnego hasła?","Czy ktoś wybrał odpowiedź tylko dlatego, że była najbezpieczniejsza?","Kto po usłyszeniu innych zbyt szybko dopasowuje swoje uzasadnienie?"]'::jsonb
where code='signal_choice';

update app_private.pp_missions set
  category='SYTUACJA',
  title='Co utrudnia działanie?',
  briefing='KATEGORIA: SYTUACJA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: PRZEPROWADZKA
PYTANIE: Co tutaj najbardziej utrudnia sprawne działanie?

Wybierz opcję, która najlepiej pasuje do hasła. Nie zdradzaj hasła na głos, dopóki trwa runda.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: SYTUACJA
PYTANIE: Co tutaj najbardziej utrudnia sprawne działanie?

Nie znasz hasła. Wybierz opcję, która może do niego pasować. Nie zdradzaj, że zgadujesz.',
  placeholder='Wpisz krótką odpowiedź',
  response_mode='choice',
  options='["Brak planu","Za dużo rzeczy","Za mało czasu","Za mało pomocy"]'::jsonb,
  discussion_prompts='["Kto mógł wybrać tę opcję nawet bez znajomości tajnego hasła?","Czy ktoś wybrał odpowiedź tylko dlatego, że była najbezpieczniejsza?","Kto po usłyszeniu innych zbyt szybko dopasowuje swoje uzasadnienie?"]'::jsonb
where code='priority_choice';

update app_private.pp_missions set
  category='OSOBA',
  title='Co robi różnicę?',
  briefing='KATEGORIA: OSOBA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: DJ
PYTANIE: Co najbardziej decyduje, czy ta osoba dobrze wykonuje swoją pracę?

Wybierz opcję, która najlepiej pasuje do hasła. Nie zdradzaj hasła na głos, dopóki trwa runda.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: OSOBA
PYTANIE: Co najbardziej decyduje, czy ta osoba dobrze wykonuje swoją pracę?

Nie znasz hasła. Wybierz opcję, która może do niego pasować. Nie zdradzaj, że zgadujesz.',
  placeholder='Wpisz krótką odpowiedź',
  response_mode='choice',
  options='["Dobór muzyki","Kontakt z ludźmi","Energia","Wyczucie momentu"]'::jsonb,
  discussion_prompts='["Kto mógł wybrać tę opcję nawet bez znajomości tajnego hasła?","Czy ktoś wybrał odpowiedź tylko dlatego, że była najbezpieczniejsza?","Kto po usłyszeniu innych zbyt szybko dopasowuje swoje uzasadnienie?"]'::jsonb
where code='leader_choice_2';

update app_private.pp_missions set
  category='SYTUACJA',
  title='Pierwsza minuta',
  briefing='KATEGORIA: SYTUACJA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: ROZMOWA KWALIFIKACYJNA
PYTANIE: Co może zepsuć pierwsze wrażenie już w pierwszej minucie?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: SYTUACJA
PYTANIE: Co może zepsuć pierwsze wrażenie już w pierwszej minucie?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='alibi_question';

update app_private.pp_missions set
  category='SYTUACJA',
  title='Co psuje plan?',
  briefing='KATEGORIA: SYTUACJA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: PODRÓŻ SAMOCHODEM
PYTANIE: Jaka jedna rzecz najłatwiej może popsuć cały plan?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: SYTUACJA
PYTANIE: Jaka jedna rzecz najłatwiej może popsuć cały plan?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='two_minutes';

update app_private.pp_missions set
  category='PRZEDMIOT',
  title='Kiedy jej zabraknie?',
  briefing='KATEGORIA: PRZEDMIOT. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: KARTA PŁATNICZA
PYTANIE: W jakiej sytuacji brak tego przedmiotu zauważysz najszybciej?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: PRZEDMIOT
PYTANIE: W jakiej sytuacji brak tego przedmiotu zauważysz najszybciej?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='memory_detail';

update app_private.pp_missions set
  category='SYTUACJA',
  title='Czego nie może zabraknąć?',
  briefing='KATEGORIA: SYTUACJA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: IMPREZA URODZINOWA
PYTANIE: Co byłoby najdziwniejsze, gdyby tego tutaj zabrakło?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: SYTUACJA
PYTANIE: Co byłoby najdziwniejsze, gdyby tego tutaj zabrakło?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='false_alarm';

update app_private.pp_missions set
  category='PRZEDMIOT',
  title='Na samym dnie',
  briefing='KATEGORIA: PRZEDMIOT. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: PLECAK
PYTANIE: Co zwykle ląduje tutaj na dnie i trudno to potem znaleźć?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: PRZEDMIOT
PYTANIE: Co zwykle ląduje tutaj na dnie i trudno to potem znaleźć?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='secret_phrase';

update app_private.pp_missions set
  category='SYTUACJA',
  title='Jak przełamać stres?',
  briefing='KATEGORIA: SYTUACJA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: KARAOKE
PYTANIE: Co najbardziej pomaga komuś, kto bardzo się tutaj stresuje?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: SYTUACJA
PYTANIE: Co najbardziej pomaga komuś, kto bardzo się tutaj stresuje?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='lost_map';

update app_private.pp_missions set
  category='SYTUACJA',
  title='Temat ryzyka',
  briefing='KATEGORIA: SYTUACJA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: RODZINNY OBIAD
PYTANIE: Jaki temat najlepiej ominąć, jeśli chcesz spokojnie dotrwać do końca?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: SYTUACJA
PYTANIE: Jaki temat najlepiej ominąć, jeśli chcesz spokojnie dotrwać do końca?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='team_weakness';

update app_private.pp_missions set
  category='OSOBA',
  title='Nie chcesz tego usłyszeć',
  briefing='KATEGORIA: OSOBA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: DENTYSTA
PYTANIE: Jakie zdanie od tej osoby najbardziej by Cię zaniepokoiło?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: OSOBA
PYTANIE: Jakie zdanie od tej osoby najbardziej by Cię zaniepokoiło?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='np. krótkie zdanie',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='unexpected_call';

update app_private.pp_missions set
  category='OSOBA',
  title='Co zauważy pierwszy?',
  briefing='KATEGORIA: OSOBA. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: FOTOGRAF
PYTANIE: Co ta osoba zauważy szybciej niż większość ludzi?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: OSOBA
PYTANIE: Co ta osoba zauważy szybciej niż większość ludzi?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='one_person_knows';

update app_private.pp_missions set
  category='PRZEDMIOT',
  title='Co najbardziej irytuje?',
  briefing='KATEGORIA: PRZEDMIOT. Każdy Agent zna tajne hasło. Oszust zna tylko kategorię.',
  agent_prompt='TAJNE HASŁO: ODKURZACZ
PYTANIE: Co najbardziej irytuje w używaniu tego przedmiotu?

Odpowiedz tak, żeby było widać, że znasz hasło, ale nie wpisuj go wprost ani nie używaj oczywistego synonimu.',
  saboteur_prompt='TAJNE HASŁO: ???
KATEGORIA: PRZEDMIOT
PYTANIE: Co najbardziej irytuje w używaniu tego przedmiotu?

Nie znasz hasła. Odpowiedz tak, jakbyś znał kontekst. Nie zdradzaj, że zgadujesz.',
  placeholder='krótka odpowiedź',
  response_mode='text',
  options='[]'::jsonb,
  discussion_prompts='["Która odpowiedź brzmi tak, jakby autor naprawdę znał tajne hasło?","Która odpowiedź jest podejrzanie ogólna albo bezpieczna?","Kogo warto dopytać: dlaczego właśnie tak odpowiedziałeś?"]'::jsonb
where code='door_order';

update app_private.pp_hot_seat_questions set question='Masz 30 sekund. Nie podając tajnego hasła, wyjaśnij, dlaczego Twoja odpowiedź pasowała do pytania.' where id=1;
update app_private.pp_hot_seat_questions set question='Masz 30 sekund. Która odpowiedź z tej rundy brzmi tak, jakby jej autor nie znał tajnego hasła? Dlaczego?' where id=2;
update app_private.pp_hot_seat_questions set question='Masz 30 sekund. Która odpowiedź najlepiej pokazuje, że jej autor znał tajne hasło?' where id=3;
update app_private.pp_hot_seat_questions set question='Masz 30 sekund. Gdybyś miał odrzucić jedną odpowiedź jako przypadkowy strzał, którą byś wybrał?' where id=4;
update app_private.pp_hot_seat_questions set question='Masz 30 sekund. Kogo najbardziej chciałbyś dopytać o związek jego odpowiedzi z tajnym hasłem?' where id=5;
update app_private.pp_hot_seat_questions set question='Masz 30 sekund. Czy Twoją odpowiedź dałoby się napisać bez znajomości tajnego hasła? Obróń ją.' where id=6;
update app_private.pp_hot_seat_questions set question='Masz 30 sekund. Która odpowiedź jest Twoim zdaniem zbyt ogólna, żeby cokolwiek udowadniała?' where id=7;
update app_private.pp_hot_seat_questions set question='Masz 30 sekund. Kto w tej rundzie najbardziej próbuje dopasować się do opinii innych?' where id=8;
update app_private.pp_hot_seat_questions set question='Masz 30 sekund. Bez zdradzania hasła podaj drugi przykład odpowiedzi, którą mógłbyś dać na to pytanie.' where id=9;
update app_private.pp_hot_seat_questions set question='Masz 30 sekund. Powiedz, czego w odpowiedziach szukasz, żeby odróżnić Agenta od Oszusta.' where id=10;

update app_private.pp_interrogation_questions set question='Która z Twoich dotychczasowych odpowiedzi była najtrudniejsza do wymyślenia i dlaczego?' where id=1;
update app_private.pp_interrogation_questions set question='Kto najczęściej odpowiadał tak ogólnie, że mógł nie znać tajnych haseł?' where id=2;
update app_private.pp_interrogation_questions set question='Która odpowiedź innej osoby najmocniej przekonała Cię, że znała tajne hasło?' where id=3;
update app_private.pp_interrogation_questions set question='Jeśli nie jesteś Oszustem, jaka cecha jego odpowiedzi powinna być już widoczna po 3 misjach?' where id=4;
update app_private.pp_interrogation_questions set question='Wskaż jedną swoją odpowiedź i wyjaśnij jej związek z hasłem, nie zdradzając samego hasła.' where id=5;
update app_private.pp_interrogation_questions set question='Kogo dziś ufasz najmniej i która konkretna odpowiedź najbardziej na to wpłynęła?' where id=6;
update app_private.pp_interrogation_questions set question='Czy ktoś Twoim zdaniem zgadywał kategorię zamiast naprawdę znać hasło? Kto i kiedy?' where id=7;
update app_private.pp_interrogation_questions set question='Gdyby finał był teraz, na kogo głosujesz i jaka odpowiedź jest Twoim najmocniejszym tropem?' where id=8;
update app_private.pp_interrogation_questions set question='Która Twoja odpowiedź mogła wyglądać podejrzanie mimo znajomości hasła? Wyjaśnij.' where id=9;
update app_private.pp_interrogation_questions set question='Podaj jedną różnicę między odpowiedzią kogoś, kto zna hasło, a dobrym blefem Oszusta.' where id=10;
