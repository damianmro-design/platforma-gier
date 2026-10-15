-- Keep finished AKTA NOCY rooms discoverable for their final closed screen.
-- Apartament 214 closes as `zamknieta`, while Ostatni Kurs closes as `ok_zamknieta`.
-- The shared room lookup must allow both terminal phases after status becomes `finished`.

create or replace function app_private.lookup_platform_room_internal(p_code text)
returns table(
  id uuid,
  code text,
  game_slug text,
  status text,
  game_phase text,
  created_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path to ''
as $$
  select
    r.id,
    r.code,
    r.game_slug,
    r.status,
    r.game_phase,
    r.created_at,
    r.expires_at
  from app_private.platform_rooms r
  where r.code = upper(trim(p_code))
    and r.expires_at > now()
    and (
      r.status <> 'finished'
      or (
        r.status = 'finished'
        and r.game_slug = 'akta-nocy'
        and r.game_phase in ('zamknieta', 'ok_zamknieta')
      )
    )
  limit 1;
$$;
