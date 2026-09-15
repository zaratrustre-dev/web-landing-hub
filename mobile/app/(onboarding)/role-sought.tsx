import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Button } from "@/components/Button";
import { RoleGrid } from "@/components/RoleGrid";
import { Screen } from "@/components/Screen";
import { StepHeader } from "@/components/StepHeader";
import { colors, fontSize, spacing } from "@/constants/theme";
import type { ProfessionalRole } from "@/constants/roles";
import { updateRoleSought } from "@/lib/profile";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";

export default function RoleSoughtScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [selected, setSelected] = useState<ProfessionalRole | null>(profile?.role_sought ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!session || !selected) return;
    setSaving(true);
    setError(null);
    try {
      await updateRoleSought(session.user.id, selected);
      await refreshProfile();
      router.replace("/");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <StepHeader
        step={4}
        totalSteps={6}
        title="Who are you looking for?"
        subtitle="Choose the category of professionals you're most interested in connecting with."
        onBack={() => router.replace("/(onboarding)/role")}
      />
      <RoleGrid selected={selected} onSelect={setSelected} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title="Continue"
        loading={saving}
        disabled={!selected}
        onPress={handleContinue}
        style={styles.button}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: spacing.xl, width: "80%", alignSelf: "center" },
  error: { color: colors.destructive, fontSize: fontSize.sm, marginTop: spacing.md },
});
