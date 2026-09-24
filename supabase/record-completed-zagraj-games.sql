
-- zaGRAj completion capture: protected, idempotent and non-test only.
-- Keep established Zakrecone Haslo / Co Ludzie Powiedza / Pod Przykrywka pipelines.
create or replace function app_private.guard_partyplay_result_insert()
returns trigger language plpgsql security definer
set search_path='app_private','pg_temp' as $$
declare v_room app_private.platform_rooms%rowtype;
        v_player app_private.room_players%rowtype;
begin
  select * into v_room from app_private.platform_rooms where id=new.room_id;
  select * into v_player from app_private.room_players where id=new.player_id and room_id=new.room_id;
  if v_room.id is null or v_player.id is null
     or coalesce(v_room.is_test,false)
     or coalesce(v_player.is_bot,false)
     or v_player.partyplay_user_id is null
     or v_player.partyplay_user_id is distinct from new.partyplay_user_id
     or v_room.game_slug is distinct from new.game_slug then
     return null;
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_partyplay_result_insert on app_private.partyplay_game_results;
create trigger trg_guard_partyplay_result_insert
before insert on app_private.partyplay_game_results
for each row execute function app_private.guard_partyplay_result_insert();

create or replace function app_private.record_zagraj_game_completion_internal(p_room_id uuid)
returns integer language plpgsql security definer
set search_path='app_private','pg_temp' as $$
declare
  r app_private.platform_rooms%rowtype;
  inserted_count integer := 0;
