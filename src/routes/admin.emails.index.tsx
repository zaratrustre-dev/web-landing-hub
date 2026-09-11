import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  fetchAdminProfiles,
  fetchEmailLog,
  sendCommercialEmail,
  sendTransactionalEmail,
  type AdminProfileRow,
  type EmailLogRow,
} from "@/lib/admin";
import { useIsAdmin, useSession } from "@/lib/auth";
import { COUNTRIES } from "@/lib/countries";

type EmailKind = "transactional" | "commercial";

interface KeyValueRow {
  key: string;
  value: string;
}

export const Route = createFileRoute("/admin/emails/")({
  head: () => ({
    meta: [{ title: "Emails — Panel admin Connect-it" }],
  }),
  component: AdminEmailsPage,
});

/** Resend/Brevo devuelven el error como JSON crudo; se muestra el campo "message" si existe. */
function formatEmailError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { message?: string };
    return parsed.message ?? raw;
  } catch {
    return raw;
  }
}

function AdminEmailsPage() {
  const { session, loading: loadingSession } = useSession();
  const isAdmin = useIsAdmin(session?.user.id);
  const navigate = useNavigate();

  const [kind, setKind] = useState<EmailKind>("transactional");

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [radarOnly, setRadarOnly] = useState(false);
  const [countryFilter, setCountryFilter] = useState("");
  const [candidates, setCandidates] = useState<AdminProfileRow[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendToAll, setSendToAll] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (isAdmin !== true) return;
    setLoadingCandidates(true);
    fetchAdminProfiles(50, 0, {
      search: debouncedSearch || undefined,
      radar: radarOnly ? true : undefined,
      country: countryFilter || undefined,
    })
      .then(setCandidates)
      .catch(() => setCandidates([]))
      .finally(() => setLoadingCandidates(false));
  }, [isAdmin, debouncedSearch, radarOnly, countryFilter]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedConsentedCount = candidates.filter(
    (c) => selectedIds.has(c.id) && c.marketing_consent,
  ).length;

  const [resendTemplateId, setResendTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [brevoTemplateId, setBrevoTemplateId] = useState("");
  const [variableRows, setVariableRows] = useState<KeyValueRow[]>([{ key: "", value: "" }]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    skipped_no_consent?: number;
  } | null>(null);

  const [log, setLog] = useState<EmailLogRow[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);

  function loadLog() {
    if (isAdmin !== true) return;
    setLoadingLog(true);
    fetchEmailLog(50)
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

  function variablesObject() {
    const obj: Record<string, string> = {};
    for (const row of variableRows) {
      if (row.key.trim()) obj[row.key.trim()] = row.value;
    }
    return obj;
  }

  async function handleSend() {
    setSendError(null);
    setSendResult(null);

    const recipientUserIds = Array.from(selectedIds);
    if (!sendToAll && recipientUserIds.length === 0) {
      setSendError('Selecciona al menos un destinatario, o marca "Enviar a todos".');
      return;
    }

    if (sendToAll) {
      const confirmMsg =
        kind === "commercial"
          ? "¿Enviar a TODOS los usuarios que hayan dado consentimiento de marketing? Esta acción no se puede deshacer."
          : "¿Enviar a TODOS los usuarios de Connect-it? Esta acción no se puede deshacer.";
      if (!window.confirm(confirmMsg)) return;
    }

    setSending(true);
    try {
      if (kind === "transactional") {
        if (!resendTemplateId.trim()) {
          throw new Error("Falta el ID de la plantilla de Resend.");
        }
        if (!subject.trim()) {
          throw new Error("Resend exige el asunto siempre, incluso usando plantilla. Rellénalo.");
        }
        const result = await sendTransactionalEmail({
          recipientUserIds,
          sendToAll,
          radarOnly,
          country: countryFilter || undefined,
          resendTemplateId: resendTemplateId.trim(),
          subject: subject.trim(),
          variables: variablesObject(),
        });
        setSendResult(result);
      } else {
        if (!brevoTemplateId.trim() || Number.isNaN(Number(brevoTemplateId))) {
          throw new Error("El ID de la plantilla de Brevo debe ser un número.");
        }
        const result = await sendCommercialEmail({
          recipientUserIds,
          sendToAll,
          radarOnly,
          country: countryFilter || undefined,
          brevoTemplateId: Number(brevoTemplateId),
          params: variablesObject(),
        });
        setSendResult(result);
      }

      setSelectedIds(new Set());
      setSendToAll(false);
      loadLog();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "No se pudo enviar.");
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
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Emails</h1>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setKind("transactional")}
            className={
              kind === "transactional"
                ? "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                : "rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            }
          >
            Transaccional (Resend)
          </button>
          <button
            type="button"
            onClick={() => setKind("commercial")}
            className={
              kind === "commercial"
                ? "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                : "rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
            }
          >
            Comercial (Brevo)
          </button>
        </div>

        {kind === "transactional" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Usa una plantilla ya publicada en Resend. Con la dirección de pruebas
            (onboarding@resend.dev) solo entrega a tu propia cuenta de Resend, hasta que verifiques
            un dominio.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Usa una plantilla de Brevo. Se filtra automáticamente en el servidor: solo se envía a
            quienes tengan marcado el consentimiento de marketing, aunque los selecciones a todos.
          </p>
        )}

        <div className="mt-6 rounded-xl border border-border p-4">
          <p className="mb-2 text-sm font-medium text-foreground">
            Destinatarios ({selectedIds.size} seleccionados
            {kind === "commercial" && `, ${selectedConsentedCount} con consentimiento`})
          </p>

          <label className="mb-3 flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={sendToAll}
              onChange={(e) => setSendToAll(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <strong>Enviar a TODOS</strong>{" "}
            {kind === "commercial"
              ? "los usuarios con consentimiento de marketing (se filtra en el servidor)"
              : "los usuarios de Connect-it"}
            {(radarOnly || countryFilter) && (
              <span className="text-muted-foreground">
                {" "}
                — respeta los filtros de abajo (
                {[radarOnly && "solo Radar", countryFilter && `país: ${countryFilter}`]
                  .filter(Boolean)
                  .join(", ")}
                )
              </span>
            )}
          </label>

          <input
            type="search"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={sendToAll}
            className={`${inputClass} w-full disabled:opacity-50`}
          />

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={radarOnly}
                  onChange={(e) => setRadarOnly(e.target.checked)}
                  disabled={sendToAll}
                  className="h-4 w-4 rounded border-input"
                />
                🔌 Solo usuarios Radar
              </label>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                disabled={sendToAll}
                className={`${inputClass} disabled:opacity-50`}
              >
                <option value="">Todos los países</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={sendToAll || candidates.length === 0}
              onClick={() => setSelectedIds(new Set(candidates.map((c) => c.id)))}
              className="text-xs text-primary underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Seleccionar los {candidates.length} de la lista
            </button>
          </div>

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
                  {kind === "commercial" && !c.marketing_consent && (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      sin consentimiento
                    </span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
          {kind === "transactional" ? (
            <>
              <input
                placeholder="ID de plantilla de Resend *"
                value={resendTemplateId}
                onChange={(e) => setResendTemplateId(e.target.value)}
                className={inputClass}
              />
              <input
                placeholder="Asunto *"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputClass}
              />
            </>
          ) : (
            <input
              type="number"
              placeholder="ID de plantilla de Brevo *"
              value={brevoTemplateId}
              onChange={(e) => setBrevoTemplateId(e.target.value)}
              className={inputClass}
            />
          )}

          <div className="sm:col-span-2">
            <p className="mb-2 text-xs text-muted-foreground">
              Variables de la plantilla (opcional — se añade siempre "nombre"/"NOMBRE"
              automáticamente por destinatario)
            </p>
            {variableRows.map((row, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input
                  placeholder="clave"
                  value={row.key}
                  onChange={(e) => {
                    const next = [...variableRows];
                    next[i] = { ...next[i]!, key: e.target.value };
                    setVariableRows(next);
                  }}
                  className={`${inputClass} w-1/3`}
                />
                <input
                  placeholder="valor"
                  value={row.value}
                  onChange={(e) => {
                    const next = [...variableRows];
                    next[i] = { ...next[i]!, value: e.target.value };
                    setVariableRows(next);
                  }}
                  className={`${inputClass} flex-1`}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setVariableRows([...variableRows, { key: "", value: "" }])}
              className="text-sm text-primary underline"
            >
              + Añadir variable
            </button>
          </div>

          {sendError && <p className="text-sm text-destructive sm:col-span-2">{sendError}</p>}
          {sendResult && (
            <p className="text-sm text-foreground sm:col-span-2">
              Enviados: {sendResult.sent} · Fallidos: {sendResult.failed}
              {typeof sendResult.skipped_no_consent === "number" &&
                ` · Omitidos sin consentimiento: ${sendResult.skipped_no_consent}`}
            </p>
          )}

          <button
            type="button"
            disabled={sending}
            onClick={handleSend}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:col-span-2"
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
                  <th className="px-4 py-2 font-medium">Proveedor</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Destinatario</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {loadingLog ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Cargando…
                    </td>
                  </tr>
                ) : log.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Sin envíos todavía.
                    </td>
                  </tr>
                ) : (
                  log.map((l) => (
                    <tr key={l.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 text-foreground">{l.provider ?? "—"}</td>
                      <td className="px-4 py-2 text-foreground">{l.email_type ?? "—"}</td>
                      <td className="px-4 py-2 text-foreground">{l.recipient_email}</td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            l.status === "sent"
                              ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600"
                              : l.status === "failed"
                                ? "rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive"
                                : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                          }
                        >
                          {l.status}
                        </span>
                        {l.status === "failed" && l.error_message && (
                          <p className="mt-1 max-w-xs text-xs text-destructive">
                            {formatEmailError(l.error_message)}
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
