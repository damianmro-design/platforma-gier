-- zaGRAj administration foundation. Auth project, not platform gameplay DB.
create table if not exists public.zagraj_admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','editor','author','moderator','analyst','support')),
  permissions text[] not null default '{}'::text[],
  game_slugs text[] not null default '{}'::text[],
  active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zagraj_admin_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index if not exists zagraj_admin_audit_time_idx on public.zagraj_admin_audit(created_at desc);

alter table public.zagraj_admin_members enable row level security;
alter table public.zagraj_admin_audit enable row level security;
revoke all on public.zagraj_admin_members from anon,authenticated;
revoke all on public.zagraj_admin_audit from anon,authenticated;
revoke all on sequence public.zagraj_admin_audit_id_seq from anon,authenticated;

create or replace function public.zagraj_admin_my_access()
returns jsonb language plpgsql stable security definer
set search_path='' as $$
declare m public.zagraj_admin_members%rowtype;
begin
 if auth.uid() is null then return jsonb_build_object('authorized',false); end if;
 select * into m from public.zagraj_admin_members
 where user_id=auth.uid() and active=true;
 if m.user_id is null then return jsonb_build_object('authorized',false); end if;
 return jsonb_build_object('authorized',true,'userId',m.user_id,
 'role',m.role,'permissions',m.permissions,'gameSlugs',m.game_slugs);
end; $$;

create or replace function public.zagraj_admin_dashboard()
returns jsonb language plpgsql stable security definer
set search_path='' as $$
declare m public.zagraj_admin_members%rowtype;
begin
 select * into m from public.zagraj_admin_members
 where user_id=auth.uid() and active=true;
 if m.user_id is null then raise exception 'ADMIN_FORBIDDEN' using errcode='42501'; end if;
 return jsonb_build_object(
  'staffTotal',(select count(*) from public.zagraj_admin_members where active),
  'staffByRole',(select coalesce(jsonb_object_agg(role,amount),'{}'::jsonb)
      from (select role,count(*) amount from public.zagraj_admin_members where active group by role) x),
  'auditTotal',(select count(*) from public.zagraj_admin_audit),
  'recentEvents',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'action',action,
    'targetType',target_type,'targetId',target_id,'createdAt',created_at)
     order by created_at desc),'[]'::jsonb)
    from (select id,action,target_type,target_id,created_at from public.zagraj_admin_audit
      order by created_at desc limit 12) x)
 );
end; $$;

create or replace function public.zagraj_admin_list_staff()
returns jsonb language plpgsql stable security definer
set search_path='' as $$
declare m public.zagraj_admin_members%rowtype;
begin
 select * into m from public.zagraj_admin_members where user_id=auth.uid() and active;
 if m.user_id is null or m.role <> 'owner' then
   raise exception 'OWNER_REQUIRED' using errcode='42501';
 end if;
 return (select coalesce(jsonb_agg(jsonb_build_object(
  'userId',s.user_id,'email',u.email,'role',s.role,'active',s.active,
  'permissions',s.permissions,'gameSlugs',s.game_slugs,'createdAt',s.created_at)
  order by s.created_at),'[]'::jsonb)
 from public.zagraj_admin_members s join auth.users u on u.id=s.user_id);
end; $$;

