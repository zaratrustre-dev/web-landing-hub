-- ============================================================================
-- Connect-it — Renombrar "Briefcase" a "Portfolio" (era una traducción
-- incorrecta del PDR: "Briefcase" no significa nada en este contexto, el
-- campo es un enlace a Portfolio/CV/LinkedIn).
-- ============================================================================

alter table public.profiles rename column briefcase_url to portfolio_url;

-- admin_get_profile se recrea con el nombre de columna nuevo (cambia el
-- tipo de retorno, hay que borrar y volver a crear).
drop function if exists public.admin_get_profile(uuid);

create or replace function public.admin_get_profile(target_user_id uuid)
returns table (
  id uuid,
  email text,
  name text,
  age smallint,
  role public.professional_role,
  role_sought public.professional_role,
  profession text,
  description text,
  portfolio_url text,
  country text,
  photo_url text,
  marketing_consent boolean,
  marketing_consent_at timestamptz,
  is_blocked boolean,
  blocked_at timestamptz,
  is_reported boolean,
  onboarding_completed boolean,
  created_at timestamptz,
  skill_ids uuid[],
  skill_names text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return query
  select
    p.id,
    u.email::text,
    p.name,
    p.age,
    p.role,
    p.role_sought,
    p.profession,
    p.description,
    p.portfolio_url,
    p.country,
    p.photo_url,
    p.marketing_consent,
    p.marketing_consent_at,
    p.is_blocked,
    p.blocked_at,
    public.is_reported(p.id),
    p.onboarding_completed,
    p.created_at,
    coalesce(
      (select array_agg(ps.skill_id order by s.name) from public.profile_skills ps
       join public.skills s on s.id = ps.skill_id where ps.profile_id = p.id),
      array[]::uuid[]
    ),
    coalesce(
      (select array_agg(s.name order by s.name) from public.profile_skills ps
       join public.skills s on s.id = ps.skill_id where ps.profile_id = p.id),
      array[]::text[]
    )
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = target_user_id;
end;
$$;

comment on function public.admin_get_profile is
  'Ficha completa de un usuario (perfil + email + skills + reportado) para el panel admin.';

comment on column public.profiles.portfolio_url is
  'Enlace profesional: Portfolio, CV, LinkedIn u otro recurso (PDR §12). Antes llamado "briefcase_url".';
