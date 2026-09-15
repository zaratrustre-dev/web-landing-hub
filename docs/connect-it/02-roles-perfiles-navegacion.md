# 2. Roles, perfiles y navegación

*Skills usadas: `connect-it-product`, `connect-it-profile-card`. Fuente principal: PDR §5-16,
§24-31; Master Prompt §5, §7; Figma (pantallas de selección de rol, creación de perfil, edición
de perfil, settings).*

## Flujo principal (core journey)

Definido de forma idéntica en la skill `connect-it-product` y en el Master Prompt (§7):

```
Register → Google Login → Terms & Conditions → Role → Role Sought → Create Profile → Home
  → Discover → Like/Dislike → Match → Start Chat / Keep Discovering
  → Chat → Matches → Individual Chat / Global Chat
  → Settings → Edit Profile / Terms / Support / Share / Delete Account / Log Out
```

📐 **Verificado contra Figma**: existen pantallas separadas y casi gemelas para "Role" y "Role
Sought" (`Connect-it Professional Discovery Duplicated` y `Connect-it Profession Selection
Unified`), ambas con la misma cuadrícula de 9 botones de rol — confirma que Role y Role Sought se
seleccionan en dos pasos idénticos en estructura, tal como indica el flujo del PDR.

## Roles (9 originales del PDR + 1 categoría añadida el 15/09/2026)

PDR §5, Master Prompt §5, skill `connect-it-product`:

`Developer, Designer, Entrepreneur, Marketing, Consultant, Lender, Logistics, Recruiter,
Influencer`

**Role Sought** (PDR §6) sigue usando exactamente este catálogo de 9 categorías — el usuario
indica qué categoría profesional busca, no una lista distinta. La 10ª categoría (ver abajo) no se
puede elegir como Role Sought — nadie busca activamente "aprendices" desde ese selector.

### ⚠️ Actualización 15/09/2026: 10ª categoría "Apprentice" (Aprendiz)

Decisión de producto de Jose (15/09/2026) que **modifica la regla "exactamente 9" de arriba**,
documentada aquí porque `connect-it-product` puede seguir describiendo solo 9 hasta que se
actualice esa skill:

- Nueva pregunta de onboarding, **entre Terms y Role**: *"Do you have experience as an
  entrepreneur?"* (en inglés, como el resto de la app).
  - **Yes** → sigue el flujo normal: pantalla de Role con las 9 categorías de siempre.
  - **No** → se salta la pantalla de Role, `profiles.role` se fija automáticamente en
    `apprentice` (Apprentice), y el registro continúa directo en Role Sought (con las 9
    categorías originales, sin Apprentice).
- `apprentice` es un valor más del enum `public.professional_role` (migración
  `20260915214749_add_apprentice_role.sql` — en su propia migración porque Postgres no permite
  usar un valor de enum recién añadido en la misma transacción en que se crea).
- **Editable después, para cualquier usuario**: Edit Profile (mobile) tiene un selector simple
  (lista desplegable, no la cuadrícula de iconos de Role/Role Sought) con las 10 categorías —
  cualquiera puede pasar a Apprentice o salir de Apprentice manualmente en cualquier momento.
- Pasos de onboarding recalculados: Terms(1) → Entrepreneur experience?(2) → Role(3, si "Yes") →
  Role Sought(4) → Create Profile(5) — `totalSteps` pasó de 5 a 6 en el `StepHeader`.
- Detalle de implementación: el gate central `mobile/app/index.tsx` (`if (!profile.role)`) ahora
  redirige a la nueva pantalla `entrepreneur-experience` en vez de a `role` directamente — así que
  un usuario que recarga a mitad de flujo vuelve a ver la pregunta (comportamiento aceptado, no es
  un bug).

## Campos del perfil

PDR §8: `Photo, Name, Age, Profession, Skills, Description, Briefcase`. Role y Role Sought forman
parte del perfil/onboarding (PDR §8).

| Campo | Límite / regla | Fuente |
|---|---|---|
| Name | Inmutable tras el registro | PDR §9 (implícito), §25; skill `connect-it-auth` |
| Age | Inmutable tras el registro | PDR §25; skill `connect-it-auth` |
| Profession | Máximo 20 caracteres, en Create Profile **y** Edit Profile | PDR §9, §25; Master Prompt §5 |
| Skills | Máximo 3, de una lista basada en las habilidades de Upwork | PDR §10; Master Prompt §5 |
| Description | Máximo 200 caracteres | PDR §11; Master Prompt §5 |
| Briefcase | Enlace profesional (Portfolio, CV, LinkedIn u otro recurso) | PDR §12 |

## ⚠️ Contradicción detectada: Name en Edit Profile (Figma vs. PDR)

La pantalla de Figma **`Connect-it Edit Profile`** muestra un campo de texto **editable**
etiquetado `FULL NAME` con un valor de ejemplo (`Alex Mercer`), es decir, un input real donde el
usuario podría escribir. Esto **contradice directamente** el PDR (§9, §25) y la skill
`connect-it-auth`, que dicen explícitamente que **Name no es editable después del registro**.

No se ha decidido cuál prevalece — queda señalado para que el equipo lo resuelva antes de
implementar la pantalla de Edit Profile. Lo más probable, dado que la regla de inmutabilidad se
repite en 3 fuentes distintas (PDR, Master Prompt, skill) frente a 1 sola pantalla de Figma, es
que el campo de Figma sea un error de la maqueta (mostrado como editable solo por conveniencia
del diseño) y deba implementarse como **solo lectura**, pero esto no debe darse por hecho sin
confirmación.

## ⚠️ Contradicción menor: Name como campo único vs. First/Last Name en Figma

La pantalla `Connect-it Profile Creation` (creación de perfil) muestra **dos** campos separados:
`FIRST NAME` y `LAST NAME`. El PDR (§8) y el esquema de datos real del panel admin (`profiles`)
tratan `Name` como **un único campo de texto**. Al implementar la app de usuario, hay que decidir
si se combinan ambos inputs en un solo `name` (concatenándolos) o si el modelo de datos necesita
cambiar. No se ha encontrado ninguna fuente que zanje esto explícitamente.

## ⚠️ Vacío detectado: campo Age no visible en la pantalla de creación de perfil

La pantalla `Connect-it Profile Creation` de Figma no muestra ningún input de edad en su
metadata (sí muestra Nombre, Apellido, Profession, Bio, Portfolio URL y Skills). El PDR exige
Age como campo del perfil (§8) y como dato inmutable (§25). Puede que el campo exista pero no se
haya capturado en la inspección de metadata (por ejemplo, un selector de fecha nativo del
sistema operativo), o puede que falte en el diseño. Requiere confirmación visual directa antes de
implementar.

## Navegación (bottom navigation)

PDR §31: **Home** (con icono de taza de café — detalle visual específico y no genérico),
**Chat**, **Store**, **Settings**.

⚠️ **Contradicción detectada (Figma vs. PDR)**: la pantalla `Connect-it Home - Ana Martínez
Profile` de Figma muestra una barra de navegación inferior con 4 botones etiquetados como "Home /
Explore", "Messages", "Network / Connections" y "Profile" — **no coincide** con los 4 ítems que
exige el PDR (`Home, Chat, Store, Settings`). En particular, **Store no aparece** en esta barra de
Figma, y aparece en su lugar un concepto de "Network / Connections" que no está definido en
ninguna parte del PDR ni de las skills. Dado que el PDR es la fuente de verdad funcional (Master
Prompt §2: *"Figma no limita el alcance funcional definido por este PDR"*), la navegación debe
implementarse como el PDR indica (Home/Chat/Store/Settings), y esta discrepancia de Figma debe
resolverse con el equipo de diseño antes de dar la pantalla del Home por definitiva.

## Settings

PDR §24: `Edit Profile, Terms & Conditions, Support, Share Account, Delete Account, Log Out`.

- **Edit Profile** (§25): se pueden editar Photo, Role, Role Sought, Profession, Skills,
  Description y Briefcase. Name y Age **no**. Mismas validaciones que en creación (Profession
  ≤20, Skills ≤3, Description ≤200).
- **Delete Account** (§26): acción destructiva con confirmación explícita, diferenciada
  claramente de Log Out. 📐 Verificado en Figma (`Connect-it: Delete Account (Minimalist)`):
  botón "CONFIRM DELETION" + enlace "Cancel" separado, con texto de advertencia — coincide con la
  exigencia del PDR.
- **Log Out** (§27): cierra sesión pero conserva la cuenta.
- **Share Account** (§28): compartir perfil/cuenta con las capacidades nativas de la plataforma.
  📐 Verificado en Figma (`Connect-it Share Profile`): tarjeta de vista previa del perfil +
  iconos sociales + campo de enlace copiable (`connect-it.app/u/alexchen`).
- **Support** (§29): debe mostrar el email oficial de soporte. 📐 Verificado en Figma
  (`Connect-it Help Center`).
- **Terms & Conditions** (§30): disponible durante el registro y desde Settings. 📐 Verificado en
  Figma (`Connect-it Privacy Policy` — nota: la pantalla de Figma se llama "Privacy Policy", no
  "Terms & Conditions"; puede que ambos documentos legales compartan plantilla visual, o puede
  que sea un vacío de nomenclatura a confirmar).

## Estado actual

📐 **Solo especificado y diseñado.** Ninguna pantalla de la app de usuario existe todavía en
código.
