-- Akta Nocy, Paczka Dowodowa B.

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
    update app_private.platform_rooms
    set game_phase = 'dowody_b_1'
    where id = target_room.id;
    return 'dowody_b_1';
  end if;

  if target_room.game_phase = 'dowody_b_5' then
    return target_room.game_phase;
  end if;

  raise exception 'Invalid phase';
end;
$$;

create or replace function app_private.reveal_akta_nocy_evidence_b_internal(
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
    when 'dowody_b_1' then 'dowody_b_2'
    when 'dowody_b_2' then 'dowody_b_3'
    when 'dowody_b_3' then 'dowody_b_4'
    when 'dowody_b_4' then 'dowody_b_5'
    when 'dowody_b_5' then 'dowody_b_5'
    else null
  end;

  if next_phase is null then raise exception 'Invalid phase'; end if;

  update app_private.platform_rooms
  set game_phase = next_phase
  where id = target_room.id;

  return next_phase;
end;
$$;

create or replace function public.reveal_akta_nocy_evidence_b(
  p_code text,
  p_host_token uuid
)
returns text
language sql
set search_path = public, app_private, pg_temp
as $$
  select app_private.reveal_akta_nocy_evidence_b_internal(p_code, p_host_token);
$$;

revoke execute on function public.reveal_akta_nocy_evidence_b(text, uuid) from public;
grant execute on function public.reveal_akta_nocy_evidence_b(text, uuid) to anon, authenticated;
