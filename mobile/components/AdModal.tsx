import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, fontSize, radius, spacing } from "@/constants/theme";
import type { DueAd } from "@/lib/discovery";

/** Segundos que el usuario está obligado a ver el anuncio antes de poder cerrarlo. */
const AD_MIN_VIEW_SECONDS = 10;

interface AdModalProps {
  ad: DueAd | null;
  onClose: () => void;
}

/**
 * Interstitial mostrado cuando sendSwipe() (lib/discovery.ts) determina que
 * toca un anuncio — PDR panel admin §5-10, rotación por interacciones
 * (Like o Dislike) — supabase/migrations/20260906214949_ads_likes_rotation.sql.
 * Se dispara desde Home (app/(tabs)/index.tsx) y desde la vista de perfil
 * completo (app/profile/[id].tsx), los dos únicos sitios donde se swipea.
 *
 * Rediseño 15/09/2026 (pedido explícito): a pantalla completa (antes era
 * una tarjeta centrada con overlay) y con un temporizador obligatorio de
 * `AD_MIN_VIEW_SECONDS` — durante ese tiempo no hay ningún botón para
 * cerrar (ni el botón X, ni "Learn more", ni Android back), solo cuando
 * termina la cuenta regresiva aparece el botón para cerrar y pasar al
 * siguiente perfil.
 *
 * `media_type: "video"` se reproduce in-app con expo-video (controles
 * nativos ocultos mientras el temporizador corre, para no dar una forma
 * de saltarlo pausando/arrastrando la barra).
 */
export function AdModal({ ad, onClose }: AdModalProps) {
  // useVideoPlayer es un hook — se llama siempre, sin importar si el
  // anuncio actual es de imagen o si `ad` es null; con source null el
  // player queda inactivo y no consume nada.
  const videoSource = ad?.media_type === "video" ? ad.media_url : null;
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
  });

  const [secondsLeft, setSecondsLeft] = useState(AD_MIN_VIEW_SECONDS);

  useEffect(() => {
    if (videoSource) player.play();
  }, [videoSource, player]);

  // Cuenta regresiva: se reinicia cada vez que llega un anuncio nuevo
  // (cambia ad.id), no en cada re-render del componente.
  useEffect(() => {
    if (!ad) return;
    setSecondsLeft(AD_MIN_VIEW_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [ad?.id]);

  if (!ad) return null;

  const canClose = secondsLeft <= 0;

  function handleLearnMore() {
    if (ad!.link_url) Linking.openURL(ad!.link_url);
  }

  function handleRequestClose() {
    // Android back button: no hace nada mientras corre el temporizador.
    if (canClose) onClose();
  }

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={handleRequestClose}>
      <View style={styles.overlay}>
        {ad.media_type === "image" ? (
          <Image source={{ uri: ad.media_url }} style={styles.media} resizeMode="cover" />
        ) : (
          <VideoView
            style={styles.media}
            player={player}
            nativeControls={false}
            contentFit="cover"
          />
        )}

        <View style={styles.scrim} pointerEvents="none" />

        {!canClose ? (
          <View style={styles.countdownBadge}>
            <Text style={styles.countdownText}>{secondsLeft}</Text>
          </View>
        ) : (
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close ad"
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        )}

        <View style={styles.footer}>
          <Text style={styles.title} numberOfLines={2}>
            {ad.title}
          </Text>

          {canClose ? (
            <View style={styles.actions}>
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
          ) : (
            <Text style={styles.waitText}>Espera {secondsLeft}s para continuar</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000",
  },
  media: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  closeButton: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownBadge: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.lg,
    minWidth: 36,
    height: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  waitText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  learnMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  learnMorePressed: { opacity: 0.7 },
  learnMoreText: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    letterSpacing: 0.6,
    color: colors.textSecondary,
  },
  continueButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
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
