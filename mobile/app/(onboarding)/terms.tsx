import { useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { Button } from "@/components/Button";
import { DevSignOutLink } from "@/components/DevSignOutLink";
import { Screen } from "@/components/Screen";
import { colors, fontSize, spacing } from "@/constants/theme";
import { acceptTerms } from "@/lib/profile";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";

export default function TermsScreen() {
  const { session, refreshProfile } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    if (!session) return;
    setAccepting(true);
    setError(null);
    try {
      await acceptTerms(session.user.id);
      await refreshProfile();
      router.replace("/");
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo continuar."));
    } finally {
      setAccepting(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Términos y Condiciones</Text>
      <Text style={styles.body}>
        Bienvenido a Connect-it. Al continuar, confirmas que has leído y aceptas nuestros
        Términos de Servicio y nuestra Política de Privacidad, que explican cómo tratamos tu
        información y las reglas de convivencia de la comunidad profesional de Connect-it.
        {"\n\n"}
        Connect-it es una plataforma de networking profesional. No está permitido su uso con
        fines ajenos al desarrollo profesional, ni contenido ofensivo, spam o suplantación de
        identidad.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Aceptar y continuar" loading={accepting} onPress={handleAccept} />
      <DevSignOutLink />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  body: { fontSize: fontSize.base, color: colors.textMuted, lineHeight: 24, marginBottom: spacing.xl },
  error: { color: colors.destructive, fontSize: fontSize.sm, marginBottom: spacing.md },
});
