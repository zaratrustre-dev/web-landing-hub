# Connect-it — Roadmap

## Fase 1 — Web / Landing (hecho)
- [x] Dirección visual elegida: "Coral social"
- [x] Sistema de diseño en src/styles.css (tokens, tipografía)
- [x] Landing `/`: hero, 9 categorías, profile card demo, flujo Match→chat, Global Chat, CTA Google/Apple
- [x] Rutas públicas: `/terminos`, `/privacidad`, `/soporte`
- [x] SEO por ruta (head con title/description/og)


## Fase 2 — Backend con Supabase CLI (en progreso)
- [x] Backend: Supabase gestionado con CLI (`supabase/`), no Lovable Cloud
- [x] Esquema inicial: profiles, roles, skills (máx. 3), likes (3/día), matches, chat individual,
      global chat + moderación, reports, push_tokens, email_templates/log
      (`supabase/migrations/00000000000001_init_schema.sql`)
- [x] RLS en todas las tablas + rol `admin` vía `user_roles`/`is_admin()`
      (`supabase/migrations/00000000000002_rls_policies.sql`)
- [x] Seed de skills basado en Upwork (`supabase/seed.sql`)
- [x] Cliente Supabase en el frontend (`src/lib/supabase.ts`, `src/lib/database.types.ts`)
- [x] Auth: Google OAuth admin (`/admin/login`, `/admin`, guardia de sesión + rol admin)
- [x] Panel admin: listado de usuarios paginado (`admin_list_profiles`, `/admin/users`)
- [x] País (`country`) añadido al perfil (PDR panel admin — "ubicación")
- [x] Bloqueo de usuarios: RLS (oculta en Discovery) + bloqueo REAL de login vía Admin API
      (Edge Function `admin-users`, acción `set_banned`)
- [x] Crear usuario nuevo y Borrar usuario de verdad — Edge Function `admin-users` con permisos de
      administrador (Admin API de Supabase)
- [x] Crear usuario: foto de perfil (bucket `profile-photos` en Storage, con RLS), país como
      desplegable (`src/lib/countries.ts`), consentimiento de marketing independiente y opcional
      (desmarcado por defecto, con fecha de aceptación/retirada)
- [ ] `supabase start` local (requiere Docker) + `supabase link` a proyecto remoto — hecho en local,
      falta enlazar a un proyecto Supabase en la nube para producción
- [x] Ver usuario (detalle) y Editar usuario (Profession/Skills/Description/Briefcase/Country/Foto/
      Marketing) — ficha en `/admin/users/:id`, edición inline con selector de skills
- [x] Búsqueda (nombre/email) y filtros (rol, país, bloqueo, reportado) en el listado de usuarios
- [x] `onboarding_completed` automático (trigger: se completa solo si role + role_sought +
      profession están rellenos, sea quien sea quien los rellene)
- [x] Moderación: ficha de usuario muestra sus reportes (perfil o chat) con quién y por qué, y
      permite abrir la conversación reportada para revisarla (`admin_get_chat_messages`)
- [x] Notificaciones Push: Edge Function `send-push` vía Firebase Cloud Messaging (API HTTP v1,
      OAuth2 con cuenta de servicio, firma RS256 implementada a mano y probada criptográficamente
      sin dependencias externas). Panel `/admin/push` con selector de destinatarios y "enviar a
      todos". Sin poder probarse de extremo a extremo todavía: no existe app de usuario final que
      registre dispositivos en `push_tokens`
- [x] Chat global en vivo para MODERACIÓN admin (`/admin/global-chat`): Supabase Realtime
      activado (migración añade la tabla a supabase_realtime), suscripción postgres_changes
      INSERT/UPDATE, bloquear/desbloquear con motivo. RLS reverificada (no-admin bloqueado,
      admin puede). El chat REAL para usuarios finales (individual + global) sigue pendiente,
      es parte de la app de usuario todavía no empezada
- [ ] Rate limit de Global Chat (5 msg/10s) y moderación de palabrotas/links vía Edge Function
- [ ] Notificaciones push a usuarios móviles
- [ ] Emails: enviar, crear plantilla, reutilizar plantilla, editor de texto enriquecido con
      variables dinámicas (`{{nombre}}`) — respetando `marketing_consent` para envíos comerciales
- [x] Anuncios: CRUD completo (crear/ver/editar/listar/activar-desactivar/borrar) en `/admin/ads`,
      con subida de imagen o vídeo a Storage, previsualización antes de guardar, enlace de destino
      y periodicidad (cada N swipes). Mostrarlos a usuarios reales (rotación cíclica, prioridad de
      nuevos) se deja para cuando exista la app de usuario final
      usuario final con Discovery/swipe

## Notas
- El PDR completo (discovery, likes, match, chat global) es el objetivo final; esta fase
  monta el backend que lo soporta, empezando por la web (landing + admin).
- Existe un documento aparte, `PDR — Panel de Administración.md`, específico de esta Fase 2
  (gestión de usuarios, chat, notificaciones, emails, anuncios). No sustituye ni se mezcla con
  el PDR de producto de Connect-it; son documentos de alcance distinto (tooling interno vs. producto).

- [x] Chat global: anti-spam con modo lento/bloqueo (10+ msj en <5s -> modo lento 1 msj/10s
      durante 1 min; 3 reincidencias -> bloqueo 5 min, luego tabla rasa). Implementado con dos
      triggers en Postgres (BEFORE para rechazar, AFTER para detectar ráfagas sin que el rechazo
      deshaga el registro del estado) y probado de verdad con ráfagas reales, incluida la
      escalada completa 1→2→3 con separación temporal real entre incidentes.
- Like desde el chat global -> Match si es mutuo: NO necesita nada nuevo, ya lo cubre el sistema
      de likes/matches existente (trigger handle_mutual_like). Falta solo el botón en la futura
      pantalla de chat de la app de usuario.
