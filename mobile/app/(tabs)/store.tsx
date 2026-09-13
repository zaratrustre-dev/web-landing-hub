import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { colors, fontSize, spacing } from "@/constants/theme";

// PDR §23/§38: Store/Unlimited Likes queda desactivado hasta que se pida
// explícitamente activar los pagos (skill connect-it-deployment).
export default function StoreScreen() {
  return (
    <Screen>
      <View style={styles.emptyState}>
        <Ionicons name="storefront-outline" size={48} color={colors.textFaint} />
        <Text style={styles.title}>Store isn&apos;t active yet</Text>
        <Text style={styles.body}>Premium plans will be enabled later on.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  title: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginTop: spacing.sm },
  body: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
});
