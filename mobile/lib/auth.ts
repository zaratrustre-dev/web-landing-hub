import { useEffect, useState } from "react";
import * as Crypto from "expo-crypto";
import * as Google from "expo-auth-session/providers/google";

import { supabase } from "./supabase";
import { getErrorMessage } from "./errors";

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
