# Connect-it — Roadmap

## Fase 1 — Web / Landing (hecho)
- [x] Dirección visual elegida: "Coral social"
- [x] Sistema de diseño en src/styles.css (tokens, tipografía)
- [x] Landing `/`: hero, 9 categorías, profile card demo, flujo Match→chat, Global Chat, CTA Google/Apple
- [x] Rutas públicas: `/terminos`, `/privacidad`, `/soporte`
- [x] SEO por ruta (head con title/description/og)


## Fase 2 — Panel de administración web (nuevo)
- [ ] Habilitar Lovable Cloud (base de datos + auth + storage)
- [ ] Auth: iniciar sesión, registrarse, cerrar sesión (+ rol admin en tabla user_roles)
- [ ] Usuarios: listar con paginación, ver, crear, editar, borrar
- [ ] Usuarios: carga de imágenes, borrar fotos, selector de ubicación, selector de fecha
- [ ] Chat en tiempo real con cualquier usuario (Realtime; socket.io no aplica en este stack)
- [ ] Notificaciones push a usuarios móviles
- [ ] Emails: enviar, crear plantilla, reutilizar plantilla, editor de texto enriquecido

## Notas
- El PDR de la app móvil (discovery, likes, match, chat global) queda fuera de esta fase; la web cubre landing + admin.
