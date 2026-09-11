import { useEffect, useState } from "react";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, StyleSheet, Text } from "react-native";

import { Button } from "@/components/Button";
import { DevSignOutLink } from "@/components/DevSignOutLink";
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
import { useAuth } from "@/providers/AuthProvider";

const MAX_PROFESSION = 20;
const MAX_DESCRIPTION = 200;

export default function CreateProfileScreen() {
  const { session, refreshProfile } = useAuth();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
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
      setError("Necesitamos acceso a tus fotos para elegir una foto de perfil.");
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

  const ageNumber = Number(age);
  const canContinue =
    !!photoUri &&
    name.trim().length > 0 &&
    age.trim().length > 0 &&
    ageNumber >= 18 &&
    ageNumber <= 120 &&
    profession.trim().length > 0 &&
    profession.length <= MAX_PROFESSION &&
    selectedSkillIds.length > 0;

  async function handleContinue() {
    if (!session || !photoUri || !canContinue) return;
    setSaving(true);
    setError(null);
    try {
      const photoUrl = await uploadProfilePhoto(session.user.id, photoUri);
      await saveProfileDetails(session.user.id, {
        name: name.trim(),
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
      setError(getErrorMessage(err, "No se pudo guardar tu perfil."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <StepHeader
        step={4}
        totalSteps={5}
        title="Crea tu perfil"
        subtitle="Nombre y edad no se podrán cambiar después de este paso."
        onBack={() => router.replace("/(onboarding)/role-sought")}
      />

      <Pressable onPress={pickPhoto} style={styles.photoPicker}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <Text style={styles.photoPlaceholder}>Añadir foto</Text>
        )}
      </Pressable>

      <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />
      <TextField
        label="Edad"
        value={age}
        onChangeText={setAge}
        placeholder="18-120"
        keyboardType="number-pad"
      />
      <TextField
        label="Profesión"
        value={profession}
        onChangeText={(t) => setProfession(t.slice(0, MAX_PROFESSION))}
        placeholder="Ej. Product Designer"
        counter={`${profession.length}/${MAX_PROFESSION}`}
      />
      <TextField
        label="Descripción (opcional)"
        value={description}
        onChangeText={(t) => setDescription(t.slice(0, MAX_DESCRIPTION))}
        placeholder="Cuenta brevemente a qué te dedicas"
        counter={`${description.length}/${MAX_DESCRIPTION}`}
        multiline
        numberOfLines={3}
      />
      <TextField
        label="Portfolio / CV / LinkedIn (opcional)"
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
        title="Terminar y entrar"
        loading={saving}
        disabled={!canContinue}
        onPress={handleContinue}
        style={styles.button}
      />
      <DevSignOutLink />
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
});