create or replace function public.zagraj_admin_set_staff(
 p_email text,p_role text,p_permissions text[] default '{}'::text[],
 p_game_slugs text[] default '{}'::text[],p_active boolean default true
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor public.zagraj_admin_members%rowtype;
 target_user auth.users%rowtype;
 previous_row public.zagraj_admin_members%rowtype;
 normalized_email text := lower(trim(coalesce(p_email,'')));
 allowed_permissions constant text[] := array[
 'games.read','games.create','games.edit','games.publish','games.manage',
 'media.manage','users.read','users.moderate','analytics.read','progress.manage',
 'admin.read','admin.manage','settings.manage','audit.read'
 ];
 clean_perms text[];
 clean_slugs text[];
begin
 select * into actor from public.zagraj_admin_members where user_id=auth.uid() and active;
 if actor.user_id is null or actor.role <> 'owner' then
  raise exception 'OWNER_REQUIRED' using errcode='42501'; end if;
 if length(normalized_email)<3 or length(normalized_email)>320 then
  raise exception 'INVALID_EMAIL' using errcode='22023'; end if;
 if p_role not in ('admin','editor','author','moderator','analyst','support') then
  raise exception 'INVALID_ROLE' using errcode='22023'; end if;
 if coalesce(array_length(p_permissions,1),0)>30 or
    exists(select 1 from unnest(coalesce(p_permissions,'{}'::text[])) v where v<>all(allowed_permissions)) then
   raise exception 'INVALID_PERMISSIONS' using errcode='22023'; end if;
 if coalesce(array_length(p_game_slugs,1),0)>100 or
    exists(select 1 from unnest(coalesce(p_game_slugs,'{}'::text[])) v
           where v !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v)>80) then
   raise exception 'INVALID_GAME_SCOPE' using errcode='22023'; end if;
 select * into target_user from auth.users where lower(email)=normalized_email
   and email_confirmed_at is not null limit 1;
 if target_user.id is null then raise exception 'CONFIRMED_ACCOUNT_NOT_FOUND' using errcode='22023'; end if;
 select * into previous_row from public.zagraj_admin_members where user_id=target_user.id for update;
 if previous_row.role='owner' then raise exception 'OWNER_IMMUTABLE' using errcode='42501'; end if;
 clean_perms:=array(select distinct v from unnest(coalesce(p_permissions,'{}'::text[])) v order by v);
 clean_slugs:=array(select distinct v from unnest(coalesce(p_game_slugs,'{}'::text[])) v order by v);
 insert into public.zagraj_admin_members(user_id,role,permissions,game_slugs,active,granted_by)
 values(target_user.id,p_role,clean_perms,clean_slugs,p_active,auth.uid())
 on conflict(user_id) do update set role=excluded.role,permissions=excluded.permissions,
 game_slugs=excluded.game_slugs,active=excluded.active,
 granted_by=excluded.granted_by,updated_at=now();
 insert into public.zagraj_admin_audit(actor_id,action,target_type,target_id,before_state,after_state)
 values(auth.uid(),'staff.upsert','admin_member',target_user.id::text,
 case when previous_row.user_id is null then null else jsonb_build_object(
  'role',previous_row.role,'active',previous_row.active,
  'permissions',previous_row.permissions,'gameSlugs',previous_row.game_slugs) end,
 jsonb_build_object('role',p_role,'active',p_active,'permissions',clean_perms,'gameSlugs',clean_slugs));
 return jsonb_build_object('ok',true,'userId',target_user.id);
end; $$;

revoke all on function public.zagraj_admin_my_access() from public,anon;
revoke all on function public.zagraj_admin_dashboard() from public,anon;
revoke all on function public.zagraj_admin_list_staff() from public,anon;
revoke all on function public.zagraj_admin_set_staff(text,text,text[],text[],boolean) from public,anon;
grant execute on function public.zagraj_admin_my_access() to authenticated;
grant execute on function public.zagraj_admin_dashboard() to authenticated;
grant execute on function public.zagraj_admin_list_staff() to authenticated;
grant execute on function public.zagraj_admin_set_staff(text,text,text[],text[],boolean) to authenticated;

-- Bootstrap once from the verified, existing auth account, by immutable UUID after lookup.
do $$
declare uid uuid;
begin
 select id into uid from auth.users where lower(email)='damian.mro@wp.pl'
  and email_confirmed_at is not null limit 1;
 if uid is null then raise exception 'OWNER_ACCOUNT_NOT_CONFIRMED'; end if;
 insert into public.zagraj_admin_members(user_id,role,permissions,game_slugs,active)
 values(uid,'owner','{}','{}',true)
 on conflict(user_id) do nothing;
end; $$;
