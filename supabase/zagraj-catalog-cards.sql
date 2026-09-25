-- Catalog records live with zaGRAj Auth and admin roles. Gameplay databases remain unchanged.
create table if not exists public.zagraj_catalog_games (
 slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 published jsonb not null check (jsonb_typeof(published)='object'),
 draft jsonb check (draft is null or jsonb_typeof(draft)='object'),
 draft_state text not null default 'published' check (draft_state in ('published','draft','submitted')),
 revision integer not null default 1 check (revision > 0),
 engine_min_players integer not null,
 engine_max_players integer not null,
 draft_author uuid references auth.users(id) on delete set null,
 submitted_by uuid references auth.users(id) on delete set null,
 updated_by uuid references auth.users(id) on delete set null,
 published_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.zagraj_catalog_history (
 id bigint generated always as identity primary key,
 slug text not null references public.zagraj_catalog_games(slug),
 revision integer not null,
 payload jsonb not null,
 published_by uuid references auth.users(id) on delete set null,
 published_at timestamptz not null default now(),
 unique(slug,revision)
);
create index if not exists zagraj_catalog_revision_idx on public.zagraj_catalog_history(slug, revision desc);
alter table public.zagraj_catalog_games enable row level security;
alter table public.zagraj_catalog_history enable row level security;
revoke all on public.zagraj_catalog_games from anon, authenticated;
revoke all on public.zagraj_catalog_history from anon, authenticated;
revoke all on sequence public.zagraj_catalog_history_id_seq from anon, authenticated;

-- One-time, non-destructive migration of the nine current homepage cards.
insert into public.zagraj_catalog_games(slug,published,engine_min_players,engine_max_players)
values('polowanie-na-milionera','{"title":"Polowanie na Milionera","eyebrow":"Duża gra wieczoru","description":"Tajne role, zadania, blef, eliminacje i milion, który może zmieniać właściciela.","players":"6–14 graczy","time":"60–120 min","accent":"gold","art":"millionaire","href":"https://polowanienamilionera.pl","status":"hit","authHandoff":"polowanie","minPlayers":6,"maxPlayers":14,"minTime":60,"maxTime":120,"categories":["strategic"],"moods":["think","compete"],"tags":["strategia","reality show","ekran lub prowadzący"],"external":true,"slug":"polowanie-na-milionera","sortOrder":0,"isVisible":true}'::jsonb,6,14)
on conflict(slug) do nothing;
insert into public.zagraj_catalog_games(slug,published,engine_min_players,engine_max_players)
values('floor-party','{"title":"Floor Party","eyebrow":"Obroń swoją podłogę","description":"Zgaduj obrazy i hasła w pojedynkach, broń swojego pola i przejmuj terytorium rywali, aż cały Floor będzie należał do 1 gracza.","players":"6–20 graczy","time":"25–60 min","accent":"pink","art":"floor","href":"https://floor-party.vercel.app","status":"hit","minPlayers":6,"maxPlayers":20,"minTime":25,"maxTime":60,"categories":["funny","strategic"],"moods":["laugh","think","compete"],"tags":["zgadywanie","pojedynki","wymagany prowadzący"],"external":true,"slug":"floor-party","sortOrder":1,"isVisible":true}'::jsonb,6,20)
on conflict(slug) do nothing;
insert into public.zagraj_catalog_games(slug,published,engine_min_players,engine_max_players)
values('co-ludzie-powiedza','{"title":"CO LUDZIE POWIEDZĄ","eyebrow":"Grywalna beta","description":"Przewiduj najpopularniejsze odpowiedzi i sprawdź, czy naprawdę znasz swoją ekipę. Najlepiej działa przy 6–10 osobach.","players":"4–14 graczy","time":"45–75 min","accent":"yellow","art":"people","href":"/gry/co-ludzie-powiedza","status":"new","minPlayers":4,"maxPlayers":14,"minTime":45,"maxTime":75,"categories":["funny","team"],"moods":["laugh","compete","cooperate"],"tags":["ankiety","drużynowa","wymagany prowadzący"],"external":false,"slug":"co-ludzie-powiedza","sortOrder":2,"isVisible":true}'::jsonb,4,14)
on conflict(slug) do nothing;
insert into public.zagraj_catalog_games(slug,published,engine_min_players,engine_max_players)
values('pod-przykrywka','{"title":"Pod Przykrywką","eyebrow":"Dedukcja i blef","description":"Jedna osoba działa przeciw grupie. Obserwuj, zbieraj tropy i odkryj, kto gra podwójną grę.","players":"6–14 graczy","time":"45–75 min","accent":"cyan","art":"agent","href":"/gry/pod-przykrywka","status":"new","minPlayers":6,"maxPlayers":14,"minTime":45,"maxTime":75,"categories":["strategic"],"moods":["think","compete"],"tags":["psychologiczna","tajna rola","wymagany prowadzący"],"external":false,"slug":"pod-przykrywka","sortOrder":3,"isVisible":true}'::jsonb,6,14)
on conflict(slug) do nothing;
insert into public.zagraj_catalog_games(slug,published,engine_min_players,engine_max_players)
values('akta-nocy','{"title":"Akta Nocy","eyebrow":"Interaktywne śledztwo","description":"Role, sekrety, dowody i przesłuchania. Odtwórz przebieg zbrodni i wskaż sprawcę.","players":"5–12 graczy","time":"75–105 min","accent":"red","art":"crime","href":"/gry/akta-nocy","status":"new","minPlayers":5,"maxPlayers":12,"minTime":75,"maxTime":105,"categories":["strategic","team"],"moods":["think","cooperate"],"tags":["murder mystery","dedukcja","wymagany prowadzący"],"external":false,"slug":"akta-nocy","sortOrder":4,"isVisible":true}'::jsonb,5,12)
on conflict(slug) do nothing;
insert into public.zagraj_catalog_games(slug,published,engine_min_players,engine_max_players)
values('zakrecone-haslo','{"title":"Zakręcone Hasło","eyebrow":"Lekki teleturniej","description":"Hasła, litery, koło ryzyka i zwroty akcji. Krótka gra, którą łatwo odpalić na każdej imprezie.","players":"3–12 graczy","time":"20–35 min","accent":"violet","art":"word","href":"/gry/zakrecone-haslo","status":"new","minPlayers":3,"maxPlayers":12,"minTime":20,"maxTime":35,"categories":["funny"],"moods":["laugh","compete"],"tags":["słowna","szybka","bez prowadzącego"],"external":false,"slug":"zakrecone-haslo","sortOrder":5,"isVisible":true}'::jsonb,3,12)
on conflict(slug) do nothing;
insert into public.zagraj_catalog_games(slug,published,engine_min_players,engine_max_players)
values('tylko-my','{"title":"TYLKO MY","eyebrow":"Gra dla 2 osób","description":"Gra dla 2 osób na 2 telefonach. Przewidujcie swoje wybory, szukajcie zgodności i sprawdzajcie momenty telepatii, bez wspólnego ekranu.","players":"2 graczy","time":"20–30 min","accent":"pink","art":"duo","href":"/gry/tylko-my","status":"new","minPlayers":2,"maxPlayers":2,"minTime":20,"maxTime":30,"categories":["funny"],"moods":["laugh","cooperate"],"tags":["dla dwojga","2 telefony","telepatia"],"external":false,"slug":"tylko-my","sortOrder":6,"isVisible":true}'::jsonb,2,2)
on conflict(slug) do nothing;
insert into public.zagraj_catalog_games(slug,published,engine_min_players,engine_max_players)
values('szyfr','{"title":"SZYFR","eyebrow":"Kooperacyjna misja","description":"Każdy widzi inne informacje. Rozmawiajcie, łączcie tropy i rozwiązujcie kody, zanim skończy się czas.","players":"2–6 graczy","time":"30–45 min","accent":"cyan","art":"cipher","href":"/gry/szyfr","status":"new","minPlayers":2,"maxPlayers":6,"minTime":30,"maxTime":45,"categories":["strategic","team"],"moods":["think","cooperate"],"tags":["kooperacyjna","escape room","komunikacja"],"external":false,"slug":"szyfr","sortOrder":7,"isVisible":true}'::jsonb,2,6)
on conflict(slug) do nothing;
insert into public.zagraj_catalog_games(slug,published,engine_min_players,engine_max_players)
values('va-banque','{"title":"VA BANQUE","eyebrow":"Licytacja i ryzyko","description":"Licytuj kategorię, przejmuj pytania i decyduj, ile jesteś gotów postawić. Wiedza to dopiero połowa gry.","players":"2–8 graczy","time":"30–45 min","accent":"gold","art":"auction","href":"/gry/va-banque","status":"new","minPlayers":2,"maxPlayers":8,"minTime":30,"maxTime":45,"categories":["strategic"],"moods":["think","compete"],"tags":["licytacja","quiz","ryzyko"],"external":false,"slug":"va-banque","sortOrder":8,"isVisible":true}'::jsonb,2,8)
on conflict(slug) do nothing;
insert into public.zagraj_catalog_history(slug,revision,payload,published_by)
select slug,revision,published,null from public.zagraj_catalog_games
on conflict(slug,revision) do nothing;

create or replace function public.zagraj_catalog_public()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(published order by (published->>'sortOrder')::integer,slug),'[]'::jsonb)
 from public.zagraj_catalog_games
 where coalesce((published->>'isVisible')::boolean,true)=true;
