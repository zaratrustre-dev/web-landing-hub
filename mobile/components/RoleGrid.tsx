import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontSize, radius, spacing } from "@/constants/theme";
import { PROFESSIONAL_ROLES, ROLE_ICONS, ROLE_LABELS, type ProfessionalRole } from "@/constants/roles";

interface RoleGridProps {
  selected: ProfessionalRole | null;
  onSelect: (role: ProfessionalRole) => void;
}

/** Cuadrícula de los 9 roles profesionales — reutilizada para Role y Role Sought. */
export function RoleGrid({ selected, onSelect }: RoleGridProps) {
  return (
    <View style={styles.grid}>
      {PROFESSIONAL_ROLES.map((role) => {
        const isSelected = selected === role;
        return (
          <Pressable
            key={role}
            onPress={() => onSelect(role)}
            style={[styles.card, isSelected && styles.cardSelected]}
          >
            <Ionicons
              name={ROLE_ICONS[role] as any}
              size={24}
              color={isSelected ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {ROLE_LABELS[role]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const CARD_WIDTH = "31%";

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: spacing.sm },
  card: {
    width: CARD_WIDTH,
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
  label: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: "center" },
  labelSelected: { color: colors.text, fontWeight: "600" },
});
