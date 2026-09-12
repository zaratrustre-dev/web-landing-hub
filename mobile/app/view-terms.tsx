import { useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Screen } from "@/components/Screen";
import { colors, fontSize, radius, spacing } from "@/constants/theme";
import { updateConsent } from "@/lib/profile";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Vista de Términos y Condiciones desde Ajustes. A diferencia de
 * app/(onboarding)/terms(_en).tsx, aquí el usuario YA aceptó los términos
 * — esta pantalla solo permite releer el texto y cambiar Marketing
 * consent / Radar (ambos editables en cualquier momento, tal como dice el
 * propio texto de Terms). No usa `acceptTerms()` ni toca
 * `terms_accepted_at`.
 */
export default function ViewTermsScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [marketingConsent, setMarketingConsent] = useState(profile?.marketing_consent ?? false);
  const [radarEnabled, setRadarEnabled] = useState(profile?.radar_enabled ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isDirty =
    marketingConsent !== (profile?.marketing_consent ?? false) ||
    radarEnabled !== (profile?.radar_enabled ?? false);

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateConsent(session.user.id, { marketingConsent, radarEnabled });
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Terms and Conditions</Text>
      </View>

      <Text style={styles.body}>
        Welcome to Connect-it. By continuing, you confirm that you have read and agree to our
        Terms of Service and Privacy Policy, which explain how we handle your information and
        the community guidelines of Connect-it&apos;s professional network.
        {"\n\n"}
        Connect-it is a professional networking platform. It may not be used for purposes
        unrelated to professional development, nor for offensive content, spam, or
        impersonation.
      </Text>

      <Checkbox
        checked={marketingConsent}
        onToggle={() => setMarketingConsent((v) => !v)}
        label="Marketing communications"
        description="I want to receive news, offers, and marketing communications from Connect-it. Optional, does not affect registration."
      />
      <Checkbox
        checked={radarEnabled}
        onToggle={() => setRadarEnabled((v) => !v)}
        label="Enable Radar"
        description="I agree to be visible/discoverable for job opportunities. Optional, you can change this anytime."
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.saved}>Preferences saved.</Text> : null}
      <Button
        title="Save changes"
        loading={saving}
        disabled={!isDirty}
        onPress={handleSave}
        style={styles.button}
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
  body: { fontSize: fontSize.base, color: colors.textMuted, lineHeight: 24, marginBottom: spacing.xl },
  error: { color: colors.destructive, fontSize: fontSize.sm, marginTop: spacing.md },
  saved: { color: colors.primary, fontSize: fontSize.sm, marginTop: spacing.md },
  button: { marginTop: spacing.xl },
});
