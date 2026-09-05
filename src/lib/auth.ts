import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "./supabase";

/**
 * Sesión actual de Supabase Auth, reactiva a login/logout.
 * `loading` es true hasta que sabemos con certeza si hay sesión o no
 * (evita parpadeos de "no autenticado" mientras se resuelve).
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading };
}

/**
 * Comprueba el rol admin (tabla user_roles) para el usuario dado.
 * Devuelve null mientras no se sabe todavía, true/false cuando se resuelve.
 */
export function useIsAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    let cancelled = false;
    setIsAdmin(null);

    // NOTA: cast puntual porque los tipos de Functions en database.types.ts están
    // escritos a mano (sin Docker no se pueden generar con `supabase gen types`).
    // El inferidor de .rpc() de supabase-js es estricto con esos metadatos.
    // Al regenerar los tipos de verdad, esto debería poder quitarse.
    (
      supabase.rpc as (
        fn: string,
        args: Record<string, unknown>,
      ) => PromiseLike<{ data: unknown; error: unknown }>
    )("is_admin", { uid: userId }).then(({ data, error }: { data: unknown; error: unknown }) => {
      if (cancelled) return;
      setIsAdmin(error ? false : Boolean(data));
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return isAdmin;
}

/** Inicia el flujo de OAuth con Google. Redirige el navegador entero. */
export async function signInWithGoogle(redirectPath = "/admin") {
  const redirectTo = `${window.location.origin}${redirectPath}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}
