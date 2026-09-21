-- Akta Nocy: prywatny Akt Oskarżenia i 4-etapowe Ujawnienie.

create table if not exists app_private.akta_nocy_accusations (
  room_id uuid not null references app_private.platform_rooms(id) on delete cascade,
  player_id uuid not null references app_private.room_players(id) on delete cascade,
  suspect_player_id uuid not null references app_private.room_players(id) on delete cascade,
  motive_key text not null check (motive_key in ('career','financial','relationship','hotel')),
  evidence_id text not null check (evidence_id in (
    'monitoring-gap','door-log','late-message','missing-drive',
    'scheduled-message','mirror-photo','hallway-audio','medical-window','wicher-file'
  )),
  submitted_at timestamptz not null default now(),
  primary key (room_id, player_id)
);

alter table app_private.akta_nocy_accusations enable row level security;
revoke all on table app_private.akta_nocy_accusations from public, anon, authenticated;

create or replace function app_private.submit_akta_nocy_accusation_internal(
  p_code text,
  p_player_token uuid,
  p_suspect_player_id uuid,
  p_motive_key text,
  p_evidence_id text
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
    and r.game_phase = 'akt_oskarzenia'
    and r.expires_at > now()
    and p.player_token = p_player_token
  limit 1;

  if target_room_id is null or target_player_id is null then
    raise exception 'Room not found';
  end if;

  if exists (
    select 1 from app_private.akta_nocy_accusations
    where room_id = target_room_id and player_id = target_player_id
  ) then
    raise exception 'Accusation locked';
  end if;

  if not exists (
    select 1 from app_private.room_players
    where room_id = target_room_id and id = p_suspect_player_id
  ) then
    raise exception 'Invalid suspect';
  end if;

  if p_motive_key not in ('career','financial','relationship','hotel') then
    raise exception 'Invalid motive';
  end if;

  if p_evidence_id not in (
    'monitoring-gap','door-log','late-message','missing-drive',
    'scheduled-message','mirror-photo','hallway-audio','medical-window','wicher-file'
  ) then
    raise exception 'Invalid evidence';
  end if;

  insert into app_private.akta_nocy_accusations (
    room_id, player_id, suspect_player_id, motive_key, evidence_id
  )
  values (
    target_room_id, target_player_id, p_suspect_player_id, p_motive_key, p_evidence_id
  );

  return true;
end;
$$;

create or replace function app_private.get_akta_nocy_accusation_player_internal(
  p_code text,
  p_player_token uuid
)
returns table (
  submitted boolean,
  suspect_player_id uuid,
  motive_key text,
  evidence_id text
)
language sql
stable
security definer
set search_path = app_private, pg_temp
as $$
  select true, a.suspect_player_id, a.motive_key, a.evidence_id
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id = r.id
  join app_private.akta_nocy_accusations a
    on a.room_id = r.id and a.player_id = p.id
  where r.code = upper(trim(p_code))
    and r.game_slug = 'akta-nocy'
    and r.status = 'active'
    and r.expires_at > now()
    and p.player_token = p_player_token
  limit 1;
$$;

create or replace function app_private.get_akta_nocy_accusation_progress_internal(
  p_code text,
  p_host_token uuid
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  submitted boolean
)
language sql
stable
security definer
set search_path = app_private, pg_temp
as $$
  select p.id, p.display_name, p.avatar, (a.player_id is not null)
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id = r.id
  left join app_private.akta_nocy_accusations a
    on a.room_id = r.id and a.player_id = p.id
  where r.code = upper(trim(p_code))
    and r.game_slug = 'akta-nocy'
    and r.status = 'active'
    and r.expires_at > now()
    and r.host_token = p_host_token
  order by p.joined_at, p.id;
$$;

create or replace function app_private.get_akta_nocy_accusation_results_internal(
  p_code text,
  p_host_token uuid
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  suspect_player_id uuid,
  motive_key text,
  evidence_id text
)
language sql
stable
security definer
set search_path = app_private, pg_temp
as $$
  select p.id, p.display_name, p.avatar,
         a.suspect_player_id, a.motive_key, a.evidence_id
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id = r.id
  join app_private.akta_nocy_accusations a
    on a.room_id = r.id and a.player_id = p.id
  where r.code = upper(trim(p_code))
    and r.game_slug = 'akta-nocy'
    and r.status = 'active'
    and r.expires_at > now()
    and r.host_token = p_host_token
    and r.game_phase in (
      'ujawnienie_1','ujawnienie_2','ujawnienie_3','ujawnienie_4'
    )
  order by p.joined_at, p.id;
$$;

create or replace function public.submit_akta_nocy_accusation(
  p_code text,
  p_player_token uuid,
  p_suspect_player_id uuid,
  p_motive_key text,
  p_evidence_id text
)
returns boolean
language sql
set search_path = public, app_private, pg_temp
as $$
  select app_private.submit_akta_nocy_accusation_internal(
    p_code, p_player_token, p_suspect_player_id, p_motive_key, p_evidence_id
  );
$$;

create or replace function public.get_akta_nocy_accusation_player(
  p_code text,
  p_player_token uuid
)
returns table (
  submitted boolean,
  suspect_player_id uuid,
  motive_key text,
  evidence_id text
)
language sql
stable
set search_path = public, app_private, pg_temp
as $$
  select * from app_private.get_akta_nocy_accusation_player_internal(
    p_code, p_player_token
  );
$$;

create or replace function public.get_akta_nocy_accusation_progress(
  p_code text,
  p_host_token uuid
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  submitted boolean
)
language sql
stable
set search_path = public, app_private, pg_temp
as $$
  select * from app_private.get_akta_nocy_accusation_progress_internal(
    p_code, p_host_token
  );
$$;

create or replace function public.get_akta_nocy_accusation_results(
  p_code text,
  p_host_token uuid
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  suspect_player_id uuid,
  motive_key text,
  evidence_id text
)
language sql
stable
set search_path = public, app_private, pg_temp
as $$
  select * from app_private.get_akta_nocy_accusation_results_internal(
    p_code, p_host_token
  );
$$;

revoke execute on function public.submit_akta_nocy_accusation(text, uuid, uuid, text, text) from public;
revoke execute on function public.get_akta_nocy_accusation_player(text, uuid) from public;
revoke execute on function public.get_akta_nocy_accusation_progress(text, uuid) from public;
revoke execute on function public.get_akta_nocy_accusation_results(text, uuid) from public;

grant execute on function public.submit_akta_nocy_accusation(text, uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.get_akta_nocy_accusation_player(text, uuid) to anon, authenticated;
grant execute on function public.get_akta_nocy_accusation_progress(text, uuid) to anon, authenticated;
grant execute on function public.get_akta_nocy_accusation_results(text, uuid) to anon, authenticated;

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
  submitted_reconstructions integer;
  submitted_accusations integer;
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
    select count(*), count(*) filter (where a.dossier_opened_at is not null)
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
    update app_private.platform_rooms set game_phase = 'akt_oskarzenia'
    where id = target_room.id;
    return 'akt_oskarzenia';
  end if;

  if target_room.game_phase = 'akt_oskarzenia' then
    select count(*) into total_players
    from app_private.room_players
    where room_id = target_room.id;

    select count(*) into submitted_accusations
    from app_private.akta_nocy_accusations
    where room_id = target_room.id;

    if submitted_accusations <> total_players then
      raise exception 'Accusations not ready';
    end if;

    update app_private.platform_rooms set game_phase = 'ujawnienie_1'
    where id = target_room.id;
    return 'ujawnienie_1';
  end if;

  if target_room.game_phase = 'ujawnienie_1' then
    update app_private.platform_rooms set game_phase = 'ujawnienie_2'
    where id = target_room.id;
    return 'ujawnienie_2';
  end if;

  if target_room.game_phase = 'ujawnienie_2' then
    update app_private.platform_rooms set game_phase = 'ujawnienie_3'
    where id = target_room.id;
    return 'ujawnienie_3';
  end if;

  if target_room.game_phase = 'ujawnienie_3' then
    update app_private.platform_rooms set game_phase = 'ujawnienie_4'
    where id = target_room.id;
    return 'ujawnienie_4';
  end if;

  if target_room.game_phase = 'ujawnienie_4' then
    return target_room.game_phase;
  end if;

  raise exception 'Invalid phase';
end;
$$;
