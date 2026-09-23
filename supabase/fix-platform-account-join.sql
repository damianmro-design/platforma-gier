-- Fix account-backed lobby joins.
-- The public wrapper must run as its owner so it can call the locked-down
-- app_private verifier. The verifier still validates x-partyplay-auth
-- against the zaGRAj auth project before joining the room.

create or replace function public.join_platform_room_account(
  p_code text,
  p_display_name text,
  p_avatar text
)
returns table (
  id uuid,
  player_token uuid,
  display_name text,
  avatar text,
  team text,
  ready boolean
)
language sql
security definer
set search_path = ''
as $$
  select *
  from app_private.join_platform_room_account_secure_internal(
    p_code,
    p_display_name,
    p_avatar
  );
$$;

revoke all on function public.join_platform_room_account(text, text, text) from public;
grant execute on function public.join_platform_room_account(text, text, text) to anon, authenticated;
