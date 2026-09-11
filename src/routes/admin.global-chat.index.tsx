import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase";
import {
  fetchGlobalChatMessages,
  fetchProfileName,
  moderateGlobalChatMessage,
  type GlobalChatMessageRow,
} from "@/lib/admin";
import { useIsAdmin, useSession } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/admin/global-chat/")({
  head: () => ({
    meta: [{ title: "Chat global — Panel admin Connect-it" }],
  }),
  component: AdminGlobalChatPage,
});

interface RawChatRow {
  id: string;
  sender_id: string;
  content: string;
  is_blocked: boolean;
  block_reason: string | null;
  created_at: string;
}

function AdminGlobalChatPage() {
  const { session, loading: loadingSession } = useSession();
  const isAdmin = useIsAdmin(session?.user.id);
  const navigate = useNavigate();

  const [messages, setMessages] = useState<GlobalChatMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Caché de nombres ya resueltos, para no repetir consultas por cada mensaje en vivo.
  const nameCache = useRef<Map<string, string | null>>(new Map());

  useEffect(() => {
    if (!loadingSession && !session) navigate({ to: "/admin/login" });
  }, [loadingSession, session, navigate]);

  useEffect(() => {
    if (isAdmin !== true) return;

    let cancelled = false;

    fetchGlobalChatMessages(100)
      .then((rows) => {
        if (cancelled) return;
        // Más antiguos arriba, más recientes abajo (orden natural de chat).
        const ordered = [...rows].reverse();
        setMessages(ordered);
        for (const m of ordered) nameCache.current.set(m.sender_id, m.sender_name);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err, "No se pudo cargar el chat global."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const channel = supabase
      .channel("admin-global-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_chat_messages" },
        (payload) => {
          const row = payload.new as RawChatRow;

          const appendWithName = (name: string | null) => {
            setMessages((prev) => [
              ...prev,
              {
                id: row.id,
                sender_id: row.sender_id,
                sender_name: name,
                content: row.content,
                is_blocked: row.is_blocked,
                block_reason: row.block_reason,
                created_at: row.created_at,
              },
            ]);
          };

          const cached = nameCache.current.get(row.sender_id);
          if (cached !== undefined) {
            appendWithName(cached);
          } else {
            fetchProfileName(row.sender_id)
              .then((name) => {
                nameCache.current.set(row.sender_id, name);
                appendWithName(name);
              })
              .catch(() => appendWithName(null));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "global_chat_messages" },
        (payload) => {
          const row = payload.new as RawChatRow;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.id
                ? { ...m, is_blocked: row.is_blocked, block_reason: row.block_reason }
                : m,
            ),
          );
        },
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleToggleBlock(message: GlobalChatMessageRow) {
    setModeratingId(message.id);
    setError(null);
    try {
      if (message.is_blocked) {
        await moderateGlobalChatMessage(message.id, false);
      } else {
        const reason = window.prompt("Motivo del bloqueo (opcional):") ?? undefined;
        await moderateGlobalChatMessage(message.id, true, reason);
      }
      // La propia suscripción UPDATE ya actualizará la fila cuando llegue el evento,
      // pero lo reflejamos también al instante para que se sienta inmediato.
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, is_blocked: !m.is_blocked } : m)),
      );
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo actualizar el mensaje."));
    } finally {
      setModeratingId(null);
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
      <div className="mx-auto max-w-2xl">
        <Link to="/admin" className="text-sm text-muted-foreground hover:underline">
          ← Panel
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Chat global</h1>
          <span
            className={
              connected
                ? "flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600"
                : "flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
            }
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-muted-foreground"}`}
            />
            {connected ? "En vivo" : "Conectando…"}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Los mensajes nuevos aparecen aquí automáticamente, sin recargar la página.
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-4 flex h-[60vh] flex-col overflow-y-auto rounded-xl border border-border p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay mensajes.</p>
          ) : (
            <div className="flex flex-1 flex-col gap-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg border p-3 text-sm ${
                    m.is_blocked ? "border-destructive/30 bg-destructive/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{m.sender_name ?? "—"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleTimeString()}
                      </span>
                      <button
                        type="button"
                        disabled={moderatingId === m.id}
                        onClick={() => handleToggleBlock(m)}
                        className={
                          m.is_blocked
                            ? "rounded-md border border-input px-2 py-1 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
                            : "rounded-md border border-destructive/40 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        }
                      >
                        {moderatingId === m.id ? "…" : m.is_blocked ? "Desbloquear" : "Bloquear"}
                      </button>
                    </div>
                  </div>
                  <p
                    className={`mt-1 ${m.is_blocked ? "text-muted-foreground line-through" : "text-foreground"}`}
                  >
                    {m.content}
                  </p>
                  {m.is_blocked && m.block_reason && (
                    <p className="mt-1 text-xs text-destructive">Motivo: {m.block_reason}</p>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
