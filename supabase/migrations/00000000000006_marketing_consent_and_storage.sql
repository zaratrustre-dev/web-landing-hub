-- ============================================================================
-- Connect-it — Consentimiento de marketing + almacenamiento de fotos
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Consentimiento de marketing (independiente y opcional, desmarcado por
-- defecto). Se guarda separado de cualquier otra aceptación (p.ej. Terms).
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists marketing_consent boolean not null default false;
alter table public.profiles add column if not exists marketing_consent_at timestamptz;

create or replace function public.set_marketing_consent_at()
returns trigger
language plpgsql
as $$
begin
  if new.marketing_consent = true and (old.marketing_consent is distinct from true) then
    new.marketing_consent_at = now();
  elsif new.marketing_consent = false then
    new.marketing_consent_at = null;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_set_marketing_consent_at
before update on public.profiles
for each row execute function public.set_marketing_consent_at();

comment on column public.profiles.marketing_consent is
  'Consentimiento independiente para comunicaciones comerciales. Desmarcado por defecto. No afecta al registro.';

-- ---------------------------------------------------------------------------
-- 2. Bucket de fotos de perfil (público para lectura: se muestran en las
-- cards de Discovery a cualquier usuario autenticado). Escritura: el propio
-- dueño de la carpeta {user_id}/... o un admin en nombre de cualquiera.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "profile_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "profile_photos_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_photos_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_photos_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_photos_admin_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'profile-photos' and public.is_admin())
  with check (bucket_id = 'profile-photos' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. admin_list_profiles: se recrea añadiendo photo_url y marketing_consent.
-- ---------------------------------------------------------------------------
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
    u.email,
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
