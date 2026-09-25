-- zaGRAj II.4: immutable, publicly viewable game artwork, uploaded by scoped administrators only.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'zagraj-game-media','zagraj-game-media',true,5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do nothing;

create table if not exists public.zagraj_admin_media (
  path text primary key,
  game_slug text not null references public.zagraj_catalog_games(slug),
  alt_text text not null default '' check(length(alt_text)<=160),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  file_size bigint not null check(file_size>0 and file_size<=5242880),
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
  created_at timestamptz not null default now(),
  check(path ~ '^[a-z0-9]+(-[a-z0-9]+)*/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|jpeg|webp)$')
);
create index if not exists zagraj_admin_media_game_date_idx
on public.zagraj_admin_media(game_slug,created_at desc);
alter table public.zagraj_admin_media enable row level security;
revoke all on public.zagraj_admin_media from anon, authenticated;

create or replace function public.zagraj_admin_can_manage_media(p_slug text)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.zagraj_admin_members m
    join public.zagraj_catalog_games g on g.slug=p_slug
    where m.user_id=auth.uid() and m.active
      and (m.role='owner' or ('media.manage'=any(m.permissions)
        and (cardinality(m.game_slugs)=0 or p_slug=any(m.game_slugs))))
  );
$$;
revoke all on function public.zagraj_admin_can_manage_media(text) from public,anon;
grant execute on function public.zagraj_admin_can_manage_media(text) to authenticated;

drop policy if exists "zagraj_scoped_admin_media_upload" on storage.objects;
create policy "zagraj_scoped_admin_media_upload" on storage.objects
  for insert to authenticated
  with check(
    bucket_id='zagraj-game-media'
    and name ~ '^[a-z0-9]+(-[a-z0-9]+)*/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|jpeg|webp)$'
    and owner_id=auth.uid()::text
    and public.zagraj_admin_can_manage_media((storage.foldername(name))[1])
  );
-- No storage update/delete policy: no overwrite or broken rollback references.
-- Public URLs on a public bucket do not require anonymous list permission.

create or replace function public.zagraj_admin_media_register(p_path text,p_alt_text text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_slug text;
        v_obj storage.objects%rowtype;
        v_row public.zagraj_admin_media%rowtype;
        v_size bigint;
        v_mime text;
begin
 if p_path is null or p_path !~ '^[a-z0-9]+(-[a-z0-9]+)*/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|jpeg|webp)$' then
   raise exception 'INVALID_MEDIA_PATH' using errcode='22023'; end if;
 v_slug:=split_part(p_path,'/',1);
 if not public.zagraj_admin_can_manage_media(v_slug) then
   raise exception 'MEDIA_FORBIDDEN' using errcode='42501'; end if;
 if length(coalesce(p_alt_text,''))>160 then
   raise exception 'INVALID_ALT_TEXT' using errcode='22023'; end if;
 select * into v_obj from storage.objects
 where bucket_id='zagraj-game-media' and name=p_path and owner_id=auth.uid()::text;
 if v_obj.id is null then raise exception 'MEDIA_NOT_UPLOADED_BY_USER' using errcode='22023'; end if;
 v_size:=case when v_obj.metadata->>'size' ~ '^[0-9]+$' then (v_obj.metadata->>'size')::bigint else 0 end;
 v_mime:=coalesce(v_obj.metadata->>'mimetype','');
 if v_size not between 1 and 5242880
    or v_mime not in ('image/jpeg','image/png','image/webp') then
    raise exception 'INVALID_MEDIA_OBJECT' using errcode='22023'; end if;
 insert into public.zagraj_admin_media(path,game_slug,alt_text,uploaded_by,file_size,mime_type)
 values(p_path,v_slug,trim(coalesce(p_alt_text,'')),auth.uid(),v_size,v_mime)
 on conflict(path) do nothing
 returning * into v_row;
 if v_row.path is null then
   select * into v_row from public.zagraj_admin_media where path=p_path;
   if v_row.uploaded_by is distinct from auth.uid() then
     raise exception 'MEDIA_ALREADY_REGISTERED' using errcode='42501'; end if;
 end if;
 insert into public.zagraj_admin_audit(actor_id,action,target_type,target_id,after_state)
 values(auth.uid(),'media.register','image',p_path,
  jsonb_build_object('game',v_slug,'size',v_size,'mime',v_mime));
 return jsonb_build_object('path',v_row.path,'slug',v_row.game_slug,'altText',v_row.alt_text);
end; $$;

create or replace function public.zagraj_admin_media_list(p_slug text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.zagraj_admin_can_manage_media(p_slug) then
   raise exception 'MEDIA_FORBIDDEN' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object(
   'path',m.path,'slug',m.game_slug,'altText',m.alt_text,
   'fileSize',m.file_size,'mimeType',m.mime_type,'createdAt',m.created_at
 ) order by m.created_at desc),'[]'::jsonb)
 from public.zagraj_admin_media m where m.game_slug=p_slug);
end; $$;

revoke all on function public.zagraj_admin_media_register(text,text) from public,anon;
revoke all on function public.zagraj_admin_media_list(text) from public,anon;
grant execute on function public.zagraj_admin_media_register(text,text) to authenticated;
grant execute on function public.zagraj_admin_media_list(text) to authenticated;