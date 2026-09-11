import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, fontSize, radius, spacing } from "@/constants/theme";

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
}

export function Checkbox({ checked, onToggle, label, description }: CheckboxProps) {
  return (
    <Pressable onPress={onToggle} style={styles.row}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Ionicons name="checkmark" size={14} color={colors.background} /> : null}
      </View>
      <View style={styles.textColumn}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm ?? 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  textColumn: { flex: 1 },
  label: { color: colors.text, fontSize: fontSize.sm, fontWeight: "600" },
  description: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
});
