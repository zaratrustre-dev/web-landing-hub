import { supabase } from "./supabase";

export interface AdminProfileRow {
  id: string;
  email: string | null;
  name: string | null;
  age: number | null;
  role: string | null;
  role_sought: string | null;
  profession: string | null;
  country: string | null;
  photo_url: string | null;
  marketing_consent: boolean;
  radar_enabled: boolean;
  is_blocked: boolean;
  is_reported: boolean;
  onboarding_completed: boolean;
  created_at: string;
  total_count: number;
}

// NOTA: cast puntual, igual que en auth.ts — los tipos de Functions en
// database.types.ts están escritos a mano (sin Docker no se generan con
// `supabase gen types`). Al regenerarlos de verdad esto puede tipar bien.
type RpcFn = (
  fn: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: unknown }>;

export interface AdminProfileFilters {
  search?: string | undefined;
  role?: string | undefined;
  country?: string | undefined;
  blocked?: boolean | undefined;
  reported?: boolean | undefined;
  skillId?: string | undefined;
  radar?: boolean | undefined;
}

export async function fetchAdminProfiles(
  pageLimit: number,
  pageOffset: number,
  filters: AdminProfileFilters = {},
) {
  const { data, error } = await (supabase.rpc as RpcFn)("admin_list_profiles", {
    page_limit: pageLimit,
    page_offset: pageOffset,
    search_text: filters.search || null,
    role_filter: filters.role || null,
    country_filter: filters.country || null,
    blocked_filter: filters.blocked ?? null,
    reported_filter: filters.reported ?? null,
    skill_filter: filters.skillId || null,
    radar_filter: filters.radar ?? null,
  });

  if (error) throw error;
  return (data ?? []) as AdminProfileRow[];
}

/**
 * Todos los emails ya registrados (sin paginar), para comprobar duplicados
 * ANTES de una importación masiva. Reutiliza admin_list_profiles con un
 * page_limit grande - no hay tabla propia de "solo emails", y es la única
 * vía ya expuesta al panel admin para leer auth.users.email vía RLS/RPC.
 */
export async function fetchAllAdminEmails(): Promise<string[]> {
  const { data, error } = await (supabase.rpc as RpcFn)("admin_list_profiles", {
    page_limit: 100000,
    page_offset: 0,
  });
  if (error) throw error;
  return ((data ?? []) as AdminProfileRow[])
    .map((r) => r.email)
    .filter((e): e is string => !!e);
}

export async function setUserBlocked(targetUserId: string, isBlocked: boolean, reason?: string) {
  const { error } = await (supabase.rpc as RpcFn)("admin_set_user_blocked", {
    target_user_id: targetUserId,
    new_is_blocked: isBlocked,
    reason: reason ?? null,
  });

  if (error) throw error;
}

export interface CreateUserInput {
  email: string;
  name?: string | undefined;
  age?: number | undefined;
  role?: string | undefined;
  role_sought?: string | undefined;
  profession?: string | undefined;
  description?: string | undefined;
  portfolio_url?: string | undefined;
  country?: string | undefined;
  marketing_consent?: boolean | undefined;
  radar_enabled?: boolean | undefined;
}

async function invokeAdminUsers(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) throw new Error(await extractFunctionErrorMessage(error));
  const result = data as { error?: string } | null;
  if (result?.error) throw new Error(result.error);
  return result;
}

/** Crea un usuario de verdad (auth.users + profile). Requiere la Edge Function admin-users. */
export async function createUser(input: CreateUserInput) {
  return invokeAdminUsers({ action: "create", ...input });
}

/** Borra un usuario de verdad (auth.users, cascada a profiles). Requiere la Edge Function admin-users. */
export async function deleteUser(userId: string) {
  return invokeAdminUsers({ action: "delete", user_id: userId });
}

/**
 * Bloquea/desbloquea el LOGIN de verdad (Admin API) además del estado visible
 * en profiles. Requiere la Edge Function admin-users. Sustituye a
 * setUserBlocked() para el botón del panel (esa función queda para casos
 * donde solo se quiera tocar el estado del perfil, sin afectar al login).
 */
export async function setUserBanned(userId: string, banned: boolean, reason?: string) {
  return invokeAdminUsers({ action: "set_banned", user_id: userId, banned, reason });
}

/** Cambia el email de login de un usuario (requiere la Admin API, no RLS normal). */
export async function updateUserEmail(userId: string, newEmail: string) {
  return invokeAdminUsers({ action: "update_email", user_id: userId, new_email: newEmail });
}

/**
 * Sube la foto de un usuario al bucket "profile-photos", bajo la carpeta de
 * su propio user_id (las políticas de Storage lo exigen así), y devuelve la
 * URL pública. No actualiza profiles.photo_url por sí sola — usa
 * updateProfilePhoto() después.
 */
