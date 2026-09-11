# 11. Despliegue y entornos

*Skill usada: `connect-it-deployment`. Fuente principal: skill `connect-it-deployment`;
`PDR___Panel_de_Administración.md` §15 (orden de prioridad); estado real de despliegue del
proyecto.*

## Requisitos de la skill

- Entornos de desarrollo, staging y producción **separados**.
- Nunca commitear secretos.
- Validar variables de entorno.
- Migraciones de base de datos seguras.
- Logging de errores y monitorización.
- Preparar la infraestructura de chat en tiempo real para producción.
- Mantener la funcionalidad de pagos desactivada hasta que se active explícitamente.
- Despliegue reproducible.
- Verificar los requisitos P0 del PDR antes de publicar.
- Ejecutar el checklist de testing de Connect-it antes de desplegar a producción.

## ⚠️ Vacío detectado: no existe entorno de staging

La skill pide explícitamente tres entornos separados (dev/staging/producción). **Solo existen
dos**: desarrollo local (Supabase local vía Docker + `npm run dev`) y producción (Supabase Cloud +
Cloudflare Workers). No hay ningún entorno intermedio de staging donde probar cambios antes de que
lleguen a producción real. Dado que los despliegues actuales van directos de local a producción,
esto es un riesgo real a considerar, especialmente según crezca el número de repos (ver nota
sobre multi-repo más abajo).

## Entornos reales existentes

| Entorno | Base de datos | Frontend | Estado |
|---|---|---|---|
| **Desarrollo local** | Supabase local (Docker) | `npm run dev`, `localhost:8080` | ✅ Funcional |
| **Producción** | Supabase Cloud (`connect-it`, `eu-west-1`) | Cloudflare Workers | ✅ Funcional, en uso real |
| **Staging** | — | — | ❌ No existe |

## Secretos y configuración

✅ Ningún secreto se ha commiteado al repositorio en ningún momento de este proyecto — las claves
(Google OAuth, Resend, Brevo, Firebase, Stripe cuando se active, secretos de webhooks) se
gestionan como **Edge Function Secrets** de Supabase, configurados directamente en el dashboard,
nunca en archivos de código. El secreto compartido para los triggers de `pg_net` (emails
automáticos de ciclo de vida) se generó aleatoriamente dentro de la propia base de datos, sin
pasar nunca por texto plano en ningún archivo.

## Migraciones

✅ Todas las migraciones (19 hasta la fecha) se han aplicado **primero contra Postgres real** antes
de darlas por buenas, y después replicado exactamente en producción vía el conector de Supabase —
nunca aplicadas a producción "a ciegas" sin validación previa.

## Monitorización

⚠️ **No existe ningún sistema de logging de errores ni monitorización dedicado** más allá de lo
que Supabase/Cloudflare ofrecen por defecto en sus propios dashboards (logs de Edge Functions,
analíticas básicas de Workers). La skill pide *"provide error logging and monitoring"* de forma
explícita — no se ha construido ninguna capa adicional (por ejemplo, alertas automáticas ante
fallos repetidos de envío de email, o un dashboard de salud del sistema).

## Chat en tiempo real en producción

✅ La infraestructura de Realtime (Supabase, ver doc. 6) está activada y probada en producción para
el chat global — cumple con el requisito de la skill de tener el chat en tiempo real listo para
producción, aunque solo para el lado de moderación del admin, no para el chat real de usuario.

## Pagos

✅ Cumplido: no se ha activado ningún cobro real. El webhook de Stripe (`payment-webhook`) existe
como infraestructura preparada, pero no está conectado a ninguna cuenta de Stripe activa ni
procesa cobros de verdad todavía — coherente con la regla de la skill y con el PDR (§23, §38).

## Orden de implementación: PDR del panel vs. lo que realmente se construyó

`PDR___Panel_de_Administración.md` §15 sugiere este orden: (1) Autenticación del admin, (2)
Estructura/navegación, (3) Usuarios, (4) Anuncios, (5) Emails y plantillas, (6) Notificaciones
Push, (7) Chat en tiempo real, (8) Dashboard y estadísticas.

**Lo que se construyó de verdad siguió ese orden casi exactamente** (Auth → Usuarios → Anuncios →
Emails → Push → Chat), con dos matices:

- ⚠️ **"Plantillas" (§4.2-4.3 del PDR del panel) nunca se construyó** — la decisión tomada con el
  usuario fue usar las plantillas nativas de Resend/Brevo en vez de un editor propio dentro de
  Connect-it (ver más detalle en el propio PDR del panel, sección de Emails, que pedía un editor
  Rich Text con variables `{{nombre}}` dentro del panel — eso no existe; en su lugar, el editor
  vive fuera de Connect-it, en el dashboard de cada proveedor).
- ⚠️ **"Dashboard y estadísticas" (paso 8) no se ha construido** — la pantalla de inicio del panel
  admin es solo una lista de enlaces a cada sección, sin ninguna métrica ni resumen. Sigue
  pendiente.

## Nota sobre multi-repo futuro

El proyecto está previsto que crezca a **3 repositorios en total**, cada uno con su propio
proyecto de Supabase independiente y su propia configuración de email — sin nada compartido entre
ellos. Esto ya está acordado y en memoria del proyecto, pero **no tiene todavía ningún documento
de arquitectura propio** que explique cómo se coordinarán entre sí (por ejemplo, si comparten
autenticación de usuarios finales, o si son completamente aislados). Se señala como vacío a
rellenar antes de que se cree el segundo repositorio.

## Checklist de release (según la skill, aplicado al estado actual)

- [x] P0 del PDR verificados — no aplica todavía, ya que el P0 completo (Auth, onboarding,
      perfiles, Home, cards, Like/Dislike, Match, Chat individual — PDR §38) pertenece a la app
      de usuario, que no existe.
- [x] Checklist de testing ejecutado — no aplica, ver documento 10.
- [x] Sin secretos commiteados.
- [x] Migraciones probadas antes de producción.
- [ ] Entorno de staging.
- [ ] Monitorización/alertas dedicadas.

## Estado actual

✅ **El panel de administración está desplegado en producción de verdad** y en uso. 📐 La app de
usuario final (donde de verdad aplica el checklist P0 del PDR) no existe todavía, así que la
mayoría de los requisitos de release de esta skill son prematuros hasta ese punto.
