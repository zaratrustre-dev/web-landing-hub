# 10. Testing

*Skill usada: `connect-it-testing`. Fuente principal: skill `connect-it-testing`; metodología de
verificación aplicada realmente en el desarrollo del panel admin durante este proyecto.*

## Tests obligatorios según la skill (para la app de usuario final)

Lista completa, tal cual la define `connect-it-testing`:

Google Login · Registro · Aceptación de Terms · Selección de Role · Selección de Role Sought ·
Creación de perfil · Edición de perfil · Profession exactamente 20 caracteres · Intentar 21+
caracteres · 0–3 skills · Intentar seleccionar una 4ª skill · Description exactamente 200
caracteres · Intentar 201+ caracteres · Skills con nombres largos · Estabilidad responsive de la
profile-card · Cuota de Likes · Countdown de 24 horas · Match mutuo · Start Chat · Keep
Discovering · Chat individual · Chat global · Moderación de lenguaje ofensivo · Bloqueo de links ·
**"5 messages / 10 seconds rate limit"** · Report · Unmatch · Estado de Store desactivada ·
Restricciones de Edit Profile · Delete Account vs. Logout.

La skill pide probar tanto **comportamiento de frontend** como **validación de
backend/datos** donde aplique — no basta con que la UI se vea bien.

## ⚠️ Nota: el propio checklist de testing hereda la contradicción del rate-limit

El ítem "5 messages / 10 seconds rate limit" de esta lista usa el número del PDR original, **no**
el que realmente se implementó (10 mensajes/5 segundos + modo lento + bloqueo — ver doc. 6). Si
se usa este checklist tal cual para escribir tests automatizados, los tests fallarían contra la
implementación real. Debe actualizarse a la vez que se resuelva la contradicción documentada en
el documento 6.

## 📐 Ninguno de estos tests existe todavía para la app de usuario final

Dado que no hay ni una sola pantalla de la app de usuario construida, **no existe ningún test
automatizado (ni manual documentado) de ninguno de los ítems de la lista anterior.** Esto no es
un vacío de calidad — es simplemente que no hay nada que probar todavía en ese frente.

## Metodología de verificación aplicada de verdad en lo que sí existe (panel admin)

A diferencia de la lista anterior (que es 100% pendiente), el trabajo realizado en el panel de
administración durante este proyecto se validó siguiendo una disciplina consistente que vale la
pena documentar como precedente para cuando empiece la app de usuario:

- **Toda migración SQL se aplicó primero contra una base de datos Postgres real** (no una
  simulación) antes de darla por buena, incluyendo comprobación de columnas, triggers y funciones
  con datos reales insertados.
- **La RLS (Row Level Security) se probó con roles de Postgres reales sin privilegios de
  superusuario**, no solo leyendo el código de la política — confirmando en cada caso tanto que
  un usuario sin permiso es rechazado de verdad como que un admin real sí puede operar. Se
  detectó y corrigió más de una vez un fallo de metodología propio (probar como superusuario, que
  se salta la RLS por diseño de Postgres) antes de aceptar un resultado como válido.
- **La lógica de anti-spam del chat global se probó con ráfagas de mensajes reales**, incluyendo
  separación temporal real entre incidentes (no solo simulada) para verificar las 7 transiciones
  de estado completas: normal → modo lento → rechazo → permitido tras esperar → segunda
  reincidencia → bloqueo → vuelta a normal con contador reseteado.
- **La firma criptográfica JWT (RS256) para las notificaciones push (Firebase)** se verificó de
  forma aislada generando un par de claves de prueba y comprobando la firma contra la clave
  pública correspondiente, antes de asumir que el código de producción sería correcto.
- **Cada Edge Function se validó con el compilador y linter real de Deno** (`deno check`, `deno
  lint`, `deno fmt`) antes de desplegarse, no solo revisada visualmente.
- Los fallos de producción reportados por el usuario durante el desarrollo (por ejemplo, el
  mensaje de error genérico que ocultaba la causa real de un fallo de envío de email) se
  diagnosticaron consultando **datos reales de producción** (tablas de log, respuestas de
  `net._http_response` de pg_net) en vez de adivinar la causa.

## Estado actual

✅ **Metodología de verificación real y sistemática aplicada** en todo lo construido para el panel
admin (base de datos, Edge Functions, RLS, criptografía, anti-spam).

📐 **Checklist completo de la skill `connect-it-testing`, sin empezar**, a la espera de que exista
la app de usuario final sobre la que ejecutarlo.
