import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Button } from "@/components/Button";
import { DevSignOutLink } from "@/components/DevSignOutLink";
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
      setError(getErrorMessage(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <StepHeader
        step={3}
        totalSteps={5}
        title="¿A quién buscas?"
        subtitle="Elige la categoría de profesionales que más te interesa conectar."
        onBack={() => router.replace("/(onboarding)/role")}
      />
      <RoleGrid selected={selected} onSelect={setSelected} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title="Continuar"
        loading={saving}
        disabled={!selected}
        onPress={handleContinue}
        style={styles.button}
      />
      <DevSignOutLink />
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: spacing.xl },
  error: { color: colors.destructive, fontSize: fontSize.sm, marginTop: spacing.md },
});
