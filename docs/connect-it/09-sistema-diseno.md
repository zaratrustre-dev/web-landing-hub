# 9. Sistema de diseño

*Skill usada: `connect-it-figma-system`. Fuente: Figma real
(`https://www.figma.com/design/yiKhty1LoNF6Av3fSCFk1H/Connect-it`), inspeccionado vía metadata
estructural (no solo mencionado de oídas) para este documento.*

## Regla de la skill

`connect-it-figma-system`: Figma es la referencia visual (layout, colores, tipografía,
componentes, espaciado, iconografía, patrones de interacción). Reutilizar componentes existentes.
Preservar el estilo oscuro y el acento naranja. El PDR determina el alcance funcional; **Figma no
limita ese alcance** — si falta una pantalla para algo que el PDR exige, hay que diseñarla
siguiendo el lenguaje visual existente, no omitir la funcionalidad. Nunca rediseñar pantallas
existentes sin necesidad.

## Identidad visual confirmada

No se ha extraído una paleta de variables de Figma formal (el archivo no usa Figma Variables para
color/tipografía, según la inspección realizada), pero los **nombres de capa reales** del archivo
confirman consistentemente el estilo oscuro + acento naranja exigido:

- Botón primario del estado "Feed Vacío": capa llamada literalmente **`Primary Action Button:
  Electric Orange filled with black text`**.
- Icono central de la pantalla de Match: **`Glowing Orange Hexagon with 'C'`**.
- Fondos recurrentes en casi todas las pantallas: capas `Background+Blur`, `Overlay+Blur`,
  `Subtle atmospheric background elements` — todas sobre base oscura.
- Barra de navegación inferior reutilizada como **componente/instancia** (`BottomNavBar`) en al
  menos 6 pantallas distintas (Home, Store, Settings, Chat List, Match, Feed Vacío) — confirma que
  sí existe un sistema de componentes reutilizables en Figma, tal como pide la skill, no capas
  duplicadas sueltas.
- El "Header - Top App Bar (Mobile)" también se reutiliza como instancia/símbolo en varias
  pantallas (Edit Profile, Privacy Policy, Help Center, Share Profile).

## Inventario de pantallas inspeccionadas (Figma)

Confirmado vía metadata estructural completa del archivo (una sola página, "Page 1"):

| Pantalla Figma | Área funcional (PDR) |
|---|---|
| Connect-it Welcome Screen | Onboarding inicial |
| Connect-it Auth Showcase Refined | Login con Google |
| Connect-it: Email Sign-up / Login / Forgot Password / Create New Password | ⚠️ Ocultas — ver doc. 3 |
| Connect-it Professional Discovery Duplicated | Selección de Role |
| Connect-it Profession Selection Unified | Selección de Role Sought |
| Connect-it Profile Creation | Create Profile |
| Connect-it Home - Ana Martínez Profile | Home / Discovery |
| Connect-it Search & Filters | Búsqueda y filtros |
| Connect-it Match: Minimalist Variant | Pantalla de Match |
| Connect-it: Deshacer Match (Alerta) | Unmatch |
| Connect-it Chat List / Chat List Unmatch Event | Lista de chats |
| Connect-it Messaging View | Chat individual |
| Connect-it International Chat | Chat global (ver nota de nombre, doc. 6) |
| Connect-it: Report User | Report |
| Connect-it Profile: Structured Variant | Perfil completo |
| Connect-it Edit Profile | Edit Profile ⚠️ ver doc. 2 |
| Connect-it Settings | Settings |
| Connect-it Share Profile | Share Account |
| Connect-it Privacy Policy | Terms & Conditions / Privacy |
| Connect-it Help Center | Support |
| Connect-it: Delete Account (Minimalist) | Delete Account |
| Connect-it Unlimited Store | Store |
| Connect-it: Pantalla de Tiempo (Likes Agotados) | Límite de Likes / countdown |
| Connect-it: Feed Vacío (Sin Perfiles) | Estado vacío de Discovery |

## ⚠️ Pantallas de Figma que no deben usarse como referencia funcional

Las 4 pantallas de email/password (ver doc. 3) están **ocultas** (`hidden="true"`) en el archivo.
Existen visualmente pero no representan una funcionalidad a implementar — es la única excepción
al principio general "Figma es la referencia visual" de este documento.

## Cómo se traduce esto al Panel de Administración (lo único implementado hoy)

⚠️ **El Panel de Administración NO se construyó a partir de este Figma.** Es una herramienta
interna separada (TanStack Start + Tailwind v4 + shadcn/Radix) con su **propia** identidad visual
oscuro+naranja, definida de forma independiente durante el desarrollo del panel, sin tomar
componentes ni tokens reales del archivo de Figma del producto de usuario final. Comparten la
misma intención de marca (fondo oscuro, acento naranja) pero no comparten sistema de diseño
formal ni componentes.

Esto es coherente con el alcance del proyecto (el panel admin es una herramienta interna, no la
app de usuario final que sí debe seguir este Figma), pero se señala explícitamente porque la
skill `connect-it-figma-system` habla de "la implementación" en general sin distinguir panel
admin de app de usuario — para evitar que alguien asuma que el panel admin ya es un ejemplo válido
de "Figma implementado".

## Estado actual

📐 Sistema de diseño completamente definido en Figma, ✅ identidad de marca (oscuro + naranja)
aplicada de forma independiente en el panel admin (no derivada de este Figma), ❌ ningún
componente de este Figma implementado en código todavía para la app de usuario final.
