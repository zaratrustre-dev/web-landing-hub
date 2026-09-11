import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";

import { createAd, deleteAd, fetchAds, updateAd, uploadAdMedia, type AdRow } from "@/lib/admin";
import { useIsAdmin, useSession } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

const PERIODICITY_OPTIONS = [5, 22, 47];

export const Route = createFileRoute("/admin/ads/")({
  head: () => ({
    meta: [{ title: "Anuncios — Panel admin Connect-it" }],
  }),
  component: AdminAdsPage,
});

function AdminAdsPage() {
  const { session, loading: loadingSession } = useSession();
  const isAdmin = useIsAdmin(session?.user.id);
  const navigate = useNavigate();

  const [ads, setAds] = useState<AdRow[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createTitle, setCreateTitle] = useState("");
  const [createLinkUrl, setCreateLinkUrl] = useState("");
  const [createPeriodicityLikes, setCreatePeriodicityLikes] = useState(5);
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createPreviewUrl, setCreatePreviewUrl] = useState<string | null>(null);
  const [createFormKey, setCreateFormKey] = useState(0);

  useEffect(() => {
    if (!loadingSession && !session) navigate({ to: "/admin/login" });
  }, [loadingSession, session, navigate]);

  function loadAds() {
    if (isAdmin !== true) return;
    setLoadingAds(true);
    setError(null);
    fetchAds()
      .then(setAds)
      .catch((err: unknown) => {
        setError(getErrorMessage(err, "No se pudo cargar la lista de anuncios."));
      })
      .finally(() => setLoadingAds(false));
  }

  useEffect(() => {
    loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Previsualización local del archivo elegido, antes de subirlo.
  useEffect(() => {
    if (!createFile) {
      setCreatePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(createFile);
    setCreatePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [createFile]);

  async function handleToggleActive(ad: AdRow) {
    setTogglingId(ad.id);
    setError(null);
    try {
      await updateAd(ad.id, { is_active: !ad.is_active });
      setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, is_active: !a.is_active } : a)));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cambiar el estado."));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(ad: AdRow) {
    if (!window.confirm(`¿Borrar el anuncio "${ad.title}"? No se puede deshacer.`)) return;
    setDeletingId(ad.id);
    setError(null);
    try {
      await deleteAd(ad.id);
      loadAds();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo borrar el anuncio."));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!createFile) {
      setCreateError("Elige una imagen o un vídeo.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const mediaType: "image" | "video" = createFile.type.startsWith("video/") ? "video" : "image";
      const mediaUrl = await uploadAdMedia(createFile);
      await createAd({
        title: createTitle,
        media_type: mediaType,
        media_url: mediaUrl,
        link_url: createLinkUrl || undefined,
        periodicity_likes: createPeriodicityLikes,
      });

      setCreateTitle("");
      setCreateLinkUrl("");
      setCreatePeriodicityLikes(5);
      setCreateFile(null);
      setCreateFormKey((k) => k + 1);
      setShowCreateForm(false);
      loadAds();
    } catch (err) {
      setCreateError(getErrorMessage(err, "No se pudo crear el anuncio."));
    } finally {
      setCreating(false);
    }
  }

  if (loadingSession || (session && isAdmin === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Comprobando acceso…</p>
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

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/admin" className="text-sm text-muted-foreground hover:underline">
              ← Panel
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">Anuncios</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {showCreateForm ? "Cancelar" : "+ Crear anuncio"}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {showCreateForm && (
          <form
            onSubmit={handleCreate}
            className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-border p-4 sm:grid-cols-2"
          >
            <input
              required
              placeholder="Título interno (máx. 80)"
              maxLength={80}
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:col-span-2"
            />
            <input
              placeholder="Enlace de destino (URL, opcional)"
              value={createLinkUrl}
              onChange={(e) => setCreateLinkUrl(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:col-span-2"
            />
            <select
              value={createPeriodicityLikes}
              onChange={(e) => setCreatePeriodicityLikes(Number(e.target.value))}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              {PERIODICITY_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Cada {n} likes
                </option>
              ))}
            </select>
            <div key={createFormKey} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Imagen o vídeo *</label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setCreateFile(e.target.files?.[0] ?? null)}
                className="text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
              />
            </div>

            {createPreviewUrl && (
              <div className="sm:col-span-2">
                <p className="mb-2 text-xs text-muted-foreground">Previsualización</p>
                {createFile?.type.startsWith("video/") ? (
                  <video src={createPreviewUrl} controls className="max-h-64 rounded-md" />
                ) : (
                  <img
                    src={createPreviewUrl}
                    alt="Previsualización"
                    className="max-h-64 rounded-md"
                  />
                )}
              </div>
            )}

            {createError && <p className="text-sm text-destructive sm:col-span-2">{createError}</p>}

            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:col-span-2"
            >
              {creating ? "Guardando…" : "Guardar anuncio"}
            </button>
          </form>
        )}

        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Miniatura</th>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Enlace</th>
                <th className="px-4 py-3 font-medium">Periodicidad</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingAds ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando…
                  </td>
                </tr>
              ) : ads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No hay anuncios todavía.
                  </td>
                </tr>
              ) : (
                ads.map((ad) => (
                  <tr key={ad.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      {ad.media_type === "video" ? (
                        <video
                          src={ad.media_url}
                          className="h-12 w-16 rounded object-cover"
                          muted
                        />
                      ) : (
                        <img
                          src={ad.media_url}
                          alt={ad.title}
                          className="h-12 w-16 rounded object-cover"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">{ad.title}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">
                      {ad.link_url || "—"}
                    </td>
                    <td className="px-4 py-3 text-foreground">Cada {ad.periodicity_likes}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          ad.is_active
                            ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600"
                            : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                        }
                      >
                        {ad.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to="/admin/ads/$adId"
                          params={{ adId: ad.id }}
                          search={{ edit: false }}
                          className="rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          Ver
                        </Link>
                        <Link
                          to="/admin/ads/$adId"
                          params={{ adId: ad.id }}
                          search={{ edit: true }}
                          className="rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          disabled={togglingId === ad.id}
                          onClick={() => handleToggleActive(ad)}
                          className="rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {togglingId === ad.id ? "…" : ad.is_active ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === ad.id}
                          onClick={() => handleDelete(ad)}
                          className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === ad.id ? "…" : "Borrar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
