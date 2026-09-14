import { useCallback, useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Alert, Image, Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { ReportProfileModal } from "@/components/ReportProfileModal";
import { Screen } from "@/components/Screen";
import { colors, fontFamily, fontSize, radius, spacing } from "@/constants/theme";
import { getPublicProfileUrl } from "@/constants/urls";
import {
  fetchLikeLimitStatus,
  fetchProfileById,
  sendSwipe,
  type CandidateProfile,
} from "@/lib/discovery";
import { reportProfile } from "@/lib/moderation";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Vista de perfil completo de Discovery (PDR §04), abierta al tocar la
 * ProfileCard desde Home. Permite Like/Dislike (mismo `sendSwipe` que la
 * card, respetando el límite de Likes de PDR §18), compartir el enlace
 * público del perfil y reportarlo (connect-it-moderation, tabla `reports`).
 */
export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile: myProfile } = useAuth();

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [likesExhausted, setLikesExhausted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchProfileById(id)
      .then(setCandidate)
      .catch(() => setError("Couldn't load this profile."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!myProfile?.id) return;
    fetchLikeLimitStatus(myProfile.id)
      .then((status) => setLikesExhausted(status.remaining === 0))
      .catch(() => setLikesExhausted(false));
  }, [myProfile?.id]);

  const handleSwipe = useCallback(
    async (isLike: boolean) => {
      if (!myProfile?.id || !candidate || swiping || (isLike && likesExhausted)) return;
      setSwiping(true);
      try {
        await sendSwipe(myProfile.id, candidate.id, isLike);
        router.back();
      } catch {
        setError("Couldn't save that. Try again.");
        setSwiping(false);
      }
    },
    [myProfile, candidate, swiping, likesExhausted],
  );

  const handleShare = useCallback(async () => {
    if (!candidate) return;
    try {
      await Share.share({
        message: `Check out ${candidate.name ?? "this profile"} on Connect-it: ${getPublicProfileUrl(candidate.id)}`,
        url: getPublicProfileUrl(candidate.id),
      });
    } catch {
      // Usuario canceló el share sheet — no es un error a mostrar.
    }
  }, [candidate]);

  const handleReportSubmit = useCallback(
    async (reason: string) => {
      if (!myProfile?.id || !candidate) return;
      setReporting(true);
      try {
        await reportProfile(myProfile.id, candidate.id, reason);
        setReportModalVisible(false);
        Alert.alert("Report submitted", "Thanks for letting us know. Our team will review this profile.");
      } catch {
        Alert.alert("Something went wrong", "Couldn't submit the report. Please try again.");
      } finally {
        setReporting(false);
      }
    },
    [myProfile, candidate],
  );

  return (
    <>
      <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !candidate ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error ?? "This profile is no longer available."}</Text>
        </View>
      ) : (
        <>
          {candidate.photoUrl ? (
            <Image source={{ uri: candidate.photoUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Ionicons name="person" size={72} color={colors.textFaint} />
            </View>
          )}

          <View style={styles.content}>
            <Text style={styles.name}>
              {[candidate.name, candidate.age ? String(candidate.age) : null].filter(Boolean).join(", ")}
            </Text>

            <View style={styles.metaRow}>
              {candidate.profession ? <Text style={styles.profession}>{candidate.profession}</Text> : null}
              {candidate.profession && candidate.portfolioUrl ? <View style={styles.dot} /> : null}
              {candidate.portfolioUrl ? (
                <Pressable
                  onPress={() => Linking.openURL(candidate.portfolioUrl!)}
                  style={styles.portfolioLink}
                  hitSlop={8}
                >
                  <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.portfolioLinkText}>VIEW PORTFOLIO</Text>
                </Pressable>
              ) : null}
            </View>

            {candidate.description ? <Text style={styles.description}>{candidate.description}</Text> : null}

            <View style={styles.actionsRow}>
              <View style={styles.actionsGroup}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Dislike"
                  onPress={() => handleSwipe(false)}
                  disabled={swiping}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.dislikeButton,
                    (pressed || swiping) && styles.actionPressed,
                  ]}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Like"
                  onPress={() => handleSwipe(true)}
                  disabled={swiping || likesExhausted}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.likeButton,
                    (pressed || swiping || likesExhausted) && styles.actionPressed,
                  ]}
                >
                  <Ionicons name="heart" size={22} color={colors.primaryForeground} />
                </Pressable>
              </View>

              <View style={styles.actionsGroup}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share profile"
                  onPress={handleShare}
                  style={({ pressed }) => [styles.actionButton, styles.shareButton, pressed && styles.actionPressed]}
                >
                  <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
                </Pressable>
                {/* Tabla `reports` ya existe (connect-it-moderation) — insert vía lib/moderation.ts */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Report profile"
                  onPress={() => setReportModalVisible(true)}
                  style={({ pressed }) => [styles.actionButton, styles.outlineButton, pressed && styles.actionPressed]}
                >
                  <Ionicons name="flag-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {candidate.skills.length > 0 ? (
              <View style={styles.skillsSection}>
                <Text style={styles.skillsHeading}>CORE SKILLS</Text>
                <View style={styles.skillsList}>
                  {candidate.skills.map((skill) => (
                    <View key={skill} style={styles.skillRow}>
                      <Text style={styles.skillText}>{skill.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </>
      )}
      </Screen>
      <ReportProfileModal
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        onSubmit={handleReportSubmit}
        submitting={reporting}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  emptyText: { color: colors.textMuted, fontSize: fontSize.base, textAlign: "center" },
  photo: { width: "100%", aspectRatio: 1, backgroundColor: colors.photoBackground, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.cardBackground },
  name: { fontFamily: fontFamily.heading, fontSize: fontSize.xxl, color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexWrap: "wrap" },
  profession: { fontSize: fontSize.lg, fontWeight: "600", color: colors.primary },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#474746" },
  portfolioLink: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  portfolioLinkText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  description: { fontSize: fontSize.base, lineHeight: 24, color: colors.textSecondary },
  actionsRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.sm },
  actionsGroup: { flexDirection: "row", gap: spacing.sm },
  actionButton: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  dislikeButton: { borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  likeButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
  },
  shareButton: { backgroundColor: colors.photoBackground },
  outlineButton: { borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  actionPressed: { opacity: 0.75 },
  error: { fontSize: fontSize.sm, color: colors.destructive, textAlign: "center" },
  skillsSection: { gap: spacing.sm, paddingTop: spacing.sm },
  skillsHeading: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  skillsList: { gap: spacing.sm },
  skillRow: {
    height: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  skillText: { fontFamily: fontFamily.mono, fontSize: fontSize.xs, fontWeight: "600", letterSpacing: 1.2, color: colors.text },
});
