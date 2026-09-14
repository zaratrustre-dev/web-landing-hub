// URL pública de la web (repo_check/src/routes/p.$userId.tsx). Sin
// verificación de dominio real todavía — usar el mismo dominio que
// support@connect-it.app hasta que se confirme el definitivo.
//
// Bug fix (14/09/2026): el QR/enlace de "Compartir cuenta" daba
// "dirección no encontrada" porque "connect-it.app" NUNCA se conectó
// como Custom Domain en Cloudflare (sin DNS, sin entrada en el Worker —
// se eligió solo por coherencia con el email de soporte, no porque
// estuviera provisionado de verdad; no hay nada de esto en el repo, es
// 100% configuración de dashboard/DNS). El dominio real donde corre HOY
// el panel/web (`p.$userId`) es el subdominio de Cloudflare Workers.
// Se deja como valor por defecto pero override-able por env var
// (EXPO_PUBLIC_PUBLIC_PROFILE_BASE_URL, mismo patrón que el resto de
// EXPO_PUBLIC_* en .env.example) para el día que connect-it.app SÍ se
// conecte como Custom Domain — ese día solo hay que setear la env var,
// sin tocar código.
export const PUBLIC_PROFILE_BASE_URL =
  process.env.EXPO_PUBLIC_PUBLIC_PROFILE_BASE_URL ||
  "https://zaratrustre-dev-web-landing-hub.connect-it-app.workers.dev/p";

export function getPublicProfileUrl(userId: string): string {
  return `${PUBLIC_PROFILE_BASE_URL}/${userId}`;
}
