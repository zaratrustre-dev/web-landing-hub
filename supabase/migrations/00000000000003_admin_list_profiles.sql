-- ============================================================================
-- Connect-it — RPC de administración: listado de usuarios
-- Necesario porque el email vive en auth.users (no expuesto por RLS normal);
-- esta función lo une a public.profiles y solo responde si quien llama es admin.
-- ============================================================================

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
    u.email,
    p.name,
    p.age,
    p.role,
    p.role_sought,
    p.profession,
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
  'Lista paginada de usuarios (perfil + email) para el panel admin. Lanza excepción si quien llama no es admin.';
