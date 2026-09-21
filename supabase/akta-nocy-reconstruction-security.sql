-- Akta Nocy: wymagaj ważnej sesji hosta lub gracza przy pobieraniu publicznej obsady.

drop function if exists public.get_akta_nocy_public_cast(text);

create or replace function app_private.get_akta_nocy_public_cast_internal(
  p_code text,
  p_session_token uuid
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  role_key text
)
language sql
stable
security definer
set search_path = app_private, pg_temp
as $$
  select
    p.id,
    p.display_name,
    p.avatar,
    a.role_key
  from app_private.platform_rooms r
  join app_private.room_players p on p.room_id = r.id
  join app_private.akta_nocy_assignments a
    on a.room_id = r.id
   and a.player_id = p.id
  where r.code = upper(trim(p_code))
    and r.game_slug = 'akta-nocy'
    and r.status = 'active'
    and r.expires_at > now()
    and (
      r.host_token = p_session_token
      or exists (
        select 1
        from app_private.room_players session_player
        where session_player.room_id = r.id
          and session_player.player_token = p_session_token
      )
    )
  order by p.joined_at, p.id;
$$;

create or replace function public.get_akta_nocy_public_cast(
  p_code text,
  p_session_token uuid
)
returns table (
  player_id uuid,
  display_name text,
  avatar text,
  role_key text
)
language sql
stable
set search_path = public, app_private, pg_temp
as $$
  select *
  from app_private.get_akta_nocy_public_cast_internal(
    p_code,
    p_session_token
  );
$$;

revoke execute on function public.get_akta_nocy_public_cast(text, uuid) from public;
grant execute on function public.get_akta_nocy_public_cast(text, uuid) to anon, authenticated;
