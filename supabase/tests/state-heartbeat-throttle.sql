-- Regression: a stale heartbeat is refreshed; a recent heartbeat is not
-- rewritten on every public game state GET. Synthetic games only; ROLLBACK.
BEGIN;
DO $audit$
DECLARE
  r record;
  p record;
  i integer;
  last_seen timestamptz;
  expected_seen timestamptz;
  state jsonb;
BEGIN
  SELECT * INTO r FROM public.create_platform_room('va-banque');
  SELECT * INTO p FROM public.join_platform_room(r.code,'AuditHeartbeatVA1','avatar-01');
  PERFORM public.set_player_ready(r.code,p.player_token,true);
  FOR i IN 2..2 LOOP
    PERFORM public.join_platform_room(r.code,'AuditHeartbeatVA' || i,'avatar-01');
  END LOOP;
  -- Ready the second player via private room rows only in this reversible test.
  UPDATE app_private.room_players SET ready=true WHERE room_id=r.id;
  IF NOT public.start_platform_room(r.code,r.host_token) THEN RAISE EXCEPTION 'VA start failed'; END IF;
  UPDATE app_private.room_players SET last_seen_at=now()-interval '10 seconds' WHERE id=p.id;
  state:=public.get_va_banque_state(r.code,p.player_token,null::uuid);
  SELECT last_seen_at INTO last_seen FROM app_private.room_players WHERE id=p.id;
  IF last_seen<>now() THEN RAISE EXCEPTION 'VA stale heartbeat not refreshed'; END IF;
  UPDATE app_private.room_players SET last_seen_at=now()-interval '1 second' WHERE id=p.id;
  state:=public.get_va_banque_state(r.code,p.player_token,null::uuid);
  SELECT last_seen_at INTO last_seen FROM app_private.room_players WHERE id=p.id;
  IF last_seen<>now()-interval '1 second' THEN RAISE EXCEPTION 'VA hot poll caused extra write'; END IF;
  IF state->'players' IS NULL THEN RAISE EXCEPTION 'VA state failed'; END IF;

  SELECT * INTO r FROM public.create_platform_room('pod-przykrywka');
  FOR i IN 1..6 LOOP
    SELECT * INTO p FROM public.join_platform_room(r.code,'AuditHeartbeatPP' || i,'avatar-01');
    PERFORM public.set_player_ready(r.code,p.player_token,true);
    IF i=1 THEN expected_seen:=null; END IF;
    IF i=1 THEN
      PERFORM set_config('audit.pp_player_id',p.id::text,true);
      PERFORM set_config('audit.pp_token',p.player_token::text,true);
    END IF;
  END LOOP;
  IF NOT public.start_platform_room(r.code,r.host_token) THEN RAISE EXCEPTION 'PP start failed'; END IF;
  UPDATE app_private.room_players SET last_seen_at=now()-interval '10 seconds' WHERE id=current_setting('audit.pp_player_id')::uuid;
  state:=public.get_pp_state(r.code,current_setting('audit.pp_token')::uuid);
  SELECT last_seen_at INTO last_seen FROM app_private.room_players WHERE id=current_setting('audit.pp_player_id')::uuid;
  IF last_seen<>now() THEN RAISE EXCEPTION 'PP stale heartbeat not refreshed'; END IF;
  UPDATE app_private.room_players SET last_seen_at=now()-interval '1 second' WHERE id=current_setting('audit.pp_player_id')::uuid;
  state:=public.get_pp_state(r.code,current_setting('audit.pp_token')::uuid);
  SELECT last_seen_at INTO last_seen FROM app_private.room_players WHERE id=current_setting('audit.pp_player_id')::uuid;
  IF last_seen<>now()-interval '1 second' THEN RAISE EXCEPTION 'PP hot poll caused extra write'; END IF;
  IF state#>>'{currentPlayer,role}' IS NULL THEN RAISE EXCEPTION 'PP private role not returned'; END IF;
END;
$audit$;
ROLLBACK;
