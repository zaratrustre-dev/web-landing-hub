-- ============================================================================
-- Connect-it — Anuncios: abrir get_due_ad / pick_and_rotate_ad_for_group a
-- usuarios autenticados (no solo admins)
-- ============================================================================
-- Bug reportado (14/09/2026): dar Likes en la app móvil nunca disparaba
-- ningún anuncio, ni siquiera tras superar varias veces la periodicidad
-- configurada (5/22/47 likes). Causa real: `get_due_ad()` y
-- `pick_and_rotate_ad_for_group()` (migración
-- 20260906214949_ads_likes_rotation.sql) todavía tenían el
-- `if not public.is_admin() then raise exception ...` que se dejó a
-- propósito como placeholder "hasta que exista el flujo real de Likes de
-- la app de usuario final" — ese flujo ya existe (Discovery/ProfileCard,
-- sesión de hoy), pero nunca se volvió a abrir el permiso. Cualquier
-- usuario final que no fuera admin recibía "No autorizado" (42501) al
-- intentar consultarla — y el cliente móvil ni siquiera la llamaba todavía
-- (ver lib/discovery.ts, sendSwipe(), en el mismo fix).
--
-- Cambio: el chequeo pasa de "es admin" a "hay un usuario autenticado"
-- (auth.uid() is null cubre tanto anon como llamadas sin JWT). Se
-- mantienen SECURITY DEFINER y el resto de la lógica intactos.
-- ============================================================================

create or replace function public.pick_and_rotate_ad_for_group(target_periodicity integer)
returns public.ads
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen public.ads;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into chosen
  from public.ads
  where periodicity_likes = target_periodicity and is_active = true
  order by last_shown_at asc nulls first
  limit 1;

  if chosen.id is not null then
    update public.ads set last_shown_at = now() where id = chosen.id;
    chosen.last_shown_at := now();
  end if;

  return chosen;
end;
$$;

create or replace function public.get_due_ad(likes_count integer)
returns public.ads
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  winning_periodicity integer;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if likes_count <= 0 then
    return null;
  end if;

  select min(periodicity_likes) into winning_periodicity
  from public.ads
  where is_active = true
    and periodicity_likes > 0
    and likes_count % periodicity_likes = 0;

  if winning_periodicity is null then
    return null;
  end if;

  return public.pick_and_rotate_ad_for_group(winning_periodicity);
end;
$$;

comment on function public.pick_and_rotate_ad_for_group is
  'Round-robin real: dentro de un grupo de periodicidad, elige el anuncio activo que lleva más tiempo sin mostrarse y actualiza su last_shown_at. Cualquier usuario autenticado puede invocarla (antes solo admins) desde el 14/09/2026, ahora que el flujo de Likes de la app móvil ya existe.';

comment on function public.get_due_ad is
  'Dado el nº de likes de un usuario, decide qué anuncio toca mostrar (prioridad a la periodicidad más corta en empates) y lo rota. Cualquier usuario autenticado puede invocarla (antes solo admins) desde el 14/09/2026.';

grant execute on function public.pick_and_rotate_ad_for_group(integer) to authenticated;
grant execute on function public.get_due_ad(integer) to authenticated;
