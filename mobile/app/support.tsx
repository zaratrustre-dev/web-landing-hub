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
        <Text style={styles.title}>Soporte</Text>
      </View>

      <Text style={styles.intro}>
        Estamos para ayudarte con el acceso, tu perfil, los reportes y cualquier duda sobre
        Connect-it.
      </Text>

      <Section heading="Escríbenos">
        <Text style={styles.paragraph}>Correo de soporte:</Text>
        <Pressable onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
          <Text style={styles.emailLink}>{SUPPORT_EMAIL}</Text>
        </Pressable>
        <Text style={styles.paragraph}>Respondemos en horario laboral.</Text>
      </Section>

      <Section heading="Reportar un perfil o una conversación">
        <Text style={styles.paragraph}>
          Desde la aplicación puedes reportar un perfil o un chat, y deshacer un Match. Si
          necesitas intervención urgente, indícanoslo en el asunto del correo.
        </Text>
      </Section>

      <Section heading="Problemas de acceso">
        <Text style={styles.paragraph}>
          El acceso funciona con Google. Si tu proveedor no responde, escríbenos indicando el
          correo con el que te registraste.
        </Text>
      </Section>

      <Section heading="Cuenta y datos">
        <Text style={styles.paragraph}>
          Puedes editar tu perfil o cerrar sesión desde Ajustes. La eliminación de cuenta es
          permanente y requiere confirmación.
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
