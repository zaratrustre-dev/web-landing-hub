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

## Sesión 14/09/2026 — Fix seguridad: `xlsx` vendored desde CDN oficial de SheetJS

**Motivo**: la versión de npm de `xlsx` (`^0.18.5`) tiene 2 vulnerabilidades
conocidas sin parchear desde 2023 — Prototype Pollution
([GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6)) y
ReDoS ([GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)).
SheetJS dejó de publicar versiones corregidas en el registro de npm — la
única forma de obtener la versión parcheada (>=0.20.2) es descargarla desde
su propio CDN (`cdn.sheetjs.com`), que **no está en la whitelist de red del
sandbox de Claude** (`host_not_allowed`). Por eso el tarball se descargó
manualmente (Jose, desde su máquina) y se subió a Claude para vendoring.

**Qué se hizo**:
- Verificado el checksum MD5 del tarball (`aac39517149362ea8123d8a303486c3c`)
  contra el hash oficial publicado por SheetJS para la versión 0.20.3, antes
  de usarlo.
- Tarball guardado en `vendor/xlsx-0.20.3.tgz` dentro del repo (patrón de
  "vendoring" documentado oficialmente por SheetJS para Bun/npm cuando no
  hay acceso directo al CDN).
- `package.json`: `"xlsx": "^0.18.5"` → `"xlsx": "file:vendor/xlsx-0.20.3.tgz"`.
- `bun install` regeneró `bun.lock` en consecuencia.
- Verificado funcionalmente: `XLSX.read` + `XLSX.utils.sheet_to_json`
  (las dos únicas funciones que usa `bulk-import-users.ts`, líneas 352 y
  362) siguen funcionando igual — probado con un Excel de prueba simulando
  la plantilla real de importación de usuarios.
- `bun run build` compila sin errores; `xlsx.mjs` queda empaquetado
  correctamente en `.output/server/_libs/`.
- Sin cambios de comportamiento relevantes: el único cambio "potencialmente
  disruptivo" documentado por SheetJS entre 0.18.5 y 0.20.3 es la
  interpretación de fechas (UTC vs. hora local) — no aplica, la plantilla
  de importación de usuarios no tiene columnas de fecha.

**⚠️ Regla importante para el futuro**: nunca reinstalar `xlsx` con
`bun add xlsx` a secas — eso volvería a traer la versión vulnerable de npm
(`^0.18.5`, la última publicada ahí). Si se necesita actualizar la versión
vendored en el futuro, repetir el mismo proceso: alguien con acceso a
`cdn.sheetjs.com` descarga el tarball nuevo, verifica el checksum oficial,
y lo sube a `vendor/` reemplazando el actual.

**Commits en `main`**: `package.json` + `bun.lock` (fix: xlsx 0.20.3 vía
CDN), `vendor/xlsx-0.20.3.tgz` (nuevo, binario vendored), `ARCHITECTURE.md`
(docs: esta sección).

## Sesión 14/09/2026 — CI/CD: Cloudflare Workers Builds (deploy automático)

**Motivo**: el panel admin se desplegaba manualmente (`wrangler deploy` desde
la máquina de Jose), sin ninguna relación con `git push`. Esto causó que el
Worker en producción quedara **varios commits atrás** de `main` durante
días (sin el botón "Importar Excel" ni el fix de seguridad de `xlsx` de la
sesión anterior) sin que nadie lo notara, porque no había ninguna señal de
que estuvieran desincronizados.

**Qué se hizo**: se conectó el repo `zaratrustre-dev/web-landing-hub`
(rama `main`) directo al Worker `zaratrustre-dev-web-landing-hub` vía
**Workers Builds** (Cloudflare dashboard → el Worker → **Settings → Builds
→ Connect**), instalando la GitHub App de Cloudflare con acceso solo a ese
repo. A partir de ahora, **cada `git push` a `main` dispara build + deploy
automático** — no hace falta correr nada a mano ni pedirle a Claude que
"despliegue" (Claude tampoco puede: el conector MCP de Cloudflare que usa
Claude no tiene ninguna herramienta de deploy, solo lectura de D1/KV/R2/
Hyperdrive/Workers — confirmado explícitamente revisando la lista completa
de herramientas permitidas).

**Configuración del build**:
- Build command: `bun run build`
- Deploy command: `npx wrangler deploy` (default)
- Root directory: `/` (repo raíz, no subcarpeta — el panel admin vive en
  la raíz del monorepo, no en `mobile/`)
- Preview builds activado: pushes a ramas que no sean `main` generan un
  preview sin tocar producción.

