-- Akta Nocy: rekonstrukcja nocy, zbieranie prywatnych teorii i wynik grupowy.

create table if not exists app_private.akta_nocy_reconstructions (
  room_id uuid not null references app_private.platform_rooms(id) on delete cascade,
  player_id uuid not null references app_private.room_players(id) on delete cascade,
  event_order text[] not null,
  suspect_player_id uuid not null references app_private.room_players(id) on delete cascade,
  motive_key text not null check (motive_key in ('career','financial','relationship','hotel')),
  coverup_key text not null check (coverup_key in ('scheduled_message','cctv_gap','door_lock','missing_drive')),
  submitted_at timestamptz not null default now(),
  primary key (room_id, player_id)
);

alter table app_private.akta_nocy_reconstructions enable row level security;
revoke all on table app_private.akta_nocy_reconstructions from public, anon, authenticated;

create or replace function app_private.get_akta_nocy_public_cast_internal(p_code text)
returns table (player_id uuid, display_name text, avatar text, role_key text)
language sql stable security definer
set search_path = app_private, pg_temp
as $$
  select p.id, p.display_name, p.avatar, a.role_key
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id = r.id
  join app_private.akta_nocy_assignments a
    on a.room_id = r.id and a.player_id = p.id
  where r.code = upper(trim(p_code))
    and r.game_slug = 'akta-nocy'
    and r.status = 'active'
    and r.expires_at > now()
  order by p.joined_at, p.id;
$$;

create or replace function app_private.get_akta_nocy_reconstruction_player_internal(
  p_code text,
  p_player_token uuid
)
returns table (
  submitted boolean,
  event_order text[],
  suspect_player_id uuid,
  motive_key text,
  coverup_key text
)
language sql stable security definer
set search_path = app_private, pg_temp
as $$
  select true, x.event_order, x.suspect_player_id, x.motive_key, x.coverup_key
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id = r.id
  join app_private.akta_nocy_reconstructions x
    on x.room_id = r.id and x.player_id = p.id
  where r.code = upper(trim(p_code))
    and r.game_slug = 'akta-nocy'
    and r.status = 'active'
    and r.expires_at > now()
    and p.player_token = p_player_token
  limit 1;
$$;

create or replace function app_private.get_akta_nocy_reconstruction_host_internal(
  p_code text,
  p_host_token uuid
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  submitted boolean,
  event_order text[],
  suspect_player_id uuid,
  motive_key text,
  coverup_key text
)
language sql stable security definer
set search_path = app_private, pg_temp
as $$
  select
    p.id,
    p.display_name,
    p.avatar,
    (x.player_id is not null),
    x.event_order,
    x.suspect_player_id,
    x.motive_key,
    x.coverup_key
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id = r.id
  left join app_private.akta_nocy_reconstructions x
    on x.room_id = r.id and x.player_id = p.id
  where r.code = upper(trim(p_code))
    and r.game_slug = 'akta-nocy'
    and r.status = 'active'
    and r.expires_at > now()
    and r.host_token = p_host_token
  order by p.joined_at, p.id;
$$;

create or replace function app_private.submit_akta_nocy_reconstruction_internal(
  p_code text,
  p_player_token uuid,
  p_event_order text[],
  p_suspect_player_id uuid,
  p_motive_key text,
  p_coverup_key text
)
returns boolean
language plpgsql security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room_id uuid;
  target_player_id uuid;
  event_key text;
begin
  select r.id, p.id
  into target_room_id, target_player_id
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id = r.id
  where r.code = upper(trim(p_code))
    and r.game_slug = 'akta-nocy'
    and r.status = 'active'
    and r.game_phase = 'rekonstrukcja'
    and r.expires_at > now()
    and p.player_token = p_player_token
  limit 1;

  if target_room_id is null or target_player_id is null then
    raise exception 'Room not found';
  end if;

  if coalesce(array_length(p_event_order, 1), 0) <> 7 then
    raise exception 'Invalid reconstruction';
  end if;

  if (select count(distinct e) from unnest(p_event_order) as t(e)) <> 7 then
    raise exception 'Invalid reconstruction';
  end if;

  foreach event_key in array p_event_order loop
    if event_key not in (
      'return_room','argument','fatal_confrontation','scheduled_message',
      'drive_removed','exit_room','message_sent','cctv_planned','investor_return'
    ) then
      raise exception 'Invalid reconstruction';
    end if;
  end loop;

  if not exists (
    select 1 from app_private.room_players
    where room_id = target_room_id and id = p_suspect_player_id
  ) then
    raise exception 'Invalid suspect';
  end if;

  if p_motive_key not in ('career','financial','relationship','hotel') then
    raise exception 'Invalid motive';
  end if;

  if p_coverup_key not in ('scheduled_message','cctv_gap','door_lock','missing_drive') then
    raise exception 'Invalid coverup';
  end if;

  insert into app_private.akta_nocy_reconstructions (
    room_id, player_id, event_order, suspect_player_id,
    motive_key, coverup_key, submitted_at
  )
  values (
    target_room_id, target_player_id, p_event_order, p_suspect_player_id,
    p_motive_key, p_coverup_key, now()
  )
  on conflict (room_id, player_id)
  do update set
    event_order = excluded.event_order,
    suspect_player_id = excluded.suspect_player_id,
    motive_key = excluded.motive_key,
    coverup_key = excluded.coverup_key,
    submitted_at = now();

  return true;
