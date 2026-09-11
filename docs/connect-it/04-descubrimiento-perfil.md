# 4. Descubrimiento y perfil

*Skills usadas: `connect-it-discovery`, `connect-it-profile-card`. Fuente principal: PDR §13-18,
§36-37; Master Prompt §6, §8; `Regla_de_adaptación_de_texto_en_las_Cards.md`; Figma (Home,
Search & Filters, Profile).*

## Home / Discovery

PDR §13: Home es la sección principal de descubrimiento y muestra profile cards.

La skill `connect-it-discovery` exige que Discovery soporte:

- Profile cards.
- Like.
- Dislike.
- Interacción tipo swipe **donde corresponda** (no necesariamente en todos los contextos).
- Apertura del perfil completo.
- Búsqueda.
- Filtrado por categoría, skill y país.
- Filtros combinables.

📐 Verificado en Figma: la pantalla `Connect-it Home - Ana Martínez Profile` muestra exactamente
este patrón — una tarjeta grande con foto, nombre+edad, chips de skills y dos botones de acción
circulares en la zona inferior de la tarjeta (Like/Dislike). También existe una pantalla de
**estado vacío** dedicada (`Connect-it: Feed Vacío (Sin Perfiles)`), con una tarjeta de sugerencia
("Amplía tus categorías profesionales para descubrir hasta +40 perfiles en tu sector") y un botón
"Restablecer filtros" — cumple con la exigencia de estados `empty` del PDR §37.

## Profile Card — regla crítica

Esta es, junto con los límites de caracteres, la regla más repetida en todas las fuentes (PDR
§14-15, Master Prompt §6, skill `connect-it-profile-card`, y el documento dedicado
`Regla_de_adaptación_de_texto_en_las_Cards.md`). Contenido de la card:

`Photo, Name, Age, Profession, hasta 3 Skills` + acciones `Like` y `Dislike` + poder abrir el
perfil completo.

### Prioridad de diseño (idéntica en las 4 fuentes, sin ninguna contradicción entre ellas)

```
Estabilidad de la card > Legibilidad > Contenido completo
```

Reglas concretas:

- Profession: máximo 20 caracteres desde el input (defensa primaria) + truncamiento con `...`
  como defensa adicional para datos heredados o externos que pudieran superar el límite.
- Skills: deben caber siempre dentro de sus chips/contenedores; adaptar tamaño de fuente
  progresivamente hasta un mínimo legible, y truncar con `...` si aun así no cabe.
- **Nunca** se permite: aumentar la altura de la card, mover los botones, solapar elementos, sacar
  contenido fuera de la card, saltos de línea extraños, o hacer el texto tan pequeño que sea
  ilegible.
- Esto se aplica en **todos** los sitios donde aparezca una card de perfil: Home/Feed, vistas
  previas, resultados de búsqueda, y cualquier otro lugar.

## Perfil completo (Full Profile)

PDR §16: `Photo, Name, Age, Profession, Description, Skills, Briefcase` + acciones `Like,
Dislike, Share, Report`.

Nota: **Share** y **Report** solo aparecen en el perfil completo, no en la card resumida de
Discovery — esto es coherente entre PDR y Master Prompt (§8), sin contradicción detectada.

## Búsqueda y filtros

PDR §17, skill `connect-it-discovery`: Home incluye buscador. Filtros: **Category, Skill,
Country**. Los filtros pueden combinarse.

📐 Verificado en Figma (`Connect-it Search & Filters`): pantalla dedicada con buscador de texto
libre, sección "CATEGORY" (pills de categoría con iconos), sección "HABILITIES & SKILLS" (buscador
de skills + chips de skills ya seleccionadas), sección "COUNTRY" (selector), y botón "Apply
Filters" — coincide exactamente con las 3 dimensiones de filtro exigidas por el PDR, combinables
entre sí.

## Sistema de Likes

PDR §18, skill `connect-it-discovery`:

- Usuario gratuito: **3 Likes por día**.
- Al consumirlos, el botón Like queda deshabilitado y se muestra un **countdown de 24 horas**.
- La recuperación de Likes se gestiona en una ventana de 24 horas.

📐 Verificado en Figma: pantalla dedicada `Connect-it: Pantalla de Tiempo (Likes Agotados)`, con
un dial/contador central y un CTA de upgrade ("Desbloquear Likes Ilimitados — $9.99/mes").

## ⚠️ Contradicción detectada: precio de Unlimited Likes visible en Figma vs. Store desactivada

La misma pantalla de "Likes Agotados" muestra un botón de compra activo con precio concreto
(**$9.99/mes**) para "Unlimited Likes". Sin embargo, el PDR (§23, §38) es explícito en que
**Store/Unlimited Likes está desactivado actualmente y no se deben implementar pagos activos**
(P2 — prioridad más baja, explícitamente pospuesta). La skill `connect-it-deployment` refuerza
esto: *"Do not activate Unlimited Likes payments unless explicitly requested."*

Esto no es necesariamente incompatible — es razonable interpretar que el **diseño visual** de la
pantalla de paywall puede construirse ya (para no bloquear el trabajo de UI), pero el **botón no
debe ejecutar ningún cobro real** hasta que se active explícitamente el Store. Aun así, se señala
como contradicción porque el PDR no aclara si esta pantalla debe mostrarse deshabilitada,
mostrarse pero sin funcionalidad de pago real, u ocultarse por completo mientras Store esté
desactivado.

## Estado actual

📐 **Solo especificado y diseñado.** No existe ninguna pantalla de Discovery, filtros o perfil
completo en código todavía.
