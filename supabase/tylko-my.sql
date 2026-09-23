-- TYLKO MY — 2-player cooperative prediction game.
-- Adds the game to platform rooms and stores only compact gameplay state.
-- Question copy and presentation live in lib/tylko-my.ts.

alter table app_private.platform_rooms
  drop constraint if exists platform_rooms_game_slug_check;

alter table app_private.platform_rooms
  add constraint platform_rooms_game_slug_check
  check (game_slug in (
    'co-ludzie-powiedza',
    'zakrecone-haslo',
    'pod-przykrywka',
    'akta-nocy',
    'tylko-my'
  ));

create table if not exists app_private.tylko_my_games (
  room_id uuid primary key references app_private.platform_rooms(id) on delete cascade,
  player_a_id uuid not null references app_private.room_players(id) on delete cascade,
  player_b_id uuid not null references app_private.room_players(id) on delete cascade,
  question_index integer not null default 0 check (question_index >= 0),
  score integer not null default 0 check (score >= 0),
  finished boolean not null default false,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (player_a_id <> player_b_id)
);

create table if not exists app_private.tylko_my_answers (
  room_id uuid not null references app_private.platform_rooms(id) on delete cascade,
  question_index integer not null check (question_index >= 0),
  player_id uuid not null references app_private.room_players(id) on delete cascade,
  answer_value text not null check (char_length(answer_value) between 1 and 40),
  answered_at timestamptz not null default now(),
  primary key (room_id, question_index, player_id)
);

alter table app_private.tylko_my_games enable row level security;
alter table app_private.tylko_my_answers enable row level security;

revoke all on app_private.tylko_my_games from public, anon, authenticated;
revoke all on app_private.tylko_my_answers from public, anon, authenticated;

drop policy if exists "deny direct client access" on app_private.tylko_my_games;
create policy "deny direct client access"
on app_private.tylko_my_games
for all to anon, authenticated
using (false) with check (false);

drop policy if exists "deny direct client access" on app_private.tylko_my_answers;
create policy "deny direct client access"
on app_private.tylko_my_answers
for all to anon, authenticated
using (false) with check (false);

create or replace function app_private.initialize_tm_game_internal(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_player_a uuid;
  v_player_b uuid;
begin
  select count(*) into v_count
  from app_private.room_players
  where room_id = p_room_id;

  if v_count <> 2 then
    return false;
  end if;

  select id into v_player_a
  from app_private.room_players
  where room_id = p_room_id
  order by joined_at, id
  limit 1;

  select id into v_player_b
  from app_private.room_players
  where room_id = p_room_id
  order by joined_at, id
  offset 1
  limit 1;

  insert into app_private.tylko_my_games(
    room_id, player_a_id, player_b_id, question_index, score, finished, updated_at
  )
  values(p_room_id, v_player_a, v_player_b, 0, 0, false, now())
  on conflict (room_id) do update
  set player_a_id = excluded.player_a_id,
      player_b_id = excluded.player_b_id,
      question_index = 0,
      score = 0,
      finished = false,
      started_at = now(),
      updated_at = now();

  delete from app_private.tylko_my_answers where room_id = p_room_id;

  return true;
end;
$$;

create or replace function app_private.get_tm_state_internal(
  p_code text,
  p_player_token uuid default null,
  p_host_token uuid default null
)
returns table (
  question_index integer,
  score integer,
  finished boolean,
  player_a_id uuid,
  player_a_name text,
  player_a_avatar text,
  player_b_id uuid,
  player_b_name text,
  player_b_avatar text,
  viewer_player_id uuid,
  viewer_answer text,
  answer_count integer,
  submitted_player_ids uuid[],
  revealed boolean,
  answers jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_room app_private.platform_rooms%rowtype;
  v_game app_private.tylko_my_games%rowtype;
  v_viewer_id uuid;
  v_viewer_answer text;
  v_answer_count integer := 0;
  v_submitted_ids uuid[] := '{}'::uuid[];
  v_answers jsonb := '[]'::jsonb;
begin
  select * into v_room
  from app_private.platform_rooms
  where code = upper(trim(p_code))
    and game_slug = 'tylko-my'
    and status = 'active'
    and expires_at > now()
  limit 1;

  if v_room.id is null then
    return;
  end if;

  if p_player_token is not null then
    select rp.id into v_viewer_id
    from app_private.room_players rp
    where rp.room_id = v_room.id
      and rp.player_token = p_player_token
    limit 1;
  end if;

  if v_viewer_id is null
     and (p_host_token is null or p_host_token <> v_room.host_token) then
    return;
  end if;

  select * into v_game
  from app_private.tylko_my_games
  where room_id = v_room.id
  limit 1;

  if v_game.room_id is null then
    return;
  end if;

  select
    count(*)::integer,
    coalesce(array_agg(a.player_id order by a.answered_at), '{}'::uuid[])
  into v_answer_count, v_submitted_ids
  from app_private.tylko_my_answers a
  where a.room_id = v_room.id
    and a.question_index = v_game.question_index;

  if v_viewer_id is not null then
    select a.answer_value into v_viewer_answer
    from app_private.tylko_my_answers a
    where a.room_id = v_room.id
      and a.question_index = v_game.question_index
      and a.player_id = v_viewer_id
    limit 1;
  end if;

  if v_answer_count >= 2 then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'player_id', a.player_id,
          'answer_value', a.answer_value
        )
        order by a.answered_at
      ),
      '[]'::jsonb
    )
    into v_answers
    from app_private.tylko_my_answers a
    where a.room_id = v_room.id
      and a.question_index = v_game.question_index;
  end if;

  return query
  select
    v_game.question_index,
    v_game.score,
    v_game.finished,
    v_game.player_a_id,
    pa.display_name,
    pa.avatar,
    v_game.player_b_id,
    pb.display_name,
    pb.avatar,
    v_viewer_id,
    v_viewer_answer,
    v_answer_count,
    v_submitted_ids,
    (v_answer_count >= 2),
    v_answers
  from app_private.room_players pa
  join app_private.room_players pb on pb.id = v_game.player_b_id
  where pa.id = v_game.player_a_id;
