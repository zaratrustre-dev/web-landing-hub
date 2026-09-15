-- ============================================================================
-- Connect-it — Arreglo real del bug de anuncios que no aparecían
-- ============================================================================
-- Causa raíz encontrada (15/09/2026, probando la llamada exacta que hace
-- el cliente vía SQL simulando auth.uid()): ALTER FUNCTION ... RENAME TO
-- (migración 20260915002100_rename_ads_to_sponsored_content.sql) solo
-- cambia el NOMBRE de la función — el CUERPO seguía con el texto literal
-- "from public.ads", que dejó de existir en cuanto se renombró la tabla.
-- Resultado: get_due_sponsored_content() fallaba con
-- 'relation "public.ads" does not exist' en TODAS las llamadas desde que
-- se aplicó el rename, sin importar si el cliente tenía el código nuevo o
-- viejo, ni si se refrescaba la página o no — el error estaba en el
-- servidor, no en el cliente. sendSwipe() se traga el error (a propósito,
-- para no bloquear el guardado del Like), así que nunca fue visible.
--
-- CREATE OR REPLACE FUNCTION reescribe el cuerpo completo apuntando a
-- public.sponsored_content; conserva nombre, firma, permisos y comments.
-- ============================================================================

create or replace function public.pick_and_rotate_sponsored_content_for_group(target_periodicity integer)
returns public.sponsored_content
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen public.sponsored_content;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into chosen
  from public.sponsored_content
  where periodicity_likes = target_periodicity and is_active = true
  order by last_shown_at asc nulls first
  limit 1;

  if chosen.id is not null then
    update public.sponsored_content set last_shown_at = now() where id = chosen.id;
    chosen.last_shown_at := now();
  end if;

  return chosen;
end;
$$;

create or replace function public.get_due_sponsored_content(likes_count integer)
returns public.sponsored_content
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
  from public.sponsored_content
  where is_active = true
    and periodicity_likes > 0
    and likes_count % periodicity_likes = 0;

  if winning_periodicity is null then
    return null;
  end if;

  return public.pick_and_rotate_sponsored_content_for_group(winning_periodicity);
end;
$$;

grant execute on function public.pick_and_rotate_sponsored_content_for_group(integer) to authenticated;
grant execute on function public.get_due_sponsored_content(integer) to authenticated;

comment on function public.pick_and_rotate_sponsored_content_for_group is
  'Round-robin real: dentro de un grupo de periodicidad, elige el contenido patrocinado activo que lleva más tiempo sin mostrarse y actualiza su last_shown_at. Cuerpo corregido el 15/09/2026 para apuntar a sponsored_content (el rename de tabla anterior solo había renombrado la función, no el cuerpo).';

comment on function public.get_due_sponsored_content is
  'Dado el nº de likes de un usuario, decide qué contenido patrocinado toca mostrar (prioridad a la periodicidad más corta en empates) y lo rota. Cuerpo corregido el 15/09/2026 para apuntar a sponsored_content (el rename de tabla anterior solo había renombrado la función, no el cuerpo).';