end;
$$;

create or replace function public.get_akta_nocy_public_cast(p_code text)
returns table (player_id uuid, display_name text, avatar text, role_key text)
language sql stable
set search_path = public, app_private, pg_temp
as $$ select * from app_private.get_akta_nocy_public_cast_internal(p_code); $$;

create or replace function public.get_akta_nocy_reconstruction_player(
  p_code text,
  p_player_token uuid
)
returns table (
  submitted boolean,
  event_order text[],
  suspect_player_id uuid,
  motive_key text,
  coverup_key text
)
language sql stable
set search_path = public, app_private, pg_temp
as $$
  select * from app_private.get_akta_nocy_reconstruction_player_internal(
    p_code, p_player_token
  );
$$;

create or replace function public.get_akta_nocy_reconstruction_host(
  p_code text,
  p_host_token uuid
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  submitted boolean,
  event_order text[],
  suspect_player_id uuid,
  motive_key text,
  coverup_key text
)
language sql stable
set search_path = public, app_private, pg_temp
as $$
  select * from app_private.get_akta_nocy_reconstruction_host_internal(
    p_code, p_host_token
  );
$$;

create or replace function public.submit_akta_nocy_reconstruction(
  p_code text,
  p_player_token uuid,
  p_event_order text[],
  p_suspect_player_id uuid,
  p_motive_key text,
  p_coverup_key text
)
returns boolean
language sql
set search_path = public, app_private, pg_temp
as $$
  select app_private.submit_akta_nocy_reconstruction_internal(
    p_code, p_player_token, p_event_order, p_suspect_player_id,
    p_motive_key, p_coverup_key
  );
$$;

revoke execute on function public.get_akta_nocy_public_cast(text) from public;
revoke execute on function public.get_akta_nocy_reconstruction_player(text, uuid) from public;
revoke execute on function public.get_akta_nocy_reconstruction_host(text, uuid) from public;
revoke execute on function public.submit_akta_nocy_reconstruction(text, uuid, text[], uuid, text, text) from public;

grant execute on function public.get_akta_nocy_public_cast(text) to anon, authenticated;
grant execute on function public.get_akta_nocy_reconstruction_player(text, uuid) to anon, authenticated;
grant execute on function public.get_akta_nocy_reconstruction_host(text, uuid) to anon, authenticated;
grant execute on function public.submit_akta_nocy_reconstruction(text, uuid, text[], uuid, text, text) to anon, authenticated;

create or replace function app_private.advance_akta_nocy_phase_internal(
  p_code text,
  p_host_token uuid
)
returns text
language plpgsql security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room app_private.platform_rooms%rowtype;
  total_players integer;
  opened_dossiers integer;
  submitted_reconstructions integer;
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

    update app_private.platform_rooms set game_phase = 'pierwsze_zeznania'
    where id = target_room.id;
    return 'pierwsze_zeznania';
  end if;

  if target_room.game_phase = 'pierwsze_zeznania' then
    update app_private.platform_rooms set game_phase = 'dowody_a_1'
    where id = target_room.id;
    return 'dowody_a_1';
  end if;

  if target_room.game_phase = 'dowody_a_4' then
    update app_private.platform_rooms set game_phase = 'przesluchania_a'
    where id = target_room.id;
    return 'przesluchania_a';
  end if;

  if target_room.game_phase = 'przesluchania_a' then
    update app_private.platform_rooms set game_phase = 'dowody_b_1'
    where id = target_room.id;
    return 'dowody_b_1';
  end if;

  if target_room.game_phase = 'dowody_b_5' then
    update app_private.platform_rooms set game_phase = 'rekonstrukcja'
    where id = target_room.id;
    return 'rekonstrukcja';
  end if;

  if target_room.game_phase = 'rekonstrukcja' then
    select count(*) into total_players
    from app_private.room_players
    where room_id = target_room.id;

    select count(*) into submitted_reconstructions
    from app_private.akta_nocy_reconstructions
    where room_id = target_room.id;

    if submitted_reconstructions <> total_players then
      raise exception 'Reconstructions not ready';
    end if;

    update app_private.platform_rooms set game_phase = 'rekonstrukcja_wynik'
    where id = target_room.id;
    return 'rekonstrukcja_wynik';
  end if;

  if target_room.game_phase = 'rekonstrukcja_wynik' then
    return target_room.game_phase;
  end if;

  raise exception 'Invalid phase';
end;
$$;
