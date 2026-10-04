-- Host-approved return flow for active platform rooms.
-- A disconnected player requests access by their existing display name.
-- The host approves the request, then the same browser receives the existing player session.

create table if not exists app_private.platform_rejoin_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references app_private.platform_rooms(id) on delete cascade,
  player_id uuid not null references app_private.room_players(id) on delete cascade,
  request_token uuid not null unique default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','approved','denied','used')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  approved_at timestamptz,
  used_at timestamptz
);

create index if not exists platform_rejoin_requests_room_status_idx
  on app_private.platform_rejoin_requests(room_id,status,created_at desc);

create or replace function app_private.request_platform_rejoin_internal(
  p_code text,
  p_display_name text
)
returns table(request_token uuid, display_name text)
language plpgsql
security definer
set search_path = app_private, pg_temp
as $function$
declare
  r app_private.platform_rooms%rowtype;
  target_player app_private.room_players%rowtype;
  req app_private.platform_rejoin_requests%rowtype;
begin
  select pr.* into r
  from app_private.platform_rooms pr
  where pr.code=upper(trim(p_code))
    and pr.status='active'
    and pr.expires_at>now()
  limit 1;

  if r.id is null then
    raise exception 'Room not active';
  end if;

  select rp.* into target_player
  from app_private.room_players rp
  where rp.room_id=r.id
    and lower(rp.display_name)=lower(trim(p_display_name))
  limit 1;

  if target_player.id is null then
    raise exception 'Player not found';
  end if;

  update app_private.platform_rejoin_requests q
  set status='denied'
  where q.room_id=r.id
    and q.player_id=target_player.id
    and q.status='pending';

  insert into app_private.platform_rejoin_requests(room_id,player_id)
  values(r.id,target_player.id)
  returning * into req;

  return query select req.request_token,target_player.display_name;
end;
$function$;

create or replace function app_private.list_platform_rejoin_requests_internal(
  p_code text,
  p_host_token uuid
)
returns table(
  request_id uuid,
  player_id uuid,
  display_name text,
  avatar text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select q.id,p.id,p.display_name,p.avatar,q.created_at
  from app_private.platform_rooms r
  join app_private.platform_rejoin_requests q on q.room_id=r.id
  join app_private.room_players p on p.id=q.player_id
  where r.code=upper(trim(p_code))
    and r.host_token=p_host_token
    and r.status='active'
    and r.expires_at>now()
    and q.status='pending'
    and q.expires_at>now()
  order by q.created_at asc;
$function$;

create or replace function app_private.approve_platform_rejoin_internal(
  p_code text,
  p_host_token uuid,
  p_request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = app_private, pg_temp
as $function$
declare
  r app_private.platform_rooms%rowtype;
begin
  select * into r
  from app_private.platform_rooms
  where code=upper(trim(p_code))
    and host_token=p_host_token
    and status='active'
    and expires_at>now()
  limit 1;

  if r.id is null then
    raise exception 'Access denied';
  end if;

  update app_private.platform_rejoin_requests
  set status='approved',approved_at=now()
  where id=p_request_id
    and room_id=r.id
    and status='pending'
    and expires_at>now();

  return found;
end;
$function$;

create or replace function app_private.consume_platform_rejoin_internal(
  p_code text,
  p_request_token uuid
)
returns table(
  id uuid,
  player_token uuid,
  display_name text,
  avatar text,
  team text,
  ready boolean
)
language plpgsql
security definer
set search_path = app_private, pg_temp
as $function$
declare
  req app_private.platform_rejoin_requests%rowtype;
begin
  select q.* into req
  from app_private.platform_rejoin_requests q
  join app_private.platform_rooms r on r.id=q.room_id
  where r.code=upper(trim(p_code))
    and q.request_token=p_request_token
    and q.status='approved'
    and q.expires_at>now()
    and r.status='active'
    and r.expires_at>now()
  for update of q
  limit 1;

  if req.id is null then
    return;
  end if;

  update app_private.platform_rejoin_requests q
  set status='used',used_at=now()
  where q.id=req.id;

  return query
  select p.id,p.player_token,p.display_name,p.avatar,p.team,p.ready
  from app_private.room_players p
  where p.id=req.player_id;
end;
$function$;

create or replace function public.request_platform_rejoin(
  p_code text,
  p_display_name text
)
returns table(request_token uuid, display_name text)
language sql
set search_path = ''
as $function$
  select * from app_private.request_platform_rejoin_internal(p_code,p_display_name);
$function$;

create or replace function public.list_platform_rejoin_requests(
  p_code text,
  p_host_token uuid
)
returns table(
  request_id uuid,
  player_id uuid,
  display_name text,
  avatar text,
  created_at timestamptz
)
language sql
set search_path = ''
as $function$
  select * from app_private.list_platform_rejoin_requests_internal(p_code,p_host_token);
$function$;

create or replace function public.approve_platform_rejoin(
  p_code text,
  p_host_token uuid,
  p_request_id uuid
)
returns boolean
language sql
set search_path = ''
as $function$
  select app_private.approve_platform_rejoin_internal(p_code,p_host_token,p_request_id);
$function$;

create or replace function public.consume_platform_rejoin(
  p_code text,
  p_request_token uuid
)
returns table(
  id uuid,
  player_token uuid,
  display_name text,
  avatar text,
  team text,
  ready boolean
)
language sql
set search_path = ''
as $function$
  select * from app_private.consume_platform_rejoin_internal(p_code,p_request_token);
$function$;

revoke all on function public.request_platform_rejoin(text,text) from public;
revoke all on function public.list_platform_rejoin_requests(text,uuid) from public;
revoke all on function public.approve_platform_rejoin(text,uuid,uuid) from public;
revoke all on function public.consume_platform_rejoin(text,uuid) from public;

grant execute on function public.request_platform_rejoin(text,text) to anon, authenticated;
grant execute on function public.list_platform_rejoin_requests(text,uuid) to anon, authenticated;
grant execute on function public.approve_platform_rejoin(text,uuid,uuid) to anon, authenticated;
grant execute on function public.consume_platform_rejoin(text,uuid) to anon, authenticated;
