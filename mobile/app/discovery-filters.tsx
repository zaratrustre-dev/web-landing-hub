import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { COUNTRY_NAMES } from "@/constants/countries";
import { colors, fontFamily, fontSize, radius, spacing } from "@/constants/theme";
import { EMPTY_DISCOVERY_FILTERS, type DiscoveryFilters } from "@/lib/discovery";
import { fetchSkillsCatalog, type SkillOption } from "@/lib/profile";
import { useDiscoveryFilters } from "@/providers/DiscoveryFiltersProvider";

// Category (PDR §17): la pantalla de Figma solo diseña chips para 5 de los
// 9 valores del enum professional_role — los otros 4 (lender, logistics,
// recruiter, influencer) no tienen tratamiento visual todavía, así que se
// dejan fuera de esta pantalla hasta que haya un diseño para ellos.
const CATEGORIES: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "developer", label: "Developers", icon: "code-slash" },
  { value: "designer", label: "Designers", icon: "color-palette" },
  { value: "entrepreneur", label: "Entrepreneurs", icon: "rocket" },
  { value: "marketing", label: "Marketing", icon: "megaphone" },
  { value: "consultant", label: "Consultant", icon: "briefcase" },
];

/**
 * Search Filters (PDR §17, Figma "Connect-it Search Filters"): Category,
 * Skill y Country, combinables entre sí, más buscador de texto libre. Lee
 * y escribe sobre DiscoveryFiltersProvider — el "Apply Filters" de aquí es
 * lo único que confirma el cambio; Home no ve nada hasta ese punto.
 */
export default function DiscoveryFiltersScreen() {
  const { filters: appliedFilters, setFilters } = useDiscoveryFilters();

  const [draft, setDraft] = useState<DiscoveryFilters>(appliedFilters);
  const [skillQuery, setSkillQuery] = useState("");
  const [skillCatalog, setSkillCatalog] = useState<SkillOption[]>([]);
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");

  useEffect(() => {
    fetchSkillsCatalog().then(setSkillCatalog).catch(() => setSkillCatalog([]));
  }, []);

  const skillSuggestions = useMemo(() => {
    const q = skillQuery.trim().toLowerCase();
    if (!q) return [];
    return skillCatalog
      .filter((s) => s.name.toLowerCase().includes(q) && !draft.skills.includes(s.name))
      .slice(0, 6);
  }, [skillQuery, skillCatalog, draft.skills]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRY_NAMES;
    return COUNTRY_NAMES.filter((c) => c.toLowerCase().includes(q));
  }, [countryQuery]);

  function toggleCategory(value: string) {
    setDraft((d) => ({ ...d, role: d.role === value ? null : value }));
  }

  function addSkill(name: string) {
    setDraft((d) => (d.skills.includes(name) ? d : { ...d, skills: [...d.skills, name] }));
    setSkillQuery("");
  }

  function removeSkill(name: string) {
    setDraft((d) => ({ ...d, skills: d.skills.filter((s) => s !== name) }));
  }

  function applyFilters() {
    setFilters(draft);
    router.back();
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Search Filters</Text>
        <Pressable onPress={() => setDraft(EMPTY_DISCOVERY_FILTERS)} hitSlop={8}>
          <Text style={styles.resetLabel}>RESET</Text>
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="Search professionals..."
          placeholderTextColor={colors.textFaint}
          value={draft.search}
          onChangeText={(text) => setDraft((d) => ({ ...d, search: text }))}
          style={styles.searchInput}
        />
      </View>

      <Text style={styles.sectionLabel}>CATEGORY</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => {
          const active = draft.role === cat.value;
          return (
            <Pressable
              key={cat.value}
              onPress={() => toggleCategory(cat.value)}
              style={[styles.categoryPill, active && styles.categoryPillActive]}
            >
              <Ionicons name={cat.icon} size={15} color={active ? colors.primary : colors.textMuted} />
              <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{cat.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>HABILITIES & SKILLS</Text>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="Search skills (e.g. React, UI/UX)"
          placeholderTextColor={colors.textFaint}
          value={skillQuery}
          onChangeText={setSkillQuery}
          style={styles.searchInput}
        />
      </View>
      {skillSuggestions.length > 0 ? (
        <View style={styles.suggestionsBox}>
          {skillSuggestions.map((s) => (
            <Pressable key={s.id} onPress={() => addSkill(s.name)} style={styles.suggestionRow}>
              <Text style={styles.suggestionText}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {draft.skills.length > 0 ? (
        <View style={styles.skillChipsWrap}>
          {draft.skills.map((name) => (
            <View key={name} style={styles.skillChip}>
              <Text style={styles.skillChipText}>{name}</Text>
              <Pressable onPress={() => removeSkill(name)} hitSlop={8}>
                <Ionicons name="close" size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionLabel}>COUNTRY</Text>
      <Pressable onPress={() => setCountryModalOpen(true)} style={styles.countrySelect}>
        <Text style={draft.country ? styles.countryValue : styles.countryPlaceholder}>
          {draft.country ?? "Select Country"}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </Pressable>

      <View style={styles.applyWrap}>
        <Button title="Apply Filters" onPress={applyFilters} icon={<Ionicons name="checkmark" size={16} color={colors.primaryForeground} />} />
      </View>

      <Modal visible={countryModalOpen} animationType="slide" onRequestClose={() => setCountryModalOpen(false)}>
        <Screen scroll={false}>
          <View style={styles.header}>
            <Pressable onPress={() => setCountryModalOpen(false)} style={styles.backButton} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>Country</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              placeholder="Search country..."
              placeholderTextColor={colors.textFaint}
              value={countryQuery}
              onChangeText={setCountryQuery}
              style={styles.searchInput}
              autoFocus
            />
          </View>
          {draft.country ? (
            <Pressable
              onPress={() => {
                setDraft((d) => ({ ...d, country: null }));
                setCountryModalOpen(false);
              }}
              style={styles.countryRow}
            >
              <Text style={styles.clearCountryText}>Clear country filter</Text>
            </Pressable>
          ) : null}
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setDraft((d) => ({ ...d, country: item }));
                  setCountryModalOpen(false);
                  setCountryQuery("");
                }}
                style={styles.countryRow}
              >
                <Text style={styles.countryRowText}>{item}</Text>
                {draft.country === item ? (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                ) : null}
              </Pressable>
            )}
          />
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  backButton: { padding: spacing.xs },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.textMuted },
  resetLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.mono,
    fontWeight: "600",
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  searchBar: {
    position: "relative",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  searchIcon: { position: "absolute", left: spacing.md, zIndex: 1 },
  searchInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingLeft: spacing.xl + spacing.md,
    paddingRight: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontFamily.mono,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xl },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: { borderColor: colors.primary },
  categoryText: { fontSize: fontSize.base, color: colors.text },
  categoryTextActive: { color: colors.primary },
  suggestionsBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: -spacing.md,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  suggestionRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  suggestionText: { fontSize: fontSize.base, color: colors.text },
  skillChipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xl },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skillChipText: { fontSize: fontSize.base, color: colors.text },
  countrySelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  countryValue: { fontSize: fontSize.base, color: colors.text },
  countryPlaceholder: { fontSize: fontSize.base, color: colors.text },
  applyWrap: { marginTop: spacing.xxl, marginBottom: spacing.lg },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  countryRowText: { fontSize: fontSize.base, color: colors.text },
  clearCountryText: { fontSize: fontSize.base, color: colors.primary },
});
