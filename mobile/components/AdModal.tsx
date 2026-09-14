import { Ionicons } from "@expo/vector-icons";
import { Image, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, radius, spacing } from "@/constants/theme";
import type { DueAd } from "@/lib/discovery";

interface AdModalProps {
  ad: DueAd | null;
  onClose: () => void;
}

/**
 * Interstitial mostrado cuando sendSwipe() (lib/discovery.ts) determina que
 * toca un anuncio — PDR panel admin §5-10, rotación por Likes
 * (supabase/migrations/20260906214949_ads_likes_rotation.sql). Se dispara
 * desde Home (app/(tabs)/index.tsx) y desde la vista de perfil completo
 * (app/profile/[id].tsx), los dos únicos sitios donde se da Like.
 *
 * Solo `media_type: "image"` se renderiza dentro de la app. Los de tipo
 * "video" abren el enlace en el navegador/reproductor nativo como
 * fallback pragmático — el proyecto todavía no tiene `expo-video`/
 * `expo-av` instalado. Pendiente si se quiere reproducir vídeo in-app.
 */
export function AdModal({ ad, onClose }: AdModalProps) {
  if (!ad) return null;

  function handleMediaPress() {
    if (ad!.media_type === "video") {
      Linking.openURL(ad!.media_url);
      return;
    }
    if (ad!.link_url) Linking.openURL(ad!.link_url);
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close ad"
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>

          <Pressable
            onPress={handleMediaPress}
            disabled={ad.media_type === "image" && !ad.link_url}
            style={styles.mediaWrapper}
          >
            {ad.media_type === "image" ? (
              <Image source={{ uri: ad.media_url }} style={styles.media} resizeMode="cover" />
            ) : (
              <View style={[styles.media, styles.videoFallback]}>
                <Ionicons name="play-circle-outline" size={48} color={colors.textFaint} />
                <Text style={styles.videoFallbackText}>Tap to watch</Text>
              </View>
            )}
          </Pressable>

          <Text style={styles.title} numberOfLines={2}>
            {ad.title}
          </Text>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.continueButton, pressed && styles.continuePressed]}
            accessibilityRole="button"
          >
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: radius.xl,
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaWrapper: { width: "100%" },
  media: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.photoBackground,
  },
  videoFallback: { alignItems: "center", justifyContent: "center", gap: spacing.xs },
  videoFallbackText: { fontSize: fontSize.sm, color: colors.textFaint },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: "center",
  },
  continueButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignSelf: "stretch",
    alignItems: "center",
  },
  continuePressed: { opacity: 0.85 },
  continueText: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.primaryForeground,
  },
});
