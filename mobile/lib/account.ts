import { supabase } from "./supabase";

/**
 * Borra la cuenta del usuario autenticado de forma permanente, invocando
 * la Edge Function `delete-account` (usa la Admin API en el servidor —
 * el cliente móvil nunca tiene la service role key). La función SIEMPRE
 * borra al llamante, nunca acepta un id externo.
 *
 * El borrado cascada (ver supabase/functions/delete-account/index.ts)
 * elimina también matches, likes, mensajes de chat y reports asociados.
 * Es irreversible.
 */
export async function deleteMyAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ success?: boolean; error?: string }>(
    "delete-account",
  );
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
