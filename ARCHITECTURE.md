# Arquitectura - Connect-it

> Generado a partir de una exploración real del código el 09/09/2026, actualizado
> el 13/09/2026. Mantener actualizado tras cambios estructurales - un
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
- **Ajustes → Compartir cuenta**: implica exponer datos por primera vez
  fuera de la app, así que se tocó Supabase directamente:
  - Nueva función SQL `public.get_public_profile(p_id uuid)`
    (`SECURITY DEFINER`, migración `public_profile_share` aplicada vía MCP
    de Supabase) que devuelve **solo** `id, name, photo_url, profession,
    skills` — nunca la fila completa de `profiles`. Sin edad, descripción,
    portfolio, país, role/role_sought ni nada de moderación. No devuelve
    nada si el perfil está bloqueado o no ha terminado el onboarding.
    `grant execute ... to anon, authenticated` — es la única vía pública
    de lectura de perfiles, no se tocó RLS de la tabla en sí.
  - Web: `src/lib/public-profile.ts` (`fetchPublicProfile`) + nueva ruta
    pública `src/routes/p.$userId.tsx` (`/p/:userId`, sin login) — foto,
    nombre, profesión, skills, y botón "Descubre Connect-it" que lleva a
    `/`. Si el perfil no existe/no es público, muestra un mensaje en vez
    de un 404 feo.
    **Pendiente manual**: `src/routeTree.gen.ts` es generado por
    TanStack Router y no se debe editar a mano — hace falta correr
    `npm run dev` o `npm run build` una vez (o que Lovable.dev lo
    regenere en su próximo build) para que la ruta `/p/$userId` quede
    registrada.
  - Mobile: nueva pantalla `app/share-profile.tsx` — vista previa de lo
    que verán los demás (foto, nombre, profesión, skills), QR code del
    enlace (`react-native-qrcode-svg`, nueva dependencia — ya se apoya en
    `react-native-svg` que estaba instalado) y botón "Compartir" con el
    share sheet nativo (`Share` de React Native). URL pública construida
    con `constants/urls.ts` (`https://connect-it.app/p/<userId>` —
    dominio provisional, mismo que `support@connect-it.app`, pendiente de
    confirmar el definitivo).
- **Ajustes → Eliminar cuenta** (última de las 5 filas, PDR §24 completo):
  la más delicada de las cinco — requiere borrar de verdad al usuario, no
  solo su perfil.
  - Nueva Edge Function `delete-account` (desplegada vía MCP de Supabase,
    `verify_jwt: true`). A diferencia de `admin-users` (que exige rol
    admin y borra un `user_id` arbitrario), esta SIEMPRE borra al que
    llama — nunca acepta un id externo, la única autorización es "eres tú
    mismo" del JWT. Llama a `auth.admin.deleteUser(callerId)`.
  - Verificado en el esquema (`profiles_id_fkey`) que `profiles.id`
    referencia `auth.users(id) ON DELETE CASCADE` — por eso hay que borrar
    el usuario de `auth.users`, no solo la fila de `profiles`. Desde ahí
    cascada a `profile_skills`, `likes`, `matches`, `chat_messages`,
    `global_chat_messages`, `global_chat_rate_limits` y `reports` (todas
    `ON DELETE CASCADE` hacia `profiles`, confirmado por consulta directa
    a `pg_constraint`, no solo asumido). `matches.unmatched_by` es `NO
    ACTION` pero no da problema: la fila del match ya se borra antes por
    `profile_a`/`profile_b`, así que no hay nada que viole la constraint.
    La función también borra los archivos del bucket `profile-photos` del
    usuario (Storage no está atado a la cascada de Postgres).
  - Mobile: `lib/account.ts` (`deleteMyAccount()`, invoca la Edge
    Function) + nueva pantalla `app/delete-account.tsx` — exige escribir
    "ELIMINAR" para habilitar el botón (evita toques accidentales en una
    acción irreversible), y hace `signOut()` + redirect a Welcome al
    terminar.
  - **No implementado a propósito**: página de "descargar tus datos"
    (GDPR export) — no se pidió y es una feature aparte más grande.
- Implementado: botón principal de Terms, Role, Role Sought y Create
  Profile ahora al 80% de ancho (`alignSelf: "center"`), igual que el
  criterio ya usado en `DevSignOutLink`. `DevSignOutLink.tsx` queda sin uso
  en ninguna pantalla por ahora (se mantiene el componente por si se
  requiere en Ajustes más adelante).
