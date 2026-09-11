-- ============================================================================
-- Connect-it — Emails automáticos de ciclo de vida de usuario
-- Dispara la Edge Function `user-lifecycle-emails` automáticamente:
--   - Al crear un usuario (auth.users INSERT)      -> email de bienvenida
--   - Al borrar un usuario (auth.users DELETE)      -> email de confirmación
-- Usa pg_net (extensión oficial de Supabase para llamadas HTTP async desde
-- triggers) — es el mecanismo recomendado por Supabase para esto.
-- ============================================================================

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Guarda un secreto compartido (nunca viaja en texto plano por el código:
-- se genera aleatoriamente aquí mismo). La Edge Function lo compara con su
-- propio secret WEBHOOK_SHARED_SECRET para saber que la llamada viene de
-- verdad de nuestra base de datos, no de cualquiera que adivine la URL.
-- RLS sin políticas = inaccesible por la API REST, solo por SQL directo o
-- funciones SECURITY DEFINER.
-- ---------------------------------------------------------------------------
create table if not exists public.internal_config (
  key text primary key,
  value text not null
);

alter table public.internal_config enable row level security;

insert into public.internal_config (key, value)
values ('webhook_shared_secret', encode(gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Trigger: nuevo usuario -> email de bienvenida
-- ---------------------------------------------------------------------------
create or replace function public.notify_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  secret text;
begin
  select value into secret from public.internal_config where key = 'webhook_shared_secret';

  perform net.http_post(
    url := 'https://cucvqfhucmjphjpquivn.supabase.co/functions/v1/user-lifecycle-emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Webhook-Secret', secret),
    body := jsonb_build_object(
      'event', 'user_created',
      'user_id', new.id,
      'email', new.email,
      'name', new.raw_user_meta_data ->> 'full_name'
    )
  );
  return new;
end;
$$;

create trigger trg_notify_user_created
after insert on auth.users
for each row execute function public.notify_user_created();

-- ---------------------------------------------------------------------------
-- Trigger: usuario borrado -> email de confirmación de borrado.
-- Se dispara con los datos ANTES de borrar (old), porque después de este
-- trigger la fila (y su perfil, por cascada) ya no existirán.
-- ---------------------------------------------------------------------------
create or replace function public.notify_account_deleted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  secret text;
  profile_name text;
begin
  select value into secret from public.internal_config where key = 'webhook_shared_secret';
  select name into profile_name from public.profiles where id = old.id;

  perform net.http_post(
    url := 'https://cucvqfhucmjphjpquivn.supabase.co/functions/v1/user-lifecycle-emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Webhook-Secret', secret),
    body := jsonb_build_object(
      'event', 'account_deleted',
      'email', old.email,
      'name', profile_name
    )
  );
  return old;
end;
$$;

create trigger trg_notify_account_deleted
before delete on auth.users
for each row execute function public.notify_account_deleted();

comment on function public.notify_user_created is
  'Dispara el email de bienvenida vía pg_net al crearse un usuario nuevo.';
comment on function public.notify_account_deleted is
  'Dispara el email de confirmación de borrado vía pg_net, con los datos de antes de borrar.';
