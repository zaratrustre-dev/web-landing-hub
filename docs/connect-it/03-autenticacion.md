# 3. Autenticación

*Skill usada: `connect-it-auth`. Fuente principal: PDR §7; Master Prompt §7; skill
`connect-it-auth`; Figma (pantallas de auth, incluidas varias ocultas).*

## Google Login (MVP)

La skill `connect-it-auth` es explícita: **"Connect-it uses OAuth/social authentication only."**
Para el MVP:

- Google Login es el único método de autenticación.
- No hay registro por email/password.
- No hay login por email/password.
- No crear flujos de email/password, "forgot password" ni verificación de email.

Flujo de registro (idéntico en la skill y en el PDR §7 en su parte de Google):
`Google Login → Terms & Conditions → Role → Role Sought → Create Profile → Home`

**Name y Age se vuelven inmutables tras el registro** (skill `connect-it-auth`; coincide con PDR
§25).

## ⚠️ Contradicción detectada: Google-only (skill) vs. Google + Apple simultáneo (PDR)

El PDR (§7) dice literalmente: **"Registro mediante Google OAuth y Apple OAuth"** — presentando
ambos como parte del alcance, sin distinguir MVP de futuro. El Master Prompt (§7) también
describe el flujo como `Google/Apple OAuth`, en plural, sin marcarlo como fase futura.

La skill `connect-it-auth`, en cambio, es la única fuente que separa esto claramente en dos
bloques temporales:
- **MVP**: solo Google Login.
- **Futuro**: Apple Login se añadirá como segundo proveedor OAuth, con la arquitectura preparada
  para no tener que rediseñar el flujo existente cuando se añada.

Esta es la interpretación que se ha seguido en la práctica del proyecto hasta ahora (confirmado
en el proyecto real de Google Cloud / Supabase Auth, donde solo Google está configurado). Queda
señalado que el PDR, tal y como está redactado, no dice explícitamente "Apple es para más
adelante" — es la skill la que introduce esa priorización. Si el PDR es la fuente de verdad
funcional máxima (como dice el Master Prompt §2), este matiz debería reflejarse también en el
propio PDR para evitar ambigüedad futura.

## ⚠️ Hallazgo importante en Figma: pantallas de email/password existen, pero están OCULTAS

Al inspeccionar el archivo de Figma completo aparecen **cuatro pantallas** de autenticación por
email/contraseña, contradiciendo aparentemente tanto la skill como (parcialmente) el PDR:

- `Connect-it: Email Sign-up Card` (formulario con Nombre completo, Email, Password)
- `Connect-it: Email Login Card` (Email + Password + "Forgot Password?")
- `Connect-it: Forgot Password Screen`
- `Connect-it: Create New Password`

**Las cuatro están marcadas `hidden="true"` en el archivo de Figma** — es decir, existen como
diseño pero están deliberadamente ocultas/desactivadas en el canvas. Esto es consistente con la
skill `connect-it-auth` ("no email/password") y debe **interpretarse como confirmación de que
esas pantallas NO deben implementarse**, no como una funcionalidad pendiente. Se documenta aquí
para que quede constancia expresa de que su existencia en Figma es intencionadamente residual
(probablemente de una iteración de diseño anterior a la decisión de ir solo con OAuth), y no una
instrucción de construirlas.

**Regla aplicada**: ante la contradicción entre "Figma tiene la pantalla" y "la skill/PDR dicen
que no debe existir ese flujo", prevalece la skill (`connect-it-auth`) y el hecho de que Figma
las marca como ocultas. **No implementar registro/login/recuperación por email/contraseña bajo
ningún concepto**, tal como exige el Master Prompt (§5): *"No se permite registro por
email/password"* es una de las reglas inmutables listadas explícitamente.

## Qué SÍ debe manejar el flujo de auth (skill `connect-it-auth`)

- Loading de autenticación.
- Errores de autenticación.
- Sesiones expiradas.
- Autenticación revocada.
- Logout.
- Borrado de cuenta.

📐 Ninguno de estos estados tiene una pantalla dedicada visible en la inspección de Figma
realizada (más allá de la pantalla de Delete Account genérica) — son estados de UI (toasts,
banners, redirecciones) que probablemente no requieren pantalla propia, pero deben implementarse
igualmente.

## Estado actual

**El único auth que existe y funciona hoy es el del Panel de Administración** (repo
`web-landing-hub`), y es completamente independiente de todo lo anterior:

✅ Login de administrador con Google OAuth (Supabase Auth + Google Cloud, proyecto
`connect-it-507702`), protección de rutas del panel, bootstrap automático de rol admin para
`zaratrustre@gmail.com`. Esto **no es** el sistema de auth de la app de usuario final descrito en
este documento — es un sistema de acceso administrativo aparte, para el equipo interno, no para
los usuarios finales de Connect-it.

📐 El auth de la app de usuario final (el descrito en el resto de este documento) sigue sin
ninguna línea de código — no existe la app.
