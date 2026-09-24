# RPC security review — zaGRAJ and Polowanie na Milionera

Date: 2026-09-24. Scope: database permissions, public RPC, secret game state, and outsider/host/player separation. Read-only review plus reversible transaction tests. This is NOT a penetration test nor a full application or live-device E2E test.

## Projects

* zaGRAJ platform database: `glcjetxskjnlbeegirln`.
* Polowanie database: `ggxfccvrswbnxfuavnht`.

## Verified findings

1. Platform: all private tables have RLS enabled after prior migration. Direct SELECT on private tables is not granted to `anon`/`authenticated`. RLS with no policy on these RPC-only private tables is intentional defense-in-depth.
2. Platform: 38 public `SECURITY DEFINER` functions executable by `anon` and 38 by `authenticated`. Most are API wrappers around private implementations. They cannot be revoked or converted en masse without affecting guest games.
3. Platform: tested `get_pp_state` with null, random, valid, and cross-room player tokens. Private `currentPlayer.role` and `secretOrder` were absent for unauthorized calls; valid tokens produced distinct player identities. Tested random/cross-room host tokens: rejected; valid host accepted. A synthetic six-player game started. All synthetic writes were in a transaction followed by ROLLBACK.
4. Platform: against an existing Akta Nocy session, tested null/invalid player tokens on assignment, cast, accusation and reconstruction readers. They returned no private rows. A valid participant token returned only one own assignment and the intended public cast. No live-game mutation was run.
5. Platform: `get_akta_nocy_public_cast` deliberately returns all **public character identities** to an authenticated room participant; private dossier/accusation endpoints check a room-scoped player or host token.
6. Polowanie: 57 public `SECURITY DEFINER` functions executable by `anon`; 197 by `authenticated` according to security advisors. Many anonymous mutation functions are phase/timer/completion watchdogs by design. Individually verify remaining functions before claiming full authorization closure.
7. Polowanie: tested a live game still at role reveal as `anon`. No early final envelope, memory items, final order, or postgame report could be read; no direct `SELECT` on `player_roles` or `final_envelopes`. Calls to finale advancement and preview functions at the wrong phase did not change game phase. Test transaction was rolled back.
8. Polowanie: check of sensitive-table grants/policies found no direct `anon` SELECT grants to `final_envelopes`, `game_secrets`, `millionaire_transfers`, `game_individual_tasks`, or `player_roles`.

## Residual risks / work items

**P1 before paid beta** — Public room codes currently act as bearer invitations for public game-screen data. `lookup_platform_room`, `get_pp_state` (without a token) and several public-stage readers operate with room code alone. Public answers and public phase data can be viewed by someone who knows a code; private roles did not leak in tests. Four-character room codes increase enumeration risk. Design and test rate limiting / abuse protection without breaking guest joins and screen synchronization. Review public payloads to ensure they contain only data intended for the shared screen.

**P1 before paid beta** — Audit all 197 authenticated `SECURITY DEFINER` findings in Polowanie, with emphasis on owner / participant binding, all mutation paths, anonymous-account scope and final moves. The 57 anonymous functions were inventoried and major public/secret and time-gated paths reviewed, but not exhaustively penetration-tested.

**P1 before paid beta** — Confirm the Data API's exposed schemas in Supabase dashboard, especially that `app_private` is not exposed. SQL session `pgrst.db_schemas` alone did not establish dashboard settings. `anon`/`authenticated` currently have schema USAGE and certain internal EXECUTE grants because invoker public wrappers depend on them; never expose that schema.

**P1 before paid beta** — Continue API route authorization and cookie/session testing in browsers (real host, ordinary player, unrelated room participant, no cookie, forged cookie, reconnect), including test mode. A successful DB check/build does not prove full E2E behavior.

**P2** — Leaked-password protection is disabled on the Polowanie Auth project. Review availability/cost and enable if applicable without breaking the existing auth flow. Supabase also flags policies accessible to anonymous auth users; these may be intentional for guest play and require per-policy review rather than blanket disabling.

## Current security advisors

zaGRAJ: 15 informational RLS-without-policy notices; 38 anon and 38 authenticated SECURITY DEFINER warnings.

Polowanie: 52 informational RLS-without-policy notices; 57 anon and 197 authenticated SECURITY DEFINER warnings, 3 anonymous sign-in policy warnings, and 1 leaked-password warning.

Reference: https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0028_anon_security_definer_function_executable

## Gate

No confirmed cross-room or pre-reveal secret leak in the tested paths. This does **not** clear the full security gate for monetization. Do not enable payments based on this audit alone.