**⚠️ Gotcha importante descubierto — variables de entorno de build vs.
runtime**: Vite necesita `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
**en el momento de compilar** (se hornean en el bundle del cliente vía
`import.meta.env`), no en runtime. Cuando el build corría en la máquina de
Jose, tomaba estos valores de su `.env.local` local — pero el build de
Cloudflare corre en infraestructura de Cloudflare, sin ese archivo. Sin
esto configurado, el build compila bien (Vite no valida el valor en build
time) pero la app **crashea en producción** al cargar cualquier página con
"Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY" (throw explícito en
`src/lib/supabase.ts`).

**Fix**: agregar las variables en **Settings → Build → Build Variables and
Secrets** del Worker (sección distinta de "Variables and secrets" de
Runtime — esa es para bindings/secrets que el Worker usa en producción,
no para el proceso de build). Los valores se sacan de Supabase Dashboard →
Project Settings → API Keys, del proyecto `cucvqfhucmjphjpquivn`.

**⚠️ Segundo gotcha, más sutil — `.env.example` tenía la publishable key
VIEJA**: `.env.example` traía `VITE_SUPABASE_ANON_KEY=sb_publishable_
ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`, y al configurar la variable de build se
copió ese valor asumiendo que estaba vigente (la key pública, a diferencia
de la `service_role`, no es secreta, así que parecía razonable que
`.env.example` tuviera el valor real). **Estaba mal — Supabase rotó la
publishable key en algún momento** y ese valor viejo ya daba
`401 UNAUTHORIZED_INVALID_API_KEY` en `/auth/v1/user`. Se detectó porque el
login de Google en `/admin` rebotaba solo a `/admin/login` sin mostrar
ningún error visible — solo se vio la causa real inspeccionando la
petición de red (F12 → Network) y el header de respuesta `sb-error-code:
UNAUTHORIZED_INVALID_API_KEY`. **`.env.example` corregido** con la key
vigente (visible en Supabase Dashboard → Project Settings → API Keys →
"Publishable key"). Si esto vuelve a pasar en el futuro (login que rebota
sin error visible), revisar primero la key en Supabase contra la que está
configurada tanto en `.env.example`/`.env.local` como en las Build
Variables de Cloudflare — no asumir que coinciden solo porque están donde
"deberían" estar.

**Cómo se diagnostica un fallo del login admin, en general** (útil para
la próxima vez): la lógica en `src/routes/admin.index.tsx` distingue dos
casos que se ven distinto:
1. **Sin sesión tras el redirect de Google** → rebota silenciosamente a
   `/admin/login` (esto fue el caso de la key vieja: la sesión nunca se
   estableció porque Supabase rechazó las llamadas de auth).
2. **Con sesión pero sin rol admin** → sí muestra un mensaje explícito:
   "No tienes acceso de admin... Pide que te lo asignen en la tabla
   `user_roles`" (esto sería el caso si el usuario de Google nunca tuvo
   una fila `role = 'admin'` en `public.user_roles`, chequeado por la
   función `is_admin(uid)` de Postgres).
Si el rebote es silencioso (caso 1), mirar la pestaña Network del navegador
en la petición a `/auth/v1/user` antes de asumir que es un tema de roles.

**Commits en `main`**: `.env.example` (fix: anon key actualizada),
2 commits `chore: trigger rebuild` (vacíos, solo para disparar el pipeline
tras agregar las Build Variables).

## Sesión 14/09/2026 — Home: Discovery / ProfileCard (nuevo)

**Objetivo**: Home pasa de placeholder vacío a mostrar Discovery real (PDR
§04) — candidato real, Like/Dislike, perfil completo, reportar perfil y
límite de Likes.

**Diseño**: extraído de exports React/CSS de Figma que Jose pegó en el chat
(el Dev Mode MCP Server de Figma requiere plan de pago — confirmado durante
la sesión, no está disponible). Colores/spacing tomados literal del export;
tokens nuevos en `theme.ts`: `cardBackground`, `cardButtonBackground`,
`textSecondary`, `photoBackground`.

**Archivos nuevos**:
- `lib/discovery.ts`: `fetchNextCandidate()` (excluye el propio perfil y los
  ya swipeados, vía `likes`), `fetchProfileById()`, `sendSwipe()`,
  `fetchLikeLimitStatus()`.
- `lib/moderation.ts`: `reportProfile()` — insert en `reports`
  (`target_type: 'profile'`), RLS ya permite `reporter_id = auth.uid()`.
- `components/ProfileCard.tsx`: card de Home. Reglas de estabilidad
  seguidas: profesión truncada a 20 caracteres, máx. 3 skills,
  `numberOfLines={1}` en nombre/profesión para que el alto de la card nunca
  cambie, botones Like/Dislike en posición fija.
- `components/ReportProfileModal.tsx`: bottom sheet con motivos
  predefinidos + "Other" con texto libre (≤500 caracteres).
- `app/profile/[id].tsx`: vista de perfil completo (foto grande,
  descripción, link a portfolio, Like/Dislike, compartir — reutiliza
  `getPublicProfileUrl()` de `share-profile.tsx` —, reportar, Core Skills).

**Archivos modificados**: `app/(tabs)/index.tsx` (Home real), `theme.ts`,
`package.json` (+ `expo-linear-gradient`, para el degradado sobre la foto).

**Límite de Likes (PDR §18)** — `supabase/migrations/
20260914072120_temp_likes_window_1_minute.sql`, aplicada directo contra
Supabase (`cucvqfhucmjphjpquivn`) vía MCP: `likes_used_last_24h()` usa
`interval '1 minute'` en vez de `'24 hours'`, **a propósito, solo para
pruebas** (mismo nombre de función, para no romper nada que ya la llame).
`fetchLikeLimitStatus()` en el cliente NO depende de esa función — lee
`likes` directo y calcula `remaining`/`resetAt` con su propia constante
`LIKE_WINDOW_MS`, así que revertir una sin la otra no rompe nada, pero
**hay que revertir las dos** antes de producción (grep `TEMPORAL` en
`lib/discovery.ts` y en `supabase/migrations/`).

**⚠️ El límite de Likes es solo de cliente** — no hay trigger/constraint en
BD que rechace el insert si alguien se salta la UI. Pendiente si se quiere
endurecer en servidor.

**Reportar perfil**: solo la parte "Report Profile" de
`connect-it-moderation` — reportar chat, unmatch, block y moderación de
Global Chat (link-blocking, spam, rate limiting) quedan pendientes.

~~**Drift detectado**: la migración `20260912113715_public_profile_share`
existe aplicada en Supabase pero NO como archivo en `supabase/migrations/`
del repo.~~ — **Resuelto el 14/09/2026**: se reconstruyó
`supabase/migrations/20260912113715_public_profile_share.sql` leyendo la
definición real en vivo (`pg_get_functiondef()`,
`information_schema.routine_privileges`, `obj_description()`) vía MCP de
Supabase, no desde memoria/documentación — el archivo commiteado coincide
exactamente con la función `get_public_profile` que ya corre en
producción. No se reaplicó nada contra Supabase (ya estaba aplicada, y
reintentarlo con la misma versión de migración habría fallado contra
`schema_migrations`).

**⚠️ Drift menor pendiente, detectado de paso**: la migración
`temp_likes_window_1_minute` está registrada en Supabase con versión
`20260914072147`, pero el archivo local en el repo se llama
`20260914072120_temp_likes_window_1_minute.sql` (27 segundos de diferencia
en el timestamp). No afecta el comportamiento — el nombre de archivo no
cambia qué SQL se ejecuta —, pero si en algún momento se usa la Supabase
CLI para sincronizar/diffear migraciones, esta discrepancia de nombre
puede causar confusión. Pendiente de renombrar el archivo local a
`20260914072147_...` para que coincida.

## Sesión 14/09/2026 — 4 bugs reportados + 1 update de diseño (Discovery)

**Bugs reportados por Jose, todos con causa raíz confirmada leyendo el
código real (no memoria):**

1. **"Entro al perfil, doy Atrás sin like/dislike, y la card cambia igual
   (van rotando)"** — `app/(tabs)/index.tsx` pedía SIEMPRE un candidato
   nuevo en `useFocusEffect`, incluso al volver de `app/profile/[id].tsx`
   sin haber swipeado — y `fetchNextCandidate()` elige al azar de un pool
   de 20. **Fix**: nueva bandera en memoria en `lib/discovery.ts`
   (`markCandidateStale()` / `consumeCandidateStale()`) — la vista de
   perfil completo solo la activa cuando SÍ hubo un swipe; Home solo pide
   un candidato nuevo si no tiene uno cargado o si la bandera está
   activa. El contador de Likes sí se refresca siempre.

2. **"Doy 3 likes, pauso 1 min, doy 3 más, el anuncio nunca salta"** —
   doble causa: (a) `get_due_ad()`/`pick_and_rotate_ad_for_group()`
   (migración `20260906214949_ads_likes_rotation.sql`) seguían con el
   `if not public.is_admin() then raise exception` que se dejó a
   propósito como placeholder "hasta que exista el flujo real de Likes
   de la app de usuario final" — ese flujo ya existía (sesión anterior),
   pero nunca se volvió a abrir el permiso; (b) el cliente móvil nunca
   llamaba a esas funciones. **Fix**: migración
   `20260914200000_ads_open_to_authenticated.sql` (aplicada en Supabase)
   cambia el chequeo a `auth.uid() is null` (cualquier autenticado, no
   solo admin) + `grant execute ... to authenticated`; `sendSwipe()` en
   `lib/discovery.ts` ahora consulta `get_due_ad()` tras cada Like y
   devuelve el anuncio si toca; `components/AdModal.tsx` (nuevo) lo
   muestra, cableado en Home y en la vista de perfil completo. Solo
   `media_type: "image"` se renderiza in-app — "video" abre el enlace en
   el navegador como fallback pragmático (no hay `expo-video`/`expo-av`
   instalado; pendiente si se quiere in-app).

3. **"Al cerrar sesión no redirige a Welcome, y si doy Atrás en el
   navegador entro a la app sin usuario"** — el único guard de sesión
   vivía en `app/index.tsx`, que solo se ejecuta la primera vez que se
   visita `/` — no es reactivo a rutas ya visitadas. En web, el botón
   Atrás del navegador puede saltar directo a una ruta protegida del
   historial (ej. `/settings`) sin volver a pasar por ese chequeo,
   renderizándola con `session`/`profile` en null. Además,
   `lib/auth.ts#signOut()` no tenía try/catch — si `supabase.auth.signOut()`
   fallaba por red, el `router.replace()` de `settings.tsx` nunca se
   ejecutaba y el logout no hacía nada visible. **Fix**: nuevo `AuthGate`
   global y reactivo en `app/_layout.tsx` (observa `session`/`pathname` y
   redirige a `/welcome` desde cualquier ruta protegida sin sesión, no
   solo tras logout); `signOut()` ahora reintenta en `scope: "local"` si
   el signOut global falla, para no dejar la sesión "a medias".

