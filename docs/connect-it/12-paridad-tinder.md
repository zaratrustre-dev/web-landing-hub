# 12. Comparativa de paridad con Tinder

*Fuente principal: PDR §32-34, §42; Master Prompt §1, §4, §12; skill `connect-it-master`.*

## El mandato explícito

PDR §32: *"Connect-it debe contemplar las funcionalidades y patrones relevantes de Tinder además
de las funcionalidades propias del producto."* Áreas cubiertas: discovery, swipe cuando
corresponda, Like/Dislike, mutual Match, Match list, perfiles, chat, estados de interacción,
safety/reporting, engagement, notificaciones relevantes, freemium/premium y re-engagement.

El Master Prompt (§1) es más tajante todavía: **"NO construyas un clon simplificado ni
implementes únicamente las pantallas actuales de Figma."** El PDR define el producto completo;
Figma define principalmente su lenguaje visual — Figma no debe usarse como excusa para recortar
funcionalidad que el PDR exige.

## Qué se adopta de Tinder (tal cual, adaptado a networking)

| Patrón de Tinder | Adaptación en Connect-it |
|---|---|
| Swipe / Like-Dislike | Igual, pero sobre perfiles profesionales, no citas |
| Match mutuo | Igual — Like mutuo → Match |
| Pantalla de "It's a Match" | Pantalla de Match con Start Chat / Keep Discovering |
| Lista de Matches | Match list, dentro de la sección Chat |
| Chat 1:1 tras Match | Individual Chat |
| Sistema de Likes limitados (freemium) | 3 Likes/día gratis + countdown 24h |
| Paywall de features premium | Store → Unlimited Likes (desactivado por ahora) |
| Reportar/bloquear usuarios | Report Profile, Report Chat, Unmatch |
| Perfil con foto + info corta + info completa | Profile Card (resumen) + Full Profile |
| Filtros de descubrimiento | Category, Skill, Country (en vez de edad/distancia/género) |

## Qué se adapta (mismo patrón, contenido distinto)

- **Perfil**: en vez de fotos + bio de citas, se muestra Profession + Skills + Briefcase.
- **Roles**: en vez de preferencias de género/edad, se usan las 9 categorías profesionales +
  Role Sought.
- **Chat Global**: patrón inspirado en salas de chat compartidas de apps de discovery, pero
  reencuadrado como espacio profesional moderado ("International Chat" en Figma).

## Qué es exclusivo de Connect-it (PDR §34, sin equivalente directo en Tinder)

- Professional Roles (9 categorías fijas).
- Role Sought (qué categoría busca el usuario, no solo quién es).
- Campo Profession con límite estricto de 20 caracteres.
- Hasta 3 Skills por perfil (catálogo basado en habilidades de Upwork).
- Briefcase (portfolio/CV/LinkedIn).
- Discovery profesional (relevancia profesional, no atractivo/proximidad).
- Filtros por País como dimensión propia de networking internacional.
- Global professional Chat como espacio de networking compartido, no solo chats 1:1.

## Qué NO se copia bajo ningún concepto (PDR §33, regla inmutable)

- Lenguaje romántico.
- Preferencias sexuales.
- Campos específicos de dating (por ejemplo, "buscando: relación seria / casual").
- Recomendaciones de tipo romántico.
- Cualquier concepto de dating en general.

Esta regla se repite de forma idéntica en el PDR, el Master Prompt y la skill
`connect-it-master`, sin ninguna contradicción entre fuentes — es la regla más consistente de
todo el proyecto.

## Definición final del producto (PDR §42, cita textual)

> "Connect-it = Professional Networking + Tinder-style Discovery. Debe sentirse como un producto
> propio: profesional, moderno, visual, rápido y social. El producto completo combina los
> patrones relevantes de Tinder con las funcionalidades profesionales específicas de Connect-it."

## Estado actual

📐 Esta comparativa es enteramente conceptual/normativa — ninguna de las dos columnas (features
adoptadas de Tinder, features exclusivas de Connect-it) tiene código implementado todavía en la
app de usuario final. Sirve como referencia de producto para cuando empiece esa fase.
