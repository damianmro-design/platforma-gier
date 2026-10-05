create or replace function app_private.advance_tm_question_internal(
  p_code text,
  p_host_token uuid,
  p_expected_question_index integer,
  p_score_delta integer,
  p_total_questions integer
)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_room app_private.platform_rooms%rowtype;
  v_game app_private.tylko_my_games%rowtype;
  v_player_id uuid;
  v_answer_count integer;
  v_next integer;
begin
  if p_score_delta < 0 or p_score_delta > 3 then
    raise exception 'Invalid score delta';
  end if;

  if p_total_questions < 1 or p_total_questions > 40 then
    raise exception 'Invalid total question count';
  end if;

  select * into v_room
  from app_private.platform_rooms
  where code = upper(trim(p_code))
    and game_slug = 'tylko-my'
    and status = 'active'
    and expires_at > now()
  limit 1;

  if v_room.id is null then
    raise exception 'Game not found';
  end if;

  select * into v_game
  from app_private.tylko_my_games
  where room_id = v_room.id
  for update;

  if v_game.room_id is null then
    raise exception 'Game not found';
  end if;

  -- The existing public RPC keeps its signature for backwards compatibility,
  -- but this token may now belong either to the room creator or to one of the
  -- two actual players. That removes the hidden host dependency from TYLKO MY.
  if p_host_token is distinct from v_room.host_token then
    select rp.id into v_player_id
    from app_private.room_players rp
    where rp.room_id = v_room.id
      and rp.player_token = p_host_token
      and rp.id in (v_game.player_a_id, v_game.player_b_id)
    limit 1;

    if v_player_id is null then
      raise exception 'Host access required';
    end if;
  end if;

  if v_game.finished then
    return v_game.question_index;
  end if;

  -- Two phones can fire the automatic transition at nearly the same moment.
  -- The first request advances and scores; the second simply observes that the
  -- state has already moved forward, so points can never be counted twice.
  if v_game.question_index > p_expected_question_index then
    return v_game.question_index;
  end if;

  if v_game.question_index <> p_expected_question_index then
    raise exception 'Stale question';
  end if;

  select count(*)::integer into v_answer_count
  from app_private.tylko_my_answers
  where room_id = v_room.id
    and question_index = v_game.question_index;

  if v_answer_count <> 2 then
    raise exception 'Waiting for answers';
  end if;

  v_next := v_game.question_index + 1;

  if v_next >= p_total_questions then
    update app_private.tylko_my_games
    set score = score + p_score_delta,
        finished = true,
        question_index = p_total_questions,
        updated_at = now()
    where room_id = v_room.id;

    update app_private.platform_rooms
    set game_phase = 'finished'
    where id = v_room.id;

    return p_total_questions;
  end if;

  update app_private.tylko_my_games
  set score = score + p_score_delta,
      question_index = v_next,
      updated_at = now()
  where room_id = v_room.id;

  return v_next;
end;
$function$;
