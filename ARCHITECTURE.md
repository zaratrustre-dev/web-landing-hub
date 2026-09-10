Ejecutó un comando

\# Arquitectura - Connect-it



> Generado a partir de una exploración real del código el 09/09/2026. Mantener

> actualizado tras cambios estructurales - un ARCHITECTURE.md desactualizado

> es peor que no tenerlo, porque lleva a asumir cosas que ya no son ciertas.



\## Visión general



Connect-it es un \*\*monorepo\*\* con dos frontends independientes que comparten

\*\*un único backend de Supabase\*\* (`cucvqfhucmjphjpquivn`, `eu-west-1`):



1\. \*\*Panel de administración (web)\*\* - en la raíz del repo. Stack: TanStack

&#x20;  Start (React 19, SSR) + Tailwind v4 + shadcn/Radix, desplegado en

&#x20;  Cloudflare Workers (Nitro). Vive en la raíz (no en `web/`) para no romper

&#x20;  la sincronización con Lovable.dev.

2\. \*\*App móvil\*\* - en `mobile/`. Stack: Expo SDK 57 + React Native +

&#x20;  expo-router (file-based routing), soporte Web incluido

&#x20;  (`react-native-web`) para poder probar sin build nativo.



No hay backend propio de aplicación: toda la lógica de servidor vive en

\*\*Supabase\*\* (Postgres + RLS + Edge Functions), consultado directamente

desde ambos clientes con `@supabase/supabase-js`. Patrón: \*\*BaaS con clientes

finos\*\*, no Clean Architecture ni MVC - la "capa de dominio" son las

funciones exportadas de `lib/` en cada cliente, que envuelven llamadas a

Supabase.



\## Estructura del proyecto

web-landing-hub/



src/ <- Panel admin (raíz, no mover - sync Lovable)

routes/ <- Rutas TanStack Start (file-based, prefijo admin.\*)

components/ui/ <- Componentes shadcn/Radix

lib/

supabase.ts <- Cliente Supabase (browser)

admin.ts <- Funciones que llaman RPCs de admin (RpcFn cast)

auth.ts <- Login de admin

database.types.ts <- Tipos escritos A MANO (sin Docker no hay gen types)

hooks/

mobile/ <- App Expo (carpeta hermana, independiente)

app/ <- Rutas expo-router (file-based)

(auth)/welcome.tsx <- Login (Google OAuth, único método)

(onboarding)/ <- Terms -> Role -> Role Sought -> Create Profile

(tabs)/ <- Home, Chat, Store, Settings (tras onboarding)

index.tsx <- Puerta de enrutamiento (redirige según sesión/perfil)

\_layout.tsx <- Carga de fuentes + AuthProvider + Stack raíz

components/ <- Button, Screen, StepHeader, RoleGrid, etc.

constants/theme.ts <- Design tokens (extraídos de Figma con get\_design\_context)

lib/

supabase.ts <- Cliente Supabase (SecureStore en nativo, localStorage en Web)

auth.ts <- useGoogleSignIn() (nonce cifrado SHA-256)

profile.ts <- CRUD de perfil (UpdateChain/InsertChain cast)

errors.ts <- getErrorMessage() - los errores de Supabase no son instanceof Error

providers/AuthProvider.tsx <- Contexto de sesión + perfil (useAuth())

supabase/

migrations/ <- 21 migraciones, única fuente de verdad del esquema

functions/ <- Edge Functions (Deno)

admin-users, send-email, user-lifecycle-emails

payment-webhook, send-push

docs/connect-it/ <- PDR: 13 archivos (producto, no arquitectura de código)



\## Flujo de datos



\### App móvil - desde el cliente hasta la base de datos

Pantalla (app/\*.tsx)

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





\*\*Puerta de enrutamiento\*\* (`app/index.tsx`): en cada carga, decide a dónde

ir según `session` y `profile` - sin sesión -> `/welcome`; sin
**Diseño visual — fuente de verdad:** el archivo de Figma actual es
`https://www.figma.com/design/LZOS9aaMoqgpwW29BZSpcO/Connect-it` (no otros
archivos anteriores). Extraer valores reales con `get_design_context` nodo
por nodo — no aproximar colores/tipografía a mano.

**Autenticación:** solo Google OAuth en el MVP (`connect-it-auth`). El botón
"Continue with Apple" se muestra visualmente (así lo pide el diseño real,
nodo 1:16 del archivo de Figma actual) pero está **deshabilitado** — no hay
proveedor de Apple configurado en Supabase todavía.

**Componente `Button` (mobile):** soporta `icon` (elemento opcional a la
izquierda del texto, usado para el logo de Apple vía `@expo/vector-icons`
`logo-apple`) y `textStyle` (para el botón de Google, texto negro sobre
fondo blanco — estándar de marca de Google, distinto del resto de botones
de la app).

## Estado actual — Fase 1 (auth + onboarding)

Flujo completo funcional en Web (`http://localhost:8081`): Welcome → Terms
→ Role → Role Sought → Create Profile → Home tabs. Verificado de extremo a
extremo con una cuenta de Google real.

**`DevSignOutLink`** (`components/DevSignOutLink.tsx`): enlace de "salida
de emergencia" presente en las 4 pantallas de onboarding (Terms, Role, Role
Sought, Create Profile). Sin esto, quedarse a mitad del onboarding no
permite cerrar sesión para probar con otra cuenta — Settings (donde vive el
cierre de sesión "real") solo es alcanzable tras completar TODO el
onboarding. Solo para pruebas; decidir si se queda o se quita antes de
producción real.

**Pendiente de Fase 1:**
- Sustituir el icono placeholder del logo (emoji ⚡) por el asset SVG real
  de Figma — no se pudo descargar en el entorno de trabajo actual (bloqueo
  de red a figma.com tanto en `bash_tool` como en `web_fetch`).
- Aplicar el mismo tratamiento de extracción real de Figma (colores,
  tipografía, spacing exactos vía `get_design_context`) a las pantallas de
  Role, Role Sought, Create Profile y Home — por ahora solo Welcome tiene
  este tratamiento completo.
- EAS development build para probar Google OAuth en Android/iOS reales
  (Expo Go no funciona para esto — ver limitación documentada en las
  conversaciones de esta fase: Google bloquea el intercambio de código
  OAuth para apps que comparten la identidad de Expo Go).