4. **"El QR no lleva a ningún perfil, dirección no encontrada"** —
   `PUBLIC_PROFILE_BASE_URL` en `constants/urls.ts` apuntaba a
   `https://connect-it.app/p`, un dominio elegido solo por coherencia con
   el email de soporte pero **nunca conectado como Custom Domain en
   Cloudflare** (sin DNS, nada en el repo que lo configure — confirmado,
   no es un bug de código). La ruta `/p/$userId` en sí
   (`src/routes/p.$userId.tsx`) está bien. **Fix**: el valor por defecto
   pasa a ser el subdominio real de Cloudflare Workers donde corre hoy el
   panel/web, con override vía `EXPO_PUBLIC_PUBLIC_PROFILE_BASE_URL` para
   el día que `connect-it.app` se conecte de verdad (tarea de
   dashboard/DNS que Jose tiene que hacer, no código).

**Update de diseño**: `ProfileCard` mostraba hasta 3 skills con
`numberOfLines={1}` + ellipsis (una skill larga se veía cortada con
"..."). Ahora muestra solo la principal (la primera), completa, con
`adjustsFontSizeToFit` para reducir el tamaño de fuente en vez de
truncar. El resto de skills sigue viéndose completo en la vista de
perfil completo (sección "CORE SKILLS"), sin cambios ahí.