export async function uploadProfilePhoto(userId: string, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/photo-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("profile-photos")
    .upload(path, file, file.type ? { upsert: true, contentType: file.type } : { upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Guarda la URL de la foto en el perfil (usa la RLS admin_all ya existente).
 * NOTA: cast puntual, mismo motivo que con .rpc() en otros archivos — sin
 * tipos Database generados de verdad (necesita Docker), supabase-js no
 * infiere bien .update() aquí tal como está escrito el tipo a mano.
 */
export async function updateProfilePhoto(userId: string, photoUrl: string) {
  const { error } = await (
    supabase.from("profiles") as unknown as {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, val: string) => PromiseLike<{ error: unknown }>;
      };
    }
  )
    .update({ photo_url: photoUrl })
    .eq("id", userId);

  if (error) throw error;
}

export interface AdminProfileDetail {
  id: string;
  email: string | null;
  name: string | null;
  age: number | null;
  role: string | null;
  role_sought: string | null;
  profession: string | null;
  description: string | null;
  portfolio_url: string | null;
  country: string | null;
  photo_url: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  radar_enabled: boolean;
  is_blocked: boolean;
  blocked_at: string | null;
  is_reported: boolean;
  onboarding_completed: boolean;
  created_at: string;
  skill_ids: string[];
  skill_names: string[];
}

/** Ficha completa de un usuario (perfil + email + skills) para Ver/Editar. */
export async function fetchAdminProfile(userId: string) {
  const { data, error } = await (supabase.rpc as RpcFn)("admin_get_profile", {
    target_user_id: userId,
  });
  if (error) throw error;
  const rows = (data ?? []) as AdminProfileDetail[];
  return rows[0] ?? null;
}

export interface SkillOption {
  id: string;
  name: string;
}

/** Catálogo completo de skills disponibles (lectura pública para autenticados). */
export async function fetchSkillsCatalog() {
  const { data, error } = await supabase.from("skills").select("id, name").order("name");
  if (error) throw error;
  return (data ?? []) as SkillOption[];
}

export interface UpdateProfileInput {
  name?: string | null;
  age?: number | null;
  role?: string | null;
  role_sought?: string | null;
  profession?: string | null;
  description?: string | null;
  portfolio_url?: string | null;
  country?: string | null;
  marketing_consent?: boolean;
  radar_enabled?: boolean;
  onboarding_completed?: boolean;
}

/** Actualiza los campos de un perfil (usa la RLS admin_all ya existente). */
export async function updateProfileAdmin(userId: string, fields: UpdateProfileInput) {
  const { error } = await (
    supabase.from("profiles") as unknown as {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, val: string) => PromiseLike<{ error: unknown }>;
      };
    }
  )
    .update(fields as Record<string, unknown>)
    .eq("id", userId);

  if (error) throw error;
}

/**
 * Sustituye por completo las skills de un usuario (borra las que tenía y
 * pone las nuevas). Máximo 3 — lo aplica un trigger en la base de datos.
 */
export async function replaceProfileSkills(userId: string, skillIds: string[]) {
  const { error: deleteError } = await supabase
    .from("profile_skills")
    .delete()
    .eq("profile_id", userId);
  if (deleteError) throw deleteError;

  if (skillIds.length === 0) return;

  const rows = skillIds.slice(0, 3).map((skillId) => ({ profile_id: userId, skill_id: skillId }));

  const { error: insertError } = await (
    supabase.from("profile_skills") as unknown as {
      insert: (v: Record<string, unknown>[]) => PromiseLike<{ error: unknown }>;
    }
  ).insert(rows);
  if (insertError) throw insertError;
}

export interface UserReport {
  report_id: string;
  reporter_id: string;
  reporter_name: string | null;
  reporter_email: string | null;
  target_type: "profile" | "chat";
  match_id: string | null;
  reason: string;
  created_at: string;
}

/** Reports que afectan a un usuario (directos a su perfil, o de un chat donde es el otro participante). */
export async function fetchUserReports(userId: string) {
  const { data, error } = await (supabase.rpc as RpcFn)("admin_get_user_reports", {
    target_user_id: userId,
  });
  if (error) throw error;
  return (data ?? []) as UserReport[];
}

export interface ChatMessageRow {
  id: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  created_at: string;
}

/** Mensajes de un chat individual (por match_id), para revisar un report. Solo admins. */
export async function fetchChatMessages(matchId: string) {
  const { data, error } = await (supabase.rpc as RpcFn)("admin_get_chat_messages", {
    match_id_param: matchId,
  });
  if (error) throw error;
  return (data ?? []) as ChatMessageRow[];
}

