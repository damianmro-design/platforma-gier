-- CMS II.3a: all writes are rolled back. Test using the actual authenticated RPC boundary.
begin;
select set_config('request.jwt.claim.sub',
 (select user_id::text from public.zagraj_admin_members where role='owner' and active limit 1),true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims',jsonb_build_object(
 'sub',(select user_id::text from public.zagraj_admin_members where role='owner' and active limit 1),
 'role','authenticated','aal','aal2')::text,true);
set local role authenticated;
do $test$
declare
  baseline jsonb;
  base_revision integer;
  initial_public jsonb;
  result jsonb;
  next_rev integer;
  saved_intro text;
  source_rev integer;
begin
  select value into result from jsonb_array_elements(public.zagraj_catalog_my_games()) row(value)
  where value->>'slug'='tylko-my';
  base_revision := (result->>'revision')::integer;
  baseline := result->'published';
  initial_public:=public.zagraj_catalog_public();
  if baseline is null or jsonb_typeof(result->'draft') is distinct from 'null' then
    raise exception 'TEST_REQUIRES_EXISTING_PUBLISHED_BASELINE'; end if;

  begin
    perform public.zagraj_catalog_save_draft('tylko-my',base_revision,
      baseline||jsonb_build_object('pageIntro',123));
    raise exception 'NON_STRING_PAGE_INTRO_ACCEPTED';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.zagraj_catalog_save_draft('tylko-my',base_revision,
      baseline||jsonb_build_object('pageIntro',repeat('x',601)));
    raise exception 'LONG_PAGE_INTRO_ACCEPTED';
  exception when sqlstate '22023' then null;
  end;

  result:=public.zagraj_catalog_save_draft('tylko-my',base_revision,
    baseline||jsonb_build_object('pageIntro','Opis testowy podstrony.'));
  next_rev:=(result->>'revision')::integer;
  select value->'draft'->>'pageIntro' into saved_intro
    from jsonb_array_elements(public.zagraj_catalog_my_games()) row(value)
    where value->>'slug'='tylko-my';
  if saved_intro<>'Opis testowy podstrony.' then
    raise exception 'DRAFT_PAGE_INTRO_NOT_STORED'; end if;
  if public.zagraj_catalog_public() is distinct from initial_public then
    raise exception 'DRAFT_LEAKED_TO_PUBLIC'; end if;

  select min((value->>'revision')::integer) into source_rev
    from jsonb_array_elements(public.zagraj_catalog_history_list('tylko-my')) row(value);
  perform public.zagraj_catalog_restore_draft('tylko-my',source_rev,next_rev);
  select value->'draft'->>'pageIntro' into saved_intro
    from jsonb_array_elements(public.zagraj_catalog_my_games()) row(value)
    where value->>'slug'='tylko-my';
  if saved_intro is distinct from '' then
    raise exception 'OLD_SNAPSHOT_INHERITED_NEW_PAGE_INTRO'; end if;
  if public.zagraj_catalog_public() is distinct from initial_public then
    raise exception 'RESTORE_CHANGED_PUBLIC'; end if;
end $test$;
rollback;
