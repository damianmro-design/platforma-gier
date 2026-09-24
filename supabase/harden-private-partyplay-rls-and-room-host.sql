-- Applied to Supabase project glcjetxskjnlbeegirln as migration
-- harden_private_partyplay_tables_and_validate_room_host.
-- Sensitive tables remain accessible only through vetted RPC functions.
-- No direct anon/authenticated table policies; SECURITY DEFINER owners bypass RLS.

ALTER TABLE app_private.partyplay_game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.pp_game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.pp_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.pp_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.pp_game_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.pp_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.pp_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.pp_interrogation_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.pp_secret_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.pp_hot_seat_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.pp_skipped_actions ENABLE ROW LEVEL SECURITY;

-- Server endpoint can validate its cookie against the database without
-- revealing the token or room internals to callers.
CREATE OR REPLACE FUNCTION app_private.is_platform_room_host_internal(
  p_code text, p_host_token uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT coalesce(
    p_host_token IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM app_private.platform_rooms r
      WHERE r.code = upper(trim(p_code))
        AND r.host_token = p_host_token
        AND r.expires_at > now()
    ), false
  );
$fn$;

REVOKE ALL ON FUNCTION app_private.is_platform_room_host_internal(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.is_platform_room_host_internal(text, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_room_host(
  p_code text, p_host_token uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $fn$
  SELECT app_private.is_platform_room_host_internal(p_code, p_host_token);
$fn$;

REVOKE ALL ON FUNCTION public.is_platform_room_host(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_room_host(text, uuid) TO anon, authenticated;