export interface AdRow {
  id: string;
  title: string;
  media_type: "image" | "video";
  media_url: string;
  link_url: string | null;
  periodicity_likes: number;
  is_active: boolean;
  last_shown_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Todos los anuncios (RLS admin_all ya limita esto a admins de verdad). */
export async function fetchAds() {
  const { data, error } = await supabase
    .from("ads")
    .select(
      "id, title, media_type, media_url, link_url, periodicity_likes, is_active, last_shown_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdRow[];
}

/** Sube el archivo (imagen o vídeo) del anuncio al bucket "ads-media" y devuelve su URL pública. */
export async function uploadAdMedia(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("ads-media")
    .upload(path, file, file.type ? { contentType: file.type } : undefined);
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("ads-media").getPublicUrl(path);
  return data.publicUrl;
}

export interface CreateAdInput {
  title: string;
  media_type: "image" | "video";
  media_url: string;
  link_url?: string | undefined;
  periodicity_likes: number;
}

// NOTA: cast puntual, mismo motivo que en el resto del archivo — sin tipos
// Database generados de verdad (necesita Docker), .insert()/.update() en
// tablas nuevas no siempre infiere bien con los tipos escritos a mano.
export async function createAd(input: CreateAdInput) {
  const { error } = await (
    supabase.from("ads") as unknown as {
      insert: (v: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
    }
  ).insert({
    title: input.title,
    media_type: input.media_type,
    media_url: input.media_url,
    link_url: input.link_url || null,
    periodicity_likes: input.periodicity_likes,
  });
  if (error) throw error;
}

export interface UpdateAdInput {
  title?: string;
  media_type?: "image" | "video";
  media_url?: string;
  link_url?: string | null;
  periodicity_likes?: number;
  is_active?: boolean;
}

export async function updateAd(adId: string, fields: UpdateAdInput) {
  const { error } = await (
    supabase.from("ads") as unknown as {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, val: string) => PromiseLike<{ error: unknown }>;
      };
    }
  )
    .update(fields as Record<string, unknown>)
    .eq("id", adId);
  if (error) throw error;
}

export async function deleteAd(adId: string) {
  const { error } = await supabase.from("ads").delete().eq("id", adId);
  if (error) throw error;
}

/**
 * Dado el nº de likes de un usuario, decide qué anuncio toca mostrar (o
 * ninguno) y lo rota dentro de su grupo de periodicidad. De momento solo
 * lo puede llamar un admin (para pruebas); se abrirá a "authenticated"
 * cuando exista el flujo real de Likes de la app de usuario final.
 */
export async function fetchDueAd(likesCount: number) {
  const { data, error } = await (supabase.rpc as RpcFn)("get_due_ad", {
    likes_count: likesCount,
  });
  if (error) throw error;
  const row = data as AdRow | null;
  return row?.id ? row : null;
}

// ---------------------------------------------------------------------------
// Emails: transaccionales (Resend) y comerciales (Brevo). Las plantillas
// viven en el dashboard de cada proveedor, aquí solo se eligen destinatarios
// de la base de datos de Connect-it y se dispara el envío.
// ---------------------------------------------------------------------------

/**
 * Cuando una Edge Function responde con un status no-2xx, supabase-js
 * devuelve un error genérico ("Edge Function returned a non-2xx status
 * code") en vez del JSON real que devolvimos ({ error: "..." }). Este
 * helper rescata el mensaje real desde error.context (el Response crudo).
 */
async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === "object") {
    const ctx = (error as { context?: unknown }).context;
    if (ctx && typeof (ctx as Response).clone === "function") {
      try {
        const body: unknown = await (ctx as Response).clone().json();
        if (
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof (body as { error: unknown }).error === "string"
        ) {
          return (body as { error: string }).error;
        }
      } catch {
        // el cuerpo no era JSON o ya se había consumido: seguimos al fallback
      }
    }
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
  }
  return "Error desconocido";
}

async function invokeSendEmail(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("send-email", { body });
  if (error) throw new Error(await extractFunctionErrorMessage(error));
  const result = data as { error?: string } | null;
  if (result?.error) throw new Error(result.error);
  return result as { success: true; sent: number; failed: number; skipped_no_consent?: number };
}

export interface SendTransactionalInput {
  recipientUserIds: string[];
  sendToAll?: boolean | undefined;
  radarOnly?: boolean | undefined;
  country?: string | undefined;
  resendTemplateId: string;
  subject?: string | undefined;
  variables?: Record<string, string> | undefined;
}

