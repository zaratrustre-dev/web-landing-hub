-- ============================================================================
-- Connect-it — Panel admin: ficha de detalle, edición y búsqueda/filtros
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RLS: un admin puede gestionar las skills de CUALQUIER perfil (hasta
-- ahora solo el propio dueño podía insertar/borrar las suyas).
-- ---------------------------------------------------------------------------
create policy "profile_skills_admin_all"
  on public.profile_skills for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. admin_list_profiles: se añade búsqueda por texto (nombre/email) y
-- filtros por rol, país y estado de bloqueo, todos opcionales.
-- ---------------------------------------------------------------------------
drop function if exists public.admin_list_profiles(integer, integer);

create or replace function public.admin_list_profiles(
  page_limit integer default 20,
  page_offset integer default 0,
  search_text text default null,
  role_filter public.professional_role default null,
  country_filter text default null,
  blocked_filter boolean default null
)
returns table (
  id uuid,
  email text,
  name text,
  age smallint,
  role public.professional_role,
  role_sought public.professional_role,
  profession text,
  country text,
  photo_url text,
  marketing_consent boolean,
  is_blocked boolean,
  blocked_at timestamptz,
  onboarding_completed boolean,
  created_at timestamptz,
  total_count bigint
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
    p.country,
    p.photo_url,
    p.marketing_consent,
    p.is_blocked,
    p.blocked_at,
    p.onboarding_completed,
    p.created_at,
    count(*) over () as total_count
  from public.profiles p
  join auth.users u on u.id = p.id
  where
    (search_text is null or search_text = '' or
      p.name ilike '%' || search_text || '%' or
      u.email ilike '%' || search_text || '%')
    and (role_filter is null or p.role = role_filter)
    and (country_filter is null or country_filter = '' or p.country = country_filter)
    and (blocked_filter is null or p.is_blocked = blocked_filter)
  order by p.created_at desc
  limit greatest(page_limit, 1)
  offset greatest(page_offset, 0);
end;
$$;

comment on function public.admin_list_profiles is
  'Lista paginada y filtrable (texto, rol, país, bloqueo) de usuarios para el panel admin.';

-- ---------------------------------------------------------------------------
-- 3. admin_get_profile: ficha completa de un usuario, incluyendo email y
-- skills (nombres), para la pantalla de detalle/edición.
-- ---------------------------------------------------------------------------
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
  briefcase_url text,
  country text,
  photo_url text,
  marketing_consent boolean,
  marketing_consent_at timestamptz,
  is_blocked boolean,
  blocked_at timestamptz,
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
    p.briefcase_url,
    p.country,
    p.photo_url,
    p.marketing_consent,
    p.marketing_consent_at,
    p.is_blocked,
    p.blocked_at,
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
  'Ficha completa de un usuario (perfil + email + skills) para el panel admin.';
