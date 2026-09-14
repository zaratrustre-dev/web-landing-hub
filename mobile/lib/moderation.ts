import { supabase } from "./supabase";

// PDR §22 / connect-it-moderation: reportar perfil. `reason` en BD acepta
// hasta 500 caracteres de texto libre — estas son las opciones que
// ofrecemos en el cliente; "Other" deja escribir un motivo libre.
export const REPORT_REASONS = [
  "Fake profile",
  "Inappropriate photos or content",
  "Harassment or abusive behavior",
  "Spam or scam",
  "Other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

type ReportInsertChain = {
  insert: (v: Record<string, unknown>[]) => PromiseLike<{ error: unknown }>;
};

const MAX_REASON_LENGTH = 500;

/**
 * Reporta un perfil (PDR §22, tabla `reports`). RLS exige
 * `reporter_id = auth.uid()`, así que `reporterId` debe ser el id del
 * usuario autenticado.
 */
export async function reportProfile(
  reporterId: string,
  targetProfileId: string,
  reason: string,
): Promise<void> {
  const trimmed = reason.trim().slice(0, MAX_REASON_LENGTH) || "No reason provided";
  const { error } = await (supabase.from("reports") as unknown as ReportInsertChain).insert([
    {
      reporter_id: reporterId,
      target_type: "profile",
      target_profile_id: targetProfileId,
      reason: trimmed,
    },
  ]);
  if (error) throw error;
}
