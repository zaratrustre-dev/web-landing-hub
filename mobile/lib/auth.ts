import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import * as Google from "expo-auth-session/providers/google";

import { supabase } from "./supabase";
import { getErrorMessage } from "./errors";

// GitHub Pages sirve la web desde /web-landing-hub/ (ver
// experiments.baseUrl en app.json). expo-auth-session calcula el
// redirectUri por defecto a partir de la URL ACTUAL del navegador
// (origin + pathname) — como app/index.tsx redirige sin sesión a
// /(auth)/welcome, ese pathname ya no es la raíz, y Google lo rechaza con
// redirect_uri_mismatch porque no coincide con lo autorizado en Google
// Cloud Console. Fijamos aquí un redirectUri estable en vez de dejar que
// dependa de en qué pantalla estés al pulsar el botón. En local
// (localhost) no hay subpath, así que se usa el origin tal cual, igual
// que ya está autorizado en Google Cloud Console.
const GITHUB_PAGES_BASE = "/web-landing-hub";

function getWebRedirectUri(): string | undefined {
  if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
  const { origin, pathname } = window.location;
  return pathname.startsWith(GITHUB_PAGES_BASE) ? `${origin}${GITHUB_PAGES_BASE}/` : origin;
}

export function useGoogleSignIn() {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rawNonce] = useState(() => Crypto.randomUUID());
  const [hashedNonce, setHashedNonce] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce).then((hash) => {
      if (!cancelled) setHashedNonce(hash);
    });
    return () => {
      cancelled = true;
    };
  }, [rawNonce]);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
    redirectUri: getWebRedirectUri(),
    extraParams: { nonce: hashedNonce ?? "" },
  });

  useEffect(() => {
    if (response?.type !== "success") return;

    const idToken = response.params.id_token;
    let cancelled = false;

    (async () => {
      await Promise.resolve();
      if (cancelled) return;

      setSigningIn(true);
      setError(null);
      try {
        if (!idToken) {
          throw new Error("Google no devolvió un id_token válido.");
        }
        const { error: signInError } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
          nonce: rawNonce,
        });
        if (signInError) throw new Error(signInError.message);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Error al iniciar sesión."));
        }
      } finally {
        if (!cancelled) setSigningIn(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [response, rawNonce]);

  return {
    promptAsync,
    ready: !!request && hashedNonce !== null,
    signingIn,
    error,
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}
