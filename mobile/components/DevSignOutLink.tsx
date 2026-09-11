import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fontSize, spacing } from "@/constants/theme";
import { signOut } from "@/lib/auth";

export function DevSignOutLink() {
  const [signingOut, setSigningOut] = useState(false);

  async function handlePress() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Pressable onPress={handlePress} disabled={signingOut} style={styles.container} hitSlop={8}>
      <Text style={styles.text}>{signingOut ? "Cerrando sesión…" : "Cerrar sesión (test)"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: "center", marginTop: spacing.lg },
  text: { fontSize: fontSize.xs, color: colors.textFaint, textDecorationLine: "underline" },
});
