-- III.2a transaction-only smoke. Test rooms are flagged is_test and rolled back.
-- Run in gameplay DB after the migration, or inside a wrapping BEGIN with the migration.
begin;

do $test$
declare
  room_old uuid;
  room_new uuid;
  code_old text;
  code_new text;
  player_old uuid;
  player_new uuid;
  token_old uuid;
  token_new uuid;
  version_new bigint;
  version_incomplete bigint;
  old_key text;
  new_key text;
  old_phrase text;
  new_phrase text;
  original_state jsonb;
  result jsonb;
  version_seen bigint;
  attempts integer;
begin
  if (select count(*) from app_private.zh_content_puzzles where version_id=1) <>
     (select count(*) from app_private.zh_puzzles) then
    raise exception 'ZH_BASELINE_COUNT_MISMATCH'; end if;
  if exists (
    select 1 from app_private.zh_puzzles original
    full join app_private.zh_content_puzzles pinned
     on pinned.version_id=1 and pinned.puzzle_key=original.puzzle_key
    where original.puzzle_key is null or pinned.puzzle_key is null
      or (original.category,original.phrase,original.difficulty)
         is distinct from (pinned.category,pinned.phrase,pinned.difficulty)
  ) then raise exception 'ZH_BASELINE_COPY_DIFFERS'; end if;
  if exists(select 1 from app_private.zh_game_state where content_version_id is null) then
    raise exception 'ZH_EXISTING_ROOMS_UNPINNED'; end if;
  if exists(
    select 1 from app_private.zh_game_state s cross join lateral unnest(s.puzzle_keys) k(key)
    where not exists(select 1 from app_private.zh_content_puzzles p
      where p.version_id=s.content_version_id and p.puzzle_key=k.key)
  ) then raise exception 'ZH_ROOM_HAS_DANGLING_KEY'; end if;

  if has_table_privilege('anon','app_private.zh_content_puzzles','SELECT')
    or has_table_privilege('authenticated','app_private.zh_content_puzzles','SELECT')
    or has_table_privilege('anon','app_private.zh_content_active','UPDATE')
    or has_table_privilege('authenticated','app_private.zh_content_active','UPDATE') then
    raise exception 'ZH_CONTENT_DIRECT_ACCESS_EXPOSED'; end if;

  -- Choose a valid unique 4-character code without exposing real room codes.
  for attempts in 1..100 loop
    code_old := translate(upper(substr(md5(gen_random_uuid()::text),1,4)),'01','AB');
    exit when not exists (select 1 from app_private.platform_rooms where code=code_old);
  end loop;
  if exists(select 1 from app_private.platform_rooms where code=code_old) then
    raise exception 'ZH_TEST_CODE_COLLISION'; end if;
  insert into app_private.platform_rooms(code,game_slug,is_test)
    values(code_old,'zakrecone-haslo',true) returning id into room_old;
  insert into app_private.room_players(room_id,display_name,avatar,recovery_code,ready)
    values(room_old,'Test pierwszy','avatar-01','993311',true)
    returning id,player_token into player_old,token_old;
  insert into app_private.room_players(room_id,display_name,avatar,recovery_code,ready)
    values(room_old,'Test drugi','avatar-02','993312',true);
  if not app_private.initialize_zh_game_internal(room_old) then
    raise exception 'ZH_FIRST_ROOM_INIT_FAILED'; end if;
  update app_private.platform_rooms set status='active',game_phase='playing' where id=room_old;
  select content_version_id,puzzle_keys[1],active_player_id
    into version_seen,old_key,player_old from app_private.zh_game_state where room_id=room_old;
  if version_seen<>1 then raise exception 'ZH_INITIAL_ROOM_NOT_V1'; end if;
  select player_token into token_old from app_private.room_players where id=player_old;
  select phrase into old_phrase from app_private.zh_content_puzzles
    where version_id=1 and puzzle_key=old_key;
  original_state:=app_private.get_zh_state_internal(code_old);
  if original_state is null then raise exception 'ZH_FIRST_STATE_MISSING'; end if;

  -- A new revision is populated via INSERT only, then atomically made active.
  insert into app_private.zh_content_versions(source_label)
    values('Transaction-only edited test revision') returning version_id into version_new;
  insert into app_private.zh_content_puzzles(version_id,puzzle_key,category,phrase,difficulty)
    select version_new,puzzle_key,category,'NOWA WERSJA '||phrase,difficulty
    from app_private.zh_content_puzzles where version_id=1;

  begin
    update app_private.zh_content_puzzles set phrase='MUTATED'
      where version_id=1 and puzzle_key=old_key;
    raise exception 'ZH_IMMUTABLE_ROW_UPDATE_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  begin
    delete from app_private.zh_content_puzzles
      where version_id=1 and puzzle_key=old_key;
    raise exception 'ZH_IMMUTABLE_ROW_DELETE_ACCEPTED';
  exception when sqlstate '55000' then null; end;
  begin
    update app_private.zh_game_state set content_version_id=version_new where room_id=room_old;
    raise exception 'ZH_PINNED_ROOM_SWITCH_ACCEPTED';
  exception when sqlstate '55000' then null; end;

  insert into app_private.zh_content_versions(source_label)
    values('Incomplete revision must never become active') returning version_id into version_incomplete;
  begin
    update app_private.zh_content_active set version_id=version_incomplete where singleton=true;
    raise exception 'ZH_INCOMPLETE_REVISION_ACTIVATED';
  exception when sqlstate '22023' then null; end;

  update app_private.zh_content_active set version_id=version_new where singleton=true;
  if (select content_version_id from app_private.zh_game_state where room_id=room_old) <> 1
     or app_private.get_zh_state_internal(code_old) is distinct from original_state then
    raise exception 'ZH_OLD_ROOM_CHANGED_AFTER_HEAD_SWITCH'; end if;

  result:=app_private.submit_zh_solve_internal(code_old,token_old,old_phrase);
  if result->>'correct'<>'true' then
    raise exception 'ZH_OLD_ROOM_SOLVE_CHANGED_WITH_NEW_HEAD'; end if;
  if (select round_score from app_private.zh_scores where room_id=room_old
     and player_id=player_old)<>1000 then raise exception 'ZH_OLD_SCORING_CHANGED'; end if;

  for attempts in 1..100 loop
    code_new := translate(upper(substr(md5(gen_random_uuid()::text),1,4)),'01','AB');
    exit when not exists(select 1 from app_private.platform_rooms where code=code_new);
  end loop;
  if exists(select 1 from app_private.platform_rooms where code=code_new) then
    raise exception 'ZH_TEST_SECOND_CODE_COLLISION'; end if;
  insert into app_private.platform_rooms(code,game_slug,is_test)
    values(code_new,'zakrecone-haslo',true) returning id into room_new;
  insert into app_private.room_players(room_id,display_name,avatar,recovery_code,ready)
    values(room_new,'Nowy pierwszy','avatar-01','993313',true);
  insert into app_private.room_players(room_id,display_name,avatar,recovery_code,ready)
    values(room_new,'Nowy drugi','avatar-02','993314',true);
  if not app_private.initialize_zh_game_internal(room_new) then
    raise exception 'ZH_NEW_ROOM_INIT_FAILED'; end if;
  update app_private.platform_rooms set status='active',game_phase='playing' where id=room_new;
  select content_version_id,puzzle_keys[1],active_player_id
    into version_seen,new_key,player_new from app_private.zh_game_state where room_id=room_new;
  if version_seen<>version_new then raise exception 'ZH_NEW_ROOM_NOT_V2'; end if;
  select player_token into token_new from app_private.room_players where id=player_new;
  select phrase into new_phrase from app_private.zh_content_puzzles
    where version_id=version_new and puzzle_key=new_key;
  if new_phrase not like 'NOWA WERSJA %' then raise exception 'ZH_NEW_PHRASE_NOT_PINNED'; end if;
  result:=app_private.submit_zh_solve_internal(code_new,token_new,new_phrase);
  if result->>'correct'<>'true' then
    raise exception 'ZH_NEW_ROOM_SOLVE_WRONG_VERSION'; end if;
  if (select round_score from app_private.zh_scores where room_id=room_new
     and player_id=player_new)<>1000 then raise exception 'ZH_NEW_SCORING_CHANGED'; end if;

  raise notice 'ZH_PINNED_ROOM_V1_AND_V2_PASS';
end $test$;

rollback;