**Commits en `main`**: `fix(mobile): Discovery — candidato ya no rota al
volver del perfil sin swipe; anuncios ahora se disparan tras un Like`,
`fix(mobile): logout dejaba entrar sin sesión al volver con el botón
Atrás del navegador`, `fix(mobile): enlace/QR de 'Compartir cuenta'
apuntaba a un dominio nunca conectado`, `feat(mobile): ProfileCard
muestra solo la skill principal, completa (sin cortar)`.

**Pendiente/decisión de Jose**: confirmar si `connect-it.app` se va a
conectar de verdad como Custom Domain en Cloudflare (y cuándo), para
saber si hay que setear `EXPO_PUBLIC_PUBLIC_PROFILE_BASE_URL` en algún
momento o dejar el subdominio de Workers como definitivo. **Aplazado a
propósito el 14/09/2026** — se deja tal cual por ahora.

**Actualización 14/09/2026 (mismo día, segunda pasada)**: se agregó
`expo-video` (`^57.0.4`, mismo esquema de versión que el resto de
paquetes `expo-*`) y `AdModal.tsx` ahora reproduce los anuncios de
`media_type: "video"` in-app con `useVideoPlayer` + `VideoView`
(controles nativos, loop), en vez de abrir el `media_url` en el
navegador. `link_url` (si el anuncio lo trae) se muestra como botón
"Learn more" separado del media, para no pelear con los gestos táctiles
del reproductor. Se corrió `bun install` en el sandbox como prueba
(`expo-video@57.0.4` resuelve sin conflictos de versión) pero `mobile/`
nunca tuvo lockfile comiteado en este repo — no hay nada para pushear
por ese lado.

