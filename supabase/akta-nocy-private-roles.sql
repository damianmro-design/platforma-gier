-- Akta Nocy: trwały przydział postaci, prywatne akta i przejście do pierwszych zeznań.

create table if not exists app_private.akta_nocy_assignments (
  room_id uuid not null references app_private.platform_rooms(id) on delete cascade,
  player_id uuid not null references app_private.room_players(id) on delete cascade,
  role_key text not null check (role_key in (
    'manager','technician','partner','reporter','investor',
    'waitress','security','lawyer','photographer','doctor','assistant','guest'
  )),
  dossier_opened_at timestamptz null,
  assigned_at timestamptz not null default now(),
  primary key (room_id, player_id),
  unique (room_id, role_key)
);

alter table app_private.akta_nocy_assignments enable row level security;
revoke all on table app_private.akta_nocy_assignments from public, anon, authenticated;

create or replace function app_private.initialize_akta_nocy_internal(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room app_private.platform_rooms%rowtype;
  total_players integer;
  existing_assignments integer;
begin
  select * into target_room
  from app_private.platform_rooms
  where id = p_room_id and game_slug = 'akta-nocy'
  limit 1;

  if target_room.id is null then return false; end if;

  select count(*) into total_players
  from app_private.room_players
  where room_id = p_room_id;

  if total_players < 5 or total_players > 12 then return false; end if;

  select count(*) into existing_assignments
  from app_private.akta_nocy_assignments
  where room_id = p_room_id;

  if existing_assignments = total_players then return true; end if;

  delete from app_private.akta_nocy_assignments where room_id = p_room_id;

  with selected_roles as (
    select role_key, row_number() over (order by random()) as rn
    from unnest(array[
      'manager','technician','partner','reporter','investor',
      'waitress','security','lawyer','photographer','doctor','assistant','guest'
    ]::text[]) with ordinality as roles(role_key, ord)
    where ord <= total_players
  ),
  randomized_players as (
    select id as player_id, row_number() over (order by random()) as rn
    from app_private.room_players
    where room_id = p_room_id
  )
  insert into app_private.akta_nocy_assignments (room_id, player_id, role_key)
  select p_room_id, p.player_id, r.role_key
  from randomized_players p
  join selected_roles r using (rn);

  return (
    select count(*) = total_players
    from app_private.akta_nocy_assignments
    where room_id = p_room_id
  );
end;
$$;

create or replace function app_private.get_akta_nocy_player_assignment_internal(
  p_code text,
  p_player_token uuid
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  role_key text,
  dossier_opened boolean
)
language sql
stable
security definer
set search_path = app_private, pg_temp
as $$
  select
    p.id,
    p.display_name,
    p.avatar,
    a.role_key,
    (a.dossier_opened_at is not null)
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id = r.id
  join app_private.akta_nocy_assignments a
    on a.room_id = r.id and a.player_id = p.id
  where r.code = upper(trim(p_code))
    and r.game_slug = 'akta-nocy'
    and r.status = 'active'
    and r.expires_at > now()
    and p.player_token = p_player_token
  limit 1;
$$;

create or replace function app_private.get_akta_nocy_host_progress_internal(
  p_code text,
  p_host_token uuid
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  dossier_opened boolean
)
language sql
stable
security definer
set search_path = app_private, pg_temp
as $$
  select
    p.id,
    p.display_name,
    p.avatar,
    (a.dossier_opened_at is not null)
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id = r.id
  left join app_private.akta_nocy_assignments a
    on a.room_id = r.id and a.player_id = p.id
  where r.code = upper(trim(p_code))
    and r.game_slug = 'akta-nocy'
    and r.status = 'active'
    and r.expires_at > now()
    and r.host_token = p_host_token
  order by p.joined_at, p.id;
$$;

create or replace function app_private.open_akta_nocy_dossier_internal(
  p_code text,
  p_player_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room_id uuid;
  target_player_id uuid;
begin
  select r.id, p.id
  into target_room_id, target_player_id
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id = r.id
  where r.code = upper(trim(p_code))
    and r.game_slug = 'akta-nocy'
    and r.status = 'active'
    and r.expires_at > now()
    and p.player_token = p_player_token
  limit 1;

  if target_room_id is null or target_player_id is null then return false; end if;

  update app_private.akta_nocy_assignments
  set dossier_opened_at = coalesce(dossier_opened_at, now())
  where room_id = target_room_id and player_id = target_player_id;

  return found;
end;
$$;

create or replace function app_private.advance_akta_nocy_phase_internal(
  p_code text,
  p_host_token uuid
)
returns text
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room app_private.platform_rooms%rowtype;
  total_players integer;
  opened_dossiers integer;
begin
  select * into target_room
  from app_private.platform_rooms
  where code = upper(trim(p_code))
    and game_slug = 'akta-nocy'
    and status = 'active'
    and expires_at > now()
    and host_token = p_host_token
  limit 1;

  if target_room.id is null then raise exception 'Room not found'; end if;
  if target_room.game_phase = 'pierwsze_zeznania' then return target_room.game_phase; end if;
  if target_room.game_phase <> 'akta_osobowe' then raise exception 'Invalid phase'; end if;

  select
    count(*),
    count(*) filter (where a.dossier_opened_at is not null)
  into total_players, opened_dossiers
  from app_private.room_players p
  left join app_private.akta_nocy_assignments a
    on a.room_id = p.room_id and a.player_id = p.id
  where p.room_id = target_room.id;

  if total_players < 5 or opened_dossiers <> total_players then
    raise exception 'Dossiers not ready';
  end if;

  update app_private.platform_rooms
  set game_phase = 'pierwsze_zeznania'
  where id = target_room.id;

  return 'pierwsze_zeznania';
end;
$$;

create or replace function public.get_akta_nocy_player_assignment(p_code text, p_player_token uuid)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  role_key text,
  dossier_opened boolean
)
language sql
stable
set search_path = public, app_private, pg_temp
as $$
  select * from app_private.get_akta_nocy_player_assignment_internal(p_code, p_player_token);
$$;

create or replace function public.get_akta_nocy_host_progress(p_code text, p_host_token uuid)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  dossier_opened boolean
)
language sql
stable
set search_path = public, app_private, pg_temp
as $$
  select * from app_private.get_akta_nocy_host_progress_internal(p_code, p_host_token);
