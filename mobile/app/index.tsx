import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/providers/AuthProvider";
import { colors } from "@/constants/theme";

/**
 * Puerta de entrada: decide a qué pantalla ir según el estado real de
 * sesión/onboarding. Sigue el flujo del PDR/Master Prompt:
 * Google Login → Terms → Role → Role Sought → Create Profile → Home.
 */
export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!profile?.terms_accepted_at) {
    return <Redirect href="/(onboarding)/terms" />;
  }

  if (!profile.role) {
    return <Redirect href="/(onboarding)/role" />;
  }

  if (!profile.role_sought) {
    return <Redirect href="/(onboarding)/role-sought" />;
  }

  if (!profile.onboarding_completed) {
    return <Redirect href="/(onboarding)/create-profile" />;
  }

  return <Redirect href="/(tabs)" />;
}
