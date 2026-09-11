# 8. Moderación y seguridad

*Skills usadas: `connect-it-moderation`, `connect-it-security`. Fuente principal: PDR §22;
Master Prompt §9; skills `connect-it-moderation` y `connect-it-security`; Figma (Report User).*

## Moderación — funcionalidad requerida

Skill `connect-it-moderation`:

- Report Profile.
- Report Chat.
- Unmatch.
- Block **donde corresponda** (nota: no especifica exactamente cuándo — ver vacío detectado más
  abajo).
- Moderación de lenguaje ofensivo.
- Bloqueo de links en el Chat Global.
- Detección de spam.
- Rate limiting.

Regla explícita y muy importante de la skill: **"Moderation must not exist only on the client.
Security-sensitive moderation rules must be enforced at the appropriate backend/data layer."**

PDR §22 (Safety): Report profile, Report chat y Unmatch, más *"contemplar patrones adicionales de
seguridad relevantes de plataformas de discovery cuando sean necesarios"* — una cláusula abierta
que delega en el buen juicio del equipo, sin listar ejemplos concretos.

## ⚠️ Vacío detectado: "Block" no está definido con precisión

La skill `connect-it-moderation` menciona "Block where appropriate" sin aclarar si se refiere a:
(a) el bloqueo administrativo de una cuenta completa (ya construido en el panel admin, ver
Estado actual), (b) un bloqueo usuario-a-usuario tipo "no quiero volver a ver a esta persona" —
distinto de Unmatch, que es más bien "deshacer una conexión existente" — o (c) ambos. Ninguna
fuente aclara si debe existir un "Block" separado de Unmatch para el usuario final. Se señala
para que el equipo lo defina antes de construir esa parte de la app.

## ⚠️ Vacío detectado: moderación de lenguaje ofensivo y bloqueo de links no están implementados

El PDR (§21) y las skills `connect-it-chat`/`connect-it-moderation` piden explícitamente que el
Chat Global bloquee o modere palabrotas/lenguaje ofensivo y que impida enviar links. **Ninguna de
las dos cosas existe todavía** — lo único construido en el chat global es el sistema anti-spam de
ritmo de mensajes (ver documento 6) y la moderación **manual** del admin (bloquear un mensaje ya
enviado, con motivo, desde el panel). No hay ningún filtro automático de palabras ofensivas ni
detección/bloqueo de URLs en el contenido de los mensajes antes de guardarlos.

## Report Profile / Report Chat

📐 Verificado en Figma (`Connect-it: Report User`): lista de motivos de reporte con iconos (varias
categorías, más un campo de texto libre "ADDITIONAL DETAILS"), y un botón de envío destacado en
la parte inferior.

✅ **Implementado en el backend/panel admin**: tabla `reports` (con `target_type` diferenciando
`profile` de `chat`), RLS, y funciones RPC `admin_get_user_reports` /
`admin_get_chat_messages` para que el admin revise un reporte y, si es de tipo chat, vea la
conversación completa. **No existe** el lado de usuario final que permita *crear* un reporte
desde la app (la pantalla de Figma de Report User no tiene código todavía).

## Seguridad (skill `connect-it-security`)

Requisitos, todos a nivel de **servidor**, nunca solo cliente:

- Autorización del lado del servidor.
- Validar todo dato controlado por el usuario.
- Forzar `Profession ≤20`, `Skills ≤3`, `Description ≤200` en servidor (no solo en el input).
- Proteger conversaciones privadas.
- Autenticación y sesiones seguras.
- Rate-limit en endpoints propensos a abuso.
- Proteger los sistemas de moderación (que no se puedan burlar fácilmente).
- No exponer datos privados innecesarios.
- Proteger el borrado de cuenta.
- **"Never trust client-side validation as the only security boundary."**

### Cómo se ha aplicado esta filosofía en lo que sí existe (panel admin)

✅ Todas las funciones RPC de administrador comprueban `is_admin()` dentro de la propia función
(no solo mediante RLS de tabla), devolviendo un error explícito `No autorizado` si quien llama no
es admin — verificado con pruebas reales usando roles de Postgres sin privilegios de superusuario
(no solo "se compiló", sino "un usuario sin permisos fue rechazado de verdad" en cada caso: chat
global, anuncios, notificaciones push).

✅ Las Edge Functions que requieren privilegios especiales (`admin-users`, `send-push`) verifican
el rol de admin explícitamente dentro del código de la función, no solo confían en `verify_jwt`.

✅ Los webhooks externos (`user-lifecycle-emails`, `payment-webhook`) **no** aceptan ningún JWT de
usuario — se autentican por secreto compartido o por firma criptográfica del proveedor (Stripe),
documentado explícitamente en el propio código como una decisión deliberada, no un descuido.

📐 **No aplicable todavía** a la app de usuario final: los límites de `Profession/Skills/
Description` sí están validados en el backend del panel admin (constraints de base de datos:
`check (char_length(...) <= N)`), pero eso es para el flujo de creación/edición desde el panel
admin, no desde una app de usuario que aún no existe.

## Estado actual

✅ **Implementado** (panel admin, backend únicamente): reportes (tablas + RPCs de consulta),
bloqueo administrativo de cuentas (real, a nivel de login, vía Admin API — no solo un flag
visual), anti-spam del chat global, autorización server-side verificada con pruebas reales en
cada función sensible construida.

📐 **No implementado**: moderación automática de lenguaje ofensivo, bloqueo automático de links,
Report/Block desde la app de usuario final, y la distinción exacta entre "Block" y "Unmatch" que
falta definir.
