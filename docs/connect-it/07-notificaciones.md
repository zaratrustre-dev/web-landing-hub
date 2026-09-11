# 7. Notificaciones

*Skill usada: `connect-it-notifications`. Fuente principal: skill `connect-it-notifications`;
`PDR___Panel_de_Administración.md` §3; Master Prompt (no dedica sección propia, notificaciones se
mencionan como parte de la paridad Tinder en §4 y §9).*

## Qué deben cubrir

Según la skill `connect-it-notifications`, las notificaciones deben cubrir tres eventos
concretos:

- **New Matches**: notificar cuando un Like mutuo genera un Match.
- **New Messages**: notificar cuando se recibe un mensaje de chat nuevo.
- **Important Status Changes**: notificar sobre estados relevantes de cuenta o producto —
  acciones importantes sobre la cuenta, restricciones, o cambios que requieran atención.

Reglas adicionales de la skill:

- Mantenerlas profesionales y relevantes al networking (nada de notificaciones "de dating").
- Evitar notificaciones innecesarias o de spam.
- Soportar estados de leído/no leído donde aplique.
- Consistencia across los distintos estados de la UI.
- Mantener el sistema extensible para futuras funcionalidades.
- **"Push notifications can be added later, but the in-app notification architecture should be
  considered from the beginning."** — es decir, la skill distingue explícitamente entre
  **notificaciones push** y una **arquitectura de notificaciones dentro de la app** (centro de
  notificaciones, badges, estados leído/no leído), y pide diseñar esta última desde el principio
  aunque el push llegue después.

## ⚠️ Vacío detectado: solo se ha construido la mitad (push), falta la arquitectura in-app

Lo que existe hoy es exclusivamente el **envío de notificaciones push desde el panel admin**
(ver Estado actual). **No existe ningún diseño ni implementación de un centro de notificaciones
dentro de la app**, ni estados de leído/no leído, ni ningún modelo de datos para notificaciones
individuales por evento (Match nuevo, mensaje nuevo, cambio de estado de cuenta) — solo existe la
capacidad de que un admin redacte y dispare un push arbitrario a los usuarios, no un sistema de
notificaciones dirigido por eventos del producto (matches, mensajes...) como pide la skill.

Esto es coherente con el estado general del proyecto (nada de la app de usuario existe todavía),
pero se señala explícitamente porque la skill pide empezar por la arquitectura in-app "desde el
principio", y hasta ahora se ha construido únicamente la pieza de push, en el orden inverso al
sugerido por la skill.

## Notificaciones Push (panel admin)

`PDR___Panel_de_Administración.md` §3 especifica un alcance sencillo: el admin puede crear una
notificación (título + mensaje) y enviarla a **todos los usuarios móviles**, con el sistema
encargándose de gestionar tokens/dispositivos.

## Estado actual

✅ **Implementado y desplegado en producción** — pero **excede** el alcance simple del PDR del
panel (que solo pedía "enviar a todos"), añadiendo selección de destinatarios:

- Tabla `push_tokens` (ya existía en el esquema base) y tabla nueva `push_log` (historial, con
  RLS verificada con roles reales).
- Edge Function `send-push`: envía vía **Firebase Cloud Messaging, API HTTP v1** (OAuth2 con
  cuenta de servicio; la firma JWT RS256 se implementó a mano con Web Crypto, sin librerías
  externas, y se **verificó criptográficamente** contra su clave pública antes de darla por
  buena — no fue solo "se compiló sin errores").
- Panel `/admin/push`: buscar/seleccionar destinatarios, opción "enviar a todos", historial con
  errores visibles.

⚠️ **Sin poder probarse de extremo a extremo todavía**: no existe ninguna app de usuario final
que registre un dispositivo en `push_tokens`, así que el sistema está construido y listo pero sin
ningún destinatario real posible hasta que exista esa app. Confirmado explícitamente con el
usuario, que decidió pausar más trabajo aquí hasta entonces.

📐 **No implementado**: la arquitectura in-app de notificaciones (centro de notificaciones,
leído/no leído, notificaciones dirigidas por eventos de Match/mensaje/cuenta) que la skill pide
como prioridad de diseño.
