-- Defensive validation of all user-editable arrays and section types.
CREATE OR REPLACE FUNCTION public.zagraj_catalog_save_draft(p_slug text, p_expected_revision integer, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare m public.zagraj_admin_members%rowtype;
 g public.zagraj_catalog_games%rowtype;
 c jsonb;
 x text;
 section jsonb;
 sections jsonb := '[]'::jsonb;
 raw_sections jsonb;
 section_bullets jsonb;
 bullet text;
 used_ids text[] := '{}'::text[];
begin
 select * into m from public.zagraj_admin_members where user_id=auth.uid() and active;
 if m.user_id is null or (m.role<>'owner' and not ('games.edit'=any(m.permissions)
     and (cardinality(m.game_slugs)=0 or p_slug=any(m.game_slugs)))) then
   raise exception 'GAME_EDIT_FORBIDDEN' using errcode='42501'; end if;
 select * into g from public.zagraj_catalog_games where slug=p_slug for update;
 if g.slug is null then raise exception 'GAME_NOT_FOUND' using errcode='22023'; end if;
 if g.revision is distinct from p_expected_revision then
   raise exception 'CATALOG_REVISION_CONFLICT' using errcode='40001'; end if;
 if jsonb_typeof(p_data) is distinct from 'object' then
   raise exception 'INVALID_CARD' using errcode='22023'; end if;
 if length(trim(coalesce(p_data->>'title',''))) not between 1 and 80
    or length(trim(coalesce(p_data->>'eyebrow',''))) not between 1 and 90
    or length(trim(coalesce(p_data->>'description',''))) not between 1 and 600 then
   raise exception 'INVALID_CARD_TEXT' using errcode='22023'; end if;
 if (p_data->>'minPlayers') !~ '^[0-9]+$' or (p_data->>'maxPlayers') !~ '^[0-9]+$'
   or (p_data->>'minTime') !~ '^[0-9]+$' or (p_data->>'maxTime') !~ '^[0-9]+$'
   or (p_data->>'sortOrder') !~ '^[0-9]+$' then
   raise exception 'INVALID_CARD_NUMBER' using errcode='22023'; end if;
 if (p_data->>'minPlayers')::integer < g.engine_min_players
   or (p_data->>'maxPlayers')::integer > g.engine_max_players
   or (p_data->>'minPlayers')::integer > (p_data->>'maxPlayers')::integer
   or (p_data->>'minTime')::integer < 5
   or (p_data->>'maxTime')::integer > 240
   or (p_data->>'minTime')::integer > (p_data->>'maxTime')::integer
   or (p_data->>'sortOrder')::integer > 99 then
   raise exception 'CARD_OUTSIDE_ENGINE_LIMITS' using errcode='22023'; end if;
 if (p_data->>'accent') not in ('gold','pink','yellow','cyan','red','violet')
   or (p_data->>'art') not in ('millionaire','floor','people','agent','crime','word','duo','cipher','auction')
   or (p_data->>'status') not in ('hit','new','soon')
   or jsonb_typeof(p_data->'isVisible') is distinct from 'boolean'
   or jsonb_typeof(p_data->'tags') is distinct from 'array'
   or jsonb_typeof(p_data->'categories') is distinct from 'array'
   or jsonb_typeof(p_data->'moods') is distinct from 'array'
   or jsonb_array_length(p_data->'tags')>8
   or jsonb_array_length(p_data->'categories')>3
   or jsonb_array_length(p_data->'moods')>4 then
    raise exception 'INVALID_CARD_OPTIONS' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(p_data->'tags') as v(value) where jsonb_typeof(v.value)<>'string')
    or exists(select 1 from jsonb_array_elements(p_data->'categories') as v(value) where jsonb_typeof(v.value)<>'string')
    or exists(select 1 from jsonb_array_elements(p_data->'moods') as v(value) where jsonb_typeof(v.value)<>'string') then
   raise exception 'INVALID_CARD_ARRAY_TYPES' using errcode='22023'; end if;
 for x in select jsonb_array_elements_text(p_data->'tags') loop
   if length(trim(x)) not between 1 and 40 then raise exception 'INVALID_TAG' using errcode='22023'; end if;
 end loop;
 for x in select jsonb_array_elements_text(p_data->'categories') loop
   if x not in ('funny','strategic','team') then raise exception 'INVALID_CATEGORY' using errcode='22023'; end if;
 end loop;
 for x in select jsonb_array_elements_text(p_data->'moods') loop
   if x not in ('laugh','think','compete','cooperate') then raise exception 'INVALID_MOOD' using errcode='22023'; end if;
 end loop;
 raw_sections := coalesce(p_data->'pageSections',g.draft->'pageSections',g.published->'pageSections','[]'::jsonb);
 if jsonb_typeof(raw_sections)<>'array' or jsonb_array_length(raw_sections)>8 then
   raise exception 'INVALID_PAGE_SECTIONS' using errcode='22023'; end if;
 for section in select value from jsonb_array_elements(raw_sections) loop
   if jsonb_typeof(section)<>'object'
      or coalesce(section->>'id','') !~ '^[a-zA-Z0-9_-]{1,70}$'
      or (section->>'id')=any(used_ids)
      or coalesce(section->>'kind','') not in ('info','steps','notice')
      or length(trim(coalesce(section->>'title',''))) not between 1 and 90
      or length(trim(coalesce(section->>'body','')))>1200 then
      raise exception 'INVALID_PAGE_SECTION' using errcode='22023'; end if;
   section_bullets:=coalesce(section->'bullets','[]'::jsonb);
   if jsonb_typeof(section_bullets)<>'array' or jsonb_array_length(section_bullets)>6 then
      raise exception 'INVALID_SECTION_BULLETS' using errcode='22023'; end if;
   if exists(select 1 from jsonb_array_elements(section_bullets) as v(value)
       where jsonb_typeof(v.value)<>'string') then
      raise exception 'INVALID_SECTION_BULLET_TYPE' using errcode='22023'; end if;
   for bullet in select jsonb_array_elements_text(section_bullets) loop
     if length(trim(coalesce(bullet,''))) not between 1 and 180 then
       raise exception 'INVALID_SECTION_BULLET' using errcode='22023'; end if;
   end loop;
   if trim(coalesce(section->>'body',''))='' and jsonb_array_length(section_bullets)=0 then
     raise exception 'EMPTY_PAGE_SECTION' using errcode='22023'; end if;
   sections:=sections||jsonb_build_array(jsonb_build_object(
     'id',section->>'id','kind',section->>'kind',
     'title',trim(section->>'title'),'body',trim(coalesce(section->>'body','')),
     'bullets',section_bullets
   ));
   used_ids:=array_append(used_ids,section->>'id');
 end loop;
 -- Explicit allowlist and backend-owned technical routing. No arbitrary href, JS or auth handoff edits.
 c:=g.published || jsonb_build_object(
  'title',trim(p_data->>'title'),'eyebrow',trim(p_data->>'eyebrow'),
  'description',trim(p_data->>'description'),
  'minPlayers',(p_data->>'minPlayers')::integer,'maxPlayers',(p_data->>'maxPlayers')::integer,
  'minTime',(p_data->>'minTime')::integer,'maxTime',(p_data->>'maxTime')::integer,
  'players',case when (p_data->>'minPlayers')::integer=(p_data->>'maxPlayers')::integer
         then (p_data->>'minPlayers')||' graczy'
         else (p_data->>'minPlayers')||'–'||(p_data->>'maxPlayers')||' graczy' end,
  'time',(p_data->>'minTime')||'–'||(p_data->>'maxTime')||' min',
  'tags',p_data->'tags','categories',p_data->'categories','moods',p_data->'moods',
  'accent',p_data->>'accent','art',p_data->>'art','status',p_data->>'status',
  'sortOrder',(p_data->>'sortOrder')::integer,'isVisible',(p_data->>'isVisible')::boolean,'pageSections',sections
 );
 -- Preserve a prior draft if the editor is only changing one field.
 update public.zagraj_catalog_games set draft=c,draft_state='draft',draft_author=auth.uid(),
   submitted_by=null,revision=revision+1,updated_by=auth.uid(),updated_at=now()
 where slug=p_slug;
 insert into public.zagraj_admin_audit(actor_id,action,target_type,target_id,before_state,after_state)
 values(auth.uid(),'catalog.draft.save','game',p_slug,
  jsonb_build_object('revision',g.revision,'draft',g.draft),
  jsonb_build_object('revision',g.revision+1,'draft',c));
 return jsonb_build_object('slug',p_slug,'revision',g.revision+1,'state','draft');
end; $function$

