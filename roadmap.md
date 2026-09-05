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
- [ ] `supabase start` local (requiere Docker) + `supabase link` a proyecto remoto
- [ ] Auth: Google OAuth (registro/login/logout), Apple OAuth más adelante
- [ ] Panel admin: usuarios (listar/ver/crear/editar/borrar, fotos, fecha, ubicación)
- [ ] Chat en tiempo real (Supabase Realtime) para individual y global chat
- [ ] Rate limit de Global Chat (5 msg/10s) y moderación de palabrotas/links vía Edge Function
- [ ] Notificaciones push a usuarios móviles
- [ ] Emails: enviar, crear plantilla, reutilizar plantilla, editor de texto enriquecido

## Notas
- El PDR completo (discovery, likes, match, chat global) es el objetivo final; esta fase
  monta el backend que lo soporta, empezando por la web (landing + admin).