export async function sendTransactionalEmail(input: SendTransactionalInput) {
  return invokeSendEmail({
    action: "send_transactional",
    recipient_user_ids: input.recipientUserIds,
    send_to_all: input.sendToAll ?? false,
    radar_only: input.radarOnly ?? false,
    country: input.country,
    resend_template_id: input.resendTemplateId,
    subject: input.subject,
    variables: input.variables,
  });
}

export interface SendCommercialInput {
  recipientUserIds: string[];
  sendToAll?: boolean | undefined;
  radarOnly?: boolean | undefined;
  country?: string | undefined;
  brevoTemplateId: number;
  params?: Record<string, string> | undefined;
}

export async function sendCommercialEmail(input: SendCommercialInput) {
  return invokeSendEmail({
    action: "send_commercial",
    recipient_user_ids: input.recipientUserIds,
    send_to_all: input.sendToAll ?? false,
    radar_only: input.radarOnly ?? false,
    country: input.country,
    brevo_template_id: input.brevoTemplateId,
    params: input.params,
  });
}

export interface EmailLogRow {
  id: string;
  provider: "resend" | "brevo" | null;
  email_type: "transactional" | "commercial" | null;
  recipient_email: string;
  subject: string;
  external_template_id: string | null;
  status: "queued" | "sent" | "failed";
  error_message: string | null;
  created_at: string;
}

/** Historial de envíos (RLS admin_all ya limita esto a admins de verdad). */
export async function fetchEmailLog(limit = 50) {
  const { data, error } = await supabase
    .from("email_log")
    .select(
      "id, provider, email_type, recipient_email, subject, external_template_id, status, error_message, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as EmailLogRow[];
}

// ---------------------------------------------------------------------------
// Notificaciones push (Firebase Cloud Messaging)
// ---------------------------------------------------------------------------

export interface SendPushInput {
  recipientUserIds: string[];
  sendToAll?: boolean;
  title: string;
  body: string;
}

export async function sendPushNotification(input: SendPushInput) {
  const { data, error } = await supabase.functions.invoke("send-push", {
    body: {
      recipient_user_ids: input.recipientUserIds,
      send_to_all: input.sendToAll ?? false,
      title: input.title,
      body: input.body,
    },
  });
  if (error) throw new Error(await extractFunctionErrorMessage(error));
  const result = data as { error?: string } | null;
  if (result?.error) throw new Error(result.error);
  return result as { success: true; sent: number; failed: number; note?: string };
}

export interface PushLogRow {
  id: string;
  token: string;
  title: string;
  body: string;
  status: "sent" | "failed";
  error_message: string | null;
  created_at: string;
}

/** Historial de notificaciones push (RLS admin_all ya limita esto a admins de verdad). */
export async function fetchPushLog(limit = 50) {
  const { data, error } = await supabase
    .from("push_log")
    .select("id, token, title, body, status, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PushLogRow[];
}

// ---------------------------------------------------------------------------
// Chat global: moderación en vivo (Supabase Realtime)
// ---------------------------------------------------------------------------

export interface GlobalChatMessageRow {
  id: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  is_blocked: boolean;
  block_reason: string | null;
  created_at: string;
}

/** Últimos N mensajes del chat global, con el nombre del autor. Solo admins ven los ya bloqueados. */
export async function fetchGlobalChatMessages(limit = 100) {
  const { data, error } = await supabase
    .from("global_chat_messages")
    .select("id, sender_id, content, is_blocked, block_reason, created_at, profiles(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  type RawRow = {
    id: string;
    sender_id: string;
    content: string;
    is_blocked: boolean;
    block_reason: string | null;
    created_at: string;
    profiles: { name: string | null } | { name: string | null }[] | null;
  };

  return ((data ?? []) as RawRow[]).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      sender_id: row.sender_id,
      sender_name: profile?.name ?? null,
      content: row.content,
      is_blocked: row.is_blocked,
      block_reason: row.block_reason,
      created_at: row.created_at,
    } satisfies GlobalChatMessageRow;
  });
}

/** Busca solo el nombre de un remitente (para enriquecer mensajes que llegan en vivo por Realtime). */
export async function fetchProfileName(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as { name: string | null } | null)?.name ?? null;
}

/** Bloquea/desbloquea un mensaje del chat global. RLS ya limita esto a admins de verdad. */
export async function moderateGlobalChatMessage(
  messageId: string,
  isBlocked: boolean,
  reason?: string,
) {
  const { error } = await (
    supabase.from("global_chat_messages") as unknown as {
      update: (v: Record<string, unknown>) => {
        eq: (col: string, val: string) => PromiseLike<{ error: unknown }>;
      };
    }
  )
    .update({ is_blocked: isBlocked, block_reason: isBlocked ? (reason ?? null) : null })
    .eq("id", messageId);
  if (error) throw error;
}
