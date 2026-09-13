import { supabase } from "./supabase";

export interface CandidateProfile {
  id: string;
  name: string | null;
  age: number | null;
  photoUrl: string | null;
  profession: string | null;
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
  profile_skills: { skills: { name: string } | null }[] | null;
};

const CANDIDATE_POOL_SIZE = 20;

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
    .select("id, name, age, photo_url, profession, profile_skills(skills(name))")
    .eq("onboarding_completed", true)
    .not("id", "in", `(${excludedIds.join(",")})`)
    .limit(CANDIDATE_POOL_SIZE);
  if (error) throw error;

  const rows = (data ?? []) as unknown as CandidateRow[];
  if (rows.length === 0) return null;

  const chosen = rows[Math.floor(Math.random() * rows.length)];
  return {
    id: chosen.id,
    name: chosen.name,
    age: chosen.age,
    photoUrl: chosen.photo_url,
    profession: chosen.profession,
    skills: (chosen.profile_skills ?? [])
      .map((ps) => ps.skills?.name)
      .filter((n): n is string => Boolean(n)),
  };
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
