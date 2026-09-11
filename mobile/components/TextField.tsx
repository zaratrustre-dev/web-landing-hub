import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, fontSize, radius, spacing } from "@/constants/theme";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  counter?: string;
}

export function TextField({ label, error, counter, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {counter && <Text style={styles.counter}>{counter}</Text>}
      </View>
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  counter: { fontSize: fontSize.xs, color: colors.textFaint },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: fontSize.base,
    color: colors.text,
  },
  inputError: { borderColor: colors.destructive },
  error: { color: colors.destructive, fontSize: fontSize.xs, marginTop: spacing.xs },
});
