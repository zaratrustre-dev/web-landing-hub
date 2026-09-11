-- ============================================================================
-- Connect-it — Anuncios: las opciones de periodicidad pasan de 5/10/20 a
-- 5/22/47. La regla de prioridad ("gana la periodicidad más corta en
-- empates", ya implementada en get_due_ad) no cambia: sigue funcionando
-- igual sea cual sea el conjunto de números elegido.
-- ============================================================================

alter table public.ads alter column periodicity_likes set default 5;
