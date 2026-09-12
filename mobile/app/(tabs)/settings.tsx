import { useState } from "react";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { colors, fontSize, radius, spacing } from "@/constants/theme";
import { ROLE_LABELS } from "@/constants/roles";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/providers/AuthProvider";

// PDR §24: Edit Profile, Terms, Support, Share, Delete Account, Log Out.
// Edit Profile y Log Out ya están funcionales; el resto son fases futuras.
export default function SettingsScreen() {
  const { profile } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/(auth)/welcome");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen>
      <View style={styles.profileCard}>
        {profile?.photo_url ? (
          <Image source={{ uri: profile.photo_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
        <View>
          <Text style={styles.name}>{profile?.name}</Text>
          <Text style={styles.meta}>
            {profile?.role ? ROLE_LABELS[profile.role] : ""}
            {profile?.profession ? ` · ${profile.profession}` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.menu}>
        <MenuRow label="Editar perfil" onPress={() => router.push("/edit-profile")} />
        <MenuRow label="Términos y Condiciones" onPress={() => router.push("/view-terms")} />
        <MenuRow label="Soporte" disabled />
        <MenuRow label="Compartir cuenta" disabled />
        <MenuRow label="Eliminar cuenta" disabled destructive />
      </View>

      <Button title="Cerrar sesión" variant="outline" loading={signingOut} onPress={handleSignOut} />
    </Screen>
  );
}

function MenuRow({
  label,
  disabled,
  destructive,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  destructive?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled || !onPress}
      style={[styles.menuRow, disabled && styles.menuRowDisabled]}
    >
      <Text style={[styles.menuLabel, destructive && styles.menuLabelDestructive]}>{label}</Text>
      {disabled && <Text style={styles.soon}>Próximamente</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  avatar: { width: 64, height: 64, borderRadius: radius.full },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
  },
  name: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textMuted },
  menu: { marginBottom: spacing.xl, gap: spacing.xs },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  menuRowDisabled: { opacity: 0.6 },
  menuLabel: { fontSize: fontSize.base, color: colors.text },
  menuLabelDestructive: { color: colors.destructive },
  soon: { fontSize: fontSize.xs, color: colors.textFaint },
});
