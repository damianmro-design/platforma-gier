-- Akta Nocy, zamknięcie zakończonej sprawy.

create or replace function app_private.close_akta_nocy_game_internal(
  p_code text,
  p_host_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = app_private, pg_temp
as $$
declare
  target_room_id uuid;
begin
  select id into target_room_id
  from app_private.platform_rooms
  where code = upper(trim(p_code))
    and game_slug = 'akta-nocy'
    and status = 'active'
    and game_phase = 'ujawnienie_4'
    and expires_at > now()
    and host_token = p_host_token
  limit 1;

  if target_room_id is null then
    raise exception 'Room not found';
  end if;

  update app_private.platform_rooms
  set status = 'finished',
      game_phase = 'zamknieta'
  where id = target_room_id;

  return true;
end;
$$;

create or replace function public.close_akta_nocy_game(
  p_code text,
  p_host_token uuid
)
returns boolean
language sql
set search_path = public, app_private, pg_temp
as $$
  select app_private.close_akta_nocy_game_internal(p_code, p_host_token);
$$;

revoke execute on function public.close_akta_nocy_game(text, uuid) from public;
grant execute on function public.close_akta_nocy_game(text, uuid) to anon, authenticated;
