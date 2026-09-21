-- Platform rooms backend.
-- The table lives in a non-exposed schema. Public RPC wrappers only expose
-- the two operations the web app needs: create a room and find an exact code.

create schema if not exists app_private;

create table if not exists app_private.platform_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (code ~ '^[A-Z2-9]{4}$'),
  game_slug text not null
    check (game_slug in ('co-ludzie-powiedza')),
  status text not null default 'lobby'
    check (status in ('lobby', 'active', 'finished')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours')
);

alter table app_private.platform_rooms enable row level security;

revoke all on app_private.platform_rooms from public, anon, authenticated;

drop policy if exists "deny direct client access" on app_private.platform_rooms;
create policy "deny direct client access"
on app_private.platform_rooms
for all
to anon, authenticated
using (false)
with check (false);

create or replace function app_private.create_platform_room_internal(p_game_slug text)
returns table (
  id uuid,
  code text,
  game_slug text,
  status text,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_code text;
  inserted_room app_private.platform_rooms%rowtype;
  attempt integer;
begin
  if p_game_slug not in ('co-ludzie-powiedza') then
    raise exception 'Unsupported game';
  end if;

  for attempt in 1..20 loop
    select string_agg(
      substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1),
      ''
    )
    into generated_code
    from generate_series(1, 4);

    begin
      insert into app_private.platform_rooms (code, game_slug)
      values (generated_code, p_game_slug)
      returning * into inserted_room;

      return query
      select
        inserted_room.id,
        inserted_room.code,
        inserted_room.game_slug,
        inserted_room.status,
        inserted_room.created_at,
        inserted_room.expires_at;
      return;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  raise exception 'Could not allocate room code';
end;
$$;

create or replace function app_private.lookup_platform_room_internal(p_code text)
returns table (
  id uuid,
  code text,
  game_slug text,
  status text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = app_private, pg_temp
as $$
  select
    r.id,
    r.code,
    r.game_slug,
    r.status,
    r.created_at,
    r.expires_at
  from app_private.platform_rooms r
  where r.code = upper(trim(p_code))
    and r.expires_at > now()
    and r.status <> 'finished'
  limit 1;
$$;

revoke all on function app_private.create_platform_room_internal(text) from public;
revoke all on function app_private.lookup_platform_room_internal(text) from public;

grant usage on schema app_private to anon, authenticated;
grant execute on function app_private.create_platform_room_internal(text) to anon, authenticated;
grant execute on function app_private.lookup_platform_room_internal(text) to anon, authenticated;

create or replace function public.create_platform_room(p_game_slug text)
returns table (
  id uuid,
  code text,
  game_slug text,
  status text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select * from app_private.create_platform_room_internal(p_game_slug);
$$;

create or replace function public.lookup_platform_room(p_code text)
returns table (
  id uuid,
  code text,
  game_slug text,
  status text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security invoker
set search_path = public, app_private, pg_temp
as $$
  select * from app_private.lookup_platform_room_internal(p_code);
$$;

revoke all on function public.create_platform_room(text) from public;
revoke all on function public.lookup_platform_room(text) from public;

grant execute on function public.create_platform_room(text) to anon, authenticated;
grant execute on function public.lookup_platform_room(text) to anon, authenticated;
