# Arquitectura - Connect-it

> Generado a partir de una exploración real del código el 09/09/2026, actualizado
> el 12/09/2026. Mantener actualizado tras cambios estructurales - un
> ARCHITECTURE.md desactualizado es peor que no tenerlo, porque lleva a asumir
> cosas que ya no son ciertas.

## Visión general

Connect-it es un **monorepo** con dos frontends independientes que comparten
**un único backend de Supabase** (`cucvqfhucmjphjpquivn`, `eu-west-1`):

1. **Panel de administración (web)** - en la raíz del repo. Stack: TanStack
   Start (React 19, SSR) + Tailwind v4 + shadcn/Radix, desplegado en
   Cloudflare Workers (Nitro). Vive en la raíz (no en `web/`) para no romper
   la sincronización con Lovable.dev.
2. **App móvil** - en `mobile/`. Stack: Expo SDK 57 + React Native +
   expo-router (file-based routing), soporte Web incluido
   (`react-native-web`) para poder probar sin build nativo.

No hay backend propio de aplicación: toda la lógica de servidor vive en
**Supabase** (Postgres + RLS + Edge Functions), consultado directamente
desde ambos clientes con `@supabase/supabase-js`. Patrón: **BaaS con clientes
finos**, no Clean Architecture ni MVC - la "capa de dominio" son las
funciones exportadas de `lib/` en cada cliente, que envuelven llamadas a
Supabase.

## Estructura del proyecto

```
web-landing-hub/
├── src/                          <- Panel admin (raíz, no mover - sync Lovable)
│   ├── routes/                   <- Rutas TanStack Start (file-based, prefijo admin.*)
│   ├── components/ui/            <- Componentes shadcn/Radix
│   ├── lib/
│   │   ├── supabase.ts           <- Cliente Supabase (browser)
│   │   ├── admin.ts              <- Funciones que llaman RPCs de admin (RpcFn cast)
│   │   ├── auth.ts               <- Login de admin
│   │   └── database.types.ts     <- Tipos escritos A MANO (sin Docker no hay gen types)
│   └── hooks/
├── mobile/                       <- App Expo (carpeta hermana, independiente)
│   ├── app/                      <- Rutas expo-router (file-based)
│   │   ├── (auth)/welcome.tsx    <- Login (Google OAuth, único método)
│   │   ├── (onboarding)/         <- Terms -> Role -> Role Sought -> Create Profile
│   │   ├── (tabs)/               <- Home, Chat, Store, Settings (tras onboarding)
│   │   ├── index.tsx             <- Puerta de enrutamiento (redirige según sesión/perfil)
│   │   └── _layout.tsx           <- Carga de fuentes + AuthProvider + Stack raíz
│   ├── components/               <- Button, Screen, StepHeader, RoleGrid, Checkbox, etc.
│   ├── constants/
│   │   ├── theme.ts               <- Design tokens (extraídos de Figma)
│   │   └── countries.ts           <- Mapeo ISO→español + getDeviceCountryName()
│   ├── lib/
│   │   ├── supabase.ts           <- Cliente Supabase (SecureStore en nativo, localStorage en Web)
│   │   ├── auth.ts               <- useGoogleSignIn() (nonce cifrado SHA-256)
│   │   ├── profile.ts            <- CRUD de perfil (UpdateChain/InsertChain cast)
│   │   └── errors.ts             <- getErrorMessage() - los errores de Supabase no son instanceof Error
│   └── providers/AuthProvider.tsx <- Contexto de sesión + perfil (useAuth())
├── supabase/
│   ├── migrations/               <- 24 migraciones (timestamps reales), única fuente de verdad del esquema
│   └── functions/                <- Edge Functions (Deno)
│       └── admin-users, send-email, user-lifecycle-emails, payment-webhook, send-push
└── docs/connect-it/              <- PDR: 13 archivos (producto, no arquitectura de código)
```

