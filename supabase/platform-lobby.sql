-- Lobby extension for shared PartyPlay rooms.
-- Applied to Supabase project platforma-gier.

alter table app_private.platform_rooms
  add column if not exists host_token uuid not null default gen_random_uuid();

create table if not exists app_private.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references app_private.platform_rooms(id) on delete cascade,
  player_token uuid not null unique default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 1 and 20),
  avatar text not null check (avatar in (
    'avatar-01','avatar-02','avatar-03','avatar-04','avatar-05',
    'avatar-06','avatar-07','avatar-08','avatar-09','avatar-10',
    'avatar-11','avatar-12','avatar-13','avatar-14','avatar-15',
    'avatar-16','avatar-17','avatar-18','avatar-19','avatar-20',
    'lion','fox','panda','tiger','koala','owl',
    'frog','penguin','bear','rabbit','monkey','cat'
  )),
  team text null check (team in ('A','B')),
  ready boolean not null default false,
  joined_at timestamptz not null default now()
);

create unique index if not exists room_players_unique_name
  on app_private.room_players (room_id, lower(trim(display_name)));

alter table app_private.room_players enable row level security;
revoke all on app_private.room_players from public, anon, authenticated;

drop policy if exists "deny direct client access" on app_private.room_players;
create policy "deny direct client access"
  on app_private.room_players
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Public access is intentionally limited to RPC functions.
-- The live database also contains the create/join/list/ready/team/start RPCs
-- defined by the corresponding Supabase migrations.
