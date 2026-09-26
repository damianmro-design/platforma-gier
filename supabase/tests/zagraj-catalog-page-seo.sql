-- II.3d SEO: authenticated-RPC scenario; no persistent publication or drafts.
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
  baseline jsonb;
  seo jsonb := jsonb_build_object('title','Testowy tytuł SEO zaGRAj','description','Testowy opis gry zaGRAj dla wyszukiwarki.');
  bad jsonb;
  result jsonb;
  draft jsonb;
  shown jsonb;
  initial_public jsonb;
  rev integer;
  old_rev integer;
begin
  initial_public:=public.zagraj_catalog_public();
  for slug in select value from jsonb_array_elements_text(
    '["akta-nocy","co-ludzie-powiedza","pod-przykrywka","szyfr","tylko-my","va-banque","zakrecone-haslo"]'::jsonb
  ) t(value) loop
    select value into baseline from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
      where value->>'slug'=slug;
    if baseline is null or jsonb_typeof(baseline->'draft') is distinct from 'null' then
      raise exception 'EXPECTED_CLEAN_CARD_FOR_%',slug; end if;
    rev:=(baseline->>'revision')::integer;
    if slug='akta-nocy' then
      foreach bad in array array[
        '{"title":42,"description":"ok"}'::jsonb,
        '{"title":"ok"}'::jsonb,
        '{"title":"ok","description":"ok","canonical":"https://fake.example"}'::jsonb,
        '{"title":"<script>","description":"ok"}'::jsonb,
        jsonb_build_object('title',repeat('x',71),'description','ok'),
        jsonb_build_object('title','ok','description',repeat('x',181)),
        '{"title":"ok","description":"https://unsafe.example"}'::jsonb
      ] loop
        begin
          perform public.zagraj_catalog_save_draft(slug,rev,
            baseline->'published'||jsonb_build_object('pageSeo',bad));
          raise exception 'INVALID_SEO_ACCEPTED';
        exception when sqlstate '22023' then null; end;
      end loop;
    end if;
    result:=public.zagraj_catalog_save_draft(slug,rev,
      baseline->'published'||jsonb_build_object('pageSeo',seo));
    rev:=(result->>'revision')::integer;
    select value->'draft' into draft from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
      where value->>'slug'=slug;
    if draft->'pageSeo' is distinct from seo then raise exception 'DRAFT_SEO_MISMATCH_%',slug; end if;
    if public.zagraj_catalog_public() is distinct from initial_public then
      raise exception 'UNPUBLISHED_SEO_LEAKED_%',slug; end if;
    if slug='tylko-my' then
      result:=public.zagraj_catalog_submit(slug,rev);
      rev:=(result->>'revision')::integer;
      result:=public.zagraj_catalog_publish(slug,rev);
      rev:=(result->>'revision')::integer;
      select value into shown from jsonb_array_elements(public.zagraj_catalog_public()) t(value)
        where value->>'slug'=slug;
      if shown->'pageSeo' is distinct from seo then raise exception 'PUBLIC_SEO_NOT_PUBLISHED'; end if;
      if not exists(select 1 from jsonb_array_elements(public.zagraj_catalog_history_list(slug)) t(value)
         where (value->>'revision')::integer=rev and value->'payload'->'pageSeo'=seo) then
        raise exception 'PUBLISHED_SEO_MISSING_FROM_HISTORY'; end if;
    else
      select min((value->>'revision')::integer) into old_rev from
        jsonb_array_elements(public.zagraj_catalog_history_list(slug)) t(value);
      perform public.zagraj_catalog_restore_draft(slug,old_rev,rev);
      select value->'draft' into draft from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
        where value->>'slug'=slug;
      if jsonb_typeof(draft->'pageSeo') is distinct from 'null' then
        raise exception 'OLD_SNAPSHOT_INHERITED_SEO_%',slug; end if;
    end if;
  end loop;
  select value into baseline from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
    where value->>'slug'='floor-party';
  begin
    perform public.zagraj_catalog_save_draft('floor-party',(baseline->>'revision')::integer,
      baseline->'published'||jsonb_build_object('pageSeo',seo));
    raise exception 'EXTERNAL_SEO_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  raise notice 'SEO_SEVEN_ADAPTERS_DRAFT_RESTORE_PUBLICATION_PASS';
end $test$;
rollback;
