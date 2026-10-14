create or replace function app_private.recover_platform_player_internal(
  p_code text,
  p_display_name text,
  p_recovery_code text
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
stable
security definer
set search_path = ''
as $$
  select p.id,p.player_token,p.display_name,p.avatar,p.team,p.ready
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id=r.id
  where r.code=upper(trim(p_code))
    and r.expires_at>now()
    and r.status in ('lobby','active','finished')
    and lower(p.display_name)=lower(trim(p_display_name))
    and p.recovery_code=upper(trim(p_recovery_code))
  limit 1;
$$;
