# 6. Chat y mensajería

*Skill usada: `connect-it-chat`. Fuente principal: PDR §20-21; Master Prompt §9;
`PDR___Panel_de_Administración.md` §2; skill `connect-it-chat`; Figma (Chat List, Messaging View,
International Chat); decisiones tomadas directamente con el usuario durante el desarrollo del
panel admin.*

## Estructura general

PDR §20: Chat contiene **Match list, Individual Chat y Global Chat**.

📐 Verificado en Figma: existe una pantalla de lista de chats (`Connect-it Chat List`, con un
botón destacado de "International Chat" — el nombre que usa Figma para lo que el PDR llama
"Global Chat", ver nota de nomenclatura más abajo), una variante de esa lista mostrando el evento
de Unmatch (`Connect-it Chat List Unmatch Event`), la vista de conversación 1:1
(`Connect-it Messaging View`), y la pantalla del chat global/internacional
(`Connect-it International Chat`).

## Chat individual

PDR §20, skill `connect-it-chat`: permite **enviar mensajes, revisar el perfil de la otra
persona, Unmatch y Report Chat**. También debe manejar: carga y envío de mensajes, fallos de
conexión y reintentos.

📐 En Figma, la pantalla de mensajería (`Connect-it Messaging View`) muestra: divisor de fecha,
grupos de mensajes recibidos/enviados con burbujas diferenciadas, marcas de tiempo, un mensaje de
sistema/acción, botón de "Report user" en la cabecera, y un área de entrada de texto con botón de
adjuntar y botón de enviar.

## ⚠️ Nota de nomenclatura: "Global Chat" (PDR) vs. "International Chat" (Figma)

El PDR y todas las skills usan siempre el término **Global Chat**. Figma nombra la pantalla
equivalente **"International Chat"** en dos sitios (`Connect-it International Chat` como pantalla
completa, y el botón de acceso desde la lista de chats: "International Chat Button"). Es
probablemente el mismo concepto con dos nombres distintos, pero se señala por si el equipo de
producto quiere unificar el texto visible al usuario final (¿"Chat Global" o "Chat
Internacional"?) antes de implementar.

## Chat global

PDR §21: chat compartido con moderación. Debe:

- Bloquear/moderar palabrotas y lenguaje ofensivo.
- No permitir links.
- Rate limit: "inicial: máximo 5 mensajes en 10 segundos" (PDR §21, repetido igual en la skill
  `connect-it-chat`, en la skill `connect-it-moderation`, y en la skill `connect-it-testing`
  como caso de prueba obligatorio).

📐 Verificado en Figma: la pantalla `Connect-it International Chat` muestra un mensaje de sistema
centrado, burbujas de mensaje con nombre del remitente visible (`Elena M.`, `Julian S.`) —
coherente con ser un chat compartido entre múltiples usuarios, no 1:1.

## ⚠️ Contradicción detectada: regla de rate-limit del chat global (documentación vs. lo que realmente se construyó)

**Las tres fuentes de documentación coinciden entre sí** en la regla: máximo **5 mensajes en 10
segundos**. Sin embargo, **lo que se construyó de verdad** en el backend del panel admin durante
esta sesión — y que quedó desplegado y probado en producción — sigue una regla **distinta**,
indicada explícitamente por el usuario en el momento de construirla:

> "si hay mensaje 10 mensajes en menos 5 segundos [...] entrará en modo slow donde solo se podrá
> mandar un mensaje cada 10 segundos por un minuto [...] y si lo repite 3 veces pues no puede
> mandar mensajes por 5 minutos"

Es decir, la implementación real usa **10 mensajes en menos de 5 segundos** como umbral (no 5 en
10), y añade un sistema completo de escalado en tres niveles (normal → modo lento 1 msj/10s
durante 1 min → bloqueo de 5 min tras 3 reincidencias) que **no aparece en ningún documento
fuente** — es una decisión de producto tomada directamente durante el desarrollo, más elaborada
que la regla original del PDR/skills.

**No se ha modificado el PDR ni las skills para reflejar este cambio** — quedan tal cual estaban,
con la regla "5 en 10s", mientras que el sistema real implementado usa "10 en 5s" + modo
lento/bloqueo. Esta discrepancia debe resolverse actualizando los documentos fuente para que
coincidan con la decisión de producto real, o revirtiendo la implementación para ajustarse al PDR
original — mientras tanto, queda documentada aquí para que nadie asuma erróneamente que el PDR
"5 en 10s" es lo que está en producción.

## ⚠️ Contradicción detectada: tecnología de chat en tiempo real (Socket.IO vs. Supabase Realtime)

El `PDR___Panel_de_Administración.md` (§2.2) especifica explícitamente:

> "El sistema de chat utilizará: WebSockets, Socket.IO."

Sin embargo, lo que se implementó de verdad para la moderación en vivo del chat global desde el
panel admin usa **Supabase Realtime** (suscripciones `postgres_changes` sobre Postgres), no
Socket.IO. Esta fue una decisión explícita tomada con el usuario durante el desarrollo (recogida
en el roadmap del proyecto como *"Chat en tiempo real (Supabase Realtime, decidido en vez de
Socket.IO)"*), no un descuido — pero el PDR del panel nunca se actualizó para reflejarlo. Se
señala aquí para que quede constancia formal de la decisión, y para que quien lea el PDR original
no asuma que hace falta montar infraestructura de Socket.IO por separado.

## ➕ Funcionalidad añadida durante el desarrollo, no presente en ningún documento fuente: Like desde el Chat Global

El usuario indicó directamente: los usuarios del chat global deben poder **ver el perfil de
otros participantes y darles Like desde ahí**; si es mutuo, se genera un Match igual que desde
Discovery. Ninguna fuente (PDR, Master Prompt, skills) menciona esta posibilidad — el PDR y las
skills tratan el Like como algo que ocurre en Discovery, y el chat global como un espacio
puramente de conversación con moderación.

Nota técnica: esto **no requiere ningún cambio de backend**, ya que el sistema de Likes/Matches
existente (tabla `likes`, trigger `handle_mutual_like`) es agnóstico de dónde se origina el Like
— cualquier `from_profile`/`to_profile` válido genera Match si es mutuo, sin importar si el Like
se disparó desde una card de Discovery o desde un perfil abierto en el chat global. Solo falta
construir el botón/acceso en la UI del chat, cuando exista.

## Estado actual (lo único real hoy)

✅ **Implementado y verificado en producción**, pero únicamente el lado de **moderación desde el
panel admin**, no el chat de usuario real:

- Tabla `global_chat_messages` con Realtime activado.
- Panel `/admin/global-chat`: lista en vivo (Supabase Realtime), bloquear/desbloquear mensajes
  con motivo, indicador de conexión en vivo. RLS verificada con roles reales (no-admin bloqueado,
  admin permitido).
- Sistema anti-spam completo a nivel de base de datos (dos triggers en `global_chat_messages`,
  regla real: 10 msj/5s → modo lento → bloqueo tras 3 reincidencias — ver contradicción arriba),
  probado con ráfagas reales y verificado en las 7 transiciones de estado.
- Tabla `admin_get_chat_messages` (RPC) para que el admin revise una conversación 1:1 reportada.

📐 **No implementado**: el chat individual real entre usuarios (no existe ninguna pantalla de
envío/recepción de mensajes para usuarios finales), ni el chat global real desde el lado del
usuario (solo existe la vista de moderación del admin, que ve los mensajes pero no participa como
usuario normal).
