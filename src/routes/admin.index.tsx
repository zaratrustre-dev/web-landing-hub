import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { signOut, useIsAdmin, useSession } from "@/lib/auth";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Panel admin — Connect-it" }],
  }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { session, loading: loadingSession } = useSession();
  const isAdmin = useIsAdmin(session?.user.id);
  const navigate = useNavigate();

  // Sin sesión -> a login. Se evalúa solo cuando loadingSession ya resolvió,
  // para no redirigir de golpe mientras aún se está comprobando.
  useEffect(() => {
    if (!loadingSession && !session) {
      navigate({ to: "/admin/login" });
    }
  }, [loadingSession, session, navigate]);

  if (loadingSession || (session && isAdmin === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Comprobando acceso…</p>
      </div>
    );
  }

  if (!session) {
    // Redirección en curso (ver useEffect arriba).
    return null;
  }

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <h1 className="text-xl font-semibold text-foreground">No tienes acceso de admin</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Tu cuenta ({session.user.email}) ha iniciado sesión correctamente, pero no tiene el rol de
          administrador. Pide que te lo asignen en la tabla <code>user_roles</code>.
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Panel de administración</h1>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Cerrar sesión
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Sesión: {session.user.email}</p>
        <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Aquí irá la gestión de usuarios, moderación y el resto de Fase 2. Login con Google y
          verificación de rol admin ya funcionan.
        </div>
      </div>
    </div>
  );
}
