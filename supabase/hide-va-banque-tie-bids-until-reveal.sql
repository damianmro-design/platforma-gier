-- Public game-state payload must not reveal a locked tie bid to other players
-- while the tie bidding phase is still running. The player's own viewer.tieBid
-- remains visible, and all bids are shown after tie_reveal begins.
CREATE OR REPLACE FUNCTION app_private.get_va_banque_state_internal(p_code text, p_player_token uuid DEFAULT NULL::uuid, p_host_token uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'app_private', 'pg_temp'
AS $function$
declare
  r app_private.platform_rooms%rowtype;
  g app_private.va_banque_games%rowtype;
  q app_private.va_banque_questions%rowtype;
  viewer app_private.room_players%rowtype;
  vp app_private.va_banque_players%rowtype;
  v_players jsonb;
  v_bids jsonb;
  v_final_answers jsonb;
  v_show_question boolean;
  v_show_solution boolean;
  v_is_host boolean := false;
begin
  perform app_private.va_banque_tick_internal(p_code);

  select * into r
  from app_private.platform_rooms
  where code=upper(trim(p_code))
    and game_slug='va-banque'
    and status='active'
    and expires_at>now()
  limit 1;

  if r.id is null then return null; end if;

  v_is_host := p_host_token is not null and r.host_token=p_host_token;

  if p_player_token is not null then
    select * into viewer
    from app_private.room_players
    where room_id=r.id and player_token=p_player_token
    limit 1;

    if viewer.id is null then
      raise exception 'Player not found';
    end if;

    update app_private.room_players
    set last_seen_at=now()
    where id=viewer.id;

    select * into vp
    from app_private.va_banque_players
    where room_id=r.id and player_id=viewer.id;
  elsif not v_is_host then
    raise exception 'Access denied';
  end if;

  select * into g from app_private.va_banque_games where room_id=r.id;
  select * into q from app_private.va_banque_questions where id=g.question_id;

  v_show_question := g.phase in (
    'question','main_result','takeover_open','takeover_question',
    'takeover_result','round_result','final_question','final_reveal','finished'
  );
  v_show_solution :=
    g.phase in ('takeover_result','round_result','final_reveal','finished')
    or (g.phase='main_result' and g.last_event->>'type'='main_correct');

  select jsonb_agg(
    jsonb_build_object(
      'id',p.player_id,
      'name',rp.display_name,
      'avatar',rp.avatar,
      'points',p.points,
      'isConnected',rp.last_seen_at > now()-interval '12 seconds'
    )
    order by p.points desc,rp.joined_at asc
  ) into v_players
  from app_private.va_banque_players p
  join app_private.room_players rp on rp.id=p.player_id
  where p.room_id=r.id;

  if g.phase in ('bid_reveal','tie_bid','tie_reveal','question','main_result','takeover_open','takeover_question','takeover_result','round_result') then
    select jsonb_agg(
      jsonb_build_object(
        'playerId',p.player_id,
        'bid',p.bid,
        'tieBid',case when g.phase <> 'tie_bid' and p.tie_locked then p.tie_bid else null end
      )
      order by rp.joined_at
    ) into v_bids
    from app_private.va_banque_players p
    join app_private.room_players rp on rp.id=p.player_id
    where p.room_id=r.id;
  else
    v_bids:='[]'::jsonb;
  end if;

  if g.phase in ('final_reveal','finished') then
    select jsonb_agg(
      jsonb_build_object(
        'playerId',p.player_id,
        'bid',p.final_bid,
        'answerIndex',p.final_answer_index,
        'correct',p.final_answer_index=q.correct_index
      )
      order by rp.joined_at
    ) into v_final_answers
    from app_private.va_banque_players p
    join app_private.room_players rp on rp.id=p.player_id
    where p.room_id=r.id;
  else
    v_final_answers:='[]'::jsonb;
  end if;

  return jsonb_build_object(
    'serverNow',now(),
    'phase',g.phase,
    'deadline',g.phase_deadline,
    'roundIndex',g.round_index,
    'regularRounds',g.regular_rounds,
    'category',q.category,
    'difficulty',q.difficulty,
    'question',case when v_show_question then q.prompt else null end,
    'options',case when v_show_question then q.options else '[]'::jsonb end,
    'correctIndex',case when v_show_solution then q.correct_index else null end,
    'explanation',case when v_show_solution then q.explanation else null end,
    'players',coalesce(v_players,'[]'::jsonb),
    'bids',coalesce(v_bids,'[]'::jsonb),
    'winningPlayerId',g.winning_player_id,
    'winningBid',g.winning_bid,
    'tiePlayerIds',to_jsonb(g.tie_player_ids),
    'takeoverPlayerId',g.takeover_player_id,
    'takeoverRisk',g.takeover_risk,
    'lastEvent',g.last_event,
    'finalAnswers',coalesce(v_final_answers,'[]'::jsonb),
    'isHost',v_is_host,
    'viewer',case when viewer.id is null then null else jsonb_build_object(
      'id',viewer.id,
      'name',viewer.display_name,
      'avatar',viewer.avatar,
      'points',vp.points,
      'bid',vp.bid,
      'bidLocked',vp.bid_locked,
      'tieBid',vp.tie_bid,
      'tieLocked',vp.tie_locked,
      'answerIndex',vp.answer_index,
      'answerLocked',vp.answer_locked,
      'finalBid',vp.final_bid,
      'finalBidLocked',vp.final_bid_locked,
      'finalAnswerIndex',vp.final_answer_index,
      'finalAnswerLocked',vp.final_answer_locked
    ) end
  );
end;
$function$