- **Vista web de mobile en GitHub Pages** (para poder ver/probar sin
  build local ni EAS): se intentó primero con Vercel, pero el conector
  MCP no tenía permiso real sobre el proyecto ya creado y conectado a
  GitHub (404/409/403 inconsistentes según la llamada — desajuste de
  scope, no arreglable reintentando). Se optó por GitHub Pages, que no
  depende de ningún conector externo:
  - Nuevo `.github/workflows/mobile-web.yml`: en cada push a `main` que
    toque `mobile/**`, hace `npm install` + `npx expo export -p web`
    dentro de `mobile/` y publica `mobile/dist` en la rama `gh-pages` con
    `peaceiris/actions-gh-pages@v4`.
  - `mobile/app.json`: añadido `experiments.baseUrl: "/web-landing-hub"`
    (necesario porque GitHub Pages de proyecto sirve desde
    `usuario.github.io/repo-name/`, no desde la raíz — si no, todos los
    assets y rutas de expo-router romperían). Solo afecta la resolución de
    rutas del bundler web, no los builds nativos.
  - **`mobile/package-lock.json` no existe** (está en `.gitignore` de raíz
    a propósito), así que el workflow usa `npm install` en vez de
    `npm ci`, y sin cache de dependencias por lockfile.
  - **Pendiente manual de Jose**: activar Pages en Settings → Pages →
    Source: "Deploy from a branch" → `gh-pages` / `root` (se crea sola la
    rama en el primer run del workflow). Y añadir como Secrets del repo
    (Settings → Secrets and variables → Actions): `EXPO_PUBLIC_SUPABASE_URL`,
    `EXPO_PUBLIC_SUPABASE_ANON_KEY` (ambas ya las tengo, se las puedo dar)
    y `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (esa no la tengo). **Sin estos
    secrets el build compila igual pero la app da pantalla en blanco al
    abrir**, porque `lib/supabase.ts` hace `throw` si faltan las de
    Supabase.
  - El proyecto `connect-it-mobile-web` en Vercel se quedó a medias
    (creado y conectado a GitHub, pero inutilizable desde el conector) —
    pendiente de decidir si se borra o se termina de configurar a mano.
  - Token de GitHub usado para este push: uno nuevo (`repo` + `workflow`,
    caducidad corta) generado específicamente porque el token anterior
    (`web-landing-hub-push`, sin caducidad) solo tenía `repo`. Pendiente
    de que Jose borre el token viejo desde
    github.com/settings/tokens.

## Sesión 13/09/2026 — bugs reportados probando la web + inglés por defecto

- **Bug real: Terms reaparecía tras login con Google.** No era el gate de
  `app/index.tsx` (ese ya estaba bien) sino una condición de carrera en
  `providers/AuthProvider.tsx`: el listener `onAuthStateChange` no ponía
  `loading=true` mientras cargaba el perfil tras un login recién hecho, así
  que por una fracción de segundo `session` ya existía pero `profile`
  seguía `null`, y el gate de `index.tsx` interpretaba eso como "términos
  no aceptados" y navegaba a Terms — navegación que se quedaba hecha
  aunque el perfil llegara un instante después. Arreglado poniendo
  `loading=true`/`false` alrededor del `loadProfile` dentro del listener,
  igual que ya hacía el `getSession()` inicial.
- **404 en GitHub Pages al entrar por link directo** (ej. `/welcome`
  directamente, o recargar en esa ruta): problema clásico de SPA en
  GitHub Pages — sirve archivos tal cual, no existe el archivo físico
  `/welcome`. Añadido paso al workflow que copia `dist/index.html` a
  `dist/404.html` tras el export (truco estándar).
- Botones de "Continue with Google" y "Continue with Apple" en Welcome:
  aplicado el mismo `width: "80%", alignSelf: "center"` que ya tenían
  Role/Role Sought/Create Profile/Terms (antes no se habían tocado, de
  ahí el reporte de que seguían "muy grandes").
- **Edad → fecha de nacimiento**: `create-profile.tsx` reescrito con 3
  campos (Día/Mes/Año) en vez de un número de edad libre. Nueva función
  `computeAge()` valida que sea una fecha real (rechaza rollovers tipo 30
  de febrero) y no sea futura, calcula la edad correctamente considerando
  si ya pasó el cumpleaños este año. Se sigue guardando `age` (entero) en
  `profiles` — no se tocó el esquema ni se añadió columna de fecha de
  nacimiento.
- **Inglés por defecto en todas las pantallas**: traducidas
  `create-profile.tsx`, `edit-profile.tsx`, `settings.tsx`,
  `delete-account.tsx` (incluida la palabra de confirmación,
  `ELIMINAR` → `DELETE`), `share-profile.tsx`, `support.tsx`,
  `store.tsx`, `chat.tsx`, `(tabs)/index.tsx` (Home), `SkillPicker.tsx`,
  `DevSignOutLink.tsx`, `lib/errors.ts` (mensaje de error genérico) y
  `lib/auth.ts` (2 mensajes de error de Google Sign-In).
  **Pendiente de decisión, sin tocar a propósito**:
  `constants/countries.ts` guarda el país del perfil en español
  (`ISO_TO_SPANISH_COUNTRY`) y el propio comentario del archivo dice que
  debe coincidir EXACTAMENTE con `src/lib/countries.ts` del panel admin
  para que `profiles.country` tenga el mismo formato viniendo de donde
  venga. Traducir esto implica decidir si se traduce también el panel
  admin (cambio de datos, no solo de UI) — no se ha tocado hasta que Jose
  lo confirme explícitamente.

## Sesión 13/09/2026 (cont.) — países a inglés

- Jose confirmó traducir `constants/countries.ts` (mobile) y
  `src/lib/countries.ts` (admin) a inglés. Mapeados los 194 países
  español→inglés (`ISO_TO_SPANISH_COUNTRY` renombrado a
  `ISO_TO_COUNTRY_NAME` en mobile — no tenía otros consumidores fuera de
  `getDeviceCountryName()`, verificado con grep antes de renombrar).
  `src/lib/countries.ts` regenerado con los mismos 194 nombres en inglés,
  orden alfabético inglés.
- **Migración de datos**: antes de tocar el código se comprobó cuántos
  perfiles reales tenían país en español (4 en total: 2× "España", 1×
  "Reino Unido", más uno nuevo "Francia" que apareció entre medias — se
  ve que alguien estaba probando el registro). Los 4 se migraron con
  `UPDATE` directo a Supabase (España→Spain, Reino Unido→United Kingdom,
  Francia→France) para que sigan siendo editables desde el `<select>` del
  panel admin, cuyo `value` tiene que coincidir exactamente con el string
  guardado en `profiles.country`.
- Los placeholders del `<select>` del panel admin ("País…") se dejaron
  sin traducir a propósito — el panel admin es una herramienta interna
  para Jose, no se pidió traducirlo completo, solo que los VALORES de
  país coincidieran con mobile.

## Sesión 13/09/2026 (cont.) — bug en Ajustes → Editar perfil: skills del registro invisibles

- **Bug reportado**: en Ajustes → Editar perfil, las skills elegidas
  durante el registro no se veían — si una skill seleccionada no estaba
  entre las primeras del catálogo, ni siquiera aparecía su chip (aunque
  el contador arriba sí marcaba, ej. "2/3 seleccionadas").
- **Causa**: `mobile/components/SkillPicker.tsx` renderiza el catálogo con
  `filtered.slice(0, 30)` — un recorte fijo a 30 elementos sobre la lista
  (sin buscar activamente, el orden es el que devuelve `catalog`, alfabético
  por nombre). Si una skill ya seleccionada quedaba fuera de esas primeras
  30, su `Pressable` nunca se montaba, así que no había forma de verla ni
  de deseleccionarla desde Ajustes.
- **Fix**: antes del `slice(0, 30)`, se ordena `filtered` poniendo primero
  las skills cuyo `id` está en `selectedIds` (`ordered`). Así las
  seleccionadas quedan siempre dentro del recorte visible,
  independientemente de su posición alfabética original. No cambia el
  límite de 3 (`MAX_SKILLS`), la búsqueda ni el resto de la lógica de
  `toggle()`.
- Commit `81001b2` en `main`.

## Sesión 14/09/2026 — Panel admin: importar usuarios desde Excel (nuevo)

**Objetivo**: permitir a Jose subir un `.xlsx` de usuarios de prueba/demo
desde Ajustes → Usuarios, sin tocar backend (no hay Edge Function nueva —
reutiliza `admin-users` y las funciones ya existentes de `src/lib/admin.ts`:
`createUser`, `uploadProfilePhoto`, `updateProfilePhoto`). Estos usuarios
**nunca inician sesión de verdad** (no hay login por contraseña en el MVP,
solo Google OAuth) — sirven únicamente para poblar el directorio en
pruebas/demos.

**Archivos nuevos**:
- `src/lib/bulk-import-users.ts`: parseo del Excel con SheetJS (`xlsx`,
  nueva dependencia en `package.json`), validación de cada fila contra las
  restricciones reales de `profiles`, y orquestación de la importación.
- `src/components/admin/BulkImportUsersDialog.tsx`: diálogo (elegir
  archivo → previsualización/errores → confirmar → progreso → resultado).

**Archivos modificados**:
- `src/lib/admin.ts`: `fetchAllAdminEmails()` (reutiliza `admin_list_profiles`
  con `page_limit` grande, para comprobar duplicados antes de importar) y
  campo `onboarding_completed` añadido a `UpdateProfileInput`.
- `src/routes/admin.users.index.tsx`: botón "Importar Excel" junto a
  "+ Crear usuario".

**Validaciones por fila** (todo-o-nada: si una sola fila falla, no se
importa ninguna):
- Email obligatorio, formato válido, sin duplicados dentro del propio
  archivo NI contra la base de datos real (se comprueba ANTES de crear
  nada, vía `fetchAllAdminEmails()`).
- Nombre obligatorio.
- Edad: entero 18-120 (mismo check constraint que `profiles.age`).
- País: acepta español ("España", "México"...) o el nombre exacto en
  inglés del desplegable. Traducción vía `ES_TO_EN_COUNTRY`, un diccionario
  de ~210 alias que cubre los 194 países de `COUNTRIES`
  (`src/lib/countries.ts`). Si no reconoce el país, rechaza la fila
  explícitamente — nunca adivina ni deja pasar un valor no normalizado
  (evitaría que el filtro de país del panel funcionara para ese usuario).
- Rol: debe ser uno exacto de los 9 valores del enum `professional_role`
  (en minúsculas, igual que ya vienen en el Excel de ejemplo).
- Profesión: obligatoria, ≤20 caracteres (mismo check constraint que
  `profiles.profession`) — se rechaza la fila si se excede, nunca se trunca
  en silencio.
- Descripción: opcional, ≤200 caracteres si viene.
- Columna "Foto": algunos Excels exportados desde Google Sheets la guardan
  como texto literal `=IMAGE("url")` en vez de una URL simple (no es una
  fórmula real — `IMAGE()` no existe en Excel — Google Sheets la exporta
  igualmente como texto). `extractPhotoUrl()` detecta ese patrón con una
  regex y saca la URL de dentro de las comillas; si la celda ya es una URL
  simple, la usa tal cual. Sin este parche, el importador intentaría
  descargar la cadena `=IMAGE(...)` como si fuera una URL y fallaría la
  fila (con el consiguiente rollback de todo el lote).
- No se piden `role_sought` ni `skills` (el Excel no las trae) — quedan
  vacías; el resto del perfil sí se marca `onboarding_completed = true`.

**Ejecución e integridad**: crea usuario por usuario en orden (Admin API →
descarga y sube la foto al bucket `profile-photos` tal cual venga
(SVG incluido, sin convertir a otro formato) → marca el perfil como
completo). Si cualquier paso de cualquier fila falla a mitad de la
importación, se **revierte automáticamente** (`deleteUser`) todo lo ya
creado en ese mismo lote, para que nunca queden importaciones parciales.

**Commits en `main`**: `src/lib/bulk-import-users.ts` (feat, nuevo),
`src/components/admin/BulkImportUsersDialog.tsx` (feat, nuevo),
`src/lib/admin.ts` (feat), `src/routes/admin.users.index.tsx` (feat),
`package.json` (chore: añade `xlsx`).

**Pendiente/decisión de Jose registrada**: a partir de esta sesión, Claude
sube los cambios de código directamente al repo (commits vía API) en vez
de solo entregar los archivos para pegar a mano — Jose sigue revisando y
puede pedir revertir cualquier commit.
