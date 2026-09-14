import { useState } from "react";

import {
  checkExistingEmails,
  parseUsersExcelFile,
  runBulkImport,
  type ImportOutcome,
  type ImportProgress,
  type ImportRow,
  type ImportRowError,
} from "@/lib/bulk-import-users";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Step = "pick" | "checking" | "blocked" | "preview" | "importing" | "done" | "failed";

interface BulkImportUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama cuando la importación termina con éxito, para refrescar la tabla. */
  onImported: () => void;
}

const initialState = {
  step: "pick" as Step,
  fileName: null as string | null,
  validRows: [] as ImportRow[],
  rowErrors: [] as ImportRowError[],
  progress: null as ImportProgress | null,
  outcome: null as ImportOutcome | null,
  generalError: null as string | null,
};

export function BulkImportUsersDialog({
  open,
  onOpenChange,
  onImported,
}: BulkImportUsersDialogProps) {
  const [state, setState] = useState(initialState);

  function reset() {
    setState(initialState);
  }

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFileSelected(file: File) {
    setState((s) => ({ ...s, fileName: file.name, step: "checking", generalError: null }));

    try {
      const parsed = await parseUsersExcelFile(file);

      if (parsed.errors.length > 0) {
        setState((s) => ({ ...s, step: "blocked", rowErrors: parsed.errors, validRows: [] }));
        return;
      }

      if (parsed.validRows.length === 0) {
        setState((s) => ({
          ...s,
          step: "blocked",
          rowErrors: [{ rowNumber: 0, rawEmail: null, messages: ["No hay filas para importar."] }],
        }));
        return;
      }

      const duplicateErrors = await checkExistingEmails(parsed.validRows);
      if (duplicateErrors.length > 0) {
        setState((s) => ({ ...s, step: "blocked", rowErrors: duplicateErrors, validRows: [] }));
        return;
      }

      setState((s) => ({ ...s, step: "preview", validRows: parsed.validRows, rowErrors: [] }));
    } catch (err) {
      setState((s) => ({
        ...s,
        step: "blocked",
        rowErrors: [
          {
            rowNumber: 0,
            rawEmail: null,
            messages: [err instanceof Error ? err.message : "No se pudo leer el archivo."],
          },
        ],
      }));
    }
  }

  async function handleConfirm() {
    setState((s) => ({ ...s, step: "importing", progress: { total: s.validRows.length, done: 0, currentEmail: "" } }));

    const outcome = await runBulkImport(state.validRows, (progress) => {
      setState((s) => ({ ...s, progress }));
    });

    if (outcome.success) {
      setState((s) => ({ ...s, step: "done", outcome }));
      onImported();
    } else {
      setState((s) => ({ ...s, step: "failed", outcome }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar usuarios desde Excel</DialogTitle>
          <DialogDescription>
            Crea perfiles de prueba/demo a partir de un archivo .xlsx. Estos usuarios nunca
            inician sesión (no hay login por contraseña) — son solo para poblar el directorio.
            Todo o nada: si una sola fila falla, no se importa ninguna.
          </DialogDescription>
        </DialogHeader>

        {state.step === "pick" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              Columnas esperadas (cabecera en la primera fila): <strong>Email</strong>,{" "}
              <strong>Nombre</strong>, <strong>Edad</strong>, <strong>País</strong>,{" "}
              <strong>Rol</strong>, <strong>Profesión</strong> (obligatorias) — Foto, Portafolio y
              Descripción son opcionales. País puede venir en español (ej. "España") o en inglés.
              Rol debe ser uno de: developer, designer, entrepreneur, marketing, consultant,
              lender, logistics, recruiter, influencer. Profesión máximo 20 caracteres.
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelected(file);
              }}
              className="text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
            />
          </div>
        )}

        {state.step === "checking" && (
          <p className="text-sm text-muted-foreground">
            Validando "{state.fileName}"…
          </p>
        )}

        {state.step === "blocked" && (
          <div className="flex flex-col gap-3">
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              No se importó nada. Corrige el Excel y vuelve a intentarlo.
            </p>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Fila</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Problema</th>
                  </tr>
                </thead>
                <tbody>
                  {state.rowErrors.map((e, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-foreground">
                        {e.rowNumber > 0 ? e.rowNumber : "—"}
                      </td>
                      <td className="px-3 py-2 text-foreground">{e.rawEmail ?? "—"}</td>
                      <td className="px-3 py-2 text-foreground">{e.messages.join(" ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={reset}
              className="self-start rounded-md border border-input px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Elegir otro archivo
            </button>
          </div>
        )}

        {state.step === "preview" && (
          <div className="flex flex-col gap-3">
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700">
              "{state.fileName}" es válido: {state.validRows.length} usuario
              {state.validRows.length === 1 ? "" : "s"} listo{state.validRows.length === 1 ? "" : "s"}{" "}
              para crear.
            </p>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nombre</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">País</th>
                    <th className="px-3 py-2 font-medium">Rol</th>
                    <th className="px-3 py-2 font-medium">Profesión</th>
                  </tr>
                </thead>
                <tbody>
                  {state.validRows.map((r) => (
                    <tr key={r.email} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-foreground">{r.name}</td>
                      <td className="px-3 py-2 text-foreground">{r.email}</td>
                      <td className="px-3 py-2 text-foreground">{r.country}</td>
                      <td className="px-3 py-2 text-foreground">{r.role}</td>
                      <td className="px-3 py-2 text-foreground">{r.profession}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {state.step === "importing" && state.progress && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-foreground">
              Creando usuario {Math.min(state.progress.done + 1, state.progress.total)} de{" "}
              {state.progress.total}
              {state.progress.currentEmail ? ` (${state.progress.currentEmail})` : ""}…
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.round((state.progress.done / Math.max(state.progress.total, 1)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              No cierres esta ventana mientras se importa.
            </p>
          </div>
        )}

        {state.step === "done" && state.outcome && (
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700">
            {state.outcome.importedCount} usuario{state.outcome.importedCount === 1 ? "" : "s"}{" "}
            importado{state.outcome.importedCount === 1 ? "" : "s"} correctamente.
          </p>
        )}

        {state.step === "failed" && state.outcome?.failedRow && (
          <div className="flex flex-col gap-2">
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              Falló en la fila {state.outcome.failedRow.rowNumber} ({state.outcome.failedRow.email}):{" "}
              {state.outcome.failedRow.message}. Se revirtieron{" "}
              {state.outcome.rolledBackCount ?? 0} usuario
              {(state.outcome.rolledBackCount ?? 0) === 1 ? "" : "s"} ya creado
              {(state.outcome.rolledBackCount ?? 0) === 1 ? "" : "s"} en este intento. No se importó
              nada.
            </p>
            {state.outcome.rollbackErrors && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700">
                Además, algunos usuarios no se pudieron revertir automáticamente — revísalos a
                mano en la tabla: {state.outcome.rollbackErrors.join(" ")}
              </p>
            )}
            <button
              type="button"
              onClick={reset}
              className="self-start rounded-md border border-input px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Elegir otro archivo
            </button>
          </div>
        )}

        <DialogFooter>
          {state.step === "preview" && (
            <>
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Confirmar importación ({state.validRows.length})
              </button>
            </>
          )}
          {(state.step === "done" || state.step === "blocked" || state.step === "pick") && (
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Cerrar
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
