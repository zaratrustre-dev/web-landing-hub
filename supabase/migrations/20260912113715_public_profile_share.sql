-- ---------------------------------------------------------------------------
-- Perfil público mínimo para compartir (PDR §24 — Ajustes → Compartir
-- cuenta). Única vía pública de lectura de perfiles: no toca RLS de la
-- tabla `profiles`, expone solo lo mínimo necesario vía SECURITY DEFINER.
--
-- ⚠️ Reconstruido el 14/09/2026: esta migración ya estaba aplicada en
-- Supabase (se aplicó directo vía MCP el 12/09/2026, sin commitear el
-- archivo .sql al repo en su momento). El contenido de este archivo se
-- generó leyendo la definición real en vivo con pg_get_functiondef() +
-- information_schema.routine_privileges + obj_description(), para que
-- coincida exactamente con lo que ya existe en producción y cierre el
-- drift entre el repo y la base de datos real. No modifica nada — es un
-- registro fiel de lo que ya está corriendo.
-- ---------------------------------------------------------------------------
create or replace function public.get_public_profile(p_id uuid)
returns table(id uuid, name text, photo_url text, profession text, skills text[])
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    p.id,
    p.name,
    p.photo_url,
    p.profession,
    coalesce(
      array_agg(s.name order by s.name) filter (where s.name is not null),
      '{}'
    ) as skills
  from public.profiles p
  left join public.profile_skills ps on ps.profile_id = p.id
  left join public.skills s on s.id = ps.skill_id
  where p.id = p_id
    and p.onboarding_completed = true
    and coalesce(p.is_blocked, false) = false
  group by p.id, p.name, p.photo_url, p.profession;
end;
$$;

comment on function public.get_public_profile(uuid) is
  'Perfil público mínimo para compartir (Ajustes → Compartir cuenta). Solo foto, nombre, profesión y skills. Callable por anon.';

grant execute on function public.get_public_profile(uuid) to anon, authenticated;
