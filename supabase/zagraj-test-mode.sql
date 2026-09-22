-- zaGRAj test rooms and full abstract-avatar support.
-- Applied to Supabase project platforma-gier (glcjetxskjnlbeegirln).

alter table app_private.platform_rooms
  add column if not exists is_test boolean not null default false;

alter table app_private.room_players
  add column if not exists is_bot boolean not null default false;

create or replace function app_private.prepare_test_room_internal(
  p_code text,
  p_host_token uuid,
  p_bot_count integer
)
returns boolean
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room app_private.platform_rooms%rowtype;
  i integer;
  bot_name text;
  bot_avatar text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  recovery text;
begin
  if p_bot_count < 0 or p_bot_count > 13 then
    raise exception 'Invalid bot count';
  end if;

  select * into target_room
  from app_private.platform_rooms
  where code = upper(trim(p_code))
    and host_token = p_host_token
    and status = 'lobby'
    and expires_at > now()
  limit 1;

  if target_room.id is null then return false; end if;

  update app_private.platform_rooms set is_test = true where id = target_room.id;

  for i in 1..p_bot_count loop
    bot_name := 'Tester ' || i;
    bot_avatar := 'avatar-0' || (((i - 1) % 6) + 1)::text;

    select string_agg(
      substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1),
      ''
    )
    into recovery
    from generate_series(1, 6);

    insert into app_private.room_players(
      room_id, display_name, avatar, recovery_code, ready, is_bot
    )
    values(target_room.id, bot_name, bot_avatar, recovery, true, true)
    on conflict do nothing;
  end loop;

  return true;
end;
$$;

create or replace function public.prepare_test_room(
  p_code text, p_host_token uuid, p_bot_count integer
)
returns boolean
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.prepare_test_room_internal(p_code,p_host_token,p_bot_count);
$$;

revoke all on function public.prepare_test_room(text,uuid,integer) from public;
grant execute on function public.prepare_test_room(text,uuid,integer) to anon, authenticated;

create or replace function app_private.get_test_player_token_internal(
  p_code text, p_host_token uuid, p_player_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = app_private, pg_temp
as $$
  select rp.player_token
  from app_private.platform_rooms r
  join app_private.room_players rp on rp.room_id = r.id
  where r.code = upper(trim(p_code))
    and r.host_token = p_host_token
    and r.is_test = true
    and rp.id = p_player_id
  limit 1;
$$;

create or replace function public.get_test_player_token(
  p_code text, p_host_token uuid, p_player_id uuid
)
returns uuid
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.get_test_player_token_internal(p_code,p_host_token,p_player_id);
$$;

revoke all on function public.get_test_player_token(text,uuid,uuid) from public;
grant execute on function public.get_test_player_token(text,uuid,uuid) to anon, authenticated;

create or replace function app_private.is_test_room_host_internal(
  p_code text, p_host_token uuid
)
returns boolean
language sql
stable
security definer
set search_path = app_private, pg_temp
as $$
  select exists(
    select 1
    from app_private.platform_rooms r
    where r.code = upper(trim(p_code))
      and r.host_token = p_host_token
      and r.is_test = true
      and r.expires_at > now()
  );
$$;

create or replace function public.is_test_room_host(
  p_code text, p_host_token uuid
)
returns boolean
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.is_test_room_host_internal(p_code,p_host_token);
$$;

revoke all on function public.is_test_room_host(text,uuid) from public;
grant execute on function public.is_test_room_host(text,uuid) to anon, authenticated;

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
