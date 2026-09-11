import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { colors, fontSize, spacing } from "@/constants/theme";

// Chat (individual + global) es la Fase 4-5, todavía no construida.
export default function ChatScreen() {
  return (
    <Screen>
      <View style={styles.emptyState}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.textFaint} />
        <Text style={styles.title}>Chat llega pronto</Text>
        <Text style={styles.body}>
          Aquí verás tus conversaciones con tus Matches y el chat global de la comunidad.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  title: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  body: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
});
