-- ============================================================================
-- Connect-it — Anuncios: disparo por LIKES (no swipes) + rotación real
-- ============================================================================
-- Decisiones de diseño (aclaradas con el usuario tras detectar una
-- contradicción en el PDR: periodicidad individual por anuncio vs rotación
-- simple A→B→C):
--   1. El contador que dispara los anuncios son los LIKES dados por el
--      usuario, no los swipes.
--   2. Los anuncios se agrupan por su periodicidad (todos los de "cada 5"
--      forman un grupo, todos los de "cada 10" otro, etc).
--   3. Dentro de un grupo, cuando toca mostrar un anuncio, se rota: se
--      elige el anuncio de ese grupo que lleva más tiempo sin mostrarse
--      (round-robin real, no solo un orden fijo A→B→C).
--   4. Si el recuento de likes coincide con varios grupos a la vez (p.ej.
--      likes=20 coincide con "cada 5", "cada 10" y "cada 20"), gana el
--      grupo de periodicidad más CORTA.
-- ============================================================================

alter table public.ads rename column periodicity_swipes to periodicity_likes;

comment on column public.ads.periodicity_likes is
  'Cada cuántos likes del usuario debe aparecer un anuncio de este grupo (PDR §5.3). Los anuncios se agrupan por este valor.';

alter table public.ads add column if not exists last_shown_at timestamptz;

comment on column public.ads.last_shown_at is
  'Última vez que este anuncio fue servido. Se usa para rotar dentro de su grupo (el que lleve más tiempo sin mostrarse va primero).';

-- ---------------------------------------------------------------------------
-- Elige y rota el anuncio a mostrar dentro de UN grupo de periodicidad.
-- Solo admins por ahora (de momento nada la llama en producción real; se
-- abrirá a "authenticated" cuando exista el flujo de Likes de la app de
-- usuario final, para que se pueda invocar automáticamente al dar un Like).
-- ---------------------------------------------------------------------------
create or replace function public.pick_and_rotate_ad_for_group(target_periodicity integer)
returns public.ads
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen public.ads;
begin
  if not public.is_admin() then
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

comment on function public.pick_and_rotate_ad_for_group is
  'Round-robin real: dentro de un grupo de periodicidad, elige el anuncio activo que lleva más tiempo sin mostrarse y actualiza su last_shown_at.';

-- ---------------------------------------------------------------------------
-- Dado el recuento de likes de un usuario, decide qué anuncio (si alguno)
-- toca mostrar ahora mismo. Si varios grupos coinciden, gana la
-- periodicidad más corta.
-- ---------------------------------------------------------------------------
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
  if not public.is_admin() then
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

comment on function public.get_due_ad is
  'Dado el nº de likes de un usuario, decide qué anuncio toca mostrar (prioridad a la periodicidad más corta en empates) y lo rota.';
