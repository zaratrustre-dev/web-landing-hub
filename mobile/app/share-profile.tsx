import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { Image, Pressable, Share, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { colors, fontSize, radius, spacing } from "@/constants/theme";
import { getPublicProfileUrl } from "@/constants/urls";
import { fetchSkillsCatalog, type SkillOption } from "@/lib/profile";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Ajustes → Compartir cuenta. Genera el enlace público de solo lectura
 * (foto + nombre + profesión + skills — ver
 * supabase get_public_profile()), lo muestra como QR y ofrece el share
 * sheet nativo. No expone edad, descripción, portfolio ni ningún otro
 * campo privado: eso lo garantiza la función RPC en el servidor, no esta
 * pantalla.
 */
export default function ShareProfileScreen() {
  const { session, profile } = useAuth();
  const [skillNames, setSkillNames] = useState<string[]>([]);

  useEffect(() => {
    if (!profile?.skill_ids?.length) return;
    fetchSkillsCatalog()
      .then((catalog: SkillOption[]) => {
        const byId = new Map(catalog.map((s) => [s.id, s.name]));
        setSkillNames(profile.skill_ids.map((id) => byId.get(id)).filter(Boolean) as string[]);
      })
      .catch(() => setSkillNames([]));
  }, [profile?.skill_ids]);

  if (!session) return null;
  const publicUrl = getPublicProfileUrl(session.user.id);

  async function handleShare() {
    try {
      await Share.share({
        message: `Mira mi perfil en Connect-it: ${publicUrl}`,
        url: publicUrl,
      });
    } catch {
      // El usuario canceló el share sheet — no es un error a mostrar.
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Compartir cuenta</Text>
      </View>

      <Text style={styles.intro}>
        Cualquiera con este enlace verá tu foto, nombre, profesión y skills — nada más. No
        muestra tu edad, descripción ni portfolio.
      </Text>

      <View style={styles.card}>
        {profile?.photo_url ? (
          <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <Text style={styles.name}>{profile?.name}</Text>
        {profile?.profession ? <Text style={styles.profession}>{profile.profession}</Text> : null}
        {skillNames.length > 0 ? (
          <View style={styles.chipsWrap}>
            {skillNames.map((name) => (
              <View key={name} style={styles.chip}>
                <Text style={styles.chipText}>{name}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.qrWrap}>
        <QRCode value={publicUrl} size={180} color={colors.text} backgroundColor={colors.surface} />
      </View>
      <Text style={styles.url}>{publicUrl}</Text>

      <Button title="Compartir" onPress={handleShare} style={styles.button} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text },
  intro: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  avatar: { width: 88, height: 88, borderRadius: radius.full, marginBottom: spacing.sm },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.sm,
  },
  name: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
  profession: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
  },
  chipText: { fontSize: fontSize.xs, color: colors.textMuted },
  qrWrap: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  url: {
    fontSize: fontSize.xs,
    color: colors.textFaint,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  button: { marginTop: spacing.sm },
});
