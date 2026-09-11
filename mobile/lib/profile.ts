import { Platform } from "react-native";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";

import { supabase } from "./supabase";
import type { ProfessionalRole } from "./database.types";

export interface Profile {
  id: string;
  name: string | null;
  age: number | null;
  photo_url: string | null;
  role: ProfessionalRole | null;
  role_sought: ProfessionalRole | null;
  profession: string | null;
  description: string | null;
  portfolio_url: string | null;
  terms_accepted_at: string | null;
  onboarding_completed: boolean;
  skill_ids: string[];
}

// NOTA: cast puntual, mismo motivo y mismo patrón que en src/lib/admin.ts
// del panel admin - sin tipos Database generados de verdad (necesita
// Docker), supabase-js no infiere bien .update()/.insert() tal como estan
// escritos los tipos a mano. Verificado exhaustivamente: el problema es
// real y reproducible incluso con el Database mas simple posible; este es
// el unico workaround que funciona.
type UpdateChain = {
  update: (v: Record<string, unknown>) => {
    eq: (col: string, val: string) => PromiseLike<{ error: unknown }>;
  };
};
type InsertChain = {
  insert: (v: Record<string, unknown>[]) => PromiseLike<{ error: unknown }>;
};

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, name, age, photo_url, role, role_sought, profession, description, portfolio_url, terms_accepted_at, onboarding_completed",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;
  const profileRow = profile as Omit<Profile, "skill_ids">;

  const { data: skillRows, error: skillsError } = await supabase
    .from("profile_skills")
    .select("skill_id")
    .eq("profile_id", userId);
  if (skillsError) throw skillsError;

  const rows = (skillRows ?? []) as { skill_id: string }[];
  return { ...profileRow, skill_ids: rows.map((s) => s.skill_id) };
}

export interface AcceptTermsOptions {
  marketingConsent?: boolean;
  radarEnabled?: boolean;
}

export async function acceptTerms(userId: string, options?: AcceptTermsOptions) {
  const { error } = await (supabase.from("profiles") as unknown as UpdateChain)
    .update({
      terms_accepted_at: new Date().toISOString(),
      marketing_consent: options?.marketingConsent ?? false,
      radar_enabled: options?.radarEnabled ?? false,
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function updateRole(userId: string, role: ProfessionalRole) {
  const { error } = await (supabase.from("profiles") as unknown as UpdateChain)
    .update({ role })
    .eq("id", userId);
  if (error) throw error;
}

export async function updateRoleSought(userId: string, roleSought: ProfessionalRole) {
  const { error } = await (supabase.from("profiles") as unknown as UpdateChain)
    .update({ role_sought: roleSought })
    .eq("id", userId);
  if (error) throw error;
}

export interface CreateProfileInput {
  name: string;
  age: number;
  profession: string;
  description?: string;
  portfolioUrl?: string;
  photoUrl: string;
  country?: string | null;
}

export async function saveProfileDetails(userId: string, input: CreateProfileInput) {
  const { error } = await (supabase.from("profiles") as unknown as UpdateChain)
    .update({
      name: input.name,
      age: input.age,
      profession: input.profession,
      description: input.description || null,
      portfolio_url: input.portfolioUrl || null,
      photo_url: input.photoUrl,
      country: input.country ?? null,
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function replaceMySkills(userId: string, skillIds: string[]) {
  const { error: deleteError } = await supabase
    .from("profile_skills")
    .delete()
    .eq("profile_id", userId);
  if (deleteError) throw deleteError;

  if (skillIds.length === 0) return;

  const { error: insertError } = await (
    supabase.from("profile_skills") as unknown as InsertChain
  ).insert(skillIds.map((skillId) => ({ profile_id: userId, skill_id: skillId })));
  if (insertError) throw insertError;
}

export interface SkillOption {
  id: string;
  name: string;
}

export async function fetchSkillsCatalog(): Promise<SkillOption[]> {
  const { data, error } = await supabase.from("skills").select("id, name").order("name");
  if (error) throw error;
  return data ?? [];
}

/** Sube una foto de perfil (URI local de expo-image-picker) al bucket "profile-photos". */
export async function uploadProfilePhoto(userId: string, localUri: string): Promise<string> {
  const extension = localUri.split(".").pop()?.toLowerCase().split("?")[0] || "jpg";
  const path = `${userId}/${Date.now()}.${extension}`;
  const contentType = extension === "png" ? "image/png" : "image/jpeg";

  const body =
    Platform.OS === "web"
      ? await fetch(localUri).then((res) => res.blob())
      : decode(await FileSystem.readAsStringAsync(localUri, { encoding: "base64" }));

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, body, { contentType, upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
  return data.publicUrl;
}
