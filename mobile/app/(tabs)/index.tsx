import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { colors, fontSize, spacing } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";

// Discovery/swipe es la Fase 2 (todavía no construida). Por ahora, Home
// muestra el estado vacío + saludo, para cerrar la Fase 1 (Auth +
// onboarding + perfil) con un punto de llegada real y coherente.
export default function HomeScreen() {
  const { profile } = useAuth();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hola, {profile?.name?.split(" ")[0] ?? ""} 👋</Text>
      </View>
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={48} color={colors.textFaint} />
        <Text style={styles.emptyTitle}>Discovery llega pronto</Text>
        <Text style={styles.emptyBody}>
          Tu perfil ya está listo. La búsqueda de profesionales (Discovery) se activará en la
          próxima fase.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: spacing.xl },
  greeting: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  emptyBody: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
});
