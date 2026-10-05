create or replace function app_private.retry_szyfr_internal(p_code text, p_host_token uuid)
returns boolean
language plpgsql
security definer
set search_path to 'app_private', 'pg_temp'
as $function$
declare
  r app_private.platform_rooms%rowtype;
  v_phase text;
begin
  select * into r
  from app_private.platform_rooms
  where code=upper(trim(p_code))
    and game_slug='szyfr'
    and expires_at>now()
  for update
  limit 1;

  if r.id is null then return false; end if;

  if p_host_token is distinct from r.host_token
     and not exists (
       select 1 from app_private.room_players rp
       where rp.room_id=r.id and rp.player_token=p_host_token
     ) then
    return false;
  end if;

  select phase into v_phase
  from app_private.szyfr_games
  where room_id=r.id
  limit 1;

  if v_phase='tutorial' then return true; end if;
  if v_phase not in ('finished','failed') then return false; end if;

  update app_private.szyfr_games
  set
    step_index=1,
    phase='tutorial',
    main_started_at=null,
    ends_at=null,
    finished_at=null,
    wrong_attempts=0,
    hints_used=0,
    hint_level=0,
    fragment_digits='{}'::integer[],
    score=null,
    last_event=jsonb_build_object('type','retry','eventId',gen_random_uuid()::text),
    updated_at=now()
  where room_id=r.id and phase in ('finished','failed');

  if not found then return false; end if;
  update app_private.platform_rooms set status='active',game_phase='tutorial' where id=r.id;
  return true;
end;
$function$;

create or replace function app_private.rematch_szyfr_internal(p_code text, p_host_token uuid)
returns boolean
language plpgsql
security definer
set search_path to 'app_private', 'pg_temp'
as $function$
declare
  r app_private.platform_rooms%rowtype;
  old_signature text;
  v_phase text;
begin
  select * into r
  from app_private.platform_rooms
  where code=upper(trim(p_code))
    and game_slug='szyfr'
    and expires_at>now()
  for update
  limit 1;

  if r.id is null then return false; end if;

  if p_host_token is distinct from r.host_token
     and not exists (
       select 1 from app_private.room_players rp
       where rp.room_id=r.id and rp.player_token=p_host_token
     ) then
    return false;
  end if;

  select phase, scenario_signature into v_phase, old_signature
  from app_private.szyfr_games
  where room_id=r.id
  limit 1;

  if v_phase='tutorial' then return true; end if;
  if v_phase not in ('finished','failed') or old_signature is null then return false; end if;

  if not app_private.initialize_szyfr_internal(r.id,old_signature) then return false; end if;

  update app_private.platform_rooms set status='active',game_phase='tutorial' where id=r.id;
  return true;
end;
$function$;
