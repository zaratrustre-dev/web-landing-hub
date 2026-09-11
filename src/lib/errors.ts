/**
 * Los errores de Supabase/PostgREST son objetos planos ({ message, details,
 * hint, code }), no instancias de Error. `err instanceof Error` falla con
 * ellos y esconde el mensaje real detrás de un fallback genérico. Este
 * helper cubre ambos casos.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;

  if (
    err !== null &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    return (err as { message: string }).message;
  }

  return fallback;
}