## Flujo de datos

### App móvil - desde el cliente hasta la base de datos

```
Pantalla (app/*.tsx)
  │ useAuth() lee { session, profile } del contexto
  ▼
providers/AuthProvider.tsx
  │ onAuthStateChange + fetchMyProfile()
  ▼
lib/profile.ts, lib/auth.ts
  │ supabase.from("profiles").select/update/insert(...)
  │ supabase.auth.signInWithIdToken(...)
  ▼
lib/supabase.ts (cliente supabase-js)
  │ SecureStore (nativo) / localStorage (Web) para persistir sesión
  ▼
Supabase (Postgres + RLS + triggers) - cucvqfhucmjphjpquivn
```

**Puerta de enrutamiento** (`app/index.tsx`): en cada carga, decide a dónde
ir según `session` y `profile` - sin sesión -> `/welcome`; sin
`terms_accepted_at` -> `/terms`; etc.

**Diseño visual — fuente de verdad:** el archivo de Figma actual es
`https://www.figma.com/design/LZOS9aaMoqgpwW29BZSpcO/Connect-it` (no otros
archivos anteriores). El servidor "Dev Mode" de Figma (desktop, MCP local)
requiere plan de pago; en su lugar se ha usado el plugin de Figma "Figma to
Code" (exporta React JSX), corrido manualmente por Jose y pegado a Claude
para extraer valores/paths reales — no aproximar colores/tipografía a mano.

**Autenticación:** solo Google OAuth en el MVP (`connect-it-auth`). El botón
"Continue with Apple" se muestra visualmente (así lo pide el diseño real,
nodo 1:16 del archivo de Figma actual) pero está **deshabilitado** — no hay
proveedor de Apple configurado en Supabase todavía. **No crear flujos de
verificación de email**: Google ya verifica el email antes del login, por lo
que un paso adicional de verificación sería redundante y requeriría
duplicar infraestructura (código propio + Resend/Brevo) o añadir
auth por contraseña, ambos descartados para el MVP.

**Componente `Button` (mobile):** soporta `icon` (elemento opcional a la
izquierda del texto, usado para el logo de Apple vía `@expo/vector-icons`
`logo-apple`, y para el círculo negro con "G" del botón de Google — no es
el logo multicolor oficial de Google, sino un círculo negro simple con una
"G" blanca en mono, tal como pide el diseño real) y `textStyle`.

**Componente `DevSignOutLink` (mobile):** reutiliza el componente `Button`
(mismo alto/estilo que "Continuar"), con fondo `#FFA077` y texto oscuro
`#0D0E0F` (convención del diseño para botones secundarios). Acepta un
`label` opcional para variar el texto sin duplicar el componente. **Desde
el 12/09/2026 se eliminó de las 5 pantallas de onboarding** (`terms.tsx`,
`terms_en.tsx`, `role.tsx`, `role-sought.tsx`, `create-profile.tsx`) —
el componente en sí sigue existiendo para usarse solo en Ajustes/Settings.
Pendiente: al cerrar sesión desde Ajustes debe redirigir siempre a
`/(auth)/welcome` (aún no implementado en código).

**Componente `Checkbox` (mobile):** nuevo, en `components/Checkbox.tsx`.
Casilla + label + descripción opcional, usa `Ionicons` para el check. Usado
en Terms para los dos consentimientos opcionales (ver más abajo).

**Detección de país (mobile):** `constants/countries.ts` expone
`getDeviceCountryName()`, que usa `expo-localization` (región del
dispositivo, sin red ni permisos) y un mapeo ISO 3166-1 alpha-2 → nombre en
español **idéntico** al de `src/lib/countries.ts` del panel admin, para que
el valor de `profiles.country` tenga siempre el mismo formato venga de
donde venga. Se detecta y guarda automáticamente al completar
`create-profile.tsx`, sin pedírselo explícitamente al usuario.

