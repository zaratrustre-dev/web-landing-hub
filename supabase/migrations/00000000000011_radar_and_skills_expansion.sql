-- ============================================================================
-- Connect-it — "Radar" (visibilidad para el admin/reclutamiento) + filtros
-- de skills y radar en el panel + ampliación del catálogo de skills.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Radar: el usuario acepta ser visible/localizable por el admin, tipo
-- "estoy abierto a que me encuentren para una oportunidad". Se muestra con
-- un icono (enchufe negro sobre fondo naranja) encima del perfil.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists radar_enabled boolean not null default false;

comment on column public.profiles.radar_enabled is
  'El usuario acepta ser visible/buscable por el admin (tipo Randstad) para oportunidades. Icono: enchufe negro sobre fondo naranja.';

-- ---------------------------------------------------------------------------
-- 2. admin_list_profiles: añade filtro por skill concreta y por radar,
-- además de las columnas correspondientes en el resultado.
-- ---------------------------------------------------------------------------
drop function if exists public.admin_list_profiles(integer, integer, text, public.professional_role, text, boolean, boolean);

create or replace function public.admin_list_profiles(
  page_limit integer default 20,
  page_offset integer default 0,
  search_text text default null,
  role_filter public.professional_role default null,
  country_filter text default null,
  blocked_filter boolean default null,
  reported_filter boolean default null,
  skill_filter uuid default null,
  radar_filter boolean default null
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
  'Lista paginada y filtrable (texto, rol, país, bloqueo, reportado, skill, radar) de usuarios para el panel admin.';

-- ---------------------------------------------------------------------------
-- 3. admin_get_profile: se añade radar_enabled a la ficha de detalle.
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
  portfolio_url text,
  country text,
  photo_url text,
  marketing_consent boolean,
  marketing_consent_at timestamptz,
  radar_enabled boolean,
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
    p.radar_enabled,
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
  'Ficha completa de un usuario (perfil + email + skills + reportado + radar) para el panel admin.';

-- ---------------------------------------------------------------------------
-- 4. Ampliación del catálogo de skills (PDR §10 — basado en Upwork). Se
-- añaden más opciones para cubrir mejor los 9 roles.
-- ---------------------------------------------------------------------------
insert into public.skills (name) values
  -- Developer
  ('C++'), ('C#'), ('Go'), ('Rust'), ('Swift (iOS)'), ('Flutter'), ('GraphQL API'),
  ('REST API Design'), ('Database Design'), ('Microservices'), ('Unit Testing'), ('CI/CD'),
  -- Designer
  ('Figma Prototyping'), ('Motion Design'), ('3D Design'), ('Adobe XD'), ('Design Systems'),
  ('Illustration'), ('Typography'), ('Wireframing'),
  -- Entrepreneur
  ('Business Model Design'), ('Market Research'), ('Product-Market Fit'), ('Co-founder Search'),
  ('Bootstrapping'), ('Angel Investing'),
  -- Marketing
  ('Affiliate Marketing'), ('Marketing Automation'), ('Community Management'),
  ('Conversion Rate Optimization'), ('A/B Testing'), ('Google Analytics'), ('TikTok Marketing'),
  -- Consultant
  ('Management Consulting'), ('Strategy Consulting'), ('Risk Management'), ('Change Management'),
  ('Process Optimization'), ('ISO Compliance'),
  -- Lender
  ('Debt Financing'), ('Credit Analysis'), ('Microfinance'), ('Asset Management'),
  ('Insurance'), ('Real Estate Investment'),
  -- Logistics
  ('Fleet Management'), ('Warehouse Management'), ('Customs Compliance'), ('Import/Export'),
  ('Inventory Management'), ('Last-Mile Delivery'),
  -- Recruiter
  ('Executive Search'), ('Employer Branding'), ('Interview Coaching'), ('HR Analytics'),
  ('Onboarding Design'), ('Diversity & Inclusion'),
  -- Influencer
  ('YouTube Content'), ('Podcasting'), ('Personal Branding'), ('Livestreaming'),
  ('Brand Partnerships'), ('Short-form Video')
on conflict (name) do nothing;
