-- ============================================================================
-- Connect-it — Notificaciones push: historial de envíos
-- Usa la tabla public.push_tokens ya existente (migración 1) para saber a
-- qué dispositivos mandar. Firebase Cloud Messaging (API HTTP v1) como
-- proveedor.
-- ============================================================================

create table public.push_log (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid references public.profiles (id) on delete set null,
  token text not null,
  title text not null,
  body text not null,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  sent_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

comment on table public.push_log is
  'Historial de notificaciones push enviadas desde el panel admin, una fila por token/dispositivo.';

create index idx_push_log_created_at on public.push_log (created_at desc);

alter table public.push_log enable row level security;

create policy "push_log_admin_all"
  on public.push_log for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