## Estado actual — Fase 1 (auth + onboarding)

Flujo completo funcional en Web (`http://localhost:8081`): Welcome → Terms
→ Role → Role Sought → Create Profile → Home tabs. Verificado de extremo a
extremo con una cuenta de Google real.

**Idioma del onboarding:** `terms.tsx`/`terms_en.tsx`, `role.tsx` y
`role-sought.tsx` están en **inglés**. `create-profile.tsx` sigue en
español (pendiente de decisión sobre si se traduce también).

**Terms (`app/(onboarding)/terms.tsx`):** texto íntegro en inglés. Incluye
dos checkboxes opcionales, desmarcados por defecto,
independientes entre sí y de la aceptación de términos:
- **Marketing communications** → guarda `profiles.marketing_consent`
  (boolean). `profiles.marketing_consent_at` se rellena solo por un
  trigger de Postgres (`set_marketing_consent_at`), no hace falta enviarlo
  desde la app.
- **Enable Radar** → guarda `profiles.radar_enabled` (boolean).

`lib/profile.ts` → `acceptTerms(userId, { marketingConsent, radarEnabled })`
guarda ambos junto con `terms_accepted_at`.

**Cambio de prioridad (12/09/2026):** se pausa el trabajo en las pantallas
de registro/onboarding (Role, Role Sought, Create Profile) para enfocar el
desarrollo en la pantalla **Home**.

**Pendiente de Fase 1:**
- Aplicar el mismo tratamiento de extracción real de Figma (colores,
  tipografía, spacing exactos) a las pantallas de Role, Role Sought,
  Create Profile y Home — por ahora solo Welcome tiene este tratamiento
  completo. El icono del logo real (SVG desde Figma) y el ícono de Google
  (círculo negro + "G") ya están aplicados en Welcome.
- EAS development build para probar Google OAuth en Android/iOS reales
  (Expo Go no funciona para esto). **Nota:** para Android hará falta
  registrar el SHA-1 del certificado de firma (el del keystore que genere
  EAS, o el de desarrollo) en Google Cloud Console — pendiente hasta llegar
  a esa fase.
- ~~Logout desde Ajustes/Settings debe redirigir siempre a `/(auth)/welcome`~~
  — implementado el 12/09/2026 (`router.replace` tras `signOut()` en
  `settings.tsx`).
- ~~Reducir un 20% el ancho de los botones largos (full-width) del flujo de
  registro~~ — implementado el 12/09/2026: `width: "80%", alignSelf:
  "center"` en el botón principal de `terms.tsx`, `terms_en.tsx`,
  `role.tsx`, `role-sought.tsx` y `create-profile.tsx`.

## Historial de sincronización repo↔Supabase (11/09/2026)

La carpeta `mobile/` llevaba tiempo sin subirse a `main` (solo existía en
local). Se subió en 3 commits:
1. `mobile/` completo (Fase 1 auth+onboarding).
2. Fase 2 backend completo: 21 migraciones, Edge Functions, panel admin de
   ads/emails/chat global/push/users, `docs/connect-it/`. 4 de esas
   migraciones (`seed_initial_skills`, `security_hardening`,
   `mobile_app_consolidation`, `fix_name_age_immutable_only_after_onboarding`)
   nunca existieron como archivo local — se habían aplicado directo contra
   Supabase y se reconstruyeron leyendo `supabase_migrations.schema_migrations`.
3. Renombrado de las 24 migraciones a sus timestamps reales de Supabase
   (antes usaban numeración secuencial local que no coincidía con el
   `version` interno — importante si en el futuro se usa la Supabase CLI).

Verificado en los 3 commits: cero archivos `.env`/`.env.production`/
`.env.local` filtrados.

## Sesión 12/09/2026

- Se eliminó `<DevSignOutLink />` (import y uso) de las 5 pantallas de
  onboarding (`terms.tsx`, `terms_en.tsx`, `role.tsx`, `role-sought.tsx`,
  `create-profile.tsx`). El componente sigue existiendo, solo para uso en
  Ajustes/Settings.
