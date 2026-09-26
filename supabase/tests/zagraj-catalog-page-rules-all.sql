-- II.3c: validate all seven fixed rule-copy adapters through authenticated RPCs.
-- Entire scenario, including simulated submission/publication, is rolled back.
begin;
select set_config('request.jwt.claim.sub',
  (select user_id::text from public.zagraj_admin_members where active and role='owner' limit 1),true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims',jsonb_build_object(
  'sub',(select user_id::text from public.zagraj_admin_members where active and role='owner' limit 1),
  'role','authenticated','aal','aal2')::text,true);
set local role authenticated;

do $test$
declare
  slug text;
  count_expected integer;
  input jsonb;
  base jsonb;
  copy_items jsonb;
  rule_copy jsonb;
  public_before jsonb;
  draft jsonb;
  saved jsonb;
  rev integer;
  old_revision integer;
  published_row jsonb;
begin
  public_before := public.zagraj_catalog_public();
  for slug,count_expected in
    select v.slug,v.n from (values
      ('akta-nocy',4),('pod-przykrywka',6),('szyfr',3),
      ('tylko-my',4),('va-banque',6),('zakrecone-haslo',4),
      ('co-ludzie-powiedza',9)
    ) as v(slug,n)
  loop
    select value into base from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
      where value->>'slug'=slug;
    if base is null or jsonb_typeof(base->'draft') is distinct from 'null' then
      raise exception 'EXPECTED_CLEAN_PUBLISHED_BASELINE_FOR_%',slug; end if;

    select jsonb_agg(to_jsonb(('Opis testowy '||v.n)::text) order by v.n)
      into copy_items from generate_series(1,count_expected) as v(n);
    rule_copy := jsonb_build_object('schema',1,'items',copy_items);
    input := base->'published'||jsonb_build_object('pageRules',rule_copy);
    rev := (base->>'revision')::integer;

    begin
      perform public.zagraj_catalog_save_draft(slug,rev,
        base->'published'||jsonb_build_object('pageRules',
          jsonb_build_object('schema',1,'items',copy_items-0)));
      raise exception 'EXPECTED_INVALID_COUNT_FOR_%',slug;
    exception when sqlstate '22023' then null; end;

    saved := public.zagraj_catalog_save_draft(slug,rev,input);
    rev := (saved->>'revision')::integer;
    select value->'draft' into draft
      from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
      where value->>'slug'=slug;
    if draft->'pageRules' is distinct from rule_copy then
      raise exception 'DRAFT_RULE_COPY_MISMATCH_FOR_%',slug; end if;
    if public.zagraj_catalog_public() is distinct from public_before then
      raise exception 'DRAFT_LEAKED_FOR_%',slug; end if;

    if slug='co-ludzie-powiedza' then
      saved := public.zagraj_catalog_submit(slug,rev);
      rev := (saved->>'revision')::integer;
      saved := public.zagraj_catalog_publish(slug,rev);
      rev := (saved->>'revision')::integer;
      select value into published_row from jsonb_array_elements(public.zagraj_catalog_public()) t(value)
        where value->>'slug'=slug;
      if published_row->'pageRules' is distinct from rule_copy then
        raise exception 'PUBLISHED_RULE_COPY_NOT_VISIBLE'; end if;
      if not exists(select 1 from jsonb_array_elements(public.zagraj_catalog_history_list(slug)) t(value)
        where (value->>'revision')::integer=rev and value->'payload'->'pageRules'=rule_copy) then
        raise exception 'PUBLISHED_RULE_COPY_MISSING_HISTORY'; end if;
    else
      select min((value->>'revision')::integer) into old_revision
        from jsonb_array_elements(public.zagraj_catalog_history_list(slug)) t(value);
      perform public.zagraj_catalog_restore_draft(slug,old_revision,rev);
      select value->'draft' into draft
        from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
        where value->>'slug'=slug;
      if jsonb_typeof(draft->'pageRules') is distinct from 'null' then
        raise exception 'RESTORE_INHERITED_NEW_RULE_COPY_FOR_%',slug; end if;
    end if;
  end loop;

  -- External catalog cards are not allowed to receive this game-page field.
  select value into base from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
    where value->>'slug'='floor-party';
  begin
    perform public.zagraj_catalog_save_draft('floor-party',(base->>'revision')::integer,
      base->'published'||jsonb_build_object('pageRules',rule_copy));
    raise exception 'EXTERNAL_GAME_RULE_COPY_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  raise notice 'SEVEN_RULE_ADAPTERS_AND_PUBLICATION_PASS';
end $test$;
rollback;
