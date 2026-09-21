-- Akta Nocy: enable room creation and a no-team lobby for 5-12 players.
-- Safe to apply after the existing PartyPlay lobby/game migrations.

alter table app_private.platform_rooms
  drop constraint if exists platform_rooms_game_slug_check;

alter table app_private.platform_rooms
  add constraint platform_rooms_game_slug_check
  check (game_slug in (
    'co-ludzie-powiedza',
    'zakrecone-haslo',
    'pod-przykrywka',
    'akta-nocy'
  ));

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
  if p_game_slug not in ('co-ludzie-powiedza','zakrecone-haslo','pod-przykrywka','akta-nocy') then
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
  p_code text,
  p_display_name text,
  p_avatar text
)
returns table (
  id uuid,
  player_token uuid,
  display_name text,
  avatar text,
  team text,
  ready boolean
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
    'lion','fox','panda','tiger','koala','owl',
    'frog','penguin','bear','rabbit','monkey','cat'
  ) then raise exception 'Invalid avatar'; end if;

  room_limit := case
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
      select
        inserted_player.id,
        inserted_player.player_token,
        inserted_player.display_name,
        inserted_player.avatar,
        inserted_player.team,
        inserted_player.ready;
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

create or replace function app_private.start_platform_room_internal(
  p_code text,
  p_host_token uuid
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
    set status = 'active', game_phase = 'briefing'
    where id = target_room.id;

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