**Actualización 15/09/2026 (conversación nueva, según lo planeado):** el
bloqueo de red se resolvió — abrir una conversación nueva sí alcanzó
para que el sandbox tomara los dominios agregados (`expo.dev`,
`api.expo.dev`, `exp.host`), sin necesidad de pasar a "Todos los
dominios". Esa sesión:
- Corrió `eas init` y vinculó `mobile/` a un proyecto EAS ya existente
  (`@zaratrustre-dev/connect-it`) — agrega `extra.eas.projectId` en
  `app.json`, `eas.json` (perfiles development/preview/production) y
  `expo-dev-client` (necesario para builds de perfil development).
  Ver commit `ef384b0`.
- De paso encontró y arregló un bug no reportado: en el panel admin,
  Editar/Borrar/Desactivar anuncios fallaba en desktop
  (`NetworkError`) pero andaba en móvil — causado por bloqueadores de
  anuncios de escritorio (uBlock, AdBlock, ETP de Firefox) que cortan
  cualquier request cuya URL contenga la palabra "ads" (`/rest/v1/ads`
  de PostgREST). Falso positivo conocido con Supabase/Firebase. Fix:
  la tabla `ads` se renombró a `sponsored_content` (y las funciones
  `get_due_ad`/`pick_and_rotate_ad_for_group` a
  `get_due_sponsored_content`/`pick_and_rotate_sponsored_content_for_group`)
  vía migración + ya aplicado en Supabase. Ver commit `dab14c0`.
- También bajó la ventana de prueba del límite de Likes a 5 likes/10s
  (antes 3/1min) para facilitar QA. Ver commit `39ae272`.

Sigue pendiente disparar el build de EAS en sí (`eas build`) — el
proyecto ya quedó vinculado, falta correrlo.

**Actualización 15/09/2026 (misma conversación, causa raíz real
encontrada):** Jose probaba dando Likes en la vista web de `mobile/`
publicada en GitHub Pages (`https://zaratrustre-dev.github.io/web-landing-hub/`,
ver `.github/workflows/mobile-web.yml` — se redeploya solo en cada push
a `main` que toque `mobile/`, Jose no corre nada local ni hace
`git pull`) y el anuncio seguía sin aparecer pasados los 5 Likes. Se
descartaron por orden: caché del navegador (bundle JS deployado
verificado byte a byte vía `raw.githubusercontent.com/.../gh-pages/...`,
ya tenía `get_due_sponsored_content`) y lógica de negocio (el `% = 0`
del SQL se verificó aparte y era correcto). La causa real: `ALTER
FUNCTION ... RENAME TO` (migración
`20260915002100_rename_ads_to_sponsored_content.sql`) solo cambia el
*nombre* de la función — el *cuerpo* seguía con el texto literal `from
public.ads`, tabla que ya no existía tras el rename. Toda llamada a
`get_due_sponsored_content()` fallaba en el servidor con `relation
"public.ads" does not exist`, error que `sendSwipe()` traga a propósito
(para no bloquear el guardado del Like) — por eso era invisible desde
el cliente. Se confirmó simulando en SQL la llamada exacta de
PostgREST (`set local role authenticated; set local
"request.jwt.claim.sub" = '<uid>'; select
get_due_sponsored_content(5);`) antes y después del fix. Corregido con
`create or replace function` reescribiendo ambos cuerpos apuntando a
`sponsored_content` (migración
`20260915010500_fix_sponsored_content_function_bodies.sql`, nombre/
firma/permisos/comments intactos). **Lección de proceso:** un rename de
tabla en Postgres nunca es solo `ALTER TABLE RENAME` + `ALTER FUNCTION
RENAME` si hay funciones que la referencian por nombre en su cuerpo —
hay que grepear y reescribir esos cuerpos también, o probar la llamada
real (no solo que el `ALTER` no tire error) antes de dar el fix por
bueno.

**Resto de la sesión del 15/09/2026 (mismo hilo, después del fix de
arriba):**

- **Contador de anuncios ahora cuenta Like O Dislike** (pedido
  explícito), no solo Like. `sendSwipe()` en `mobile/lib/discovery.ts`
  ya no hace `if (!isLike) return null` antes de chequear el anuncio;
  `fetchTotalLikesGiven` (contaba solo `is_like=true`) se reemplazó por
  `fetchTotalSwipesGiven` (cuenta cualquier fila de `likes` del
  usuario, like o dislike). El nombre de columna `periodicity_likes` en
  `sponsored_content` quedó igual (no se migró) aunque ahora mide
  interacciones en general, no solo likes — dato a tener en cuenta si
  se retoma esto.
