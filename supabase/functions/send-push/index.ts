// Edge Function send-push: envía notificaciones push a usuarios de
// Connect-it vía Firebase Cloud Messaging (API HTTP v1, con OAuth2).
//
// Requiere el secret FIREBASE_SERVICE_ACCOUNT_JSON: el contenido COMPLETO
// del archivo .json descargado en Firebase Console > Configuración del
// proyecto > Cuentas de servicio > Generar nueva clave privada.
import { withSupabase } from "@supabase/server";
import {
  getGoogleAccessToken,
  type ServiceAccount,
} from "./_shared/google-auth.ts";

interface SendPushPayload {
  recipient_user_ids: string[];
  send_to_all?: boolean;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface PushLogRow {
  recipient_user_id: string | null;
  token: string;
  title: string;
  body: string;
  status: "sent" | "failed";
  error_message: string | null;
  sent_by: string;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const callerId = ctx.userClaims?.id;
    if (!callerId) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { data: roleRow, error: roleError } = await ctx.supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) {
      return Response.json({ error: roleError.message }, { status: 500 });
    }
    if (!roleRow) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }

    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      return Response.json(
        {
          error:
            "Falta el secret FIREBASE_SERVICE_ACCOUNT_JSON en el proyecto de Supabase.",
        },
        { status: 500 },
      );
    }

    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch {
      return Response.json(
        { error: "FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido." },
        { status: 500 },
      );
    }

    let payload: SendPushPayload;
    try {
      payload = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    if (!payload.title || !payload.body) {
      return Response.json({ error: "title y body son obligatorios" }, {
        status: 400,
      });
    }
    if (
      !payload.send_to_all &&
      (!payload.recipient_user_ids || payload.recipient_user_ids.length === 0)
    ) {
      return Response.json({ error: "recipient_user_ids es obligatorio" }, {
        status: 400,
      });
    }

    let recipientIds = payload.recipient_user_ids ?? [];
    if (payload.send_to_all) {
      const { data: allProfiles, error: allProfilesError } = await ctx
        .supabaseAdmin
        .from("profiles")
        .select("id");
      if (allProfilesError) throw allProfilesError;
      recipientIds = (allProfiles ?? []).map((p: { id: string }) => p.id);
    }

    // Uno o varios tokens (dispositivos) por usuario.
    const { data: tokenRows, error: tokenError } = await ctx.supabaseAdmin
      .from("push_tokens")
      .select("user_id, token")
      .in("user_id", recipientIds);
    if (tokenError) {
      return Response.json({ error: tokenError.message }, { status: 500 });
    }

    if (!tokenRows || tokenRows.length === 0) {
      return Response.json({
        success: true,
        sent: 0,
        failed: 0,
        note: "Nadie tiene dispositivos registrados.",
      });
    }

    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken(serviceAccount);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : "Error obteniendo el token de Google";
      return Response.json({ error: message }, { status: 500 });
    }

    const logs: PushLogRow[] = [];

    for (const row of tokenRows as { user_id: string; token: string }[]) {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token: row.token,
              notification: { title: payload.title, body: payload.body },
              ...(payload.data ? { data: payload.data } : {}),
            },
          }),
        },
      );

      const ok = res.ok;
      const errorText = ok ? null : await res.text();

      logs.push({
        recipient_user_id: row.user_id,
        token: row.token,
        title: payload.title,
        body: payload.body,
        status: ok ? "sent" : "failed",
        error_message: ok ? null : errorText,
        sent_by: callerId,
      });
    }

    await (
      ctx.supabaseAdmin.from("push_log") as unknown as {
        insert: (v: unknown) => Promise<{ error: unknown }>;
      }
    ).insert(logs);

    return Response.json({
      success: true,
      sent: logs.filter((l) => l.status === "sent").length,
      failed: logs.filter((l) => l.status === "failed").length,
    });
  }),
};
