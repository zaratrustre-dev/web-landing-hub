import { supabase } from "./supabase";

export interface CandidateProfile {
  id: string;
  name: string | null;
  age: number | null;
  photoUrl: string | null;
  profession: string | null;
  description: string | null;
  portfolioUrl: string | null;
  skills: string[];
}

// NOTA: mismo motivo que en lib/profile.ts — sin tipos Database generados
// (necesita Docker), supabase-js no infiere bien filas embebidas via FK
// (profile_skills(skills(name))), así que se castea a mano tras el select.
type CandidateRow = {
  id: string;
  name: string | null;
  age: number | null;
  photo_url: string | null;
  profession: string | null;
  description: string | null;
  portfolio_url: string | null;
  profile_skills: { skills: { name: string } | null }[] | null;
};

const CANDIDATE_SELECT =
  "id, name, age, photo_url, profession, description, portfolio_url, profile_skills(skills(name))";

function mapCandidateRow(row: CandidateRow): CandidateProfile {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    photoUrl: row.photo_url,
    profession: row.profession,
    description: row.description,
    portfolioUrl: row.portfolio_url,
    skills: (row.profile_skills ?? [])
      .map((ps) => ps.skills?.name)
      .filter((n): n is string => Boolean(n)),
  };
}

const CANDIDATE_POOL_SIZE = 20;

// PDR §18 — límite de Likes. La ventana real de producción es 24h; se deja
// en 1 minuto TEMPORALMENTE para pruebas (debe coincidir con el intervalo
// de la función `likes_used_last_24h` en Supabase — ver migración
// 20260914072120_temp_likes_window_1_minute.sql). Revertir ambos a 24h
// antes de producción.
export const LIKE_LIMIT = 3;
export const LIKE_WINDOW_MS = 60 * 1000;

export interface LikeLimitStatus {
  remaining: number;
  limit: number;
  /** Momento en que se libera el próximo Like, o null si aún quedan Likes. */
  resetAt: Date | null;
}

/**
 * Calcula cuántos Likes le quedan al usuario en la ventana actual y, si ya
 * no le quedan, cuándo se libera el siguiente. Se hace en cliente contra
 * `likes` directamente (RLS ya permite leer los propios) en vez de vía RPC,
 * para tener también el timestamp del Like más antiguo de la ventana y
 * poder calcular el countdown.
 */
export async function fetchLikeLimitStatus(userId: string): Promise<LikeLimitStatus> {
  const since = new Date(Date.now() - LIKE_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("likes")
    .select("created_at")
    .eq("from_profile", userId)
    .eq("is_like", true)
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as { created_at: string }[];
  const remaining = Math.max(0, LIKE_LIMIT - rows.length);
  const resetAt =
    remaining === 0 && rows[0] ? new Date(new Date(rows[0].created_at).getTime() + LIKE_WINDOW_MS) : null;

  return { remaining, limit: LIKE_LIMIT, resetAt };
}

/**
 * Trae un candidato para Discovery (PDR §04): excluye el propio perfil y
 * cualquier perfil que el usuario ya haya likeado/dislikeado (tabla
 * `likes`). No hay todavía relevancia profesional/orden inteligente (fuera
 * de alcance de esta primera pasada) — se trae un lote pequeño de
 * candidatos y se elige uno al azar en cliente, para no mostrar siempre el
 * mismo primer resultado del orden natural de la tabla.
 *
 * Devuelve null cuando no quedan candidatos.
 */
export async function fetchNextCandidate(userId: string): Promise<CandidateProfile | null> {
  const { data: swiped, error: swipedError } = await supabase
    .from("likes")
    .select("to_profile")
    .eq("from_profile", userId);
  if (swipedError) throw swipedError;

  const excludedIds = [
    userId,
    ...((swiped ?? []) as { to_profile: string }[]).map((s) => s.to_profile),
  ];

  const { data, error } = await supabase
    .from("profiles")
    .select(CANDIDATE_SELECT)
    .eq("onboarding_completed", true)
    .not("id", "in", `(${excludedIds.join(",")})`)
    .limit(CANDIDATE_POOL_SIZE);
  if (error) throw error;

  const rows = (data ?? []) as unknown as CandidateRow[];
  if (rows.length === 0) return null;

  return mapCandidateRow(rows[Math.floor(Math.random() * rows.length)]);
}

/** Trae el perfil completo de un candidato por id, para la vista de perfil completo. */
export async function fetchProfileById(id: string): Promise<CandidateProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(CANDIDATE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapCandidateRow(data as unknown as CandidateRow);
}

type SwipeInsertChain = {
  insert: (v: Record<string, unknown>[]) => PromiseLike<{ error: unknown }>;
};

/**
 * Guarda un Like o Dislike. NOTA: el límite de 3 Likes/24h (PDR §18,
 * función `likes_used_last_24h` ya existente en la base de datos) todavía
 * NO se aplica aquí — queda pendiente para una siguiente pasada, decisión
 * explícita para esta primera versión de la card conectada a Supabase.
 */
export async function sendSwipe(
  fromProfileId: string,
  toProfileId: string,
  isLike: boolean,
): Promise<void> {
  const { error } = await (supabase.from("likes") as unknown as SwipeInsertChain).insert([
    { from_profile: fromProfileId, to_profile: toProfileId, is_like: isLike },
  ]);
  if (error) throw error;
}