end;
$$;

create or replace function app_private.submit_tm_answer_internal(
  p_code text,
  p_player_token uuid,
  p_question_index integer,
  p_answer_value text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room app_private.platform_rooms%rowtype;
  v_game app_private.tylko_my_games%rowtype;
  v_player_id uuid;
  v_answer_count integer;
  v_clean_answer text := trim(p_answer_value);
begin
  if char_length(v_clean_answer) < 1 or char_length(v_clean_answer) > 40 then
    raise exception 'Invalid answer';
  end if;

  select * into v_room
  from app_private.platform_rooms
  where code = upper(trim(p_code))
    and game_slug = 'tylko-my'
    and status = 'active'
    and expires_at > now()
  limit 1;

  if v_room.id is null then
    raise exception 'Game not found';
  end if;

  select * into v_game
  from app_private.tylko_my_games
  where room_id = v_room.id
  limit 1;

  if v_game.room_id is null or v_game.finished then
    raise exception 'Game is finished';
  end if;

  if v_game.question_index <> p_question_index then
    raise exception 'Stale question';
  end if;

  select rp.id into v_player_id
  from app_private.room_players rp
  where rp.room_id = v_room.id
    and rp.player_token = p_player_token
    and rp.id in (v_game.player_a_id, v_game.player_b_id)
  limit 1;

  if v_player_id is null then
    raise exception 'Player not found';
  end if;

  select count(*)::integer into v_answer_count
  from app_private.tylko_my_answers
  where room_id = v_room.id
    and question_index = v_game.question_index;

  if v_answer_count >= 2 then
    raise exception 'Question locked';
  end if;

  insert into app_private.tylko_my_answers(
    room_id, question_index, player_id, answer_value, answered_at
  )
  values(
    v_room.id, v_game.question_index, v_player_id, v_clean_answer, now()
  )
  on conflict (room_id, question_index, player_id) do update
  set answer_value = excluded.answer_value,
      answered_at = now();

  return true;
end;
$$;

create or replace function app_private.advance_tm_question_internal(
  p_code text,
  p_host_token uuid,
  p_expected_question_index integer,
  p_score_delta integer,
  p_total_questions integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room app_private.platform_rooms%rowtype;
  v_game app_private.tylko_my_games%rowtype;
  v_answer_count integer;
  v_next integer;
begin
  if p_score_delta < 0 or p_score_delta > 3 then
    raise exception 'Invalid score delta';
  end if;

  if p_total_questions < 1 or p_total_questions > 40 then
    raise exception 'Invalid total question count';
  end if;

  select * into v_room
  from app_private.platform_rooms
  where code = upper(trim(p_code))
    and game_slug = 'tylko-my'
    and host_token = p_host_token
    and status = 'active'
    and expires_at > now()
  limit 1;

  if v_room.id is null then
    raise exception 'Host access required';
  end if;

  select * into v_game
  from app_private.tylko_my_games
  where room_id = v_room.id
  for update;

  if v_game.room_id is null then
    raise exception 'Game not found';
  end if;

  if v_game.finished then
    return v_game.question_index;
  end if;

  if v_game.question_index <> p_expected_question_index then
    raise exception 'Stale question';
  end if;

  select count(*)::integer into v_answer_count
  from app_private.tylko_my_answers
  where room_id = v_room.id
    and question_index = v_game.question_index;

  if v_answer_count <> 2 then
    raise exception 'Waiting for answers';
  end if;

  v_next := v_game.question_index + 1;

  if v_next >= p_total_questions then
    update app_private.tylko_my_games
    set score = score + p_score_delta,
        finished = true,
        question_index = p_total_questions,
        updated_at = now()
    where room_id = v_room.id;

    update app_private.platform_rooms
    set game_phase = 'finished'
    where id = v_room.id;

    return p_total_questions;
  end if;

  update app_private.tylko_my_games
  set score = score + p_score_delta,
      question_index = v_next,
      updated_at = now()
  where room_id = v_room.id;

  return v_next;
end;
$$;

create or replace function public.get_tm_state(
  p_code text,
  p_player_token uuid default null,
  p_host_token uuid default null
)
returns table (
  question_index integer,
  score integer,
  finished boolean,
  player_a_id uuid,
  player_a_name text,
  player_a_avatar text,
  player_b_id uuid,
  player_b_name text,
  player_b_avatar text,
  viewer_player_id uuid,
  viewer_answer text,
  answer_count integer,
  submitted_player_ids uuid[],
  revealed boolean,
  answers jsonb
)
language sql
security invoker
set search_path = ''
as $$
  select * from app_private.get_tm_state_internal(
    p_code, p_player_token, p_host_token
  );
$$;

create or replace function public.submit_tm_answer(
  p_code text,
  p_player_token uuid,
  p_question_index integer,
  p_answer_value text
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select app_private.submit_tm_answer_internal(
    p_code, p_player_token, p_question_index, p_answer_value
  );
$$;

create or replace function public.advance_tm_question(
  p_code text,
  p_host_token uuid,
  p_expected_question_index integer,
  p_score_delta integer,
  p_total_questions integer
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select app_private.advance_tm_question_internal(
    p_code,
    p_host_token,
    p_expected_question_index,
    p_score_delta,
    p_total_questions
  );
$$;

revoke all on function public.get_tm_state(text, uuid, uuid) from public;
revoke all on function public.submit_tm_answer(text, uuid, integer, text) from public;
revoke all on function public.advance_tm_question(text, uuid, integer, integer, integer) from public;

grant execute on function public.get_tm_state(text, uuid, uuid) to anon, authenticated;
grant execute on function public.submit_tm_answer(text, uuid, integer, text) to anon, authenticated;
grant execute on function public.advance_tm_question(text, uuid, integer, integer, integer) to anon, authenticated;

create or replace function app_private.create_platform_room_internal(p_game_slug text)
returns table (
  id uuid,
  code text,
  game_slug text,
  status text,
  host_token uuid,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_code text;
  inserted_room app_private.platform_rooms%rowtype;
  attempt integer;
begin
  if p_game_slug not in (
    'co-ludzie-powiedza',
    'zakrecone-haslo',
    'pod-przykrywka',
    'akta-nocy',
    'tylko-my'
  ) then
    raise exception 'Unsupported game';
  end if;

  for attempt in 1..20 loop
    select string_agg(
      substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1),
      ''
    )
    into generated_code
    from generate_series(1, 4);

    begin
      insert into app_private.platform_rooms (code, game_slug)
      values (generated_code, p_game_slug)
      returning * into inserted_room;

      return query
      select
        inserted_room.id,
        inserted_room.code,
        inserted_room.game_slug,
        inserted_room.status,
        inserted_room.host_token,
        inserted_room.created_at,
        inserted_room.expires_at;
      return;
    exception
      when unique_violation then null;
    end;
  end loop;

  raise exception 'Could not allocate room code';
end;
$$;

create or replace function app_private.join_platform_room_internal(
  p_code text, p_display_name text, p_avatar text
)
returns table (
  id uuid, player_token uuid, display_name text, avatar text, team text, ready boolean
)
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room app_private.platform_rooms%rowtype;
  inserted_player app_private.room_players%rowtype;
  player_count integer;
  room_limit integer;
  clean_name text := trim(p_display_name);
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_recovery text;
  attempt integer;
begin
  select * into target_room
  from app_private.platform_rooms
  where code = upper(trim(p_code))
    and expires_at > now()
    and status = 'lobby'
  limit 1;

  if target_room.id is null then raise exception 'Room not found or not joinable'; end if;
  if char_length(clean_name) < 1 or char_length(clean_name) > 20 then raise exception 'Invalid name'; end if;

  if p_avatar not in (
    'avatar-01','avatar-02','avatar-03','avatar-04','avatar-05','avatar-06',
    'avatar-07','avatar-08','avatar-09','avatar-10','avatar-11','avatar-12',
    'avatar-13','avatar-14','avatar-15','avatar-16','avatar-17','avatar-18',
    'avatar-19','avatar-20',
    'lion','fox','panda','tiger','koala','owl','frog','penguin','bear','rabbit','monkey','cat'
  ) then raise exception 'Invalid avatar'; end if;

  room_limit := case
    when target_room.game_slug = 'tylko-my' then 2
    when target_room.game_slug in ('zakrecone-haslo','akta-nocy') then 12
    else 14
  end;

  select count(*) into player_count
  from app_private.room_players
  where room_id = target_room.id;

  if player_count >= room_limit then raise exception 'Room is full'; end if;

  for attempt in 1..20 loop
    select string_agg(
      substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1),
      ''
    )
    into generated_recovery
    from generate_series(1, 6);

    begin
      insert into app_private.room_players(room_id, display_name, avatar, recovery_code)
      values(target_room.id, clean_name, p_avatar, generated_recovery)
      returning * into inserted_player;

      return query
      select inserted_player.id, inserted_player.player_token, inserted_player.display_name,
             inserted_player.avatar, inserted_player.team, inserted_player.ready;
      return;
    exception
      when unique_violation then
        if exists (
          select 1 from app_private.room_players
          where room_id = target_room.id
            and lower(display_name) = lower(clean_name)
        ) then
          raise exception 'Name already taken';
        end if;
    end;
  end loop;

  raise exception 'Could not allocate recovery code';
end;
$$;

create or replace function app_private.join_platform_room_account_internal(
  p_code text, p_display_name text, p_avatar text, p_partyplay_user_id uuid
)
returns table (
  id uuid, player_token uuid, display_name text, avatar text, team text, ready boolean
)
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room app_private.platform_rooms%rowtype;
  inserted_player app_private.room_players%rowtype;
  player_count integer;
  room_limit integer;
  clean_name text := trim(p_display_name);
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_recovery text;
  attempt integer;
begin
  if p_partyplay_user_id is null then
    raise exception 'PartyPlay account required';
  end if;

  select * into target_room
  from app_private.platform_rooms
  where code=upper(trim(p_code))
    and expires_at>now()
    and status='lobby'
  limit 1;

  if target_room.id is null then raise exception 'Room not found or not joinable'; end if;
  if char_length(clean_name)<1 or char_length(clean_name)>20 then raise exception 'Invalid name'; end if;

  if p_avatar not in (
    'avatar-01','avatar-02','avatar-03','avatar-04','avatar-05',
    'avatar-06','avatar-07','avatar-08','avatar-09','avatar-10',
    'avatar-11','avatar-12','avatar-13','avatar-14','avatar-15',
    'avatar-16','avatar-17','avatar-18','avatar-19','avatar-20',
    'lion','fox','panda','tiger','koala','owl','frog','penguin','bear','rabbit','monkey','cat'
  ) then raise exception 'Invalid avatar'; end if;

  if exists (
    select 1
    from app_private.room_players
    where room_id=target_room.id
      and partyplay_user_id=p_partyplay_user_id
  ) then
    raise exception 'PartyPlay account already joined';
  end if;

  room_limit := case
    when target_room.game_slug = 'tylko-my' then 2
    when target_room.game_slug in ('zakrecone-haslo','akta-nocy') then 12
    else 14
  end;

  select count(*) into player_count
  from app_private.room_players where room_id=target_room.id;
  if player_count>=room_limit then raise exception 'Room is full'; end if;

  for attempt in 1..20 loop
    select string_agg(
      substr(alphabet,1+floor(random()*length(alphabet))::integer,1),''
    )
    into generated_recovery
    from generate_series(1,6);

    begin
      insert into app_private.room_players(
        room_id,display_name,avatar,recovery_code,partyplay_user_id
      )
      values(
        target_room.id,clean_name,p_avatar,generated_recovery,p_partyplay_user_id
      )
      returning * into inserted_player;

      return query
      select inserted_player.id,inserted_player.player_token,inserted_player.display_name,
             inserted_player.avatar,inserted_player.team,inserted_player.ready;
      return;
    exception
      when unique_violation then
        if exists (
          select 1 from app_private.room_players
          where room_id=target_room.id and lower(display_name)=lower(clean_name)
        ) then
          raise exception 'Name already taken';
        end if;

        if exists (
          select 1 from app_private.room_players
          where room_id=target_room.id and partyplay_user_id=p_partyplay_user_id
        ) then
          raise exception 'PartyPlay account already joined';
        end if;
    end;
  end loop;

  raise exception 'Could not allocate recovery code';
end;
$$;

create or replace function app_private.start_platform_room_internal(
  p_code text, p_host_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room app_private.platform_rooms%rowtype;
  total_players integer;
  ready_players integer;
  unassigned_players integer;
  min_players integer;
  max_players integer;
begin
  select *
  into target_room
  from app_private.platform_rooms
  where code = upper(trim(p_code))
    and host_token = p_host_token
    and status = 'lobby'
    and expires_at > now()
  limit 1;

  if target_room.id is null then
    return false;
  end if;

  select
    count(*),
    count(*) filter (where ready),
    count(*) filter (where team is null)
  into total_players, ready_players, unassigned_players
  from app_private.room_players
  where room_id = target_room.id;

  if target_room.game_slug = 'tylko-my' then
    min_players := 2;
    max_players := 2;

    if total_players <> 2 or ready_players <> total_players then
      return false;
    end if;

    if not app_private.initialize_tm_game_internal(target_room.id) then
      raise exception 'Could not initialize Tylko My';
    end if;

    update app_private.platform_rooms
    set status = 'active', game_phase = 'playing'
    where id = target_room.id;

    return true;
  end if;

  if target_room.game_slug = 'zakrecone-haslo' then
    min_players := 3;
    max_players := 12;

    if total_players < min_players
       or total_players > max_players
       or ready_players <> total_players then
      return false;
    end if;

    update app_private.platform_rooms
    set status = 'active', game_phase = 'playing'
    where id = target_room.id;

    if not app_private.initialize_zh_game_internal(target_room.id) then
      raise exception 'Could not initialize Zakrecone Haslo';
    end if;

    return true;
  end if;

  if target_room.game_slug = 'pod-przykrywka' then
    min_players := 6;
    max_players := 14;

    if total_players < min_players
       or total_players > max_players
       or ready_players <> total_players then
      return false;
    end if;

    update app_private.platform_rooms
    set status='active', game_phase='briefing'
    where id=target_room.id;

    if not app_private.initialize_pp_game_internal(target_room.id) then
      raise exception 'Could not initialize Pod Przykrywka';
    end if;

    return true;
  end if;

  if target_room.game_slug = 'akta-nocy' then
    min_players := 5;
    max_players := 12;

    if total_players < min_players
       or total_players > max_players
       or ready_players <> total_players then
      return false;
    end if;

    if not app_private.initialize_akta_nocy_internal(target_room.id) then
      raise exception 'Could not initialize Akta Nocy';
    end if;

    update app_private.platform_rooms
    set status = 'active', game_phase = 'akta_osobowe'
    where id = target_room.id;

    return true;
  end if;

  if total_players < 4 or ready_players <> total_players or unassigned_players > 0 then
    return false;
  end if;

  update app_private.platform_rooms
  set
    status = 'active',
    game_phase = case
      when target_room.game_slug = 'co-ludzie-powiedza' then 'poznajmy_tlum'
      else game_phase
    end
  where id = target_room.id;

  return true;
end;
$$;