- Se tradujeron `role.tsx` y `role-sought.tsx` a inglés (título, subtítulo,
  botón "Continuar"→"Continue", mensaje de error). Los labels de
  `ROLE_LABELS` (`constants/roles.ts`) ya estaban en inglés.
- Decisiones pendientes de implementar (ver "Pendiente de Fase 1"): logout
  desde Ajustes → redirige a Welcome; botones largos del registro 20% más
  cortos.
- Cambio de prioridad: se pausan las pantallas de registro/onboarding para
  enfocar el desarrollo en Home.
- Se revisó la lógica de `app/index.tsx` por un reporte de que la pantalla
  de Terms reaparecía en cada entrada: el gate `!profile?.terms_accepted_at`
  y la persistencia en `acceptTerms()` (sin bloqueo de RLS) son correctos
  tal como están en `main` — no se encontró bug en el código estático.
  Pendiente de confirmar si el síntoma persiste con la misma cuenta (no una
  recreada) antes de investigar más.
- Implementado: `handleSignOut` en `settings.tsx` ahora hace
  `router.replace("/(auth)/welcome")` justo después de `signOut()` (antes
  no navegaba explícitamente; sin esto, `Redirect` de `app/index.tsx` no se
  vuelve a evaluar porque Settings queda montado sobre la misma ruta).
- **Ajustes → Editar perfil** (primera sub-sección de Settings en
  implementarse, de las 5 marcadas "Próximamente"): nueva pantalla
  `app/edit-profile.tsx` (ruta raíz, fuera de `(tabs)`, empujada con
  `router.push` desde el `MenuRow` de Settings). Permite editar foto,
  profesión, descripción, portfolio/CV/LinkedIn y skills (máx. 3, mismo
  `SkillPicker` que Create Profile). **Nombre y edad se muestran de solo
  lectura** — regla PDR: inmutables tras el onboarding. Nueva función
  `updateProfileDetails()` en `lib/profile.ts` (no toca `name`/`age`, a
  diferencia de `saveProfileDetails()` que sí las escribe en el
  onboarding). `MenuRow` en `settings.tsx` pasó de `View` a `Pressable`
  para soportar filas navegables además de las deshabilitadas.
- **Ajustes → Términos y Condiciones**: nueva pantalla
  `app/view-terms.tsx`. Muestra el mismo texto de Terms (en inglés, igual
  que `terms(_en).tsx`) más los toggles de Marketing consent y Radar,
  editables en cualquier momento — tal como el propio texto le dice al
  usuario ("you can change this later in settings"). No usa
  `acceptTerms()` ni toca `terms_accepted_at` (eso es solo del onboarding,
  una vez). Se añadió `marketing_consent` y `radar_enabled` al `Profile` y
  al `select` de `fetchMyProfile()` (antes no se leían de vuelta), y una
  nueva función `updateConsent()` en `lib/profile.ts` para guardar solo
  esos dos campos.
- **Ajustes → Soporte**: nueva pantalla estática `app/support.tsx`, mismo
  contenido y correo (`support@connect-it.app`) que la página web
  `/soporte` (`src/routes/soporte.tsx`), adaptado a móvil. Secciones:
  Escríbenos (mailto: vía `Linking.openURL`), Reportar un perfil o
  conversación, Problemas de acceso, Cuenta y datos. Sin backend ni
  formulario — es solo info + enlace de correo, como se pidió.
- Implementado: botón principal de Terms, Role, Role Sought y Create
  Profile ahora al 80% de ancho (`alignSelf: "center"`), igual que el
  criterio ya usado en `DevSignOutLink`. `DevSignOutLink.tsx` queda sin uso
  en ninguna pantalla por ahora (se mantiene el componente por si se
  requiere en Ajustes más adelante).