$$;

create or replace function public.open_akta_nocy_dossier(p_code text, p_player_token uuid)
returns boolean
language sql
set search_path = public, app_private, pg_temp
as $$
  select app_private.open_akta_nocy_dossier_internal(p_code, p_player_token);
$$;

create or replace function public.advance_akta_nocy_phase(p_code text, p_host_token uuid)
returns text
language sql
set search_path = public, app_private, pg_temp
as $$
  select app_private.advance_akta_nocy_phase_internal(p_code, p_host_token);
$$;

revoke execute on function public.get_akta_nocy_player_assignment(text, uuid) from public;
revoke execute on function public.get_akta_nocy_host_progress(text, uuid) from public;
revoke execute on function public.open_akta_nocy_dossier(text, uuid) from public;
revoke execute on function public.advance_akta_nocy_phase(text, uuid) from public;

grant execute on function public.get_akta_nocy_player_assignment(text, uuid) to anon, authenticated;
grant execute on function public.get_akta_nocy_host_progress(text, uuid) to anon, authenticated;
grant execute on function public.open_akta_nocy_dossier(text, uuid) to anon, authenticated;
grant execute on function public.advance_akta_nocy_phase(text, uuid) to anon, authenticated;

create or replace function app_private.start_platform_room_internal(p_code text, p_host_token uuid)
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
  select * into target_room
  from app_private.platform_rooms
  where code = upper(trim(p_code))
    and host_token = p_host_token
    and status = 'lobby'
    and expires_at > now()
  limit 1;

  if target_room.id is null then return false; end if;

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
    if total_players < min_players or total_players > max_players or ready_players <> total_players then return false; end if;

    update app_private.platform_rooms set status = 'active', game_phase = 'playing' where id = target_room.id;
    if not app_private.initialize_zh_game_internal(target_room.id) then raise exception 'Could not initialize Zakrecone Haslo'; end if;
    return true;
  end if;

  if target_room.game_slug = 'pod-przykrywka' then
    min_players := 6;
    max_players := 14;
    if total_players < min_players or total_players > max_players or ready_players <> total_players then return false; end if;

    update app_private.platform_rooms set status='active', game_phase='briefing' where id=target_room.id;
    if not app_private.initialize_pp_game_internal(target_room.id) then raise exception 'Could not initialize Pod Przykrywka'; end if;
    return true;
  end if;

  if target_room.game_slug = 'akta-nocy' then
    min_players := 5;
    max_players := 12;
    if total_players < min_players or total_players > max_players or ready_players <> total_players then return false; end if;

    if not app_private.initialize_akta_nocy_internal(target_room.id) then
      raise exception 'Could not initialize Akta Nocy';
    end if;

    update app_private.platform_rooms
    set status = 'active', game_phase = 'akta_osobowe'
    where id = target_room.id;

    return true;
  end if;

  if total_players < 4 or ready_players <> total_players or unassigned_players > 0 then return false; end if;

  update app_private.platform_rooms
  set status = 'active',
      game_phase = case when target_room.game_slug = 'co-ludzie-powiedza' then 'poznajmy_tlum' else game_phase end
  where id = target_room.id;

  return true;
end;
$$;
