-- Akta Nocy, Paczka Dowodowa A i pierwsze przesłuchania.

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

  if target_room.game_phase = 'akta_osobowe' then
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
  end if;

  if target_room.game_phase = 'pierwsze_zeznania' then
    update app_private.platform_rooms
    set game_phase = 'dowody_a_1'
    where id = target_room.id;

    return 'dowody_a_1';
  end if;

  if target_room.game_phase = 'dowody_a_4' then
    update app_private.platform_rooms
    set game_phase = 'przesluchania_a'
    where id = target_room.id;

    return 'przesluchania_a';
  end if;

  if target_room.game_phase = 'przesluchania_a' then
    return target_room.game_phase;
  end if;

  raise exception 'Invalid phase';
end;
$$;

create or replace function app_private.reveal_akta_nocy_evidence_a_internal(
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
  next_phase text;
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

  next_phase := case target_room.game_phase
    when 'dowody_a_1' then 'dowody_a_2'
    when 'dowody_a_2' then 'dowody_a_3'
    when 'dowody_a_3' then 'dowody_a_4'
    when 'dowody_a_4' then 'dowody_a_4'
    else null
  end;

  if next_phase is null then raise exception 'Invalid phase'; end if;

  update app_private.platform_rooms
  set game_phase = next_phase
  where id = target_room.id;

  return next_phase;
end;
$$;

create or replace function app_private.get_akta_nocy_host_interrogations_internal(
  p_code text,
  p_host_token uuid
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  role_key text
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
    a.role_key
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id = r.id
  join app_private.akta_nocy_assignments a
    on a.room_id = r.id and a.player_id = p.id
  where r.code = upper(trim(p_code))
    and r.game_slug = 'akta-nocy'
    and r.status = 'active'
    and r.expires_at > now()
    and r.host_token = p_host_token
    and r.game_phase = 'przesluchania_a'
  order by p.joined_at, p.id;
$$;

create or replace function public.reveal_akta_nocy_evidence_a(
  p_code text,
  p_host_token uuid
)
returns text
language sql
set search_path = public, app_private, pg_temp
as $$
  select app_private.reveal_akta_nocy_evidence_a_internal(p_code, p_host_token);
$$;

create or replace function public.get_akta_nocy_host_interrogations(
  p_code text,
  p_host_token uuid
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  role_key text
)
language sql
stable
set search_path = public, app_private, pg_temp
as $$
  select * from app_private.get_akta_nocy_host_interrogations_internal(p_code, p_host_token);
$$;

revoke execute on function public.reveal_akta_nocy_evidence_a(text, uuid) from public;
revoke execute on function public.get_akta_nocy_host_interrogations(text, uuid) from public;

grant execute on function public.reveal_akta_nocy_evidence_a(text, uuid) to anon, authenticated;
grant execute on function public.get_akta_nocy_host_interrogations(text, uuid) to anon, authenticated;
