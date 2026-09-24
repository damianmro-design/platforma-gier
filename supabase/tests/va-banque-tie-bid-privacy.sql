-- Reversible regression for private tie bids in VA BANQUE.
-- All synthetic data is discarded with ROLLBACK.
BEGIN;
DO $setup$
DECLARE r record; a record; b record;
BEGIN
  SELECT * INTO r FROM public.create_platform_room('va-banque');
  SELECT * INTO a FROM public.join_platform_room(r.code,'AuditA','avatar-01');
  SELECT * INTO b FROM public.join_platform_room(r.code,'AuditB','avatar-01');
  IF NOT public.set_player_ready(r.code,a.player_token,true)
     OR NOT public.set_player_ready(r.code,b.player_token,true) THEN
    RAISE EXCEPTION 'ready failed';
  END IF;
  IF NOT public.start_platform_room(r.code,r.host_token) THEN
    RAISE EXCEPTION 'start failed';
  END IF;
  UPDATE app_private.va_banque_games
    SET phase='tie_bid',phase_deadline=now()+interval '5 minutes',
        tie_player_ids=array[a.id,b.id],winning_bid=100,
        last_event=jsonb_build_object('type','bid_tie','bid',100)
    WHERE room_id=r.id;
  UPDATE app_private.va_banque_players SET
    bid=100,bid_locked=true,tie_bid=150,tie_locked=true
    WHERE room_id=r.id AND player_id=a.id;
  UPDATE app_private.va_banque_players SET
    bid=100,bid_locked=true,tie_bid=null,tie_locked=false
    WHERE room_id=r.id AND player_id=b.id;
  PERFORM set_config('audit.room',r.id::text,true);
  PERFORM set_config('audit.code',r.code,true);
  PERFORM set_config('audit.player_a',a.player_token::text,true);
  PERFORM set_config('audit.player_b',b.player_token::text,true);
  PERFORM set_config('audit.other_id',a.id::text,true);
END $setup$;

SET LOCAL ROLE anon;
DO $hidden$
DECLARE state_b jsonb; state_a jsonb; early_bid jsonb;
BEGIN
  state_b:=public.get_va_banque_state(current_setting('audit.code'),
    current_setting('audit.player_b')::uuid,null::uuid);
  SELECT item->'tieBid' INTO early_bid
    FROM jsonb_array_elements(state_b->'bids') item
    WHERE item->>'playerId'=current_setting('audit.other_id');
  IF early_bid IS DISTINCT FROM 'null'::jsonb THEN
    RAISE EXCEPTION 'Opponent tie bid leaked early';
  END IF;
  state_a:=public.get_va_banque_state(current_setting('audit.code'),
    current_setting('audit.player_a')::uuid,null::uuid);
  IF state_a#>>'{viewer,tieBid}' <> '150' THEN
    RAISE EXCEPTION 'Own locked tie bid not shown to player';
  END IF;
END $hidden$;

RESET ROLE;
UPDATE app_private.va_banque_games
SET phase='tie_reveal',phase_deadline=now()+interval '5 minutes'
WHERE room_id=current_setting('audit.room')::uuid;

SET LOCAL ROLE anon;
DO $revealed$
DECLARE state_b jsonb; disclosed_bid jsonb;
BEGIN
  state_b:=public.get_va_banque_state(current_setting('audit.code'),
    current_setting('audit.player_b')::uuid,null::uuid);
  SELECT item->'tieBid' INTO disclosed_bid
    FROM jsonb_array_elements(state_b->'bids') item
    WHERE item->>'playerId'=current_setting('audit.other_id');
  IF disclosed_bid IS DISTINCT FROM '150'::jsonb THEN
    RAISE EXCEPTION 'Tie bid not disclosed after reveal';
  END IF;
END $revealed$;
ROLLBACK;
