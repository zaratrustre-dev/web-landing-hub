-- ============================================================================
-- Connect-it — País (ubicación) + bloqueo de usuarios (Admin Panel PDR §1, §11)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Country (PDR §17 filtros, §34 diferenciador) — pendiente desde el esquema
--    inicial, lo añadimos ahora al ir de la mano de "ubicación" en el admin.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists country text check (char_length(country) <= 56);

-- ---------------------------------------------------------------------------
-- 2. Bloqueo de usuarios (Admin Panel PDR — nueva funcionalidad)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text check (char_length(blocked_reason) <= 300),
  add column if not exists blocked_by uuid references auth.users (id);

-- Un usuario bloqueado deja de ser visible para el resto en Discovery, pero
-- sigue viéndose a sí mismo y los admins lo ven siempre (para poder
-- desbloquearlo). No afecta al login todavía: eso requiere la Admin API
-- (fuera del alcance de esta migración, ver Edge Function de gestión de
-- usuarios).
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (is_blocked = false or id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Actualizar el RPC de listado admin con los nuevos campos.
--    Hay que borrarlo y recrearlo porque cambia el conjunto de columnas
--    devueltas (Postgres no permite CREATE OR REPLACE si cambian los
--    OUT params).
-- ---------------------------------------------------------------------------
drop function if exists public.admin_list_profiles(integer, integer);

create function public.admin_list_profiles(
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
  is_blocked boolean,
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
    p.country,
    p.is_blocked,
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

-- ---------------------------------------------------------------------------
-- 4. Helper para bloquear/desbloquear (encapsula blocked_at/blocked_by,
--    para no tener que gestionarlos a mano desde el frontend)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_blocked(
  target_user_id uuid,
  new_is_blocked boolean,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update public.profiles
  set
    is_blocked = new_is_blocked,
    blocked_at = case when new_is_blocked then now() else null end,
    blocked_by = case when new_is_blocked then auth.uid() else null end,
    blocked_reason = case when new_is_blocked then reason else null end
  where id = target_user_id;
end;
$$;

comment on function public.admin_set_user_blocked is
  'Bloquea/desbloquea un usuario. Solo admins. Rellena blocked_at/blocked_by automáticamente.';
