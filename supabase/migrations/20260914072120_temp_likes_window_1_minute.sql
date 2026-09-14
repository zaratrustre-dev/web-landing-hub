-- ---------------------------------------------------------------------------
-- Límite de Likes (PDR §18) — ventana TEMPORAL de 1 minuto para pruebas.
--
-- La función se llamaba `likes_used_last_24h` porque la ventana de
-- producción es de 24 horas (3 Likes / 24h). Mientras probamos el flujo,
-- se reduce a 1 minuto para no tener que esperar un día entero entre
-- pruebas. El nombre de la función NO cambia (para no romper el código
-- cliente que ya la llama) — solo el intervalo interno.
--
-- ⚠️ REVERTIR ANTES DE PRODUCCIÓN: cambiar interval '1 minute' de vuelta a
-- interval '24 hours' en una migración posterior.
-- ---------------------------------------------------------------------------
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
    and created_at > now() - interval '1 minute';
$$;
