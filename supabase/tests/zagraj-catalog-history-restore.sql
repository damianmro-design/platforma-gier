-- Run in Auth-project SQL editor. Entire test rolls back; no live draft, audit or published card persists.
-- Simulates the owner's JWT with local claims. A real TOTP session still needs UI verification.
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
  before_public jsonb; current_revision integer; source_revision integer;
  result jsonb; row_data jsonb;
begin
  before_public:=public.zagraj_catalog_public();
  select (row->>'revision')::integer into current_revision
    from jsonb_array_elements(public.zagraj_catalog_my_games()) row
    where row->>'slug'='tylko-my';
  select (row->>'revision')::integer into source_revision
    from jsonb_array_elements(public.zagraj_catalog_history_list('tylko-my')) row
    order by (row->>'revision')::integer limit 1;
  if current_revision is null or source_revision is null then
    raise exception 'MISSING_CATALOG_HISTORY'; end if;
  result:=public.zagraj_catalog_restore_draft('tylko-my',source_revision,current_revision);
  if result->>'state'<>'draft' or (result->>'revision')::integer<>current_revision+1 then
    raise exception 'RESTORE_DID_NOT_STAGE_A_DRAFT'; end if;
  if before_public is distinct from public.zagraj_catalog_public() then
    raise exception 'RESTORE_CHANGED_LIVE_CATALOG'; end if;
  select row into row_data from jsonb_array_elements(public.zagraj_catalog_my_games()) row
    where row->>'slug'='tylko-my';
  if row_data->>'draftState'<>'draft' then raise exception 'DRAFT_NOT_VISIBLE_TO_EDITOR'; end if;
  begin
    perform public.zagraj_catalog_restore_draft('tylko-my',source_revision,current_revision);
    raise exception 'STALE_REVISION_NOT_REJECTED';
  exception when serialization_failure then null;
  end;
end $test$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
do $test$
begin
  begin
    perform public.zagraj_catalog_history_list('tylko-my');
    raise exception 'UNAUTHORIZED_HISTORY_READ';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.zagraj_catalog_restore_draft('tylko-my',1,1);
    raise exception 'UNAUTHORIZED_RESTORE';
  exception when insufficient_privilege then null;
  end;
end $test$;
rollback;
