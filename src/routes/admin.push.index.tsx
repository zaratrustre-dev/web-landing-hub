import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  fetchAdminProfiles,
  fetchPushLog,
  sendPushNotification,
  type AdminProfileRow,
  type PushLogRow,
} from "@/lib/admin";
import { useIsAdmin, useSession } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/admin/push/")({
  head: () => ({
    meta: [{ title: "Notificaciones push — Panel admin Connect-it" }],
  }),
  component: AdminPushPage,
});

function AdminPushPage() {
  const { session, loading: loadingSession } = useSession();
  const isAdmin = useIsAdmin(session?.user.id);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [candidates, setCandidates] = useState<AdminProfileRow[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendToAll, setSendToAll] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    note?: string;
  } | null>(null);

  const [log, setLog] = useState<PushLogRow[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (isAdmin !== true) return;
    setLoadingCandidates(true);
    fetchAdminProfiles(50, 0, { search: debouncedSearch || undefined })
      .then(setCandidates)
      .catch(() => setCandidates([]))
      .finally(() => setLoadingCandidates(false));
  }, [isAdmin, debouncedSearch]);

  function loadLog() {
    if (isAdmin !== true) return;
    setLoadingLog(true);
    fetchPushLog(50)
      .then(setLog)
      .catch(() => setLog([]))
      .finally(() => setLoadingLog(false));
  }

  useEffect(() => {
    loadLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!loadingSession && !session) navigate({ to: "/admin/login" });
  }, [loadingSession, session, navigate]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    setSendError(null);
    setSendResult(null);

    const recipientUserIds = Array.from(selectedIds);
    if (!sendToAll && recipientUserIds.length === 0) {
      setSendError('Selecciona al menos un destinatario, o marca "Enviar a todos".');
      return;
    }
    if (!title.trim() || !body.trim()) {
      setSendError("Título y mensaje son obligatorios.");
      return;
    }

    if (sendToAll) {
      if (
        !window.confirm(
          "¿Enviar esta notificación a TODOS los usuarios con dispositivo registrado? Esta acción no se puede deshacer.",
        )
      ) {
        return;
      }
    }

    setSending(true);
    try {
      const result = await sendPushNotification({
        recipientUserIds,
        sendToAll,
        title: title.trim(),
        body: body.trim(),
      });
      setSendResult(result);
      setSelectedIds(new Set());
      setSendToAll(false);
      setTitle("");
      setBody("");
      loadLog();
    } catch (err) {
      setSendError(getErrorMessage(err, "No se pudo enviar."));
    } finally {
      setSending(false);
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

  const inputClass =
    "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link to="/admin" className="text-sm text-muted-foreground hover:underline">
          ← Panel
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Notificaciones push</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Vía Firebase Cloud Messaging. Solo llega a usuarios con la app instalada y un dispositivo
          registrado — de momento no existe la app de usuario final, así que esto quedará sin
          destinatarios reales hasta entonces.
        </p>

        <div className="mt-6 rounded-xl border border-border p-4">
          <p className="mb-2 text-sm font-medium text-foreground">
            Destinatarios ({selectedIds.size} seleccionados)
          </p>

          <label className="mb-3 flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={sendToAll}
              onChange={(e) => setSendToAll(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <strong>Enviar a TODOS</strong> los usuarios con dispositivo registrado
          </label>

          <input
            type="search"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={sendToAll}
            className={`${inputClass} w-full disabled:opacity-50`}
          />
          <div
            className={`mt-3 max-h-56 space-y-1 overflow-y-auto ${sendToAll ? "opacity-40" : ""}`}
          >
            {loadingCandidates ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin resultados.</p>
            ) : (
              candidates.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => toggleSelected(c.id)}
                    disabled={sendToAll}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-foreground">{c.name ?? "—"}</span>
                  <span className="text-muted-foreground">{c.email}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-border p-4">
          <input
            placeholder="Título *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
          <textarea
            placeholder="Mensaje *"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className={inputClass}
          />

          {sendError && <p className="text-sm text-destructive">{sendError}</p>}
          {sendResult && (
            <p className="text-sm text-foreground">
              Enviados: {sendResult.sent} · Fallidos: {sendResult.failed}
              {sendResult.note && ` · ${sendResult.note}`}
            </p>
          )}

          <button
            type="button"
            disabled={sending}
            onClick={handleSend}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {sending ? "Enviando…" : "Enviar"}
          </button>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">Historial de envíos</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Título</th>
                  <th className="px-4 py-2 font-medium">Mensaje</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {loadingLog ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      Cargando…
                    </td>
                  </tr>
                ) : log.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      Sin envíos todavía.
                    </td>
                  </tr>
                ) : (
                  log.map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-foreground">{l.title}</td>
                      <td className="max-w-xs truncate px-4 py-2 text-muted-foreground">
                        {l.body}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            l.status === "sent"
                              ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600"
                              : "rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive"
                          }
                        >
                          {l.status}
                        </span>
                        {l.status === "failed" && l.error_message && (
                          <p className="mt-1 max-w-xs text-xs text-destructive">
                            {l.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(l.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
