import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, fontSize, radius, spacing } from "@/constants/theme";
import { REPORT_REASONS } from "@/lib/moderation";

interface ReportProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void | Promise<void>;
  submitting?: boolean;
}

export function ReportProfileModal({ visible, onClose, onSubmit, submitting }: ReportProfileModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");

  const isOther = selected === "Other";
  const canSubmit = Boolean(selected) && (!isOther || customText.trim().length > 0) && !submitting;

  function handleClose() {
    setSelected(null);
    setCustomText("");
    onClose();
  }

  function handleSubmit() {
    if (!canSubmit || !selected) return;
    onSubmit(isOther ? customText.trim() : selected);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Report this profile</Text>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>Let us know what&apos;s wrong. Our team will review it.</Text>

        <View style={styles.options}>
          {REPORT_REASONS.map((reason) => {
            const active = selected === reason;
            return (
              <Pressable
                key={reason}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setSelected(reason)}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{reason}</Text>
                {active ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>

        {isOther ? (
          <TextInput
            style={styles.input}
            placeholder="Describe the issue…"
            placeholderTextColor={colors.textFaint}
            multiline
            maxLength={500}
            value={customText}
            onChangeText={setCustomText}
          />
        ) : null}

        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={styles.submitText}>Submit report</Text>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted },
  options: { gap: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  optionActive: { borderColor: colors.primary },
  optionText: { fontSize: fontSize.base, color: colors.textSecondary },
  optionTextActive: { color: colors.text },
  input: {
    minHeight: 80,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: colors.cardBackground,
    color: colors.text,
    padding: spacing.md,
    fontSize: fontSize.base,
    textAlignVertical: "top",
  },
  submitButton: {
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitText: { fontSize: fontSize.base, fontWeight: "700", color: colors.primaryForeground },
});
