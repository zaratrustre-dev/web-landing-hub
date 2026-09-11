# 5. Matching

*Skill usada: `connect-it-matching`. Fuente principal: PDR §19; Master Prompt §7; skill
`connect-it-matching`; Figma (Match, Deshacer Match).*

## Regla core

**Like mutuo = Match.** (PDR §19; Master Prompt §5, como regla inmutable; skill
`connect-it-matching`: *"A Match occurs when two users have both selected Like."*)

## Pantalla de Match

PDR §19: pantalla de Match con dos botones rectangulares: **Start Chat** y **Keep Discovering**.
La skill `connect-it-matching` detalla el comportamiento de cada uno:

- **Start Chat** → abre el chat individual con esa persona.
- **Keep Discovering** → devuelve al usuario a Home.

📐 Verificado en Figma (`Connect-it Match: Minimalist Variant`): pantalla centrada con un
hexágono naranja brillante con una "C" (icono de marca), tipografía grande de celebración, y dos
botones de acción apilados en la zona inferior — coincide con la estructura de dos acciones del
PDR, aunque los textos exactos de los botones no son legibles en la metadata (solo la posición y
existencia de dos `Button`).

## Qué debe manejar el sistema de matching

Según la skill `connect-it-matching`, más allá del caso feliz:

- Likes duplicados.
- Matches ya existentes (no crear duplicados).
- Estados de carga.
- Errores al hacer Match.
- Estado vacío de Matches (sin ningún match todavía).
- **Unmatch.**
- Actualización de la lista de Matches en tiempo real/al momento.

## Unmatch

📐 Verificado en Figma con una pantalla dedicada: `Connect-it: Deshacer Match (Alerta)` — un
modal de confirmación con icono de advertencia, texto explicativo, y dos botones de acción
apilados (confirmar / cancelar, siguiendo el mismo patrón que Delete Account). Coherente con la
skill `connect-it-moderation`, que también exige Unmatch como parte del sistema de seguridad.

## Encuadre profesional (no romántico)

Tanto la skill `connect-it-matching` como el PDR (§33-34) insisten en que **los Matches son
conexiones profesionales, no matches románticos** — ningún texto, icono o copy debe sugerir lo
contrario (nada de corazones como símbolo central, lenguaje de citas, etc.). El icono central de
la pantalla de Match en Figma es un hexágono con la "C" de marca, no un corazón — coherente con
esta regla.

## Estado actual

📐 **Solo especificado y diseñado.** No existe backend ni frontend de matching para la app de
usuario final. (El backend de Likes/Matches del panel admin — tablas `likes` y `matches`, trigger
`handle_mutual_like` — existe únicamente como infraestructura de base de datos preparatoria,
construida junto con el resto del esquema, pero no hay ningún cliente/app que lo use todavía.)
