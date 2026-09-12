import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { colors, fontSize, radius, spacing } from "@/constants/theme";
import { deleteMyAccount } from "@/lib/account";
import { getErrorMessage } from "@/lib/errors";
import { signOut } from "@/lib/auth";

const CONFIRM_WORD = "ELIMINAR";

/**
 * Ajustes → Eliminar cuenta. Borrado permanente e irreversible: exige
 * escribir "ELIMINAR" para habilitar el botón (mismo patrón que otras
 * apps para evitar toques accidentales en una acción destructiva).
 */
export default function DeleteAccountScreen() {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  async function handleDelete() {
    if (!canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteMyAccount();
      await signOut();
      router.replace("/(auth)/welcome");
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo eliminar la cuenta. Inténtalo de nuevo."));
      setDeleting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Eliminar cuenta</Text>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>Esta acción es permanente</Text>
        <Text style={styles.warningText}>
          Se eliminará tu perfil, tus Matches, tus conversaciones y tus Likes. No podrás
          recuperarlos ni volver a acceder con esta cuenta.
        </Text>
      </View>

      <Text style={styles.label}>
        Escribe <Text style={styles.labelWord}>{CONFIRM_WORD}</Text> para confirmar
      </Text>
      <TextField
        label="Confirmación"
        value={confirmText}
        onChangeText={setConfirmText}
        placeholder={CONFIRM_WORD}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title="Eliminar cuenta definitivamente"
        loading={deleting}
        disabled={!canDelete}
        onPress={handleDelete}
        style={styles.deleteButton}
        textStyle={styles.deleteButtonText}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text },
  warningBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.destructive,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  warningTitle: { fontSize: fontSize.base, fontWeight: "700", color: colors.destructive, marginBottom: spacing.xs },
  warningText: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  label: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.sm },
  labelWord: { fontWeight: "700", color: colors.text },
  error: { color: colors.destructive, fontSize: fontSize.sm, marginTop: spacing.md },
  deleteButton: {
    marginTop: spacing.xl,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  deleteButtonText: { color: colors.destructive },
});
