import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { AdModal } from "@/components/AdModal";
import { ProfileCard } from "@/components/ProfileCard";
import { Screen } from "@/components/Screen";
import { colors, fontSize, spacing } from "@/constants/theme";
import {
  consumeCandidateStale,
  fetchLikeLimitStatus,
  fetchNextCandidate,
  hasActiveFilters,
  sendSwipe,
  type CandidateProfile,
  type DiscoveryFilters,
  type DueAd,
  type LikeLimitStatus,
} from "@/lib/discovery";
import { useAuth } from "@/providers/AuthProvider";
import { useDiscoveryFilters } from "@/providers/DiscoveryFiltersProvider";

// Discovery (PDR §04): Home muestra un candidato real a la vez, con Like/
// Dislike guardados en `likes`, límite de 3 Likes (PDR §18, ventana
// TEMPORAL de 1 minuto para pruebas — ver lib/discovery.ts) con countdown,
// y navegación al perfil completo.
export default function HomeScreen() {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const { filters, resetFilters } = useDiscoveryFilters();

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [likeStatus, setLikeStatus] = useState<LikeLimitStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dueAd, setDueAd] = useState<DueAd | null>(null);

  // Ref (no state) a propósito: se lee dentro del callback de
  // useFocusEffect sin que su identidad cambie en cada render — si
  // `candidate` estuviera en las deps de ese useCallback, el efecto se
  // volvería a disparar cada vez que cambia el candidato, no solo al
  // ganar foco.
  const candidateRef = useRef<CandidateProfile | null>(null);
  useEffect(() => {
    candidateRef.current = candidate;
  }, [candidate]);

  // Ref con la misma lógica que candidateRef: guarda los filtros aplicados
  // la última vez que se cargó un candidato, para que useFocusEffect pueda
  // detectar "los filtros cambiaron desde la Search Filters screen" sin
  // tenerlos en sus deps (eso dispararía el efecto en cada tecleo si algún
  // día los filtros vivieran en este mismo componente).
  const appliedFiltersKeyRef = useRef<string>(JSON.stringify(filters));

  const loadCandidate = useCallback(async (currentFilters: DiscoveryFilters) => {
    setError(null);
    try {
      const next = await fetchNextCandidate(currentFilters);
      setCandidate(next);
    } catch {
      setError("Couldn't load a profile right now. Try again in a moment.");
    }
  }, []);

  const loadLikeStatus = useCallback(async (id: string) => {
    try {
      setLikeStatus(await fetchLikeLimitStatus(id));
    } catch {
      // Si esto falla no bloqueamos Discovery — el límite simplemente no se aplica esa vez.
    }
  }, []);

  // useFocusEffect cubre tanto la carga inicial como el refresh al volver
  // de la vista de perfil completo. Bug fix (14/09/2026): antes esto pedía
  // SIEMPRE un candidato nuevo al ganar foco, así que entrar al perfil y
  // pulsar Atrás sin dar Like/Dislike igual mostraba una card distinta
  // (fetchNextCandidate elige al azar). Ahora solo se pide un candidato
  // nuevo si todavía no hay uno cargado (montaje inicial / se quedó sin
  // candidatos) o si de verdad hubo un swipe en la vista de perfil
  // completo (consumeCandidateStale() — ver lib/discovery.ts). El
  // contador de Likes sí se refresca siempre, porque eso puede haber
  // cambiado aunque el candidato no.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      const filtersKey = JSON.stringify(filters);
      const filtersChanged = filtersKey !== appliedFiltersKeyRef.current;
      const needsNewCandidate = !candidateRef.current || consumeCandidateStale() || filtersChanged;
      appliedFiltersKeyRef.current = filtersKey;
      setLoading(needsNewCandidate);
      const tasks: Promise<unknown>[] = [loadLikeStatus(userId)];
      if (needsNewCandidate) tasks.push(loadCandidate(filters));
      Promise.all(tasks).finally(() => setLoading(false));
    }, [userId, filters, loadCandidate, loadLikeStatus]),
  );

  // Countdown del límite de Likes: solo corre un timer mientras hay un
  // resetAt pendiente, y al llegar a 0 se refresca el estado real.
  useEffect(() => {
    if (!likeStatus?.resetAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [likeStatus?.resetAt]);

  useEffect(() => {
    if (!userId || !likeStatus?.resetAt || now < likeStatus.resetAt.getTime()) return;
    fetchLikeLimitStatus(userId)
      .then(setLikeStatus)
      .catch(() => {
        // Si falla, se reintenta en el próximo tick del countdown.
      });
  }, [now, userId, likeStatus?.resetAt]);

  const handleSwipe = useCallback(
    async (isLike: boolean) => {
      if (!userId || !candidate || swiping) return;
      setSwiping(true);
      try {
        const ad = await sendSwipe(userId, candidate.id, isLike);
        await loadCandidate(filters);
        if (isLike) await loadLikeStatus(userId);
        if (ad) setDueAd(ad);
      } catch {
        setError("Couldn't save that. Try again.");
      } finally {
        setSwiping(false);
      }
    },
    [userId, candidate, swiping, filters, loadCandidate, loadLikeStatus],
  );

  const likesExhausted = likeStatus?.remaining === 0;
  const countdownSeconds =
    likeStatus?.resetAt ? Math.max(0, Math.ceil((likeStatus.resetAt.getTime() - now) / 1000)) : 0;

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>Hi, {profile?.name?.split(" ")[0] ?? ""} 👋</Text>
          <Pressable
            onPress={() => router.push("/discovery-filters")}
            hitSlop={8}
            style={styles.filterButton}
          >
            <Ionicons name="options-outline" size={22} color={colors.text} />
            {hasActiveFilters(filters) ? <View style={styles.filterActiveDot} /> : null}
          </Pressable>
        </View>
        {likeStatus ? (
          <Text style={styles.likeStatus}>
            {likesExhausted
              ? `No likes left — resets in ${countdownSeconds}s`
              : `${likeStatus.remaining}/${likeStatus.limit} likes left`}
          </Text>
        ) : null}
      </View>

      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : candidate ? (
          <ProfileCard
            candidate={candidate}
            onLike={() => handleSwipe(true)}
            onDislike={() => handleSwipe(false)}
            onOpenProfile={() => router.push(`/profile/${candidate.id}`)}
            disabled={swiping}
            likeDisabled={likesExhausted}
          />
        ) : hasActiveFilters(filters) ? (
          // Figma "Connect-it: Feed Vacío (Sin Perfiles)" (PDR §37): estado
          // vacío específico para cuando el vacío lo causan los filtros,
          // con CTA para quitarlos — distinto del vacío genérico de abajo.
          <View style={styles.emptyState}>
            <Ionicons name="filter-outline" size={48} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>No profiles match your filters</Text>
            <Text style={styles.emptyBody}>
              Widen your professional categories to discover more people in your field.
            </Text>
            <Pressable onPress={resetFilters} style={styles.resetFiltersButton} hitSlop={8}>
              <Text style={styles.resetFiltersText}>Reset filters</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
            <Text style={styles.emptyBody}>
              No new professionals to show right now. Check back later.
            </Text>
          </View>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <AdModal ad={dueAd} onClose={() => setDueAd(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.lg, gap: spacing.xs },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text },
  filterButton: { padding: spacing.xs, position: "relative" },
  filterActiveDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  likeStatus: { fontSize: fontSize.sm, color: colors.textMuted },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  emptyBody: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
  resetFiltersButton: { marginTop: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  resetFiltersText: { fontSize: fontSize.base, fontWeight: "600", color: colors.primary },
  error: { fontSize: fontSize.sm, color: colors.destructive, textAlign: "center", marginTop: spacing.sm },
});
