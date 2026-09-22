-- Fix public RPC wrappers for Pod Przykrywka.
-- The private implementations intentionally remain non-executable by anon/authenticated.
-- Public wrappers run as SECURITY DEFINER and delegate to token-validating internals.

create or replace function public.get_pp_state(
  p_code text,
  p_player_token uuid default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select app_private.get_pp_state_internal(p_code, p_player_token);
$$;

create or replace function public.submit_pp_answer(
  p_code text,
  p_player_token uuid,
  p_answer text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select app_private.submit_pp_answer_internal(p_code, p_player_token, p_answer);
$$;

create or replace function public.submit_pp_vote(
  p_code text,
  p_player_token uuid,
  p_target_player_id uuid,
  p_vote_type text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select app_private.submit_pp_vote_internal(
    p_code,
    p_player_token,
    p_target_player_id,
    p_vote_type
  );
$$;

create or replace function public.advance_pp_phase(
  p_code text,
  p_host_token uuid
)
returns text
language sql
security definer
set search_path = ''
as $$
  select app_private.advance_pp_phase_internal(p_code, p_host_token);
$$;

create or replace function public.extend_pp_phase_timer(
  p_code text,
  p_host_token uuid,
  p_seconds integer default 60
)
returns integer
language sql
security definer
set search_path = ''
as $$
  select app_private.extend_pp_phase_timer_internal(
    p_code,
    p_host_token,
    p_seconds
  );
$$;

create or replace function public.skip_pp_player(
  p_code text,
  p_host_token uuid,
  p_player_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select app_private.skip_pp_player_internal(
    p_code,
    p_host_token,
    p_player_id
  );
$$;

revoke all on function public.get_pp_state(text, uuid) from public;
grant execute on function public.get_pp_state(text, uuid) to anon, authenticated;

revoke all on function public.submit_pp_answer(text, uuid, text) from public;
grant execute on function public.submit_pp_answer(text, uuid, text) to anon, authenticated;

revoke all on function public.submit_pp_vote(text, uuid, uuid, text) from public;
grant execute on function public.submit_pp_vote(text, uuid, uuid, text) to anon, authenticated;

revoke all on function public.advance_pp_phase(text, uuid) from public;
grant execute on function public.advance_pp_phase(text, uuid) to anon, authenticated;

revoke all on function public.extend_pp_phase_timer(text, uuid, integer) from public;
grant execute on function public.extend_pp_phase_timer(text, uuid, integer) to anon, authenticated;

revoke all on function public.skip_pp_player(text, uuid, uuid) from public;
grant execute on function public.skip_pp_player(text, uuid, uuid) to anon, authenticated;
