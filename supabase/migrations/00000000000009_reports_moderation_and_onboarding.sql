-- ============================================================================
-- Connect-it — Onboarding automático + moderación (reportes y chats) en el panel
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. onboarding_completed automático: se considera completo el onboarding
-- cuando role, role_sought y profession están rellenos (Register → OAuth →
-- Role → Role Sought → Create Profile, PDR §7). Aplica tanto si lo rellena
-- el propio usuario como si lo crea/edita un admin.
-- ---------------------------------------------------------------------------
create or replace function public.compute_onboarding_completed()
returns trigger
language plpgsql
as $$
begin
  new.onboarding_completed :=
    new.role is not null
    and new.role_sought is not null
    and new.profession is not null
    and new.profession <> '';
  return new;
end;
$$;

create trigger trg_profiles_compute_onboarding
before insert or update on public.profiles
for each row execute function public.compute_onboarding_completed();

-- Recalcula los perfiles que ya existían antes de este trigger (si no, se
-- quedarían con el valor viejo hasta la próxima vez que alguien los edite).
update public.profiles set id = id;

-- ---------------------------------------------------------------------------
-- 2. RLS de admin para moderación: poder leer CUALQUIER match y CUALQUIER
-- chat individual (necesario para revisar reports de chat).
-- ---------------------------------------------------------------------------
create policy "matches_admin_select"
  on public.matches for select
  to authenticated
  using (public.is_admin());

create policy "chat_messages_admin_select"
  on public.chat_messages for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. ¿Un usuario está "reportado"? Cuenta tanto los reports directos a su
-- perfil como los reports de un chat donde él es el otro participante (si
-- reportas un chat, estás reportando a la otra persona de esa conversación).
-- ---------------------------------------------------------------------------
create or replace function public.is_reported(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reports r
    where r.target_type = 'profile' and r.target_profile_id = target_user_id
  )
  or exists (
    select 1 from public.reports r
    join public.matches m on m.id = r.target_match_id
    where r.target_type = 'chat'
      and r.reporter_id <> target_user_id
      and (m.profile_a = target_user_id or m.profile_b = target_user_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. admin_list_profiles: se añade el filtro de "reportado" y la columna
-- correspondiente en el resultado. Se calcula is_reported en un CTE y el
-- total_count por fuera, después de aplicar el filtro de reportado (si se
-- pusiera dentro de la misma consulta que la window function, contaría mal).
-- ---------------------------------------------------------------------------
drop function if exists public.admin_list_profiles(integer, integer, text, public.professional_role, text, boolean);
drop function if exists public.admin_list_profiles(integer, integer, text, public.professional_role, text, boolean, boolean);

create or replace function public.admin_list_profiles(
  page_limit integer default 20,
  page_offset integer default 0,
  search_text text default null,
  role_filter public.professional_role default null,
  country_filter text default null,
  blocked_filter boolean default null,
  reported_filter boolean default null
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
  'Lista paginada y filtrable (texto, rol, país, bloqueo, reportado) de usuarios para el panel admin.';

-- ---------------------------------------------------------------------------
-- 5. admin_get_profile: se añade is_reported también en la ficha de detalle.
-- ---------------------------------------------------------------------------
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
  briefcase_url text,
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
    p.briefcase_url,
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

-- ---------------------------------------------------------------------------
-- 6. admin_get_user_reports: reports que afectan a un usuario (como
-- perfil reportado directamente, o como el otro participante de un chat
-- reportado), con datos del que reportó.
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_user_reports(target_user_id uuid)
returns table (
  report_id uuid,
  reporter_id uuid,
  reporter_name text,
  reporter_email text,
  target_type public.report_target_type,
  match_id uuid,
  reason text,
  created_at timestamptz
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
    r.id,
    r.reporter_id,
    rp.name,
    ru.email::text,
    r.target_type,
    r.target_match_id,
    r.reason,
    r.created_at
  from public.reports r
  join public.profiles rp on rp.id = r.reporter_id
  join auth.users ru on ru.id = r.reporter_id
  where
    (r.target_type = 'profile' and r.target_profile_id = target_user_id)
    or (
      r.target_type = 'chat'
      and r.reporter_id <> target_user_id
      and exists (
        select 1 from public.matches m
        where m.id = r.target_match_id
          and (m.profile_a = target_user_id or m.profile_b = target_user_id)
      )
    )
  order by r.created_at desc;
end;
$$;

comment on function public.admin_get_user_reports is
  'Reports que afectan a un usuario (directos a su perfil, o de un chat donde es el otro participante).';

-- ---------------------------------------------------------------------------
-- 7. admin_get_chat_messages: mensajes de un match concreto, para revisar
-- una conversación reportada. Solo admins.
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_chat_messages(match_id_param uuid)
returns table (
  id uuid,
  sender_id uuid,
  sender_name text,
  content text,
  created_at timestamptz
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
  select cm.id, cm.sender_id, p.name, cm.content, cm.created_at
  from public.chat_messages cm
  join public.profiles p on p.id = cm.sender_id
  where cm.match_id = match_id_param
  order by cm.created_at asc;
end;
$$;

comment on function public.admin_get_chat_messages is
  'Mensajes de un chat individual (por match_id), para moderación. Solo admins.';