- **`AdModal.tsx` reescrito a pantalla completa** (pedido explícito):
  antes era una tarjeta centrada con overlay, cerrable al toque. Ahora
  cubre toda la pantalla (imagen o vídeo edge-to-edge) y tiene un
  temporizador obligatorio de `AD_MIN_VIEW_SECONDS = 10` — mientras
  corre no hay ningún botón para cerrar (ni X, ni "Learn more", ni
  Android back), solo un contador en la esquina; al llegar a 0 aparece
  el botón de cerrar (+ "Learn more" si `link_url`), que dispara el
  mismo `onClose()` de siempre y pasa al siguiente perfil.
- **Límite de Likes temporal subido a 50/10s** (pedido explícito, para
  poder probar los grupos de periodicidad 22 y 47 sin bloquearse a los
  pocos likes). Es puramente cliente (`fetchLikeLimitStatus` en
  `discovery.ts`, consulta directa a `likes` con `gte(created_at,
  since)`) — no depende de ninguna función SQL, así que no hizo falta
  migración. **Recordar revertir a 3 Likes/24h antes de producción**
  (dato: el contador de "Likes restantes" se resetea solo cada vez que
  pasan más de 10s sin dar Like — es la mecánica normal de una ventana
  deslizante tan corta, no es un bug, y es distinto del contador
  acumulado que dispara el anuncio, que nunca se resetea).
- **Se mandó `notify pgrst, 'reload schema';`** por SQL directo,
  porque Supabase/PostgREST cachea su esquema y no detecta solo
  funciones/tablas renombradas o nuevas — ver entrada nueva en
  `learnings.md`. Se hizo porque, a pesar de que el fix de arriba se
  confirmó correcto simulando `auth.uid()` en SQL directo repetidas
  veces con usuarios reales que ya habían llegado a 5/10+ interacciones,
  el anuncio seguía sin disparar en la app real (`last_shown_at` seguía
  `null`) — la sospecha es que la API REST (que sí pasa por PostgREST)
  nunca vio la función renombrada, a diferencia de las pruebas por SQL
  directo (que la esquivan por completo).
- **`/welcome` devuelve 404 al entrar directo — es intencional y
  funciona bien**: se confirmó que `dist/404.html` publicado es
  idéntico byte a byte a `dist/index.html` (el truco de SPA-fallback
  para GitHub Pages, ver más abajo en este documento, sigue en pie). Un
  navegador real ejecuta el JS igual con status 404. Pero `/welcome` es
  la pantalla de login (`app/(auth)/welcome.tsx`) — no tiene lógica de
  swipes ni de anuncios; si se prueba ahí no va a aparecer nada por
  diseño, hay que loguearse y probar en Discovery.
- **⚠️ SIN RESOLVER al cierre de esta sesión:** después de todo lo
  anterior (fix de función + reload de esquema), el anuncio sigue sin
  aparecer en pruebas reales — `sponsored_content.last_shown_at` sigue
  en `null`. Se agotaron las vías de diagnóstico disponibles sin acceso
  a un navegador real: la extensión de Chrome conectada a Claude no
  estaba disponible en toda la sesión, y el cambio de allowlist de red
  del sandbox que Jose activó no tomó efecto en esta misma conversación
  (puede necesitar una conversación nueva). **Sin poder ver la consola
  del navegador (Network/Console) durante una prueba real, no se puede
  seguir descartando causas** (CORS, algún error de runtime distinto al
  ya corregido, anon key/URL mal configurada en el build de GitHub
  Pages, etc.). Punto de partida para la próxima sesión: confirmar
  acceso de red primero, después reproducir en vivo con DevTools
  abierto.

**Pendiente de Fase 2** (fuera de alcance de esta sesión, a propósito):
- Búsqueda, filtros (categoría/skill/país).
- Matches (qué pasa cuando el Like es mutuo — tabla `matches` ya existe).
- El resto de `connect-it-moderation` (ver arriba).

**Commits en `main`**: `feat(mobile): Discovery — ProfileCard conectada a
Supabase en Home`, `feat(mobile): Discovery — vista de perfil completo al
tocar la card`, `feat(mobile): Reportar perfil (connect-it-moderation, PDR
§22)`, `feat(mobile): límite de Likes (PDR §18) — ventana TEMPORAL de 1
minuto` (+ 1 merge commit sincronizando con el importador de Excel del
panel admin, sin conflictos — tocaba archivos distintos).

