-- II.5: list immutable publication snapshots and stage an older one as a draft.
-- Historical snapshots do not change live cards until owner approves publication.
create or replace function public.zagraj_catalog_history_list(p_slug text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare m public.zagraj_admin_members%rowtype;
begin
  select * into m from public.zagraj_admin_members where user_id=auth.uid() and active;
  if m.user_id is null or (m.role <> 'owner' and not (
    ('games.read'=any(m.permissions) or 'games.edit'=any(m.permissions)
     or 'games.create'=any(m.permissions))
    and (cardinality(m.game_slugs)=0 or p_slug=any(m.game_slugs))
  )) then
    raise exception 'HISTORY_FORBIDDEN' using errcode='42501';
  end if;
  if not exists (select 1 from public.zagraj_catalog_games where slug=p_slug) then
    raise exception 'GAME_NOT_FOUND' using errcode='22023';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'revision',h.revision,'publishedAt',h.published_at,'payload',h.payload
  ) order by h.revision desc),'[]'::jsonb)
  from public.zagraj_catalog_history h where h.slug=p_slug);
end; $$;

create or replace function public.zagraj_catalog_restore_draft(
  p_slug text, p_published_revision integer, p_expected_revision integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  m public.zagraj_admin_members%rowtype;
  g public.zagraj_catalog_games%rowtype;
  h public.zagraj_catalog_history%rowtype;
  restored jsonb;
  outcome jsonb;
begin
  select * into m from public.zagraj_admin_members where user_id=auth.uid() and active;
  if m.user_id is null or m.role <> 'owner' then
    raise exception 'OWNER_REQUIRED' using errcode='42501';
  end if;
  select * into g from public.zagraj_catalog_games where slug=p_slug for update;
  if g.slug is null then raise exception 'GAME_NOT_FOUND' using errcode='22023'; end if;
  if g.revision is distinct from p_expected_revision then
    raise exception 'CATALOG_REVISION_CONFLICT' using errcode='40001';
  end if;
  select * into h from public.zagraj_catalog_history
  where slug=p_slug and revision=p_published_revision;
  if h.id is null then raise exception 'HISTORY_NOT_FOUND' using errcode='22023'; end if;

  -- Old bootstrap versions had no media or info-section keys. Explicit empty
  -- values prevent the regular draft writer from inheriting newer artwork.
  restored := h.payload || jsonb_build_object(
    'coverPath', coalesce(h.payload->>'coverPath',''),
    'pageSections', coalesce(h.payload->'pageSections','[]'::jsonb)
  );
  -- Reuse current engine bounds, media reference integrity and content validation.
  select public.zagraj_catalog_save_draft(p_slug,p_expected_revision,restored)
  into outcome;
  insert into public.zagraj_admin_audit(
    actor_id,action,target_type,target_id,before_state,after_state
  ) values (
    auth.uid(),'catalog.history.restore_draft','game',p_slug,
    jsonb_build_object('revision',g.revision,'draftState',g.draft_state,'draft',g.draft),
    jsonb_build_object('sourcePublishedRevision',h.revision,'revision',(outcome->>'revision')::integer,'draftState','draft')
  );
  return jsonb_build_object('slug',p_slug,'revision',(outcome->>'revision')::integer,
    'state','draft','sourcePublishedRevision',h.revision);
end; $$;

revoke all on function public.zagraj_catalog_history_list(text) from public,anon;
revoke all on function public.zagraj_catalog_restore_draft(text,integer,integer) from public,anon;
grant execute on function public.zagraj_catalog_history_list(text) to authenticated;
grant execute on function public.zagraj_catalog_restore_draft(text,integer,integer) to authenticated;
