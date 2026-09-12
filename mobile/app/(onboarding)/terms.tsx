import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Screen } from "@/components/Screen";
import { colors, fontSize, spacing } from "@/constants/theme";
import { acceptTerms } from "@/lib/profile";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";

export default function TermsScreen() {
  const { session, refreshProfile } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [radarEnabled, setRadarEnabled] = useState(false);

  async function handleAccept() {
    if (!session) return;
    setAccepting(true);
    setError(null);
    try {
      await acceptTerms(session.user.id, { marketingConsent, radarEnabled });
      await refreshProfile();
      router.replace("/");
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setAccepting(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Terms and Conditions</Text>
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
        description="I agree to be visible/discoverable for job opportunities. Optional, you can change this later in settings."
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Accept and continue" loading={accepting} onPress={handleAccept} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  body: { fontSize: fontSize.base, color: colors.textMuted, lineHeight: 24, marginBottom: spacing.xl },
  error: { color: colors.destructive, fontSize: fontSize.sm, marginBottom: spacing.md },
});