begin
  select * into r from app_private.platform_rooms where id=p_room_id;
  if r.id is null or coalesce(r.is_test,false) or r.status='lobby' then return 0; end if;

  if r.game_slug='tylko-my' and r.game_phase='finished' then
    insert into app_private.partyplay_game_results(
      room_id,player_id,partyplay_user_id,game_slug,display_name,avatar,team,
      final_score,placement,won,result_data)
    select r.id,p.id,p.partyplay_user_id,r.game_slug,p.display_name,p.avatar,null,
      g.score,null,false,jsonb_build_object('mode','cooperative','compatibilityScore',g.score)
    from app_private.tylko_my_games g
    join app_private.room_players p on p.room_id=g.room_id
    where g.room_id=r.id and g.finished and p.partyplay_user_id is not null and not coalesce(p.is_bot,false)
    on conflict(room_id,partyplay_user_id) do nothing;
    get diagnostics inserted_count=row_count;
    return inserted_count;
  end if;

  if r.game_slug='va-banque' and r.game_phase='finished' then
    with ranked as (
      select v.player_id,v.points,
        rank() over(order by v.points desc)::integer as placement
      from app_private.va_banque_players v
      where v.room_id=r.id
    )
    insert into app_private.partyplay_game_results(
      room_id,player_id,partyplay_user_id,game_slug,display_name,avatar,team,
      final_score,placement,won,result_data)
    select r.id,p.id,p.partyplay_user_id,r.game_slug,p.display_name,p.avatar,null,
      ranked.points,ranked.placement,ranked.placement=1,
      jsonb_build_object('mode','individual','points',ranked.points)
    from ranked join app_private.room_players p on p.id=ranked.player_id
    join app_private.va_banque_games g on g.room_id=p.room_id
    where p.room_id=r.id and g.phase='finished'
      and p.partyplay_user_id is not null and not coalesce(p.is_bot,false)
    on conflict(room_id,partyplay_user_id) do nothing;
    get diagnostics inserted_count=row_count;
    return inserted_count;
  end if;

  if r.game_slug='szyfr' and r.game_phase in ('finished','failed') then
    insert into app_private.partyplay_game_results(
      room_id,player_id,partyplay_user_id,game_slug,display_name,avatar,team,
      final_score,placement,won,result_data)
    select r.id,p.id,p.partyplay_user_id,r.game_slug,p.display_name,p.avatar,null,
      coalesce(g.score,0),case when g.phase='finished' then 1 else 2 end,
      g.phase='finished',
      jsonb_build_object('mode','cooperative','outcome',g.phase,
        'wrongAttempts',g.wrong_attempts,'hintsUsed',g.hints_used)
    from app_private.szyfr_games g
    join app_private.room_players p on p.room_id=g.room_id
    where g.room_id=r.id and g.phase=r.game_phase and g.finished_at is not null
      and p.partyplay_user_id is not null and not coalesce(p.is_bot,false)
    on conflict(room_id,partyplay_user_id) do nothing;
    get diagnostics inserted_count=row_count;
    return inserted_count;
  end if;

  if r.game_slug='akta-nocy' and r.status='finished'
     and r.game_phase in ('zamknieta','ok_zamknieta') then
    insert into app_private.partyplay_game_results(
      room_id,player_id,partyplay_user_id,game_slug,display_name,avatar,team,
      final_score,placement,won,result_data)
    select r.id,p.id,p.partyplay_user_id,r.game_slug,p.display_name,p.avatar,null,
      (case when a.suspect_player_id=culprit.player_id then 100 else 0 end) +
      (case when a.motive_key=case when r.game_phase='ok_zamknieta' then 'embezzlement' else 'career' end then 50 else 0 end) +
      (case when (r.game_phase='zamknieta' and a.evidence_id=any(array[
          'scheduled-message','mirror-photo','hallway-audio','medical-window','wicher-file'
        ])) or (r.game_phase='ok_zamknieta' and a.evidence_id=any(array[
          'receipt-metadata','service-door-log','northbridge-file','platform-return'
        ])) then 25 else 0 end),
      case when a.suspect_player_id=culprit.player_id
       and a.motive_key=case when r.game_phase='ok_zamknieta' then 'embezzlement' else 'career' end
       and ((r.game_phase='zamknieta' and a.evidence_id=any(array[
          'scheduled-message','mirror-photo','hallway-audio','medical-window','wicher-file'
         ])) or (r.game_phase='ok_zamknieta' and a.evidence_id=any(array[
          'receipt-metadata','service-door-log','northbridge-file','platform-return'
         ])))
       and (r.game_phase='zamknieta' or a.disappearance_key='staged_exit')
       then 1 else 2 end,
      coalesce(a.suspect_player_id=culprit.player_id,false)
       and coalesce(a.motive_key=case when r.game_phase='ok_zamknieta' then 'embezzlement' else 'career' end,false)
       and coalesce(((r.game_phase='zamknieta' and a.evidence_id=any(array[
          'scheduled-message','mirror-photo','hallway-audio','medical-window','wicher-file'
         ])) or (r.game_phase='ok_zamknieta' and a.evidence_id=any(array[
          'receipt-metadata','service-door-log','northbridge-file','platform-return'
         ]))),false)
       and (r.game_phase='zamknieta' or coalesce(a.disappearance_key='staged_exit',false)),
      jsonb_build_object('mode','investigation','case',coalesce(c.case_key,'sprawa-001'),
        'suspectCorrect',coalesce(a.suspect_player_id=culprit.player_id,false),
        'motiveCorrect',coalesce(a.motive_key=case when r.game_phase='ok_zamknieta' then 'embezzlement' else 'career' end,false),
        'evidenceId',a.evidence_id)
    from app_private.room_players p
    left join app_private.akta_nocy_room_config c on c.room_id=p.room_id
    left join app_private.akta_nocy_assignments culprit on culprit.room_id=p.room_id
      and culprit.role_key=case when r.game_phase='ok_zamknieta' then 'ok_fixer' else 'reporter' end
    left join lateral (
      select x.suspect_player_id,x.motive_key,x.evidence_id,null::text as disappearance_key
      from app_private.akta_nocy_accusations x where x.room_id=p.room_id and x.player_id=p.id
      and r.game_phase='zamknieta'
      union all
      select x.suspect_player_id,x.motive_key,x.evidence_id,x.disappearance_key
      from app_private.akta_nocy_ok_accusations x where x.room_id=p.room_id and x.player_id=p.id
      and r.game_phase='ok_zamknieta'
    ) a on true
    where p.room_id=r.id and p.partyplay_user_id is not null
      and not coalesce(p.is_bot,false)
    on conflict(room_id,partyplay_user_id) do nothing;
    get diagnostics inserted_count=row_count;
    return inserted_count;
  end if;

  return 0;
end; $$;

create or replace function app_private.capture_zagraj_room_completion()
returns trigger language plpgsql security definer
set search_path='app_private','pg_temp' as $$
begin
  if (old.status is distinct from new.status or old.game_phase is distinct from new.game_phase)
     and new.game_slug in ('tylko-my','va-banque','szyfr','akta-nocy')
     and not coalesce(new.is_test,false) then
     perform app_private.record_zagraj_game_completion_internal(new.id);
  end if;
  return new;
end; $$;

drop trigger if exists trg_capture_zagraj_room_completion on app_private.platform_rooms;
create trigger trg_capture_zagraj_room_completion
after update of status,game_phase on app_private.platform_rooms
for each row execute function app_private.capture_zagraj_room_completion();

-- Rebuild only confirmed, non-test completed results. No activity/lobby awards.
select app_private.record_zagraj_game_completion_internal(r.id)
from app_private.platform_rooms r
where not coalesce(r.is_test,false) and
  ((r.game_slug='tylko-my' and r.game_phase='finished')
   or (r.game_slug='va-banque' and r.game_phase='finished')
   or (r.game_slug='szyfr' and r.game_phase in ('finished','failed'))
   or (r.game_slug='akta-nocy' and r.status='finished' and r.game_phase in ('zamknieta','ok_zamknieta')));