$$;

create or replace function public.zagraj_catalog_my_games()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare m public.zagraj_admin_members%rowtype;
begin
 select * into m from public.zagraj_admin_members where user_id=auth.uid() and active;
 if m.user_id is null or (m.role<>'owner' and not (
    'games.read'=any(m.permissions) or 'games.edit'=any(m.permissions)
    or 'games.create'=any(m.permissions))) then
  raise exception 'ADMIN_FORBIDDEN' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object(
  'slug',g.slug,'published',g.published,'draft',g.draft,
  'draftState',g.draft_state,'revision',g.revision,'draftAuthor',g.draft_author,
  'updatedAt',g.updated_at,'publishedAt',g.published_at,
  'engineMinPlayers',g.engine_min_players,'engineMaxPlayers',g.engine_max_players
 ) order by (g.published->>'sortOrder')::integer,g.slug),'[]'::jsonb)
 from public.zagraj_catalog_games g
 where m.role='owner' or cardinality(m.game_slugs)=0 or g.slug=any(m.game_slugs));
end; $$;

create or replace function public.zagraj_catalog_save_draft(
 p_slug text, p_expected_revision integer, p_data jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.zagraj_admin_members%rowtype;
 g public.zagraj_catalog_games%rowtype;
 c jsonb;
 x text;
begin
 select * into m from public.zagraj_admin_members where user_id=auth.uid() and active;
 if m.user_id is null or (m.role<>'owner' and not ('games.edit'=any(m.permissions)
     and (cardinality(m.game_slugs)=0 or p_slug=any(m.game_slugs)))) then
   raise exception 'GAME_EDIT_FORBIDDEN' using errcode='42501'; end if;
 select * into g from public.zagraj_catalog_games where slug=p_slug for update;
 if g.slug is null then raise exception 'GAME_NOT_FOUND' using errcode='22023'; end if;
 if g.revision is distinct from p_expected_revision then
   raise exception 'CATALOG_REVISION_CONFLICT' using errcode='40001'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' then
   raise exception 'INVALID_CARD' using errcode='22023'; end if;
 if length(trim(coalesce(p_data->>'title',''))) not between 1 and 80
    or length(trim(coalesce(p_data->>'eyebrow',''))) not between 1 and 90
    or length(trim(coalesce(p_data->>'description',''))) not between 1 and 600 then
   raise exception 'INVALID_CARD_TEXT' using errcode='22023'; end if;
 if (p_data->>'minPlayers') !~ '^[0-9]+$' or (p_data->>'maxPlayers') !~ '^[0-9]+$'
   or (p_data->>'minTime') !~ '^[0-9]+$' or (p_data->>'maxTime') !~ '^[0-9]+$'
   or (p_data->>'sortOrder') !~ '^[0-9]+$' then
   raise exception 'INVALID_CARD_NUMBER' using errcode='22023'; end if;
 if (p_data->>'minPlayers')::integer < g.engine_min_players
   or (p_data->>'maxPlayers')::integer > g.engine_max_players
   or (p_data->>'minPlayers')::integer > (p_data->>'maxPlayers')::integer
   or (p_data->>'minTime')::integer < 5
   or (p_data->>'maxTime')::integer > 240
   or (p_data->>'minTime')::integer > (p_data->>'maxTime')::integer
   or (p_data->>'sortOrder')::integer > 99 then
   raise exception 'CARD_OUTSIDE_ENGINE_LIMITS' using errcode='22023'; end if;
 if (p_data->>'accent') not in ('gold','pink','yellow','cyan','red','violet')
   or (p_data->>'art') not in ('millionaire','floor','people','agent','crime','word','duo','cipher','auction')
   or (p_data->>'status') not in ('hit','new','soon')
   or jsonb_typeof(p_data->'isVisible') is distinct from 'boolean'
   or jsonb_typeof(p_data->'tags') is distinct from 'array'
   or jsonb_typeof(p_data->'categories') is distinct from 'array'
   or jsonb_typeof(p_data->'moods') is distinct from 'array'
   or jsonb_array_length(p_data->'tags')>8
   or jsonb_array_length(p_data->'categories')>3
   or jsonb_array_length(p_data->'moods')>4 then
    raise exception 'INVALID_CARD_OPTIONS' using errcode='22023'; end if;
 for x in select jsonb_array_elements_text(p_data->'tags') loop
   if length(trim(x)) not between 1 and 40 then raise exception 'INVALID_TAG' using errcode='22023'; end if;
 end loop;
 for x in select jsonb_array_elements_text(p_data->'categories') loop
   if x not in ('funny','strategic','team') then raise exception 'INVALID_CATEGORY' using errcode='22023'; end if;
 end loop;
 for x in select jsonb_array_elements_text(p_data->'moods') loop
   if x not in ('laugh','think','compete','cooperate') then raise exception 'INVALID_MOOD' using errcode='22023'; end if;
 end loop;
 -- Explicit allowlist and backend-owned technical routing. No arbitrary href, JS or auth handoff edits.
 c:=g.published || jsonb_build_object(
  'title',trim(p_data->>'title'),'eyebrow',trim(p_data->>'eyebrow'),
  'description',trim(p_data->>'description'),
  'minPlayers',(p_data->>'minPlayers')::integer,'maxPlayers',(p_data->>'maxPlayers')::integer,
  'minTime',(p_data->>'minTime')::integer,'maxTime',(p_data->>'maxTime')::integer,
  'players',case when (p_data->>'minPlayers')::integer=(p_data->>'maxPlayers')::integer
         then (p_data->>'minPlayers')||' graczy'
         else (p_data->>'minPlayers')||'–'||(p_data->>'maxPlayers')||' graczy' end,
  'time',(p_data->>'minTime')||'–'||(p_data->>'maxTime')||' min',
  'tags',p_data->'tags','categories',p_data->'categories','moods',p_data->'moods',
  'accent',p_data->>'accent','art',p_data->>'art','status',p_data->>'status',
  'sortOrder',(p_data->>'sortOrder')::integer,'isVisible',(p_data->>'isVisible')::boolean
 );
 -- Preserve a prior draft if the editor is only changing one field.
 update public.zagraj_catalog_games set draft=c,draft_state='draft',draft_author=auth.uid(),
   submitted_by=null,revision=revision+1,updated_by=auth.uid(),updated_at=now()
 where slug=p_slug;
 insert into public.zagraj_admin_audit(actor_id,action,target_type,target_id,before_state,after_state)
 values(auth.uid(),'catalog.draft.save','game',p_slug,
  jsonb_build_object('revision',g.revision,'draft',g.draft),
  jsonb_build_object('revision',g.revision+1,'draft',c));
 return jsonb_build_object('slug',p_slug,'revision',g.revision+1,'state','draft');
end; $$;

create or replace function public.zagraj_catalog_submit(
 p_slug text,p_expected_revision integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.zagraj_admin_members%rowtype;g public.zagraj_catalog_games%rowtype;
begin
 select * into m from public.zagraj_admin_members where user_id=auth.uid() and active;
 if m.user_id is null or (m.role<>'owner' and not ('games.edit'=any(m.permissions)
   and (cardinality(m.game_slugs)=0 or p_slug=any(m.game_slugs)))) then
   raise exception 'GAME_EDIT_FORBIDDEN' using errcode='42501'; end if;
 select * into g from public.zagraj_catalog_games where slug=p_slug for update;
 if g.slug is null or g.draft is null or g.draft_state<>'draft' then
   raise exception 'NO_DRAFT' using errcode='22023'; end if;
 if g.revision is distinct from p_expected_revision then raise exception 'CATALOG_REVISION_CONFLICT' using errcode='40001'; end if;
 update public.zagraj_catalog_games set draft_state='submitted',submitted_by=auth.uid(),
  revision=revision+1,updated_at=now() where slug=p_slug;
 insert into public.zagraj_admin_audit(actor_id,action,target_type,target_id,before_state,after_state)
 values(auth.uid(),'catalog.submit','game',p_slug,jsonb_build_object('state',g.draft_state),
 jsonb_build_object('state','submitted','revision',g.revision+1));
 return jsonb_build_object('slug',p_slug,'revision',g.revision+1,'state','submitted');
end; $$;

create or replace function public.zagraj_catalog_publish(
 p_slug text,p_expected_revision integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.zagraj_admin_members%rowtype;g public.zagraj_catalog_games%rowtype;
begin
 select * into m from public.zagraj_admin_members where user_id=auth.uid() and active;
 if m.user_id is null or m.role<>'owner' then raise exception 'OWNER_REQUIRED' using errcode='42501'; end if;
 select * into g from public.zagraj_catalog_games where slug=p_slug for update;
 if g.slug is null or g.draft is null or g.draft_state<>'submitted' then
   raise exception 'NOT_SUBMITTED' using errcode='22023'; end if;
 if g.revision is distinct from p_expected_revision then raise exception 'CATALOG_REVISION_CONFLICT' using errcode='40001'; end if;
 update public.zagraj_catalog_games set published=g.draft,draft=null,
  draft_state='published',revision=revision+1,updated_by=auth.uid(),
  published_at=now(),updated_at=now() where slug=p_slug;
 insert into public.zagraj_catalog_history(slug,revision,payload,published_by)
 values(p_slug,g.revision+1,g.draft,auth.uid());
 insert into public.zagraj_admin_audit(actor_id,action,target_type,target_id,before_state,after_state)
 values(auth.uid(),'catalog.publish','game',p_slug,
  jsonb_build_object('revision',g.revision,'published',g.published),
  jsonb_build_object('revision',g.revision+1,'published',g.draft));
 return jsonb_build_object('slug',p_slug,'revision',g.revision+1,'state','published');
end; $$;

revoke all on function public.zagraj_catalog_public() from public;
grant execute on function public.zagraj_catalog_public() to anon,authenticated;
revoke all on function public.zagraj_catalog_my_games() from public,anon;
revoke all on function public.zagraj_catalog_save_draft(text,integer,jsonb) from public,anon;
revoke all on function public.zagraj_catalog_submit(text,integer) from public,anon;
revoke all on function public.zagraj_catalog_publish(text,integer) from public,anon;
grant execute on function public.zagraj_catalog_my_games() to authenticated;
grant execute on function public.zagraj_catalog_save_draft(text,integer,jsonb) to authenticated;
grant execute on function public.zagraj_catalog_submit(text,integer) to authenticated;
grant execute on function public.zagraj_catalog_publish(text,integer) to authenticated;
