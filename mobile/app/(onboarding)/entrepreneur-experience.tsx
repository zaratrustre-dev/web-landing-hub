import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StepHeader } from "@/components/StepHeader";
import { APPRENTICE_ROLE } from "@/constants/roles";
import { colors, fontSize, spacing } from "@/constants/theme";
import { updateRole } from "@/lib/profile";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Nueva pantalla de onboarding (entre Terms y Role): filtra si el usuario
 * pasa por la selección normal de Role o si su categoría se fija
 * automáticamente en "Apprentice".
 * - "Yes" -> pantalla de Role de siempre (elige entre las 9 categorías).
 * - "No"  -> se guarda role = "apprentice" y se salta directo a Role Sought,
 *   sin pasar por la pantalla de Role.
 */
export default function EntrepreneurExperienceScreen() {
  const { session, refreshProfile } = useAuth();
  const [saving, setSaving] = useState<"yes" | "no" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleNo() {
    if (!session) return;
    setSaving("no");
    setError(null);
    try {
      await updateRole(session.user.id, APPRENTICE_ROLE);
      await refreshProfile();
      router.replace("/(onboarding)/role-sought");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save."));
      setSaving(null);
    }
  }

  function handleYes() {
    router.replace("/(onboarding)/role");
  }

  return (
    <Screen>
      <StepHeader
        step={2}
        totalSteps={6}
        title="Do you have experience as an entrepreneur?"
        subtitle="This helps us place you in the right category."
        onBack={() => router.replace("/(onboarding)/terms")}
      />
      <View style={styles.options}>
        <Button
          title="Yes"
          onPress={handleYes}
          disabled={saving !== null}
          style={styles.button}
        />
        <Button
          title="No"
          variant="outline"
          loading={saving === "no"}
          disabled={saving !== null}
          onPress={handleNo}
          style={styles.button}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  options: { gap: spacing.md, marginTop: spacing.xl },
  button: { width: "80%", alignSelf: "center" },
  error: { color: colors.destructive, fontSize: fontSize.sm, marginTop: spacing.md, textAlign: "center" },
});
