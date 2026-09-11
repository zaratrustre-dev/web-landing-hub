-- Fija search_path en funciones que no lo tenían (mitiga search_path hijacking)
alter function public.enforce_max_3_skills() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.set_marketing_consent_at() set search_path = public;
alter function public.compute_onboarding_completed() set search_path = public;

-- Las funciones admin_* ya rechazan internamente a quien no sea admin, pero
-- por defensa en profundidad, quitamos el permiso de ejecución a "anon"
-- (usuarios sin sesión) — nunca deberían necesitar llamarlas de todas formas.
revoke execute on function public.admin_get_chat_messages(uuid) from anon;
revoke execute on function public.admin_get_profile(uuid) from anon;
revoke execute on function public.admin_get_user_reports(uuid) from anon;
revoke execute on function public.admin_list_profiles(integer, integer, text, public.professional_role, text, boolean, boolean, uuid, boolean) from anon;
revoke execute on function public.admin_set_user_blocked(uuid, boolean, text) from anon;
revoke execute on function public.get_due_ad(integer) from anon;
revoke execute on function public.pick_and_rotate_ad_for_group(integer) from anon;
