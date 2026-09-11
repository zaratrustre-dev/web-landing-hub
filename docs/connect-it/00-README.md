# Documentación de Connect-it

Generada actuando como orquestador de la skill `connect-it-master`, apoyándome en las skills
especializadas del proyecto y revisando **de verdad** las fuentes de origen antes de escribir
nada:

- **PDR del producto** (`Connect-it_PDR.txt`, 42 secciones).
- **Master Prompt** (`Connect-it_Master_Prompt_for_Claude.txt`).
- **PDR del Panel de Administración** (`PDR___Panel_de_Administración.md`).
- **Regla de adaptación de texto en las Cards** (`Regla_de_adaptación_de_texto_en_las_Cards.md`).
- **Figma real** (`yiKhty1LoNF6Av3fSCFk1H`, ~35 pantallas inspeccionadas vía metadata).
- Las 12 skills especializadas: `connect-it-product`, `connect-it-auth`, `connect-it-discovery`,
  `connect-it-profile-card`, `connect-it-matching`, `connect-it-chat`,
  `connect-it-notifications`, `connect-it-moderation`, `connect-it-security`,
  `connect-it-figma-system`, `connect-it-deployment`, `connect-it-testing`.

## Estado real del proyecto (contexto imprescindible para leer estos documentos)

**Lo único construido y funcionando hasta la fecha es el Panel de Administración** (repo
`web-landing-hub`, desplegado en producción: Supabase Cloud + Cloudflare Workers). **La app de
usuario final (Discovery, swipe, Match, Chat real, Settings...) no existe todavía — ni una sola
pantalla.** Solo existe como diseño en Figma y como especificación en el PDR.

Por tanto, en cada documento distingo explícitamente:
- ✅ **Implementado**: existe código real, desplegado, verificado.
- 📐 **Diseñado (Figma) / Especificado (PDR)**: existe la referencia visual o funcional, pero no
  hay ni una línea de código de la app de usuario.
- ⚠️ **Contradicción detectada**: el PDR, una skill, Figma o la implementación real del panel
  admin no coinciden entre sí. Señalado explícitamente, sin decidir por mi cuenta cuál prevalece.

## Índice

1. [Visión general del producto](01-vision-general.md)
2. [Roles, perfiles y navegación](02-roles-perfiles-navegacion.md)
3. [Autenticación](03-autenticacion.md)
4. [Descubrimiento y perfil](04-descubrimiento-perfil.md)
5. [Matching](05-matching.md)
6. [Chat y mensajería](06-chat-mensajeria.md)
7. [Notificaciones](07-notificaciones.md)
8. [Moderación y seguridad](08-moderacion-seguridad.md)
9. [Sistema de diseño](09-sistema-diseno.md)
10. [Testing](10-testing.md)
11. [Despliegue y entornos](11-despliegue-entornos.md)
12. [Comparativa de paridad con Tinder](12-paridad-tinder.md)
