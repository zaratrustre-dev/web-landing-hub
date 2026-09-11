import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { deleteAd, fetchAds, updateAd, uploadAdMedia, type AdRow } from "@/lib/admin";
import { useIsAdmin, useSession } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

const PERIODICITY_OPTIONS = [5, 22, 47];

export const Route = createFileRoute("/admin/ads/$adId")({
  validateSearch: (search: Record<string, unknown>) => ({
    edit: search["edit"] === true || search["edit"] === "true",
  }),
  head: () => ({
    meta: [{ title: "Anuncio — Panel admin Connect-it" }],
  }),
  component: AdminAdDetailPage,
});

function AdminAdDetailPage() {
  const { adId } = Route.useParams();
  const { edit: editFromUrl } = Route.useSearch();
  const { session, loading: loadingSession } = useSession();
  const isAdmin = useIsAdmin(session?.user.id);
  const navigate = useNavigate();

  const [ad, setAd] = useState<AdRow | null>(null);
  const [loadingAd, setLoadingAd] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState(editFromUrl);
  useEffect(() => {
    setEditing(editFromUrl);
  }, [editFromUrl]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreviewUrl, setNewPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    link_url: "",
    periodicity_likes: 10,
    is_active: true,
  });

  useEffect(() => {
    if (!loadingSession && !session) navigate({ to: "/admin/login" });
  }, [loadingSession, session, navigate]);

  useEffect(() => {
    if (isAdmin !== true) return;
    let cancelled = false;

    // No hay admin_get_ad de momento: se reutiliza el listado y se filtra.
    // Es aceptable para el volumen de anuncios esperado en el panel.
    fetchAds()
      .then((all) => {
        if (cancelled) return;
        const found = all.find((a) => a.id === adId) ?? null;
        setAd(found);
        if (found) {
          setForm({
            title: found.title,
            link_url: found.link_url ?? "",
            periodicity_likes: found.periodicity_likes,
            is_active: found.is_active,
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(getErrorMessage(err, "No se pudo cargar el anuncio."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAd(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, adId]);

  useEffect(() => {
    if (!newFile) {
      setNewPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(newFile);
    setNewPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [newFile]);

  async function handleSave() {
    if (!ad) return;
    setSaving(true);
    setSaveError(null);
    try {
      const fields: Parameters<typeof updateAd>[1] = {
        title: form.title,
        link_url: form.link_url || null,
        periodicity_likes: form.periodicity_likes,
        is_active: form.is_active,
      };

      if (newFile) {
        const mediaUrl = await uploadAdMedia(newFile);
        fields.media_url = mediaUrl;
        fields.media_type = newFile.type.startsWith("video/") ? "video" : "image";
      }

      await updateAd(ad.id, fields);
      setAd({ ...ad, ...fields } as AdRow);
      setNewFile(null);
      setEditing(false);
    } catch (err) {
      setSaveError(getErrorMessage(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!ad) return;
    if (!window.confirm(`¿Borrar el anuncio "${ad.title}"? No se puede deshacer.`)) return;
    try {
      await deleteAd(ad.id);
      navigate({ to: "/admin/ads" });
    } catch (err) {
      setSaveError(getErrorMessage(err, "No se pudo borrar el anuncio."));
    }
  }

  if (loadingSession || (session && isAdmin === null) || loadingAd) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  if (!session) return null;

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <h1 className="text-xl font-semibold text-foreground">No tienes acceso de admin</h1>
        <Link to="/admin" className="text-sm text-primary underline">
          Volver
        </Link>
      </div>
    );
  }

  if (loadError || !ad) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link to="/admin/ads" className="text-sm text-muted-foreground hover:underline">
          ← Anuncios
        </Link>
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {loadError ?? "Anuncio no encontrado."}
        </p>
      </div>
    );
  }

  const inputClass =
    "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/admin/ads" className="text-sm text-muted-foreground hover:underline">
          ← Anuncios
        </Link>

        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">{ad.title}</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {editing ? "Cancelar" : "Editar"}
            </button>
          </div>
        </div>

        {saveError && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {saveError}
          </p>
        )}

        <div className="mt-4">
          {ad.media_type === "video" ? (
            <video src={ad.media_url} controls className="max-h-96 w-full rounded-xl bg-black" />
          ) : (
            <img
              src={ad.media_url}
              alt={ad.title}
              className="max-h-96 w-full rounded-xl object-contain"
            />
          )}
        </div>

        {!editing ? (
          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-border p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Enlace</dt>
              <dd className="mt-1 break-all text-foreground">{ad.link_url || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Periodicidad</dt>
              <dd className="mt-1 text-foreground">Cada {ad.periodicity_likes} likes</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estado</dt>
              <dd className="mt-1 text-foreground">{ad.is_active ? "Activo" : "Inactivo"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Última actualización</dt>
              <dd className="mt-1 text-foreground">{new Date(ad.updated_at).toLocaleString()}</dd>
            </div>
          </dl>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-border p-5 sm:grid-cols-2">
            <input
              placeholder="Título interno (máx. 80)"
              maxLength={80}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={`${inputClass} sm:col-span-2`}
            />
            <input
              placeholder="Enlace de destino (URL)"
              value={form.link_url}
              onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
              className={`${inputClass} sm:col-span-2`}
            />
            <select
              value={form.periodicity_likes}
              onChange={(e) =>
                setForm((f) => ({ ...f, periodicity_likes: Number(e.target.value) }))
              }
              className={inputClass}
            >
              {PERIODICITY_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Cada {n} likes
                </option>
              ))}
            </select>
            <select
              value={form.is_active ? "active" : "inactive"}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === "active" }))}
              className={inputClass}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>

            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">
                Reemplazar imagen/vídeo (opcional)
              </label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                className="mt-1 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
              />
              {newPreviewUrl && (
                <div className="mt-2">
                  {newFile?.type.startsWith("video/") ? (
                    <video src={newPreviewUrl} controls className="max-h-48 rounded-md" />
                  ) : (
                    <img
                      src={newPreviewUrl}
                      alt="Nueva previsualización"
                      className="max-h-48 rounded-md"
                    />
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:col-span-2"
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
