-- Akta Nocy, utwardzenie granicy między publicznym RPC i funkcjami wewnętrznymi.
-- Publiczne wrappery pozostają dostępne dla klienta, ale funkcje app_private nie są
-- już wykonywalne bezpośrednio przez PUBLIC/anon/authenticated.

drop function if exists app_private.get_akta_nocy_public_cast_internal(text);

alter function public.advance_akta_nocy_phase(text, uuid) security definer;
alter function public.close_akta_nocy_game(text, uuid) security definer;
alter function public.get_akta_nocy_accusation_player(text, uuid) security definer;
alter function public.get_akta_nocy_accusation_progress(text, uuid) security definer;
alter function public.get_akta_nocy_accusation_results(text, uuid) security definer;
alter function public.get_akta_nocy_host_interrogations(text, uuid) security definer;
alter function public.get_akta_nocy_host_progress(text, uuid) security definer;
alter function public.get_akta_nocy_player_assignment(text, uuid) security definer;
alter function public.get_akta_nocy_public_cast(text, uuid) security definer;
alter function public.get_akta_nocy_reconstruction_host(text, uuid) security definer;
alter function public.get_akta_nocy_reconstruction_player(text, uuid) security definer;
alter function public.open_akta_nocy_dossier(text, uuid) security definer;
alter function public.reveal_akta_nocy_evidence_a(text, uuid) security definer;
alter function public.reveal_akta_nocy_evidence_b(text, uuid) security definer;
alter function public.run_akta_nocy_test_bots(text, uuid) security definer;
alter function public.submit_akta_nocy_accusation(text, uuid, uuid, text, text) security definer;
alter function public.submit_akta_nocy_reconstruction(text, uuid, text[], uuid, text, text) security definer;

revoke execute on function app_private.advance_akta_nocy_phase_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.close_akta_nocy_game_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.get_akta_nocy_accusation_player_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.get_akta_nocy_accusation_progress_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.get_akta_nocy_accusation_results_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.get_akta_nocy_host_interrogations_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.get_akta_nocy_host_progress_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.get_akta_nocy_player_assignment_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.get_akta_nocy_public_cast_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.get_akta_nocy_reconstruction_host_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.get_akta_nocy_reconstruction_player_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.initialize_akta_nocy_internal(uuid) from public, anon, authenticated;
revoke execute on function app_private.open_akta_nocy_dossier_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.reveal_akta_nocy_evidence_a_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.reveal_akta_nocy_evidence_b_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.run_akta_nocy_test_bots_internal(text, uuid) from public, anon, authenticated;
revoke execute on function app_private.submit_akta_nocy_accusation_internal(text, uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function app_private.submit_akta_nocy_reconstruction_internal(text, uuid, text[], uuid, text, text) from public, anon, authenticated;
revoke execute on function app_private.akta_nocy_test_bots_phase_trigger() from public, anon, authenticated;