## Sesión 15/09/2026 — Fix: importador de Excel no marcaba el perfil como completo de verdad

**Gotcha encontrado** (reportado por Jose al probar el buscador del panel
por Rol, ej. "developer"): el importador masivo de usuarios (sesión
14/09/2026 más arriba) intentaba forzar `onboarding_completed = true` vía
`updateProfileAdmin()` tras crear cada usuario, pero el trigger de base de
datos `trg_profiles_compute_onboarding` /
`compute_onboarding_completed()` (migración
`20260906214810_reports_moderation_and_onboarding.sql`) **recalcula ese
campo en cada insert/update y lo sobrescribe según `role`, `role_sought` y
`profession`** — el valor explícito que mandaba el importador se perdía
silenciosamente. Como el Excel nunca pedía `role_sought`, **todo usuario
creado por bulk import quedaba con `onboarding_completed = false` de
verdad**, aunque el panel mostrara el import como exitoso: invisible en
Discovery (`fetchNextCandidate()` filtra `.eq("onboarding_completed",
true)`) y "incompleto" para el filtro de Rol del buscador admin.

**Fix**: `role_sought` (columna "Rol Buscado" en el Excel, mismo catálogo
de 9 valores que "Rol") pasa a ser **obligatoria** en el importador:
- `src/lib/bulk-import-users.ts`: nuevo alias de cabecera `rol_buscado` /
  "Rol Buscado" / `role_sought`, añadida a `requiredCols`, validada contra
  el mismo enum que `Rol`, incluida en `ImportRow` (`roleSought`) y pasada
  a `createUser({ role_sought: ... })`. Sin ella, la fila se rechaza
  explícitamente (mismo criterio todo-o-nada que las demás columnas) en
  vez de crear un perfil incompleto en silencio.
- `src/components/admin/BulkImportUsersDialog.tsx`: texto de columnas
  esperadas y tabla de previsualización actualizados con "Rol Buscado".
- Plantilla de referencia (Excel de ejemplo entregado a Jose) actualizada
  con la nueva columna.

