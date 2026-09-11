import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors, fontSize, radius, spacing } from "@/constants/theme";
import type { SkillOption } from "@/lib/profile";

const MAX_SKILLS = 3;

interface SkillPickerProps {
  catalog: SkillOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/** Selector de hasta 3 skills (PDR §10, regla inmutable), con búsqueda simple. */
export function SkillPicker({ catalog, selectedIds, onChange }: SkillPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? catalog.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
    : catalog;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
      return;
    }
    if (selectedIds.length >= MAX_SKILLS) return;
    onChange([...selectedIds, id]);
  }

  return (
    <View>
      <TextInput
        placeholder="Buscar skills…"
        placeholderTextColor={colors.textFaint}
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />
      <Text style={styles.helper}>
        {selectedIds.length}/{MAX_SKILLS} seleccionadas
      </Text>
      <View style={styles.chipsWrap}>
        {filtered.slice(0, 30).map((skill) => {
          const isSelected = selectedIds.includes(skill.id);
          const isDisabled = !isSelected && selectedIds.length >= MAX_SKILLS;
          return (
            <Pressable
              key={skill.id}
              disabled={isDisabled}
              onPress={() => toggle(skill.id)}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                isDisabled && styles.chipDisabled,
              ]}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {skill.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: fontSize.base,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  helper: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontSize: fontSize.sm, color: colors.textMuted },
  chipTextSelected: { color: colors.primaryForeground, fontWeight: "600" },
});
