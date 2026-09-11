-- ============================================================================
-- Connect-it — Anuncios (Panel de Administración, secciones 5-10)
-- Fase actual: CRUD completo desde el panel (crear/ver/editar/listar/
-- activar-desactivar/borrar). La rotación real hacia usuarios finales se
-- deja para cuando exista la app de usuario (Discovery/swipe).
-- ============================================================================

create table public.ads (
  id uuid primary key default gen_random_uuid(),

  -- Etiqueta interna para identificarlo en el panel (no lo ve el usuario final).
  title text not null check (char_length(title) <= 80),

  media_type text not null check (media_type in ('image', 'video')),
  media_url text not null,

  -- URL de destino al pulsar el anuncio (PDR §5.2). Opcional.
  link_url text,

  -- Cada cuántos swipes debe aparecer (PDR §5.3). Ej: 5, 10, 20.
  periodicity_swipes integer not null default 10 check (periodicity_swipes > 0),

  is_active boolean not null default true,

  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ads is
  'Anuncios gestionados desde el panel admin (PDR Panel de Administración §5-10).';

create trigger trg_ads_updated_at
before update on public.ads
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: gestión completa solo para admins. Lectura de anuncios ACTIVOS
-- abierta a cualquier autenticado, de cara a cuando exista la app de
-- usuario final y tenga que consumir la rotación (PDR §6.2).
-- ---------------------------------------------------------------------------
alter table public.ads enable row level security;

create policy "ads_admin_all"
  on public.ads for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "ads_read_active_authenticated"
  on public.ads for select
  to authenticated
  using (is_active = true);

-- ---------------------------------------------------------------------------
-- Storage: bucket para las imágenes/vídeos de los anuncios. Lectura pública
-- (se muestran a cualquier usuario de la app), escritura solo admins.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ads-media', 'ads-media', true)
on conflict (id) do nothing;

create policy "ads_media_public_read"
  on storage.objects for select
  using (bucket_id = 'ads-media');

create policy "ads_media_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ads-media' and public.is_admin());

create policy "ads_media_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'ads-media' and public.is_admin());

create policy "ads_media_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'ads-media' and public.is_admin());