**Corrige la nota de la sesión 14/09/2026** ("No se piden `role_sought` ni
`skills`... el resto del perfil sí se marca `onboarding_completed =
true`") — esa asunción era incorrecta una vez existe el trigger de
recálculo automático; `skills` sigue sin pedirse en el Excel (no bloquea
`onboarding_completed`, solo enriquece el matching/búsqueda por skill) y
queda pendiente para una futura mejora si hace falta.

**Commits en `main`**: `fix(admin): exigir Rol Buscado en el importador de
Excel — sin él el trigger de la base de datos marca el perfil como
incompleto`.

## Sesión 15/09/2026 (cont.) — Importador de Excel: columna opcional "Habilidades"

**Objetivo**: cerrar el pendiente que quedó anotado en la sesión anterior
("`skills` sigue sin pedirse en el Excel... queda pendiente para una
futura mejora si hace falta") — a petición de Jose, añadir una columna
"Habilidades" al importador masivo de usuarios, igual que en el
documento de referencia (la plantilla de Excel entregada).

**Diseño**: a diferencia de `role_sought`, las skills **no** son
obligatorias — no las lee el trigger `compute_onboarding_completed()`,
solo enriquecen el matching/búsqueda por skill (`skill_filter` en
`admin_list_profiles`, filtro por skill del panel). Cada fila puede traer
hasta 3 nombres separados por coma (mismo límite que ya aplica el trigger
de `profile_skills` al guardar) y cada nombre debe existir ya en el
catálogo (`fetchSkillsCatalog()` → tabla `skills`) — el importador nunca
crea una skill nueva, rechaza la fila explícitamente si no la reconoce
(mismo criterio que País, Rol y Rol Buscado).

**Cambios en `src/lib/bulk-import-users.ts`**:
- El catálogo de skills se carga **una sola vez** al abrir el archivo
  (`fetchSkillsCatalog()`), no fila a fila.
- Nuevo alias de cabecera: "Habilidades" / "Habilidad" / "Skills" / "Skill".
- Columna opcional (no entra en `requiredCols`); si viene, valida cada
  nombre contra el catálogo y el límite de 3.
- `ImportRow` gana `skillIds: string[]` (para guardar) y
  `skillNames: string[]` (para la previsualización).
- `runBulkImport()` llama a `replaceProfileSkills(newUserId, skillIds)`
  después de crear el usuario y subir la foto, antes de marcar el perfil
  como completo.

**Cambios en `src/components/admin/BulkImportUsersDialog.tsx`**: texto de
columnas esperadas y tabla de previsualización con la nueva columna
"Habilidades".

**Plantilla de referencia** (Excel de ejemplo entregado a Jose) actualizada
con la columna "Habilidades" (ejemplo: `Node.js, React, DevOps`).

**Commits en `main`**: `feat(admin): columna opcional Habilidades en el
importador de Excel de usuarios`.

## Sesión 15/09/2026 (cont.) — Cierra el bug de anuncios sin resolver + fixes de UI en AdModal

**Cierra el "⚠️ SIN RESOLVER" de la sesión anterior.** Sin acceso a
navegador en esta sesión tampoco, la causa raíz se encontró leyendo los
logs reales de Supabase (`edge_logs` + `postgres_logs` del proyecto, vía
Supabase MCP) de una prueba real de Hou en la web de GitHub Pages, en vez
de simular por SQL: las llamadas a `POST /rest/v1/rpc/get_due_sponsored_content`
devolvían `405` exactamente en los swipes donde `likes_count % periodicity_likes = 0`
(el único camino que llega al `UPDATE`), y el log de Postgres en ese
mismo instante mostraba `sql_state_code: 25006` (`read_only_sql_transaction`)
apuntando al `update ... set last_shown_at = now()` dentro de
`pick_and_rotate_sponsored_content_for_group`.

**Causa real**: `get_due_sponsored_content` estaba marcada `STABLE`.
PostgREST ejecuta las funciones `STABLE`/`IMMUTABLE` dentro de una
transacción de solo lectura (por contrato: no deberían escribir) — pero
esta función llama internamente a `pick_and_rotate_sponsored_content_for_group`,
que sí hace un `UPDATE`. Postgres rechaza el `UPDATE` con `25006` solo
cuando se invoca vía la API REST real; una simulación SQL directa (SQL
Editor o `execute_sql` del MCP) corre en una transacción read-write
normal y nunca lo detecta — de ahí que "en SQL simulado siempre
funcionaba" pero nunca en la app real. Como `sendSwipe()` traga cualquier
error del RPC de anuncios a propósito (para no bloquear el guardado del
swipe), esto era invisible para el usuario y para las sesiones anteriores.

**Fix**: se quitó `STABLE` de `get_due_sponsored_content` (queda
`VOLATILE`, el default) — aplicado directo en Supabase vía MCP
(`CREATE OR REPLACE FUNCTION`, mismo cuerpo/firma/permisos, + `NOTIFY
pgrst, 'reload schema'`), sin migración nueva en el repo porque no
cambia nada versionable más allá del propio código SQL de la función
(que ya vive versionado en las migraciones anteriores — queda con el
cuerpo desactualizado ahí, pero es solo histórico). **Lección agregada a
`learnings.md`**: cualquier función RPC marcada `STABLE`/`IMMUTABLE` que
escriba, directa o transitivamente, falla solo a través de PostgREST —
revisar `provolatile` en `pg_proc` antes de dar por buena una función así
marcada.

**De paso, 3 fixes de UI en `AdModal.tsx` pedidos por Hou probando en
Firefox móvil** (capturas contra la build de GitHub Pages):
- Quitado el botón "Continue": una vez pasa el timer obligatorio de
  `AD_MIN_VIEW_SECONDS`, la X que aparece al mismo tiempo ya alcanza para
  cerrar — el botón de texto era redundante.
- "Learn more" (cuando el anuncio trae `link_url`) ahora está disponible
  desde el primer segundo del anuncio, no solo después del countdown —
  antes vivía detrás del mismo `if (canClose)` que también condicionaba
  el botón Continue eliminado.
- Anuncios de `media_type: "video"` se veían recortados a solo una
  esquina en la build web. Causa: `VideoView` (`expo-video`) renderiza
  un `<video>` HTML nativo en web — un "replaced element" en términos de
  CSS — que no se estira solo con `position: absolute` + `top/left/
  right/bottom: 0` como sí lo hace el `<div>` que usa `Image` de React
  Native Web; sin `width`/`height: "100%"` explícitos queda pineado a su
  tamaño intrínseco. Fix: agregado `width: "100%", height: "100%"` al
  estilo `media` compartido por ambos (`Image` y `VideoView`) — no
  probado en vivo (sin acceso a browser en esta sesión), a confirmar por
  Hou en la próxima prueba real.

**Commits en `main`**: `fix(mobile): AdModal — quitar botón Continue
redundante, Learn more visible desde el inicio, y fix del video
recortado en web` (`eb6a2ad`). El fix de la función SQL no generó commit
en el repo (cambio aplicado directo en Supabase, ver arriba).
