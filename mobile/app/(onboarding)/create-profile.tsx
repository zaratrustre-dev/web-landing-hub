import { useEffect, useState } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { SkillPicker } from "@/components/SkillPicker";
import { StepHeader } from "@/components/StepHeader";
import { TextField } from "@/components/TextField";
import { colors, fontSize, radius, spacing } from "@/constants/theme";
import {
  fetchSkillsCatalog,
  replaceMySkills,
  saveProfileDetails,
  uploadProfilePhoto,
  type SkillOption,
} from "@/lib/profile";
import { getErrorMessage } from "@/lib/errors";
import { getDeviceCountryName } from "@/constants/countries";
import { useAuth } from "@/providers/AuthProvider";

const MAX_PROFESSION = 20;
const MAX_DESCRIPTION = 200;

/**
 * Calcula la edad a partir de día/mes/año, validando que sea una fecha
 * real (rechaza rollovers como 30 de febrero). Devuelve null si la fecha
 * no es válida o está incompleta.
 */
function computeAge(day: number, month: number, year: number): number | null {
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  if (date > new Date()) return null;
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}

export default function CreateProfileScreen() {
  const { session, refreshProfile } = useAuth();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [profession, setProfession] = useState("");
  const [description, setDescription] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [skillCatalog, setSkillCatalog] = useState<SkillOption[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const ageNumber = computeAge(Number(birthDay), Number(birthMonth), Number(birthYear));
  const canContinue =
    !!photoUri &&
    name.trim().length > 0 &&
    ageNumber !== null &&
    ageNumber >= 18 &&
    ageNumber <= 120 &&
    profession.trim().length > 0 &&
    profession.length <= MAX_PROFESSION &&
    selectedSkillIds.length > 0;

  async function handleContinue() {
    if (!session || !photoUri || !canContinue || ageNumber === null) return;
    setSaving(true);
    setError(null);
    try {
      const photoUrl = await uploadProfilePhoto(session.user.id, photoUri);
      await saveProfileDetails(session.user.id, {
        name: name.trim(),
        country: getDeviceCountryName(),
        age: ageNumber,
        profession: profession.trim(),
        description: description.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
        photoUrl,
      });
      await replaceMySkills(session.user.id, selectedSkillIds);
      await refreshProfile();
      router.replace("/");
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't save your profile."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <StepHeader
        step={4}
        totalSteps={5}
        title="Create your profile"
        subtitle="Name and date of birth can't be changed after this step."
        onBack={() => router.replace("/(onboarding)/role-sought")}
      />

      <Pressable onPress={pickPhoto} style={styles.photoPicker}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <Text style={styles.photoPlaceholder}>Add photo</Text>
        )}
      </Pressable>

      <TextField label="Name" value={name} onChangeText={setName} placeholder="Your name" />

      <Text style={styles.dobLabel}>Date of birth</Text>
      <View style={styles.dobRow}>
        <View style={styles.dobDay}>
          <TextField
            label="Day"
            value={birthDay}
            onChangeText={(t) => setBirthDay(t.replace(/\D/g, "").slice(0, 2))}
            placeholder="DD"
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={styles.dobMonth}>
          <TextField
            label="Month"
            value={birthMonth}
            onChangeText={(t) => setBirthMonth(t.replace(/\D/g, "").slice(0, 2))}
            placeholder="MM"
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={styles.dobYear}>
          <TextField
            label="Year"
            value={birthYear}
            onChangeText={(t) => setBirthYear(t.replace(/\D/g, "").slice(0, 4))}
            placeholder="YYYY"
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
      </View>
      {birthDay && birthMonth && birthYear && ageNumber === null ? (
        <Text style={styles.dobError}>That date doesn&apos;t look right.</Text>
      ) : null}
      {ageNumber !== null && (ageNumber < 18 || ageNumber > 120) ? (
        <Text style={styles.dobError}>You must be between 18 and 120 years old.</Text>
      ) : null}

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
      <Button
        title="Finish and continue"
        loading={saving}
        disabled={!canContinue}
        onPress={handleContinue}
        style={styles.button}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  dobLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  dobRow: { flexDirection: "row", gap: spacing.sm },
  dobDay: { flex: 1 },
  dobMonth: { flex: 1 },
  dobYear: { flex: 1.4 },
  dobError: { color: colors.destructive, fontSize: fontSize.xs, marginTop: -spacing.sm, marginBottom: spacing.md },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  button: { marginTop: spacing.xl, width: "80%", alignSelf: "center" },
  error: { color: colors.destructive, fontSize: fontSize.sm, marginTop: spacing.md },
});
