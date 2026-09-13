import type { ReactNode } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { colors, fontSize, radius, spacing } from "@/constants/theme";

const SUPPORT_EMAIL = "support@connect-it.app";

/**
 * Soporte estático (Ajustes). Mismo contenido y correo que la página web
 * /soporte del monorepo (src/routes/soporte.tsx), adaptado a móvil.
 */
export default function SupportScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Support</Text>
      </View>

      <Text style={styles.intro}>
        We&apos;re here to help with access, your profile, reports, or any other question about
        Connect-it.
      </Text>

      <Section heading="Contact us">
        <Text style={styles.paragraph}>Support email:</Text>
        <Pressable onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
          <Text style={styles.emailLink}>{SUPPORT_EMAIL}</Text>
        </Pressable>
        <Text style={styles.paragraph}>We reply during business hours.</Text>
      </Section>

      <Section heading="Report a profile or conversation">
        <Text style={styles.paragraph}>
          You can report a profile or a chat, and undo a Match, from within the app. If you
          need urgent intervention, let us know in the subject of your email.
        </Text>
      </Section>

      <Section heading="Access issues">
        <Text style={styles.paragraph}>
          Sign-in works with Google. If your provider isn&apos;t responding, email us with the
          address you registered with.
        </Text>
      </Section>

      <Section heading="Account and data">
        <Text style={styles.paragraph}>
          You can edit your profile or log out from Settings. Account deletion is permanent
          and requires confirmation.
        </Text>
      </Section>
    </Screen>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {children}
    </View>
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
  intro: { fontSize: fontSize.base, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.xl },
  section: { marginBottom: spacing.lg },
  sectionHeading: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paragraph: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.xs },
  emailLink: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
    textDecorationLine: "underline",
    marginBottom: spacing.xs,
  },
});
