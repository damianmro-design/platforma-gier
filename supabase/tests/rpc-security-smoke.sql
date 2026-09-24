-- Run in the PLATFORM database SQL Editor, NEVER in the Polowanie database.
-- Synthetic guest game + host/player token authorization smoke test.
-- All test data is rolled back. No real room tokens or player data are selected.
-- An assertion error aborts the transaction; ROLLBACK the session if needed.
BEGIN;
SET LOCAL ROLE anon;

DO $security_smoke$
DECLARE
  room_a record;
  room_b record;
  p record;
  other_player record;
  valid_token uuid;
  i integer;
  public_state jsonb;
  random_state jsonb;
  valid_state jsonb;
  initial_phase text;
BEGIN
  SELECT * INTO room_a FROM public.create_platform_room('pod-przykrywka');
  SELECT * INTO room_b FROM public.create_platform_room('pod-przykrywka');
  IF room_a.code IS NULL OR room_b.code IS NULL THEN
    RAISE EXCEPTION 'Cannot create synthetic rooms';
  END IF;

  IF NOT public.is_platform_room_host(room_a.code, room_a.host_token) THEN
    RAISE EXCEPTION 'Valid host token rejected';
  END IF;
  IF public.is_platform_room_host(room_a.code, room_b.host_token)
     OR public.is_platform_room_host(room_b.code, room_a.host_token)
     OR public.is_platform_room_host(room_a.code, gen_random_uuid()) THEN
    RAISE EXCEPTION 'Invalid/cross-room host token accepted';
  END IF;
  IF public.start_platform_room(room_a.code, room_b.host_token) THEN
    RAISE EXCEPTION 'Cross-room host started a game';
  END IF;

  FOR i IN 1..6 LOOP
    SELECT * INTO p FROM public.join_platform_room(room_a.code, 'Audit_' || i, 'avatar-01');
    IF p.player_token IS NULL THEN RAISE EXCEPTION 'Join failed'; END IF;
    IF NOT public.set_player_ready(room_a.code, p.player_token, true) THEN
      RAISE EXCEPTION 'Ready failed';
    END IF;
    IF i=1 THEN valid_token:=p.player_token; END IF;
  END LOOP;

  SELECT * INTO other_player FROM public.join_platform_room(room_b.code, 'Audit_other', 'avatar-01');

  IF NOT public.start_platform_room(room_a.code, room_a.host_token) THEN
    RAISE EXCEPTION 'Correct host could not start the game';
  END IF;

  public_state:=public.get_pp_state(room_a.code, NULL::uuid);
  random_state:=public.get_pp_state(room_a.code, gen_random_uuid());
  valid_state:=public.get_pp_state(room_a.code, valid_token);

  IF public_state->'currentPlayer' <> 'null'::jsonb
     OR random_state->'currentPlayer' <> 'null'::jsonb
     OR (public.get_pp_state(room_a.code,other_player.player_token)->'currentPlayer') <> 'null'::jsonb THEN
    RAISE EXCEPTION 'Unauthorized player identity leaked';
  END IF;
  IF public_state#>'{twist,secretOrder}' <> 'null'::jsonb THEN
    RAISE EXCEPTION 'Hidden order leaked before reveal';
  END IF;
  IF valid_state#>>'{currentPlayer,role}' IS NULL THEN
    RAISE EXCEPTION 'Valid player cannot read own role';
  END IF;

  SELECT game_phase INTO initial_phase FROM public.lookup_platform_room(room_a.code);
  BEGIN
    PERFORM public.advance_pp_phase(room_a.code, room_b.host_token);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  IF (SELECT game_phase FROM public.lookup_platform_room(room_a.code))
      IS DISTINCT FROM initial_phase THEN
    RAISE EXCEPTION 'Unauthorized host advanced the game';
  END IF;

  IF has_table_privilege(current_user, 'app_private.pp_roles', 'SELECT')
     OR has_table_privilege(current_user, 'app_private.pp_votes', 'SELECT') THEN
    RAISE EXCEPTION 'Anonymous user can read private tables';
  END IF;
END;
$security_smoke$;

ROLLBACK;
