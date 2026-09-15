-- ============================================================================
-- Connect-it — Renombrar `ads` → `sponsored_content` (y funciones asociadas)
-- ============================================================================
-- Bug reportado (15/09/2026): en el panel admin, Editar/Borrar/Desactivar
-- fallan en desktop con "TypeError: NetworkError when attempting to fetch
-- resource" pero funcionan en móvil. Causa: los bloqueadores de anuncios de
-- escritorio (uBlock Origin, AdBlock, y la Protección de Rastreo Mejorada
-- de Firefox activada por defecto) bloquean peticiones de red cuya URL
-- contiene la palabra "ads" — aquí, literalmente el nombre de la tabla en
-- la URL de PostgREST (`/rest/v1/ads`). Es un falso positivo muy conocido.
--
-- ALTER TABLE/FUNCTION RENAME conserva RLS, policies, triggers, comments y
-- grants (están ligados al oid, no al nombre), así que no hace falta
-- recrear nada de eso.
--
-- El bucket de Storage "ads-media" se deja igual por ahora (ver nota en el
-- código del panel admin): renombrarlo requeriría mover el objeto binario
-- ya subido y no hay evidencia de que las cargas de <img>/<video> estén
-- siendo bloqueadas (el bug reportado es solo en las mutaciones).
-- ============================================================================

alter table public.ads rename to sponsored_content;

alter function public.get_due_ad(integer) rename to get_due_sponsored_content;
alter function public.pick_and_rotate_ad_for_group(integer) rename to pick_and_rotate_sponsored_content_for_group;

comment on table public.sponsored_content is
  'Anuncios gestionados desde el panel admin (PDR Panel de Administración §5-10). Renombrada de "ads" el 15/09/2026 para evitar que bloqueadores de anuncios del navegador bloqueen las peticiones REST.';

comment on function public.get_due_sponsored_content is
  'Dado el nº de likes de un usuario, decide qué contenido patrocinado toca mostrar (prioridad a la periodicidad más corta en empates) y lo rota. Cualquier usuario autenticado puede invocarla. Renombrada de get_due_ad el 15/09/2026 (ver rename de tabla).';

comment on function public.pick_and_rotate_sponsored_content_for_group is
  'Round-robin real: dentro de un grupo de periodicidad, elige el contenido patrocinado activo que lleva más tiempo sin mostrarse y actualiza su last_shown_at. Renombrada de pick_and_rotate_ad_for_group el 15/09/2026 (ver rename de tabla).';
