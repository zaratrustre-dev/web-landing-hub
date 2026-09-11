# 1. Visión general del producto

*Skills usadas: `connect-it-product`, `connect-it-master`. Fuente principal: PDR §1-6, §42;
Master Prompt §1.*

## Qué es Connect-it

> "Connect-it es una aplicación de networking profesional con una experiencia de discovery y
> matching inspirada en Tinder. El producto permite descubrir profesionales, expresar interés,
> generar Matches y conversar." — PDR §1

Definición final del propio PDR (§42): **Connect-it = Professional Networking + Tinder-style
Discovery.** No es un clon simplificado de Tinder ni una copia de LinkedIn — debe sentirse como
un producto propio: profesional, moderno, visual, rápido y social.

## Propuesta de valor

Crear una experiencia de networking **rápida, visual y social** sin convertirla en una copia de
LinkedIn (PDR §2). Los objetivos explícitos (PDR §3):

- Crear un perfil profesional rápidamente.
- Descubrir profesionales relevantes.
- Filtrar por categoría, skill y país.
- Generar conexiones mediante Likes mutuos.
- Conversar después del Match.
- Mantener una experiencia segura y estable.

## Audiencia objetivo

"Profesionales, emprendedores, recruiters, especialistas y otros perfiles que quieran descubrir
colaboradores, talento, socios o contactos profesionales." (PDR §4)

## Diferenciación frente a apps tipo Tinder

El PDR (§34) lista explícitamente los diferenciadores de Connect-it frente a una app de dating
genérica:

- Roles profesionales (Professional Roles) y Role Sought.
- Campo Profession.
- Hasta 3 Skills por perfil.
- Briefcase (enlace profesional: portfolio, CV, LinkedIn...).
- Discovery profesional (no romántico).
- Filtros profesionales (Category, Skill, Country).
- Global professional Chat.
- Enfoque completo en networking profesional.

Y, al contrario, el PDR (§33) es igual de explícito sobre qué **no** copiar de Tinder: **nada de
lenguaje romántico, preferencias sexuales, campos de dating, ni recomendaciones románticas.**
Esto es una regla inmutable repetida en el Master Prompt (§4, §12) y en la skill
`connect-it-master`: *"Connect-it is professional networking, not dating. Tinder functionality
must always be adapted to professional networking."*

## Alcance: Tinder + Connect-it

El Master Prompt (§4) es explícito en que **no basta con implementar las pantallas actuales de
Figma** — hay que contemplar también los patrones relevantes de Tinder que el PDR exige aunque no
tengan pantalla diseñada todavía: discovery rápido, swipe cuando corresponda, Like/Dislike, Match
mutuo, Match list, chat, estados de interacción, seguridad/reportes, engagement y arquitectura
freemium. Ver el documento [12 — Paridad con Tinder](12-paridad-tinder.md) para el desglose
completo.

## Estado actual

📐 **Solo especificado y diseñado.** No existe ninguna implementación de la app de usuario final
todavía (ver [00-README](00-README.md)). Todo lo construido hasta la fecha pertenece
exclusivamente al Panel de Administración (ver PDR del Panel, resumido en los documentos
correspondientes de esta serie donde aplica).
