-- Akta Nocy: automatyczne ruchy botów w trybie testowym.

create or replace function app_private.run_akta_nocy_test_bots_internal(
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
  bot_player app_private.room_players%rowtype;
  culprit_player_id uuid;
  fallback_player_id uuid;
  bot_number integer := 1;
  event_order text[];
  motive_key text;
  coverup_key text;
  evidence_id text;
  suspect_player_id uuid;
begin
  select * into target_room
  from app_private.platform_rooms
  where code = upper(trim(p_code))
    and host_token = p_host_token
    and game_slug = 'akta-nocy'
    and is_test = true
    and status = 'active'
    and expires_at > now()
  limit 1;

  if target_room.id is null then
    return 'not_test';
  end if;

  if target_room.game_phase = 'akta_osobowe' then
    select p.* into bot_player
    from app_private.room_players p
    join app_private.akta_nocy_assignments a
      on a.room_id = p.room_id
     and a.player_id = p.id
    where p.room_id = target_room.id
      and p.is_bot = true
      and a.dossier_opened_at is null
    order by p.joined_at, p.id
    limit 1;

    if bot_player.id is null then return 'idle'; end if;

    update app_private.akta_nocy_assignments
    set dossier_opened_at = now()
    where room_id = target_room.id
      and player_id = bot_player.id;

    return 'dossier_opened';
  end if;

  select a.player_id into culprit_player_id
  from app_private.akta_nocy_assignments a
  where a.room_id = target_room.id
    and a.role_key = 'reporter'
  limit 1;

  select p.id into fallback_player_id
  from app_private.room_players p
  join app_private.akta_nocy_assignments a
    on a.room_id = p.room_id
   and a.player_id = p.id
  where p.room_id = target_room.id
    and a.role_key <> 'reporter'
  order by p.joined_at, p.id
  limit 1;

  if target_room.game_phase = 'rekonstrukcja' then
    select p.* into bot_player
    from app_private.room_players p
    left join app_private.akta_nocy_reconstructions r
      on r.room_id = p.room_id
     and r.player_id = p.id
    where p.room_id = target_room.id
      and p.is_bot = true
      and r.player_id is null
    order by p.joined_at, p.id
    limit 1;

    if bot_player.id is null then return 'idle'; end if;

    select count(*) + 1 into bot_number
    from app_private.room_players p
    where p.room_id = target_room.id
      and p.is_bot = true
      and p.joined_at < bot_player.joined_at;

    if bot_number % 3 = 1 then
      event_order := array[
        'return_room','argument','fatal_confrontation','scheduled_message',
        'drive_removed','exit_room','message_sent'
      ];
      suspect_player_id := culprit_player_id;
      motive_key := 'career';
      coverup_key := 'scheduled_message';
    elsif bot_number % 3 = 2 then
      event_order := array[
        'return_room','investor_return','argument','fatal_confrontation',
        'drive_removed','exit_room','message_sent'
      ];
      suspect_player_id := coalesce(fallback_player_id, culprit_player_id);
      motive_key := 'financial';
      coverup_key := 'cctv_gap';
    else
      event_order := array[
        'return_room','argument','cctv_planned','fatal_confrontation',
        'scheduled_message','exit_room','message_sent'
      ];
      suspect_player_id := culprit_player_id;
      motive_key := 'career';
      coverup_key := 'missing_drive';
    end if;

    insert into app_private.akta_nocy_reconstructions(
      room_id, player_id, event_order, suspect_player_id,
      motive_key, coverup_key, submitted_at
    )
    values(
      target_room.id, bot_player.id, event_order, suspect_player_id,
      motive_key, coverup_key, now()
    )
    on conflict (room_id, player_id) do nothing;

    return 'reconstruction_submitted';
  end if;

  if target_room.game_phase = 'akt_oskarzenia' then
    select p.* into bot_player
    from app_private.room_players p
    left join app_private.akta_nocy_accusations a
      on a.room_id = p.room_id
     and a.player_id = p.id
    where p.room_id = target_room.id
      and p.is_bot = true
      and a.player_id is null
    order by p.joined_at, p.id
    limit 1;

    if bot_player.id is null then return 'idle'; end if;

    select count(*) + 1 into bot_number
    from app_private.room_players p
    where p.room_id = target_room.id
      and p.is_bot = true
      and p.joined_at < bot_player.joined_at;

    if bot_number % 3 = 1 then
      suspect_player_id := culprit_player_id;
      motive_key := 'career';
      evidence_id := 'wicher-file';
    elsif bot_number % 3 = 2 then
      suspect_player_id := coalesce(fallback_player_id, culprit_player_id);
      motive_key := 'financial';
      evidence_id := 'monitoring-gap';
    else
      suspect_player_id := culprit_player_id;
      motive_key := 'career';
      evidence_id := 'mirror-photo';
    end if;

    insert into app_private.akta_nocy_accusations(
      room_id, player_id, suspect_player_id, motive_key, evidence_id, submitted_at
    )
    values(
      target_room.id, bot_player.id, suspect_player_id, motive_key, evidence_id, now()
    )
    on conflict (room_id, player_id) do nothing;

    return 'accusation_submitted';
  end if;

  return 'idle';
end;
$$;

create or replace function public.run_akta_nocy_test_bots(
  p_code text,
  p_host_token uuid
)
returns text
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.run_akta_nocy_test_bots_internal(p_code, p_host_token);
$$;

revoke all on function public.run_akta_nocy_test_bots(text,uuid) from public;
grant execute on function public.run_akta_nocy_test_bots(text,uuid) to anon, authenticated;
