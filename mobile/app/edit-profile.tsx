import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { SkillPicker } from "@/components/SkillPicker";
import { TextField } from "@/components/TextField";
import { colors, fontSize, radius, spacing } from "@/constants/theme";
import {
  fetchSkillsCatalog,
  replaceMySkills,
  updateProfileDetails,
  uploadProfilePhoto,
  type SkillOption,
} from "@/lib/profile";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/providers/AuthProvider";

const MAX_PROFESSION = 20;
const MAX_DESCRIPTION = 200;

export default function EditProfileScreen() {
  const { session, profile, refreshProfile } = useAuth();
  const [photoUri, setPhotoUri] = useState<string | null>(profile?.photo_url ?? null);
  const [profession, setProfession] = useState(profile?.profession ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(profile?.portfolio_url ?? "");
  const [skillCatalog, setSkillCatalog] = useState<SkillOption[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(profile?.skill_ids ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSkillsCatalog().then(setSkillCatalog).catch(() => setSkillCatalog([]));
  }, []);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("We need access to your photos to choose a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  const canSave =
    !!photoUri &&
    profession.trim().length > 0 &&
    profession.length <= MAX_PROFESSION &&
    selectedSkillIds.length > 0;

  async function handleSave() {
    if (!session || !photoUri || !canSave) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const photoUrl = photoUri.startsWith("http")
        ? photoUri
        : await uploadProfilePhoto(session.user.id, photoUri);
      await updateProfileDetails(session.user.id, {
        profession: profession.trim(),
        description: description.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        photoUrl,
      });
      await replaceMySkills(session.user.id, selectedSkillIds);
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save your profile."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Edit profile</Text>
      </View>

      <Pressable onPress={pickPhoto} style={styles.photoPicker}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <Text style={styles.photoPlaceholder}>Add photo</Text>
        )}
      </Pressable>

      <View style={styles.readOnlyRow}>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyLabel}>Name</Text>
          <Text style={styles.readOnlyValue}>{profile?.name}</Text>
        </View>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyLabel}>Age</Text>
          <Text style={styles.readOnlyValue}>{profile?.age}</Text>
        </View>
      </View>
      <Text style={styles.readOnlyNote}>
        Name and age can&apos;t be changed after registration.
      </Text>

      <TextField
        label="Profession"
        value={profession}
        onChangeText={(t) => setProfession(t.slice(0, MAX_PROFESSION))}
        placeholder="e.g. Product Designer"
        counter={`${profession.length}/${MAX_PROFESSION}`}
      />
      <TextField
        label="Description (optional)"
        value={description}
        onChangeText={(t) => setDescription(t.slice(0, MAX_DESCRIPTION))}
        placeholder="Briefly describe what you do"
        counter={`${description.length}/${MAX_DESCRIPTION}`}
        multiline
        numberOfLines={3}
      />
      <TextField
        label="Portfolio / CV / LinkedIn (optional)"
        value={portfolioUrl}
        onChangeText={setPortfolioUrl}
        placeholder="https://…"
        autoCapitalize="none"
      />

      <Text style={styles.sectionLabel}>Skills</Text>
      <SkillPicker
        catalog={skillCatalog}
        selectedIds={selectedSkillIds}
        onChange={setSelectedSkillIds}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.saved}>Changes saved.</Text> : null}
      <Button
        title="Save changes"
        loading={saving}
        disabled={!canSave}
        onPress={handleSave}
        style={styles.button}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.text },
  photoPicker: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" },
  photoPlaceholder: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: "center" },
  readOnlyRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xs },
  readOnlyField: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  readOnlyLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  readOnlyValue: { fontSize: fontSize.base, color: colors.textMuted },
  readOnlyNote: { fontSize: fontSize.xs, color: colors.textFaint, marginBottom: spacing.md },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  button: { marginTop: spacing.xl },
  error: { color: colors.destructive, fontSize: fontSize.sm, marginTop: spacing.md },
  saved: { color: colors.primary, fontSize: fontSize.sm, marginTop: spacing.md },
});
