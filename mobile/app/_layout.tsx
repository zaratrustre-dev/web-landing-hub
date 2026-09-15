import { useEffect } from "react";
import { Platform } from "react-native";
import { router, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_800ExtraBold } from "@expo-google-fonts/inter";
import { JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";

import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { DiscoveryFiltersProvider } from "@/providers/DiscoveryFiltersProvider";
import { colors } from "@/constants/theme";

WebBrowser.maybeCompleteAuthSession();

// Bug fix (14/09/2026): app/index.tsx decide a dónde ir SOLO la primera vez
// que se visita "/" — no vuelve a ejecutarse si el usuario ya está en otra
// pantalla. Eso deja un hueco real en web: tras cerrar sesión, el botón
// Atrás del navegador puede saltar directo a una ruta protegida del
// historial (ej. "/settings") sin volver a pasar por ese chequeo, y esa
// pantalla se renderiza igual con session/profile en null ("entro a la app
// sin ningún usuario"). AuthGate es un guard global y reactivo: vive fuera
// de cualquier pantalla concreta, así que cubre también la navegación por
// historial del navegador (Atrás/Adelante), refrescos, y cualquier otra
// forma de llegar a una ruta protegida sin sesión — no solo el logout.
function AuthGate() {
  const { session, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    // "/" ya tiene su propio guard en app/index.tsx (evita un doble
    // redirect/loop); "/welcome" es a donde este guard redirige, así que
    // excluirlo evita reemplazar la misma pantalla por sí misma.
    if (!session && pathname !== "/" && pathname !== "/welcome") {
      router.replace("/(auth)/welcome");
    }
  }, [session, loading, pathname]);

  return null;
}

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
        <DiscoveryFiltersProvider>
          <StatusBar style="light" />
          <AuthGate />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </DiscoveryFiltersProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
