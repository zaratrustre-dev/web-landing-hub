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

// PDR §18 — límite de Likes. La ventana real de producción es 3 Likes/24h;
// se deja en 5 Likes/10 segundos TEMPORALMENTE para pruebas (debe coincidir
// con el intervalo de la función `likes_used_last_24h` en Supabase — ver
// migración 20260915100000_temp_likes_window_10_seconds.sql, que sustituye
// a la ventana anterior de 1 minuto). Revertir ambos a 3/24h antes de
// producción.
export const LIKE_LIMIT = 5;
export const LIKE_WINDOW_MS = 10 * 1000;

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

// ---------------------------------------------------------------------------
// Bandera en memoria (bug fix 14/09/2026): Home (app/(tabs)/index.tsx) usa
// useFocusEffect para refrescar al volver de la vista de perfil completo
// (app/profile/[id].tsx), pero antes de este fix eso pedía SIEMPRE un
// candidato nuevo — incluyendo cuando el usuario solo entraba a ver el
// perfil y pulsaba Atrás sin dar Like/Dislike. Como fetchNextCandidate()
// elige al azar de un pool de 20, el resultado se veía como "las cards
// van rotando solas". Esta bandera es la única forma en que la vista de
// perfil completo (que vive en otra pantalla, sin estado compartido) le
// avisa a Home que el candidato actual quedó obsoleto de verdad porque SÍ
// hubo un swipe — Home solo pide uno nuevo en ese caso, o en el montaje
// inicial.
// ---------------------------------------------------------------------------
let candidateStaleAfterDetailSwipe = false;

/** Llamar tras un sendSwipe() exitoso desde una pantalla que no es Home. */
export function markCandidateStale(): void {
  candidateStaleAfterDetailSwipe = true;
}

/** Home la consulta en cada focus; deja la bandera en false al leerla. */
export function consumeCandidateStale(): boolean {
  const wasStale = candidateStaleAfterDetailSwipe;
  candidateStaleAfterDetailSwipe = false;
  return wasStale;
}

// ---------------------------------------------------------------------------
// Anuncios (PDR panel admin §5-10, rotación por Likes —
// supabase/migrations/20260906214949_ads_likes_rotation.sql). El CRUD y los
// tipos "de verdad" viven en el panel admin (src/lib/admin.ts, `AdRow`);
// aquí solo se necesita lo mínimo para consumir la rotación desde el
// cliente móvil.
// ---------------------------------------------------------------------------
export interface DueAd {
  id: string;
  title: string;
  media_type: "image" | "video";
  media_url: string;
  link_url: string | null;
}

/**
 * Total de Likes (no Dislikes) que el usuario ha dado en toda su historia.
 * Es el contador que dispara los anuncios — distinto del contador de
 * fetchLikeLimitStatus(), que solo mira la ventana de 1 minuto/24h del
 * límite de Likes.
 */
async function fetchTotalLikesGiven(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("likes")
    .select("id", { count: "exact", head: true })
    .eq("from_profile", userId)
    .eq("is_like", true);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Le pregunta al servidor (función `get_due_sponsored_content`) si, con el nº total de
 * Likes dado, toca mostrar un anuncio ahora — y si toca, lo rota dentro de
 * su grupo de periodicidad. Devuelve null si no toca ninguno.
 */
async function fetchDueAd(likesCount: number): Promise<DueAd | null> {
  const { data, error } = await (supabase.rpc as RpcFn)("get_due_sponsored_content", { likes_count: likesCount });
  if (error) throw error;
  const row = data as DueAd | null;
  return row?.id ? row : null;
}

type RpcFn = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

/**
 * Guarda un Like o Dislike. Si fue un Like, de paso comprueba si toca
 * mostrar un anuncio (PDR panel admin §5-10) y lo devuelve — quien llame
 * a sendSwipe() decide cómo mostrarlo (ver AdModal). Un fallo al consultar
 * el anuncio nunca bloquea el guardado del swipe ni Discovery: se traga el
 * error y se comporta como si no tocara ninguno.
 *
 * NOTA: el límite de 3 Likes/24h (PDR §18, función `likes_used_last_24h`
 * ya existente en la base de datos) todavía NO se aplica aquí a nivel de
 * servidor — el límite de cliente en fetchLikeLimitStatus() es la única
 * barrera hoy. Pendiente si se quiere endurecer.
 */
export async function sendSwipe(
  fromProfileId: string,
  toProfileId: string,
  isLike: boolean,
): Promise<DueAd | null> {
  const { error } = await (supabase.from("likes") as unknown as SwipeInsertChain).insert([
    { from_profile: fromProfileId, to_profile: toProfileId, is_like: isLike },
  ]);
  if (error) throw error;

  if (!isLike) return null;
  try {
    const totalLikes = await fetchTotalLikesGiven(fromProfileId);
    return await fetchDueAd(totalLikes);
  } catch {
    return null;
  }
}
