-- Self-contained permission regression in a disposable PostgreSQL test database.
-- NEVER execute this fixture against any Supabase or production database.
\set ON_ERROR_STOP on

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA app_private;

CREATE FUNCTION app_private.create_platform_room_internal(p_game_slug text)
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $function$ SELECT p_game_slug $function$;

CREATE FUNCTION public.create_platform_room(p_game_slug text)
RETURNS text LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $function$ SELECT app_private.create_platform_room_internal(p_game_slug) $function$;

GRANT USAGE ON SCHEMA app_private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.create_platform_room_internal(text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_platform_room(text)
  TO anon, authenticated, service_role;

-- Run the exact staged migration with synthetic functions and roles.
\ir ../staged-restrict-room-creation-to-server.sql

DO $assert$
BEGIN
  IF has_function_privilege('anon',
    'public.create_platform_room(text)', 'EXECUTE')
    OR has_function_privilege('authenticated',
    'public.create_platform_room(text)', 'EXECUTE')
    OR has_function_privilege('anon',
    'app_private.create_platform_room_internal(text)', 'EXECUTE')
    OR has_function_privilege('authenticated',
    'app_private.create_platform_room_internal(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Public room creation was not revoked';
  END IF;
  IF NOT has_function_privilege('service_role',
    'public.create_platform_room(text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role',
    'app_private.create_platform_room_internal(text)', 'EXECUTE')
    OR NOT has_schema_privilege('service_role','app_private','USAGE') THEN
    RAISE EXCEPTION 'Server room creator lacks required grants';
  END IF;
END;
$assert$;

SET ROLE service_role;
DO $assert$
DECLARE result text;
BEGIN
  SELECT public.create_platform_room('example') INTO result;
  IF result <> 'example' THEN
    RAISE EXCEPTION 'Service role cannot use the existing invoker wrapper';
  END IF;
END;
$assert$;
RESET ROLE;

SELECT 'ROOM CREATE SQL PERMISSIONS: PASS' AS result;
