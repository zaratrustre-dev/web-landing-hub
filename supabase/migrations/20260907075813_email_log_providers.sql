-- ============================================================================
-- Connect-it — Emails: Resend (transaccionales) + Brevo (comerciales)
-- Decisión de arquitectura: las plantillas se gestionan en el dashboard de
-- cada proveedor (Resend / Brevo), no en Connect-it. Aquí solo guardamos
-- el registro de envíos y quién los mandó.
-- ============================================================================

alter table public.email_log
  add column if not exists provider text check (provider in ('resend', 'brevo')),
  add column if not exists email_type text check (email_type in ('transactional', 'commercial')),
  add column if not exists recipient_user_id uuid references public.profiles (id) on delete set null,
  add column if not exists external_template_id text,
  add column if not exists error_message text;

comment on column public.email_log.provider is 'Qué proveedor lo envió: resend (transaccional) o brevo (comercial).';
comment on column public.email_log.email_type is 'transactional (Resend) o commercial (Brevo, solo a marketing_consent=true).';
comment on column public.email_log.external_template_id is 'ID/alias de la plantilla en Resend o Brevo (las plantillas viven en esos dashboards, no aquí).';

-- Índice para el listado de envíos por fecha (pantalla de historial en el panel)
create index if not exists idx_email_log_created_at on public.email_log (created_at desc);
