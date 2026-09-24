-- STAGED ONLY, DO NOT APPLY to production without all rollout gates.
-- Existing join/recover/game-state RPCs remain public; only room creation changes.
-- Requires ZAGRAJ_ROOM_CREATION_MODE=server-only and a server-only Supabase
-- service-role/secret API key in the Vercel production environment.
-- The room creation gateway is lib/platform-room-create.ts.
--
-- First verify an encrypted backup + isolated restore of BOTH databases,
-- Vercel preview/E2E and the deployment sequence in docs/release/room-create-gateway.md.
BEGIN;

-- The existing public wrapper is SECURITY INVOKER and calls this private
-- function. service_role currently has neither app_private USAGE nor EXECUTE.
GRANT USAGE ON SCHEMA app_private TO service_role;
GRANT EXECUTE ON FUNCTION app_private.create_platform_room_internal(text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.create_platform_room(text)
  TO service_role;

-- Revoke both levels to prevent bypassing the Next.js gateway with the
-- publicly distributed publishable key or anonymous Auth sessions.
REVOKE EXECUTE ON FUNCTION public.create_platform_room(text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION app_private.create_platform_room_internal(text)
  FROM PUBLIC, anon, authenticated;

COMMIT;
