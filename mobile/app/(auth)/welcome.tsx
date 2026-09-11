import { useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { colors, fontFamily, fontSize, spacing } from "@/constants/theme";
import { useGoogleSignIn } from "@/lib/auth";
import { useAuth } from "@/providers/AuthProvider";

export default function WelcomeScreen() {
  const { promptAsync, ready, signingIn, error } = useGoogleSignIn();
  const { session } = useAuth();

  useEffect(() => {
    if (session) router.replace("/");
  }, [session]);

  return (
    <Screen scroll={false}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoGlyph}>⚡</Text>
          </View>
          <Text style={styles.title}>Connect-it</Text>
          <Text style={styles.subtitle}>High-performance network diagnostics.</Text>
        </View>

        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            title="Continue with Google"
            loading={signingIn}
            disabled={!ready}
            onPress={() => promptAsync()}
            style={styles.googleButton}
            textStyle={styles.googleButtonText}
          />
          <Button
            title="Continue with Apple"
            disabled
            onPress={() => {}}
            style={styles.appleButton}
            textStyle={styles.appleButtonText}
            icon={<Ionicons name="logo-apple" size={18} color={colors.text} />}
          />
          <Text style={styles.legal}>
            By continuing, you agree to Connect-it&apos;s{" "}
            <Text style={styles.legalLink}>Terms of Service</Text> and{" "}
            <Text style={styles.legalLink}>Privacy Policy</Text>.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: "space-between" },
  hero: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  logoGlyph: { fontSize: 36, color: colors.primary },
  title: {
    fontFamily: fontFamily.heading,
    fontSize: fontSize.display,
    color: colors.text,
    letterSpacing: -2.4,
  },
  subtitle: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.lg,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  footer: { gap: spacing.md, paddingBottom: spacing.lg },
  googleButton: { backgroundColor: colors.googleButtonBg },
  googleButtonText: {
    color: colors.googleButtonText,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    letterSpacing: 1.2,
  },
  appleButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appleButtonText: {
    color: colors.text,
    fontFamily: fontFamily.mono,
    fontSize: fontSize.xs,
    letterSpacing: 1.2,
  },
  legal: {
    fontFamily: fontFamily.body,
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: "center",
  },
  legalLink: { color: colors.text, textDecorationLine: "underline" },
  error: { color: colors.destructive, fontSize: fontSize.sm, textAlign: "center" },
});
