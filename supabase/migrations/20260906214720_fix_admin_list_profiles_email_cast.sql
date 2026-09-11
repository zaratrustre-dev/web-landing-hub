-- ============================================================================
-- Connect-it — Fix: admin_list_profiles fallaba con error 42804
-- (auth.users.email es `character varying`, no `text`; PostgREST/Postgres
-- exige que el tipo devuelto coincida exactamente con el declarado en
-- RETURNS TABLE). Se soluciona con un cast explícito a text.
-- ============================================================================

drop function if exists public.admin_list_profiles(integer, integer);

create or replace function public.admin_list_profiles(
  page_limit integer default 20,
  page_offset integer default 0
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
  order by p.created_at desc
  limit greatest(page_limit, 1)
  offset greatest(page_offset, 0);
end;
$$;

comment on function public.admin_list_profiles is
  'Lista paginada de usuarios (perfil + email + foto + consentimiento + bloqueo) para el panel admin.';
