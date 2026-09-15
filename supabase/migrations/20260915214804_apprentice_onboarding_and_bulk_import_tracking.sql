-- ============================================================================
-- Connect-it — Onboarding de "Apprentice" (Aprendiz) + trazabilidad de
-- usuarios subidos por Excel en el panel admin.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. bulk_imported: distingue los perfiles creados por el importador masivo
--    de Excel (Ajustes > Usuarios > Importar Excel) de los creados a mano
--    desde el panel o por registro normal. Solo se marca a partir de esta
--    migración -- los ya importados en sesiones anteriores no quedan
--    marcados retroactivamente (decisión explícita de Jose).
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists bulk_imported boolean not null default false;

comment on column public.profiles.bulk_imported is
  'true si el perfil se creó con el importador masivo de Excel (Ajustes > Usuarios > Importar Excel). Permite filtrarlos y borrarlos en bloque desde el panel admin. Solo se marca desde la sesión 15/09/2026 en adelante -- los importados antes quedan sin marcar.';

-- ---------------------------------------------------------------------------
-- 2. admin_list_profiles: añade el filtro por bulk_imported y la columna
--    correspondiente en el resultado.
-- ---------------------------------------------------------------------------
drop function if exists public.admin_list_profiles(integer, integer, text, public.professional_role, text, boolean, boolean, uuid, boolean);

create or replace function public.admin_list_profiles(
  page_limit integer default 20,
  page_offset integer default 0,
  search_text text default null,
  role_filter public.professional_role default null,
  country_filter text default null,
  blocked_filter boolean default null,
  reported_filter boolean default null,
  skill_filter uuid default null,
  radar_filter boolean default null,
  bulk_imported_filter boolean default null
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
  radar_enabled boolean,
  bulk_imported boolean,
  is_blocked boolean,
  blocked_at timestamptz,
  is_reported boolean,
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
  with filtered as (
    select
      p.id,
      u.email::text as email,
      p.name,
      p.age,
      p.role,
      p.role_sought,
      p.profession,
      p.country,
      p.photo_url,
      p.marketing_consent,
      p.radar_enabled,
      p.bulk_imported,
      p.is_blocked,
      p.blocked_at,
      public.is_reported(p.id) as is_reported,
      p.onboarding_completed,
      p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where
      (search_text is null or search_text = '' or
        p.name ilike '%' || search_text || '%' or
        u.email ilike '%' || search_text || '%')
      and (role_filter is null or p.role = role_filter)
      and (country_filter is null or country_filter = '' or p.country = country_filter)
      and (blocked_filter is null or p.is_blocked = blocked_filter)
      and (radar_filter is null or p.radar_enabled = radar_filter)
      and (bulk_imported_filter is null or p.bulk_imported = bulk_imported_filter)
      and (
        skill_filter is null
        or exists (
          select 1 from public.profile_skills ps
          where ps.profile_id = p.id and ps.skill_id = skill_filter
        )
      )
  )
  select f.*, count(*) over () as total_count
  from filtered f
  where reported_filter is null or f.is_reported = reported_filter
  order by f.created_at desc
  limit greatest(page_limit, 1)
  offset greatest(page_offset, 0);
end;
$$;

comment on function public.admin_list_profiles is
  'Lista paginada y filtrable (texto, rol, país, bloqueo, reportado, skill, radar, importado por Excel) de usuarios para el panel admin.';
