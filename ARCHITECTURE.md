# Arquitectura - Connect-it

> Generado a partir de una exploración real del código el 09/09/2026. Mantener
> actualizado tras cambios estructurales - un ARCHITECTURE.md desactualizado
> es peor que no tenerlo, porque lleva a asumir cosas que ya no son ciertas.

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
  - src/                        <- Panel admin (raíz, no mover - sync Lovable)
      - routes/                 <- Rutas TanStack Start (file-based, prefijo admin.*)
      - components/ui/          <- Componentes shadcn/Radix
      - lib/
          - supabase.ts         <- Cliente Supabase (browser)
          - admin.ts            <- Funciones que llaman RPCs de admin (RpcFn cast)
          - auth.ts             <- Login de admin
          - database.types.ts   <- Tipos escritos A MANO (sin Docker no hay `gen types`)
      - hooks/
 
  - mobile/                     <- App Expo (carpeta hermana, independiente)
      - app/                    <- Rutas expo-router (file-based)
          - (auth)/welcome.tsx  <- Login (Google OAuth, único método)
          - (onboarding)/       <- Terms -> Role -> Role Sought -> Create Profile
          - (tabs)/             <- Home, Chat, Store, Settings (tras onboarding)
          - index.tsx           <- Puerta de enrutamiento (redirige según sesión/perfil)
          - _layout.tsx         <- Carga de fuentes + AuthProvider + Stack raíz
      - components/             <- Button, Screen, StepHeader, RoleGrid, etc.
      - constants/theme.ts      <- Design tokens (extraídos de Figma con get_design_context)
      - lib/
          - supabase.ts         <- Cliente Supabase (SecureStore en nativo, localStorage en Web)
          - auth.ts             <- useGoogleSignIn() (nonce cifrado SHA-256)
          - profile.ts          <- CRUD de perfil (UpdateChain/InsertChain cast)
          - errors.ts           <- getErrorMessage() - los errores de Supabase no son `instanceof Error`
      - providers/AuthProvider.tsx  <- Contexto de sesión + perfil (useAuth())
 
  - supabase/
      - migrations/              <- 21 migraciones, única fuente de verdad del esquema
      - functions/                <- Edge Functions (Deno)
          - admin-users, send-email, user-lifecycle-emails
          - payment-webhook, send-push
 
  - docs/connect-it/             <- PDR: 13 archivos (producto, no arquitectura de código)
```

## Flujo de datos

### App móvil - desde el cliente hasta la base de datos

```
Pantalla (app/*.tsx)
      useAuth() lee { session, profile } del contexto
   v
providers/AuthProvider.tsx
      onAuthStateChange + fetchMyProfile()
   v
lib/profile.ts, lib/auth.ts
      supabase.from("profiles").select/update/insert(...)
      supabase.auth.signInWithIdToken(...)
   v
lib/supabase.ts (cliente supabase-js)
      SecureStore (nativo) / localStorage (Web) para persistir sesión
   v
Supabase (Postgres + RLS + triggers) - cucvqfhucmjphjpquivn
```

**Puerta de enrutamiento** (`app/index.tsx`): en cada carga, decide a dónde
ir según `session` y `profile` - sin sesión -> `/welcome`; sin
`terms_accepted_at` -> `/terms`; sin `role` -> `/role`; etc. Cada paso del
onboarding termina con `router.replace("/")` (no `push`), así que el botón
"atrás" del sistema NO sirve para navegar hacia atrás en el onboarding -
cada pantalla que necesita un botón de volver lo implementa con una ruta
explícita (`router.replace("/(onboarding)/terms")`), no con `router.back()`.

### Login con Google - flujo completo

```
Botón "Continue with Google" -> promptAsync()
    
   v
expo-auth-session (nonce propio: SHA-256(raw) enviado a Google)
    
   v
Google devuelve id_token con el nonce cifrado incrustado
    
   v
supabase.auth.signInWithIdToken({ token, nonce: raw })
      Supabase cifra `raw` internamente y lo compara con el del token
   v
Sesión creada -> trigger handle_new_user (Postgres)
      autorrellena profiles.name desde raw_user_meta_data de Google
   v
AuthProvider detecta la sesión -> fetchMyProfile() -> puerta de enrutamiento
```

### Panel admin (web)

Similar pero sin onboarding - rutas `admin.*.tsx` llaman a `lib/admin.ts`,
que envuelve RPCs de Postgres (`supabase.rpc(...)`) en vez de queries
directas a tablas en la mayoría de casos (filtros complejos, paginación).

## Reglas del sistema

**Multi-repo (futuro):** Connect-it crecerá a 3 repos totales, cada uno con
su propio proyecto Supabase y config de email independientes. No mezclar
cambios entre repos aunque parezcan relacionados.

**Tipos de Supabase escritos a mano:** sin Docker corriendo no se pueden
generar con `supabase gen types`, así que `database.types.ts` en ambos
clientes se mantiene manualmente. Esto causa que TypeScript infiera `never`
en `.update()`/`.insert()` - el workaround establecido es castear la tabla a
un tipo mínimo local (`UpdateChain`/`InsertChain` en mobile,
`RpcFn` en admin) en el momento de la llamada, no en todo el cliente.

**Errores de Supabase no son `Error`:** Postgrest/Storage/Auth devuelven
objetos planos con `.message`, no instancias de `Error`. Usar siempre
`getErrorMessage()` (`lib/errors.ts` en mobile) en los `catch`, nunca
`err instanceof Error` a solas - si no, se pierde el mensaje real y solo se
ve el genérico de respaldo.

**Compatibilidad de plataforma (mobile):** varios módulos nativos de Expo
NO existen en Web y hay que ramificar por `Platform.OS`:
`expo-secure-store` (usar `localStorage` en Web),
`expo-web-browser`'s `warmUpAsync`/`coolDownAsync` (omitir en Web),
`expo-file-system` (usar `fetch().then(blob)` en Web para subir archivos).

**Nonce de Google OAuth:** Supabase espera el nonce **sin cifrar** en
`signInWithIdToken()` - internamente lo cifra (SHA-256) y lo compara con el
del `id_token`. Hay que generar el nonce en crudo, mandarle a Google la
versión **ya cifrada**, y a Supabase la versión sin cifrar. Ver
`mobile/lib/auth.ts`.

**Componente `Screen` (mobile):** `contentContainerStyle` solo existe en
`ScrollView`, NO en `View` - si se añade una variante `scroll={false}`, el
padding hay que aplicarlo vía `style`, no `contentContainerStyle`, o se
ignora silenciosamente.

**Inmutabilidad de Name/Age:** el trigger `enforce_name_age_immutable_for_users`
solo bloquea cambios **después** de `onboarding_completed = true` - nunca
antes, porque `handle_new_user` autorrellena `name` desde Google al
registrarse, y el usuario debe poder corregirlo durante el propio
onboarding sin que la regla se lo impida.

**Diseño visual - fuente de verdad:** el archivo de Figma actual es
`https://www.figma.com/design/LZOS9aaMoqgpwW29BZSpcO/Connect-it` (no otros
archivos anteriores). Extraer valores reales con `get_design_context` nodo
por nodo - no aproximar colores/tipografía a mano.

**Autenticación:** solo Google OAuth en el MVP (`connect-it-auth`). Apple
está en el diseño (botón visible) pero deshabilitado - no hay proveedor
configurado en Supabase todavía.
