-- ---------------------------------------------------------------------------
-- Límite de Likes (PDR §18) — ventana TEMPORAL de 10 segundos para pruebas.
--
-- Sustituye a la ventana de 1 minuto (20260914072120_temp_likes_window_1_minute.sql).
-- Se ajusta junto con LIKE_LIMIT (mobile/lib/discovery.ts): pasa de
-- 3 Likes/1 minuto a 5 Likes/10 segundos, para poder probar la periodicidad
-- de anuncios de "cada 5 likes" sin bloquearse a los 3.
--
-- ⚠️ REVERTIR ANTES DE PRODUCCIÓN: cambiar interval '10 seconds' de vuelta a
-- interval '24 hours' (y LIKE_LIMIT de 5 a 3) en una migración posterior.
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
    and created_at > now() - interval '10 seconds';
$$;
