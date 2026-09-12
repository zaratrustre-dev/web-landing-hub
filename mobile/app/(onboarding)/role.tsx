import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Button } from "@/components/Button";
import { RoleGrid } from "@/components/RoleGrid";
import { Screen } from "@/components/Screen";
import { StepHeader } from "@/components/StepHeader";
import { colors, fontSize, spacing } from "@/constants/theme";
import type { ProfessionalRole } from "@/constants/roles";
import { updateRole } from "@/lib/profile";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";

export default function RoleScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [selected, setSelected] = useState<ProfessionalRole | null>(profile?.role ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!session || !selected) return;
    setSaving(true);
    setError(null);
    try {
      await updateRole(session.user.id, selected);
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
        step={2}
        totalSteps={5}
        title="What's your role?"
        subtitle="Choose the category that best represents you."
        onBack={() => router.replace("/(onboarding)/terms")}
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
  button: { marginTop: spacing.xl },
  error: { color: colors.destructive, fontSize: fontSize.sm, marginTop: spacing.md },
});
