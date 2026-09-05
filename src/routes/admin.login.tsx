import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { signInWithGoogle, useSession } from "@/lib/auth";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [{ title: "Acceso admin — Connect-it" }],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Si ya hay sesión (p.ej. volviste a /admin/login por error), directo al panel.
  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/admin" });
    }
  }, [loading, session, navigate]);

  async function handleLogin() {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle("/admin");
      // A partir de aquí el navegador redirige a Google; no hay más que hacer.
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión con Google.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Panel de administración</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Acceso restringido al equipo de Connect-it.
        </p>

        <button
          type="button"
          onClick={handleLogin}
          disabled={submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Redirigiendo a Google…" : "Continuar con Google"}
        </button>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
