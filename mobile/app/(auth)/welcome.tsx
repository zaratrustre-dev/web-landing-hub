import { useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

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
            <Svg width={36} height={32} viewBox="0 0 36 32" fill="none">
              <Path
                d="M30 22V18H34C34.5667 18 35.0417 18.1917 35.425 18.575C35.8083 18.9583 36 19.4333 36 20C36 20.5667 35.8083 21.0417 35.425 21.425C35.0417 21.8083 34.5667 22 34 22H30ZM30 30V26H34C34.5667 26 35.0417 26.1917 35.425 26.575C35.8083 26.9583 36 27.4333 36 28C36 28.5667 35.8083 29.0417 35.425 29.425C35.0417 29.8083 34.5667 30 34 30H30ZM22 32C20.9 32 19.9583 31.6083 19.175 30.825C18.3917 30.0417 18 29.1 18 28H14V20H18C18 18.9 18.3917 17.9583 19.175 17.175C19.9583 16.3917 20.9 16 22 16H28V32H22ZM8 26C5.8 26 3.91667 25.2167 2.35 23.65C0.783333 22.0833 0 20.2 0 18C0 15.8 0.783333 13.9167 2.35 12.35C3.91667 10.7833 5.8 10 8 10H11C11.8333 10 12.5417 9.70833 13.125 9.125C13.7083 8.54167 14 7.83333 14 7C14 6.16667 13.7083 5.45833 13.125 4.875C12.5417 4.29167 11.8333 4 11 4H4C3.43333 4 2.95833 3.80833 2.575 3.425C2.19167 3.04167 2 2.56667 2 2C2 1.43333 2.19167 0.958333 2.575 0.575C2.95833 0.191667 3.43333 0 4 0H11C12.9333 0 14.5833 0.683333 15.95 2.05C17.3167 3.41667 18 5.06667 18 7C18 8.93333 17.3167 10.5833 15.95 11.95C14.5833 13.3167 12.9333 14 11 14H8C6.9 14 5.95833 14.3917 5.175 15.175C4.39167 15.9583 4 16.9 4 18C4 19.1 4.39167 20.0417 5.175 20.825C5.95833 21.6083 6.9 22 8 22H12V26H8Z"
                fill={colors.primary}
              />
            </Svg>
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
            icon={<View style={styles.googleIconCircle}><Text style={styles.googleIconG}>G</Text></View>}
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
  googleButton: { backgroundColor: colors.googleButtonBg, width: "80%", alignSelf: "center" },
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
    width: "80%",
    alignSelf: "center",
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
  googleIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconG: {
    color: "#ffffff",
    fontFamily: fontFamily.mono,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
});


