-- Read-only catalogue contract checks; safe to run against the Auth project.
-- No player-room, progress or published content is modified.
do $test$
declare
  actual jsonb;
  expected jsonb;
begin
  if exists (
    select 1 from public.zagraj_catalog_games g
    where (g.published->>'slug') is distinct from g.slug
      or jsonb_typeof(g.published->'tags') is distinct from 'array'
      or jsonb_typeof(g.published->'categories') is distinct from 'array'
      or jsonb_typeof(g.published->'moods') is distinct from 'array'
      or coalesce((g.published->>'minPlayers')::integer,0) < g.engine_min_players
      or coalesce((g.published->>'maxPlayers')::integer,99999) > g.engine_max_players
      or (g.published->>'minPlayers')::integer > (g.published->>'maxPlayers')::integer
      or coalesce((g.published->>'minTime')::integer,0) < 5
      or coalesce((g.published->>'maxTime')::integer,99999) > 240
      or (g.published->>'minTime')::integer > (g.published->>'maxTime')::integer
  ) then
    raise exception 'PUBLISHED_CARD_ENGINE_CONTRACT_FAILED';
  end if;

  if exists (
    select 1 from public.zagraj_catalog_games g
    where not exists (
      select 1 from public.zagraj_catalog_history h
      where h.slug=g.slug
        -- The first 9 snapshots predate the empty pageSections bootstrap.
        -- Normalize only this absent-vs-empty key; any other discrepancy fails.
        and (h.payload-'pageSections')=(g.published-'pageSections')
        and coalesce(h.payload->'pageSections','[]'::jsonb)
            =coalesce(g.published->'pageSections','[]'::jsonb)
        and h.revision=(select max(h2.revision) from public.zagraj_catalog_history h2
                        where h2.slug=g.slug)
    )
  ) then
    raise exception 'LIVE_CARD_DIFFERS_FROM_LATEST_PUBLISHED_SNAPSHOT';
  end if;

  select public.zagraj_catalog_public() into actual;
  select coalesce(jsonb_agg(g.published order by (g.published->>'sortOrder')::integer,g.slug),
                  '[]'::jsonb) into expected
  from public.zagraj_catalog_games g
  where coalesce((g.published->>'isVisible')::boolean,true);
  if actual is distinct from expected then
    raise exception 'PUBLIC_FEED_DIFFERS_FROM_VISIBLE_PUBLISHED_CARDS';
  end if;

  if exists(
    select 1 from jsonb_array_elements(actual) card
    where coalesce((card->>'isVisible')::boolean,true)=false
  ) then raise exception 'HIDDEN_CARD_EXPOSED_IN_PUBLIC_LIST'; end if;

  if has_function_privilege('anon','public.zagraj_catalog_my_games()','EXECUTE')
     or has_function_privilege('anon','public.zagraj_catalog_save_draft(text,integer,jsonb)','EXECUTE')
     or has_function_privilege('anon','public.zagraj_catalog_publish(text,integer)','EXECUTE')
  then raise exception 'ADMIN_CATALOG_RPC_EXPOSED_TO_ANON'; end if;

  raise notice 'CATALOG_CONSISTENCY_PASS (% public cards)',
    jsonb_array_length(actual);
end $test$;
