import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ProfileCard } from "@/components/ProfileCard";
import { Screen } from "@/components/Screen";
import { colors, fontSize, spacing } from "@/constants/theme";
import { fetchNextCandidate, sendSwipe, type CandidateProfile } from "@/lib/discovery";
import { useAuth } from "@/providers/AuthProvider";

// Discovery (PDR §04): Home muestra un candidato real a la vez, con Like/
// Dislike guardados en `likes`. El límite de 3 Likes/24h (PDR §18) y la
// vista de perfil completo quedan fuera de esta primera pasada — a
// propósito, para no bloquear el punto de llegada de la card en sí.
export default function HomeScreen() {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
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

  // useFocusEffect cubre tanto la carga inicial como el refresh al volver
  // de la vista de perfil completo (donde el usuario puede haber likeado/
  // dislikeado, dejando el candidato en memoria obsoleto).
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      setLoading(true);
      loadCandidate(userId).finally(() => setLoading(false));
    }, [userId, loadCandidate]),
  );

  const handleSwipe = useCallback(
    async (isLike: boolean) => {
      if (!userId || !candidate || swiping) return;
      setSwiping(true);
      try {
        await sendSwipe(userId, candidate.id, isLike);
        await loadCandidate(userId);
      } catch {
        setError("Couldn't save that. Try again.");
      } finally {
        setSwiping(false);
      }
    },
    [userId, candidate, swiping, loadCandidate],
  );

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {profile?.name?.split(" ")[0] ?? ""} 👋</Text>
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, marginBottom: spacing.lg },
  greeting: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  emptyBody: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
  error: { fontSize: fontSize.sm, color: colors.destructive, textAlign: "center", marginTop: spacing.sm },
});
