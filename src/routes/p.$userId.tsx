import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { fetchPublicProfile, type PublicProfile } from "@/lib/public-profile";

export const Route = createFileRoute("/p/$userId")({
  head: () => ({
    meta: [
      { title: "Perfil — Connect-it" },
      {
        name: "description",
        content: "Descubre este perfil profesional en Connect-it.",
      },
    ],
  }),
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublicProfile(userId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="page-gradient min-h-screen font-body text-ink">
      <SiteHeader />
      <main className="mx-auto flex max-w-xl flex-col items-center px-5 pb-16 pt-6 text-center">
        {loading ? (
          <p className="mt-16 text-ink-soft">Cargando perfil…</p>
        ) : error || !profile ? (
          <div className="mt-16 rounded-2xl bg-surface p-8 ring-1 ring-line">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Este perfil no está disponible
            </h1>
            <p className="mt-3 text-ink-soft">
              El enlace puede haber caducado o el perfil ya no es público.
            </p>
          </div>
        ) : (
          <div className="mt-10 w-full rounded-2xl bg-surface p-8 ring-1 ring-line">
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.name ?? "Perfil"}
                className="mx-auto size-28 rounded-full object-cover ring-1 ring-line"
              />
            ) : (
              <div className="mx-auto size-28 rounded-full bg-surface-elevated" />
            )}
            <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
              {profile.name}
            </h1>
            {profile.profession ? (
              <p className="mt-1 text-ink-soft">{profile.profession}</p>
            ) : null}
            {profile.skills.length > 0 ? (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {profile.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-surface-elevated px-3 py-1 text-xs text-ink-soft"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-semibold text-primary-foreground shadow-coral transition-transform hover:-translate-y-0.5"
        >
          Descubre Connect-it
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
