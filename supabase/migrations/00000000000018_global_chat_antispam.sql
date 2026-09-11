-- ============================================================================
-- Connect-it — Chat global: modo lento / bloqueo anti-spam
-- Regla acordada:
--   - 10+ mensajes en menos de 5 segundos -> "modo lento": 1 mensaje cada
--     10 segundos como máximo, durante 1 minuto.
--   - Si esto se repite 3 veces -> bloqueo total de mensajes durante 5
--     minutos. Al terminar el bloqueo, el contador de repeticiones vuelve
--     a cero (tabla rasa) y se vuelve al modo normal.
--
-- Nota de diseño: la comprobación (BEFORE INSERT, solo lee y como mucho
-- actualiza "last_message_at") y la detección de ráfagas + escalado
-- (AFTER INSERT, solo se ejecuta si el mensaje ya se insertó) están en dos
-- triggers separados a propósito: si se hiciera todo en un único trigger
-- BEFORE y se usara RAISE EXCEPTION para rechazar el mensaje, esa misma
-- excepción desharía también cualquier UPDATE de estado hecho justo antes
-- en la misma función (todo ocurre en la misma transacción). Separándolo,
-- el registro de la ráfaga siempre queda guardado para la próxima vez,
-- pase lo que pase con el mensaje que la disparó.
-- ============================================================================

create table public.global_chat_rate_limits (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  mode text not null default 'normal' check (mode in ('normal', 'slow', 'blocked')),
  mode_expires_at timestamptz,
  slow_mode_count integer not null default 0,
  last_message_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.global_chat_rate_limits is
  'Estado anti-spam por usuario del chat global: modo normal/lento/bloqueado y contador de reincidencias.';

alter table public.global_chat_rate_limits enable row level security;

-- Nadie necesita leer/escribir esto directamente vía API: solo lo tocan
-- los triggers (SECURITY DEFINER). Sin políticas = inaccesible por REST.
-- El admin sí puede consultarlo si hace falta depurar.
create policy "global_chat_rate_limits_admin_read"
  on public.global_chat_rate_limits for select
  to authenticated
  using (public.is_admin());

create trigger trg_global_chat_rate_limits_updated_at
before update on public.global_chat_rate_limits
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- BEFORE INSERT: comprueba el estado actual y rechaza el mensaje si toca.
-- Solo escribe (last_message_at) en la rama donde SÍ se permite el mensaje,
-- así que un RAISE EXCEPTION en las otras ramas no deshace nada importante.
-- ---------------------------------------------------------------------------
create or replace function public.check_global_chat_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  state record;
begin
  select * into state from public.global_chat_rate_limits where user_id = new.sender_id;

  if not found then
    return new; -- primera vez que escribe: sin restricciones todavía
  end if;

  if state.mode = 'blocked' and state.mode_expires_at is not null and now() < state.mode_expires_at then
    raise exception 'Estás bloqueado temporalmente para enviar mensajes en el chat global. Podrás volver a escribir en %',
      to_char(state.mode_expires_at, 'HH24:MI:SS')
      using errcode = 'P0001';
  end if;

  if state.mode = 'slow' and state.mode_expires_at is not null and now() < state.mode_expires_at then
    if state.last_message_at is not null and now() - state.last_message_at < interval '10 seconds' then
      raise exception 'Modo lento activo: espera al menos 10 segundos entre mensajes.'
        using errcode = 'P0001';
    end if;
    update public.global_chat_rate_limits set last_message_at = now() where user_id = new.sender_id;
  end if;

  return new;
end;
$$;

create trigger trg_check_global_chat_rate_limit
before insert on public.global_chat_messages
for each row execute function public.check_global_chat_rate_limit();

-- ---------------------------------------------------------------------------
-- AFTER INSERT: solo se ejecuta si el mensaje ya se guardó. Detecta ráfagas
-- (10+ mensajes en 5s) y escala el estado para las PRÓXIMAS comprobaciones.
-- ---------------------------------------------------------------------------
create or replace function public.update_global_chat_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count integer;
  state record;
begin
  insert into public.global_chat_rate_limits (user_id)
  values (new.sender_id)
  on conflict (user_id) do nothing;

  select * into state from public.global_chat_rate_limits where user_id = new.sender_id;

  -- Si el modo lento/bloqueo ya venció, se resetea antes de seguir.
  if state.mode in ('blocked', 'slow') and state.mode_expires_at is not null and now() >= state.mode_expires_at then
    update public.global_chat_rate_limits
      set mode = 'normal',
        mode_expires_at = null,
        slow_mode_count = case when state.mode = 'blocked' then 0 else state.slow_mode_count end
      where user_id = new.sender_id;
    state.mode := 'normal';
    state.mode_expires_at := null;
  end if;

  -- Ya está en modo lento o bloqueado activo: el BEFORE trigger ya se
  -- encarga de aplicar la restricción, aquí no hay nada más que hacer.
  if state.mode in ('slow', 'blocked') then
    return new;
  end if;

  select count(*) into recent_count
  from public.global_chat_messages
  where sender_id = new.sender_id and created_at > now() - interval '5 seconds';

  if recent_count < 10 then
    return new; -- ritmo normal
  end if;

  if state.slow_mode_count + 1 >= 3 then
    update public.global_chat_rate_limits
      set mode = 'blocked', mode_expires_at = now() + interval '5 minutes', slow_mode_count = 0
      where user_id = new.sender_id;
  else
    update public.global_chat_rate_limits
      set mode = 'slow', mode_expires_at = now() + interval '1 minute',
        slow_mode_count = slow_mode_count + 1, last_message_at = now()
      where user_id = new.sender_id;
  end if;

  return new;
end;
$$;

create trigger trg_update_global_chat_rate_limit
after insert on public.global_chat_messages
for each row execute function public.update_global_chat_rate_limit();

comment on function public.check_global_chat_rate_limit is
  'Rechaza mensajes del chat global si el usuario está en modo lento (1 msj/10s) o bloqueado.';
comment on function public.update_global_chat_rate_limit is
  'Detecta ráfagas de 10+ mensajes en 5s y escala a modo lento (1 min) o bloqueo (5 min tras 3 reincidencias).';
