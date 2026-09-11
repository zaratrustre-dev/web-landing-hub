-- ============================================================================
-- Connect-it — Esquema inicial
-- Fuente de verdad: Connect-it_PDR.txt + Connect-it_Master_Prompt_for_Claude.txt
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensiones
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 2. Tipos enumerados
-- ---------------------------------------------------------------------------
-- PDR §5 / §6 — exactamente estos 9 roles, para Role y Role Sought
create type public.professional_role as enum (
  'developer',
  'designer',
  'entrepreneur',
  'marketing',
  'consultant',
  'lender',
  'logistics',
  'recruiter',
  'influencer'
);

-- PDR §19/§20/§22 — estado de una relación Match
create type public.match_status as enum (
  'active',
  'unmatched'
);

-- PDR §22 — a qué apunta un report
create type public.report_target_type as enum (
  'profile',
  'chat'
);

-- App role, no confundir con professional_role. Solo se usa para el panel admin.
create type public.app_role as enum (
  'admin'
);

-- ---------------------------------------------------------------------------
-- 3. Perfiles (PDR §8-§16)
-- ---------------------------------------------------------------------------
-- 1:1 con auth.users. Se crea automáticamente (ver trigger handle_new_user)
-- vacío en id/created_at; el resto se rellena durante el onboarding.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,

  -- Identidad (PDR §8). Name y Age no editables tras el registro (§25).
  name text,
  age smallint check (age is null or (age >= 18 and age <= 120)),
  photo_url text,

  -- Onboarding (PDR §5, §6)
  role public.professional_role,
  role_sought public.professional_role,

  -- Campos con límite estricto de caracteres (PDR §9, §11)
  profession text check (char_length(profession) <= 20),
  description text check (char_length(description) <= 200),

  -- Briefcase: Portfolio / CV / LinkedIn / otro recurso (PDR §12)
  briefcase_url text,

  -- Onboarding completo -> visible en Discovery
  onboarding_completed boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil profesional del usuario (PDR §8-§16). Name/Age inmutables tras registro.';

-- ---------------------------------------------------------------------------
-- 4. Roles de aplicación (panel admin — roadmap Fase 2)
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = uid and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. Skills (PDR §10 — catálogo basado en habilidades de Upwork, máx. 3)
-- ---------------------------------------------------------------------------
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.profile_skills (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  skill_id uuid not null references public.skills (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, skill_id)
);

-- Máximo 3 skills por perfil (PDR §10, §15)
create or replace function public.enforce_max_3_skills()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.profile_skills where profile_id = new.profile_id) >= 3 then
    raise exception 'Un perfil no puede tener más de 3 skills' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_max_3_skills
before insert on public.profile_skills
for each row execute function public.enforce_max_3_skills();

-- ---------------------------------------------------------------------------
-- 6. Likes / Dislikes (PDR §18 — 3 gratuitos por día, countdown de 24h)
-- ---------------------------------------------------------------------------
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  from_profile uuid not null references public.profiles (id) on delete cascade,
  to_profile uuid not null references public.profiles (id) on delete cascade,
  is_like boolean not null, -- true = Like, false = Dislike
  created_at timestamptz not null default now(),
  unique (from_profile, to_profile),
  check (from_profile <> to_profile)
);

create index idx_likes_from_profile_created_at on public.likes (from_profile, created_at);
create index idx_likes_to_profile on public.likes (to_profile);

-- Likes (no dislikes) consumidos en las últimas 24h. La UI usa esto para
-- calcular "quedan N de 3" y el countdown de reseteo.
create or replace function public.likes_used_last_24h(uid uuid default auth.uid())
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.likes
  where from_profile = uid
    and is_like = true
    and created_at > now() - interval '24 hours';
$$;

-- ---------------------------------------------------------------------------
-- 7. Matches (PDR §19)
-- ---------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  profile_a uuid not null references public.profiles (id) on delete cascade,
  profile_b uuid not null references public.profiles (id) on delete cascade,
  status public.match_status not null default 'active',
  created_at timestamptz not null default now(),
  unmatched_at timestamptz,
  unmatched_by uuid references public.profiles (id),
  check (profile_a <> profile_b),
  unique (profile_a, profile_b)
);

create index idx_matches_profile_a on public.matches (profile_a);
create index idx_matches_profile_b on public.matches (profile_b);

-- Crea el Match automáticamente cuando el like es mutuo (Like mutuo = Match, §19)
create or replace function public.handle_mutual_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a uuid;
  b uuid;
begin
  if new.is_like = true and exists (
    select 1 from public.likes
    where from_profile = new.to_profile
      and to_profile = new.from_profile
      and is_like = true
  ) then
    a := least(new.from_profile, new.to_profile);
    b := greatest(new.from_profile, new.to_profile);
    insert into public.matches (profile_a, profile_b)
    values (a, b)
    on conflict (profile_a, profile_b) do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_handle_mutual_like
after insert on public.likes
for each row execute function public.handle_mutual_like();

-- ---------------------------------------------------------------------------
-- 8. Individual Chat (PDR §20)
-- ---------------------------------------------------------------------------
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index idx_chat_messages_match_id on public.chat_messages (match_id, created_at);

-- ---------------------------------------------------------------------------
-- 9. Global Chat + moderación (PDR §21)
-- ---------------------------------------------------------------------------
create table public.global_chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) <= 500),
  is_blocked boolean not null default false, -- bloqueado por moderación (palabrotas/links)
  block_reason text,
  created_at timestamptz not null default now()
);

create index idx_global_chat_created_at on public.global_chat_messages (created_at);
create index idx_global_chat_sender_rate on public.global_chat_messages (sender_id, created_at);

-- ---------------------------------------------------------------------------
-- 10. Reports / Safety (PDR §22)
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target_type not null,
  target_profile_id uuid references public.profiles (id) on delete cascade,
  target_match_id uuid references public.matches (id) on delete cascade,
  reason text not null check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  check (
    (target_type = 'profile' and target_profile_id is not null and target_match_id is null)
    or
    (target_type = 'chat' and target_match_id is not null)
  )
);

-- ---------------------------------------------------------------------------
-- 11. Notificaciones push (roadmap Fase 2)
-- ---------------------------------------------------------------------------
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

-- ---------------------------------------------------------------------------
-- 12. Emails desde el panel admin (roadmap Fase 2)
-- ---------------------------------------------------------------------------
create table public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  subject text not null,
  body_html text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.email_templates (id),
  sent_by uuid references auth.users (id),
  recipient_email text not null,
  subject text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 13. Trigger: crear fila de profile al registrarse (Google OAuth, PDR §7)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, photo_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_handle_new_user
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 14. updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_email_templates_updated_at
before update on public.email_templates
for each row execute function public.set_updated_at();
