-- zaGRAj III.1, run against the GAMEPLAY project as a privileged read-only audit.
-- Only metadata and aggregate counts; no roles, player data, secret answers or content rows.
begin transaction read only;

select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       has_table_privilege('anon',c.oid,'SELECT') as anon_can_select,
       has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_can_select,
       has_table_privilege('anon',c.oid,'UPDATE') as anon_can_update,
       has_table_privilege('authenticated',c.oid,'UPDATE') as authenticated_can_update
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='app_private'
  and c.relname in ('platform_rooms','akta_nocy_assignments','clp_round1_questions',
    'pp_missions','szyfr_puzzles','tylko_my_games','va_banque_questions','zh_puzzles')
order by c.relname;

select table_name, count(*) filter (
  where column_name in ('content_version','content_snapshot','game_version',
    'definition_id','question_snapshot','puzzle_snapshot','scenario_version')
) as explicit_content_version_columns
from information_schema.columns
where table_schema='app_private'
  and table_name in ('platform_rooms','clp_game_state','pp_game_missions',
    'pp_game_state','akta_nocy_room_config','szyfr_games',
    'tylko_my_games','va_banque_games','zh_game_state')
group by table_name order by table_name;

select 'clp_round1_questions' as bank,count(*) as item_count from app_private.clp_round1_questions union all
select 'clp_round3_questions',count(*) from app_private.clp_round3_questions union all
select 'clp_round4_questions',count(*) from app_private.clp_round4_questions union all
select 'clp_round5_questions',count(*) from app_private.clp_round5_questions union all
select 'clp_round6_questions',count(*) from app_private.clp_round6_questions union all
select 'clp_round7_questions',count(*) from app_private.clp_round7_questions union all
select 'clp_final_questions',count(*) from app_private.clp_final_questions union all
select 'pp_missions',count(*) from app_private.pp_missions union all
select 'pp_hot_seat_questions',count(*) from app_private.pp_hot_seat_questions union all
select 'pp_interrogation_questions',count(*) from app_private.pp_interrogation_questions union all
select 'pp_secret_orders',count(*) from app_private.pp_secret_orders union all
select 'szyfr_puzzles',count(*) from app_private.szyfr_puzzles union all
select 'va_banque_questions',count(*) from app_private.va_banque_questions union all
select 'zh_puzzles',count(*) from app_private.zh_puzzles
order by bank;

rollback;
