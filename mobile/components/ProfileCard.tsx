import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, radius, spacing } from "@/constants/theme";
import type { CandidateProfile } from "@/lib/discovery";

interface ProfileCardProps {
  candidate: CandidateProfile;
  onLike: () => void;
  onDislike: () => void;
  /** Abre la vista de perfil completo. Si se omite, la card no es pulsable. */
  onOpenProfile?: () => void;
  /** Deshabilita ambos botones mientras se guarda el swipe anterior. */
  disabled?: boolean;
  /** PDR §18: deshabilita solo Like cuando se agotó el límite. */
  likeDisabled?: boolean;
}

// PDR §04 / skill connect-it-profile-card: profesión máx. 20 caracteres.
// Truncado defensivo además del `numberOfLines` visual, por si el texto
// llega ya sin espacios donde el ellipsis del SO no cortaría a tiempo.
const MAX_PROFESSION_LENGTH = 20;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function ProfileCard({
  candidate,
  onLike,
  onDislike,
  onOpenProfile,
  disabled,
  likeDisabled,
}: ProfileCardProps) {
  const nameAge = [candidate.name, candidate.age ? String(candidate.age) : null]
    .filter(Boolean)
    .join(", ");
  const profession = candidate.profession ? truncate(candidate.profession, MAX_PROFESSION_LENGTH) : null;
  // Update (14/09/2026): la card muestra solo la skill principal (la
  // primera), completa — antes mostraba hasta 3 con numberOfLines={1} +
  // ellipsis, así que una skill larga se veía cortada y ninguna de las
  // otras aportaba mucho en el espacio de una card. El resto de skills ya
  // se ve completo en la vista de perfil (app/profile/[id].tsx, sección
  // "CORE SKILLS"), que no cambia con este fix.
  const primarySkill = candidate.skills[0] ?? null;

  return (
    <Pressable
      style={styles.card}
      onPress={onOpenProfile}
      disabled={!onOpenProfile}
      accessibilityRole={onOpenProfile ? "button" : undefined}
    >
      {candidate.photoUrl ? (
        <Image source={{ uri: candidate.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.photoPlaceholder]}>
          <Ionicons name="person" size={64} color={colors.textFaint} />
        </View>
      )}

      <LinearGradient
        colors={["transparent", "rgba(27,28,28,0.9)", colors.cardBackground]}
        locations={[0, 0.45, 1]}
        style={styles.gradient}
      />

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
          {nameAge || "—"}
        </Text>
        {profession ? (
          <Text style={styles.profession} numberOfLines={1} ellipsizeMode="tail">
            {profession}
          </Text>
        ) : null}

        {primarySkill ? (
          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <Text
                style={styles.chipText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {primarySkill.toUpperCase()}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actionsRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dislike"
            onPress={onDislike}
            disabled={disabled}
            style={({ pressed }) => [
              styles.actionButton,
              styles.dislikeButton,
              (pressed || disabled) && styles.actionPressed,
            ]}
          >
            <Ionicons name="close" size={26} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Like"
            onPress={onLike}
            disabled={disabled || likeDisabled}
            style={({ pressed }) => [
              styles.actionButton,
              styles.likeButton,
              (pressed || disabled || likeDisabled) && styles.actionPressed,
            ]}
          >
            <Ionicons name="heart" size={22} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 480,
    borderRadius: radius.xl,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: "hidden",
  },
  photoPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  gradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "62%" },
  content: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  name: { fontFamily: fontFamily.heading, fontSize: fontSize.xxl, color: colors.text },
  profession: { fontFamily: fontFamily.body, fontSize: fontSize.base, color: colors.textSecondary },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    maxWidth: "100%",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,107,44,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,107,44,0.30)",
  },
  chipText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: colors.primary,
  },
  actionsRow: { flexDirection: "row", gap: spacing.md },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  dislikeButton: {
    backgroundColor: colors.cardButtonBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  likeButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  actionPressed: { opacity: 0.75 },
});
