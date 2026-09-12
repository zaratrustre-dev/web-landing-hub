// URL pública de la web (repo_check/src/routes/p.$userId.tsx). Sin
// verificación de dominio real todavía — usar el mismo dominio que
// support@connect-it.app hasta que se confirme el definitivo.
export const PUBLIC_PROFILE_BASE_URL = "https://connect-it.app/p";

export function getPublicProfileUrl(userId: string): string {
  return `${PUBLIC_PROFILE_BASE_URL}/${userId}`;
}
