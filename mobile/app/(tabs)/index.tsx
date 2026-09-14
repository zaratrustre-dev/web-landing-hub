import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ProfileCard } from "@/components/ProfileCard";
import { Screen } from "@/components/Screen";
import { colors, fontSize, spacing } from "@/constants/theme";
import {
  fetchLikeLimitStatus,
  fetchNextCandidate,
  sendSwipe,
  type CandidateProfile,
  type LikeLimitStatus,
} from "@/lib/discovery";
import { useAuth } from "@/providers/AuthProvider";

// Discovery (PDR §04): Home muestra un candidato real a la vez, con Like/
// Dislike guardados en `likes`, límite de 3 Likes (PDR §18, ventana
// TEMPORAL de 1 minuto para pruebas — ver lib/discovery.ts) con countdown,
// y navegación al perfil completo.
export default function HomeScreen() {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [likeStatus, setLikeStatus] = useState<LikeLimitStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCandidate = useCallback(async (id: string) => {
    setError(null);
    try {
      const next = await fetchNextCandidate(id);
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
  // de la vista de perfil completo (donde el usuario puede haber likeado/
  // dislikeado, dejando el candidato o el contador de Likes obsoletos).
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      setLoading(true);
      Promise.all([loadCandidate(userId), loadLikeStatus(userId)]).finally(() => setLoading(false));
    }, [userId, loadCandidate, loadLikeStatus]),
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
        await sendSwipe(userId, candidate.id, isLike);
        await loadCandidate(userId);
        if (isLike) await loadLikeStatus(userId);
      } catch {
        setError("Couldn't save that. Try again.");
      } finally {
        setSwiping(false);
      }
    },
    [userId, candidate, swiping, loadCandidate, loadLikeStatus],
  );

  const likesExhausted = likeStatus?.remaining === 0;
  const countdownSeconds =
    likeStatus?.resetAt ? Math.max(0, Math.ceil((likeStatus.resetAt.getTime() - now) / 1000)) : 0;

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {profile?.name?.split(" ")[0] ?? ""} 👋</Text>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.lg, gap: spacing.xs },
  greeting: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text },
  likeStatus: { fontSize: fontSize.sm, color: colors.textMuted },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  emptyBody: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
  error: { fontSize: fontSize.sm, color: colors.destructive, textAlign: "center", marginTop: spacing.sm },
});
