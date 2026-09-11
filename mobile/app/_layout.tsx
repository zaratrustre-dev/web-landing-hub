import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";

import { AuthProvider } from "@/providers/AuthProvider";
import { colors } from "@/constants/theme";

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_800ExtraBold,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    if (Platform.OS === "web") return;
    WebBrowser.warmUpAsync();
    return () => {
      WebBrowser.coolDownAsync();
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
