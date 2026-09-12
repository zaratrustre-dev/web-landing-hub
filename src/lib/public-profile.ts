import { supabase } from "./supabase";

// NOTA: mismo motivo de cast que en admin.ts — sin tipos Database
// generados de verdad, supabase-js no infiere bien .rpc() tal como está
// escrito el tipo a mano.
type RpcFn = (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: unknown }>;

export interface PublicProfile {
  id: string;
  name: string | null;
  photo_url: string | null;
  profession: string | null;
  skills: string[];
}

/**
 * Perfil público mínimo (Ajustes → Compartir cuenta, en la app). Solo
 * foto, nombre, profesión y skills — el resto lo garantiza la función RPC
 * `get_public_profile` en el servidor (SECURITY DEFINER, ver
 * supabase/migrations/*_public_profile_share.sql), no este cliente.
 * Devuelve null si el perfil no existe, no ha terminado el onboarding, o
 * está bloqueado.
 */
export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await (supabase.rpc as RpcFn)("get_public_profile", {
    p_id: userId,
  });
  if (error) throw error;
  const rows = (data ?? []) as PublicProfile[];
  return rows[0] ?? null;
}
