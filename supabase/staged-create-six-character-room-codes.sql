-- STAGED ONLY. DO NOT APPLY until release gate:
-- (1) front-end 4/6 compatibility is deployed and confirmed on Vercel,
-- (2) encrypted backup of BOTH databases and isolated restore have succeeded,
-- (3) separate staging game creates a 6-character code and completes a round,
-- (4) direct RPC rate limits/abuse protection are designed and tested.
--
-- Existing 4-character rooms remain accessible until expiry. The table has no
-- hard-coded 4-character length check in the inspected schema.
-- This changes ONLY allocation of newly created rooms, not active codes.
CREATE OR REPLACE FUNCTION app_private.create_platform_room_internal(p_game_slug text)
 RETURNS TABLE(id uuid, code text, game_slug text, status text, host_token uuid, created_at timestamp with time zone, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'app_private', 'pg_temp'
AS $function$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated_code text;
  inserted_room app_private.platform_rooms%rowtype;
  attempt integer;
begin
  if p_game_slug not in (
    'co-ludzie-powiedza','zakrecone-haslo','pod-przykrywka',
    'akta-nocy','tylko-my','va-banque','szyfr'
  ) then
    raise exception 'Unsupported game';
  end if;

  for attempt in 1..20 loop
    select string_agg(
      substr(alphabet,1+floor(random()*length(alphabet))::integer,1),''
    )
    into generated_code
    from generate_series(1,6);

    begin
      insert into app_private.platform_rooms(code,game_slug)
      values(generated_code,p_game_slug)
      returning * into inserted_room;

      return query
      select inserted_room.id,inserted_room.code,inserted_room.game_slug,
             inserted_room.status,inserted_room.host_token,
             inserted_room.created_at,inserted_room.expires_at;
      return;
    exception when unique_violation then null;
    end;
  end loop;

  raise exception 'Could not allocate room code';
end;
$function$
;
