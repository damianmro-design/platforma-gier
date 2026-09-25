-- II.3b: run as the authenticated owner; no persistent writes.
begin;
select set_config('request.jwt.claim.sub',
  (select user_id::text from public.zagraj_admin_members where active and role='owner' limit 1), true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims', jsonb_build_object(
  'sub',(select user_id::text from public.zagraj_admin_members where active and role='owner' limit 1),
  'role','authenticated','aal','aal2')::text,true);
set local role authenticated;

do $test$
declare
  va jsonb;
  word_game jsonb;
  published_before jsonb;
  valid_va jsonb := jsonb_build_object('schema',1,'items',to_jsonb(array[
    'Najpierw zobacz kategorię.', 'Licytuj zgodnie z zasadami.',
    'Odpowiadaj na pytanie.', 'Spróbuj przejąć pytanie.',
    'Rozstrzygnij remis.', 'Rozegraj finał.'
  ]::text[]));
  valid_word jsonb := jsonb_build_object('schema',1,'items',to_jsonb(array[
    'Zakręć kołem.', 'Wybierz literę.', 'Kup samogłoskę.', 'Rozwiąż hasło.'
  ]::text[]));
  result jsonb;
  draft jsonb;
  revision_after integer;
  source_revision integer;
begin
  select value into va from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
    where value->>'slug'='va-banque';
  select value into word_game from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
    where value->>'slug'='zakrecone-haslo';
  if va is null or word_game is null or va->'draft'<>'null'::jsonb
     or word_game->'draft'<>'null'::jsonb then
    raise exception 'TEST_REQUIRES_PUBLISHED_CARDS_WITHOUT_DRAFTS'; end if;
  published_before:=public.zagraj_catalog_public();

  begin
    perform public.zagraj_catalog_save_draft('va-banque',(va->>'revision')::integer,
      va->'published'||jsonb_build_object('pageRules',jsonb_build_object('items',valid_va->'items')));
    raise exception 'MISSING_SCHEMA_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.zagraj_catalog_save_draft('va-banque',(va->>'revision')::integer,
      va->'published'||jsonb_build_object('pageRules',jsonb_build_object('schema',2,'items',valid_va->'items')));
    raise exception 'WRONG_SCHEMA_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.zagraj_catalog_save_draft('va-banque',(va->>'revision')::integer,
      va->'published'||jsonb_build_object('pageRules',jsonb_build_object('schema',1,'items',to_jsonb(array['too few']::text[]))));
    raise exception 'WRONG_COUNT_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.zagraj_catalog_save_draft('va-banque',(va->>'revision')::integer,
      va->'published'||jsonb_build_object('pageRules',valid_va||jsonb_build_object('href','https://example.org')));
    raise exception 'EXTRA_FIELD_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.zagraj_catalog_save_draft('va-banque',(va->>'revision')::integer,
      va->'published'||jsonb_build_object('pageRules',jsonb_set(valid_va,'{items,0}','"<script>bad</script>"'::jsonb)));
    raise exception 'MARKUP_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.zagraj_catalog_save_draft('va-banque',(va->>'revision')::integer,
      va->'published'||jsonb_build_object('pageRules',jsonb_set(valid_va,'{items,0}',to_jsonb('https://example.org'::text))));
    raise exception 'LINK_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.zagraj_catalog_save_draft('va-banque',(va->>'revision')::integer,
      va->'published'||jsonb_build_object('pageRules',jsonb_set(valid_va,'{items,0}',to_jsonb(repeat('x',361)))));
    raise exception 'OVERSIZED_COPY_ACCEPTED';
  exception when sqlstate '22023' then null; end;
  begin
    perform public.zagraj_catalog_save_draft('tylko-my',1,
      (select value->'published' from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
       where value->>'slug'='tylko-my')||jsonb_build_object('pageRules',valid_va));
    raise exception 'UNSUPPORTED_GAME_ACCEPTED';
  exception when sqlstate '22023' then null; end;

  result:=public.zagraj_catalog_save_draft('va-banque',(va->>'revision')::integer,
    va->'published'||jsonb_build_object('pageRules',valid_va));
  revision_after:=(result->>'revision')::integer;
  select value->'draft' into draft from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
    where value->>'slug'='va-banque';
  if draft->'pageRules' is distinct from valid_va then
    raise exception 'DRAFT_RULE_COPY_MISMATCH'; end if;
  if public.zagraj_catalog_public() is distinct from published_before then
    raise exception 'DRAFT_LEAKED_IN_PUBLIC_FEED'; end if;

  select min((value->>'revision')::integer) into source_revision
    from jsonb_array_elements(public.zagraj_catalog_history_list('va-banque')) t(value);
  perform public.zagraj_catalog_restore_draft('va-banque',source_revision,revision_after);
  select value->'draft' into draft from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
    where value->>'slug'='va-banque';
  if jsonb_typeof(draft->'pageRules') is distinct from 'null' then
    raise exception 'RESTORE_INHERITED_NEWER_RULE_COPY'; end if;
  if public.zagraj_catalog_public() is distinct from published_before then
    raise exception 'RESTORE_CHANGED_LIVE_PUBLIC_FEED'; end if;

  result:=public.zagraj_catalog_save_draft('zakrecone-haslo',(word_game->>'revision')::integer,
    word_game->'published'||jsonb_build_object('pageRules',valid_word));
  select value->'draft' into draft from jsonb_array_elements(public.zagraj_catalog_my_games()) t(value)
    where value->>'slug'='zakrecone-haslo';
  if draft->'pageRules' is distinct from valid_word then
    raise exception 'WORD_GAME_RULE_COPY_MISMATCH'; end if;
  if public.zagraj_catalog_public() is distinct from published_before then
    raise exception 'WORD_GAME_DRAFT_LEAKED'; end if;

  raise notice 'RULE_COPY_DRAFT_AND_RESTORE_PASS';
end $test$;
rollback;
