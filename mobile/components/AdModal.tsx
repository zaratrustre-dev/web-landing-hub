import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
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
 * `media_type: "video"` se reproduce in-app con expo-video (14/09/2026 —
 * antes abría el enlace en el navegador como fallback porque el proyecto
 * no tenía ninguna librería de vídeo instalada). `link_url` (si existe) se
 * ofrece como botón "Learn more" debajo del título en vez de envolver el
 * media en un Pressable, para no pelear con los controles nativos del
 * reproductor de vídeo.
 */
export function AdModal({ ad, onClose }: AdModalProps) {
  // useVideoPlayer es un hook — se llama siempre, sin importar si el
  // anuncio actual es de imagen o si `ad` es null; con source null el
  // player queda inactivo y no consume nada.
  const videoSource = ad?.media_type === "video" ? ad.media_url : null;
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (videoSource) player.play();
  }, [videoSource, player]);

  if (!ad) return null;

  function handleLearnMore() {
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

          {ad.media_type === "image" ? (
            <Image source={{ uri: ad.media_url }} style={styles.media} resizeMode="cover" />
          ) : (
            <VideoView style={styles.media} player={player} nativeControls contentFit="cover" />
          )}

          <Text style={styles.title} numberOfLines={2}>
            {ad.title}
          </Text>

          {ad.link_url ? (
            <Pressable
              onPress={handleLearnMore}
              style={({ pressed }) => [styles.learnMoreButton, pressed && styles.learnMorePressed]}
              accessibilityRole="button"
            >
              <Text style={styles.learnMoreText}>Learn more</Text>
              <Ionicons name="open-outline" size={16} color={colors.textSecondary} />
            </Pressable>
          ) : null}

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
  media: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.photoBackground,
  },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: "center",
  },
  learnMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  learnMorePressed: { opacity: 0.7 },
  learnMoreText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    color: colors.textSecondary,
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
