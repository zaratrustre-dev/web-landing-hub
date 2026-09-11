import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "@/constants/theme";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
}

export function Screen({ children, scroll = true, padded = true }: ScreenProps) {
  const Container = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Container
        style={styles.flex}
        contentContainerStyle={padded ? styles.padded : undefined}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  padded: { padding: spacing.lg, flexGrow: 1 },
});
