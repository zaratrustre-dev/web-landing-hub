// Edge Function send-email: envía emails a usuarios de Connect-it.
//   - send_transactional: vía Resend, usando una plantilla ya publicada ahí.
//   - send_commercial:    vía Brevo, usando una plantilla de ahí. SOLO se
//     manda a destinatarios con profiles.marketing_consent = true — el
//     filtro se aplica aquí, en el servidor, no solo en el frontend.
//
// Las plantillas viven en el dashboard de cada proveedor, no en Connect-it
// (decisión de arquitectura). Aquí solo seleccionamos destinatarios de
// nuestra base de datos y disparamos el envío.
//
// Requiere los secrets RESEND_API_KEY y BREVO_API_KEY configurados en el
// proyecto de Supabase (Project Settings > Edge Functions > Secrets).
import { withSupabase } from "@supabase/server";

interface SendTransactionalPayload {
  action: "send_transactional";
  recipient_user_ids: string[];
  send_to_all?: boolean;
  radar_only?: boolean;
  country?: string;
  resend_template_id: string;
  subject?: string;
  variables?: Record<string, string | number>;
}

interface SendCommercialPayload {
  action: "send_commercial";
  recipient_user_ids: string[];
  send_to_all?: boolean;
  radar_only?: boolean;
  country?: string;
  brevo_template_id: number;
  params?: Record<string, string | number>;
}

type Payload = SendTransactionalPayload | SendCommercialPayload;

// Remitente de pruebas de Resend. Solo entrega a la propia cuenta de Resend
// hasta que se verifique un dominio propio (ver roadmap).
const RESEND_FROM = "Connect-it <onboarding@resend.dev>";

interface Recipient {
  id: string;
  email: string;
  name: string | null;
}

async function fetchRecipients(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  userIds: string[],
): Promise<Recipient[]> {
  const { data: profileRows, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, name")
    .in("id", userIds);
  if (profileError) throw profileError;

  const nameById = new Map<string, string | null>(
    (profileRows ?? []).map((
      p: { id: string; name: string | null },
    ) => [p.id, p.name]),
  );

  const recipients: Recipient[] = [];
  for (const id of userIds) {
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin
      .getUserById(id);
    if (userError || !userData?.user?.email) continue; // usuario borrado o sin email: se omite
    recipients.push({
      id,
      email: userData.user.email,
      name: nameById.get(id) ?? null,
    });
  }
  return recipients;
}

interface LogRow {
  provider: "resend" | "brevo";
  email_type: "transactional" | "commercial";
  recipient_user_id: string;
  recipient_email: string;
  subject: string;
  external_template_id: string;
  sent_by: string;
  status: "sent" | "failed";
  error_message: string | null;
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

    let payload: Payload;
    try {
      payload = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    if (
      !payload.send_to_all &&
      (!payload.recipient_user_ids || payload.recipient_user_ids.length === 0)
    ) {
      return Response.json({ error: "recipient_user_ids es obligatorio" }, {
        status: 400,
      });
    }

    // "Enviar a todos": el servidor obtiene la lista completa de IDs de
    // profiles (opcionalmente filtrada por Radar y/o país), en vez de
    // fiarse de una lista mandada por el cliente (que podría estar
    // incompleta o desactualizada para envíos masivos).
    let recipientIds = payload.recipient_user_ids ?? [];
    if (payload.send_to_all) {
      let query = ctx.supabaseAdmin.from("profiles").select("id");
      if (payload.radar_only) query = query.eq("radar_enabled", true);
      if (payload.country) query = query.eq("country", payload.country);

      const { data: allProfiles, error: allProfilesError } = await query;
      if (allProfilesError) throw allProfilesError;
      recipientIds = (allProfiles ?? []).map((p: { id: string }) => p.id);
    }

    try {
      if (payload.action === "send_transactional") {
        const apiKey = Deno.env.get("RESEND_API_KEY");
        if (!apiKey) {
          return Response.json(
            {
              error:
                "Falta el secret RESEND_API_KEY en el proyecto de Supabase.",
            },
            { status: 500 },
          );
        }
        if (!payload.resend_template_id) {
          return Response.json({ error: "resend_template_id es obligatorio" }, {
            status: 400,
          });
        }

        const recipients = await fetchRecipients(
          ctx.supabaseAdmin,
          recipientIds,
        );
        const logs: LogRow[] = [];

        for (const r of recipients) {
          const variables = {
            nombre: r.name ?? "",
            ...(payload.variables ?? {}),
          };

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: RESEND_FROM,
              to: r.email,
              ...(payload.subject ? { subject: payload.subject } : {}),
              template: { id: payload.resend_template_id, variables },
            }),
          });

          const ok = res.ok;
          const bodyText = ok ? null : await res.text();

          logs.push({
            provider: "resend",
            email_type: "transactional",
            recipient_user_id: r.id,
            recipient_email: r.email,
            subject: payload.subject ?? "(definido por la plantilla)",
            external_template_id: payload.resend_template_id,
            sent_by: callerId,
            status: ok ? "sent" : "failed",
            error_message: ok ? null : bodyText,
          });
        }

        await (ctx.supabaseAdmin.from("email_log") as unknown as {
          insert: (v: unknown) => Promise<{ error: unknown }>;
        }).insert(logs);

        return Response.json({
          success: true,
          sent: logs.filter((l) => l.status === "sent").length,
          failed: logs.filter((l) => l.status === "failed").length,
        });
      }

      if (payload.action === "send_commercial") {
        const apiKey = Deno.env.get("BREVO_API_KEY");
        if (!apiKey) {
          return Response.json(
            {
              error:
                "Falta el secret BREVO_API_KEY en el proyecto de Supabase.",
            },
            { status: 500 },
          );
        }
        if (!payload.brevo_template_id) {
          return Response.json({ error: "brevo_template_id es obligatorio" }, {
            status: 400,
          });
        }

        // Filtro de consentimiento aplicado en el SERVIDOR, no solo en el
        // frontend: solo se manda a quien tenga marketing_consent = true.
        const { data: consentRows, error: consentError } = await ctx
          .supabaseAdmin
          .from("profiles")
          .select("id")
          .in("id", recipientIds)
          .eq("marketing_consent", true);
        if (consentError) throw consentError;

        const consentedIds = new Set(
          (consentRows ?? []).map((p: { id: string }) => p.id),
        );
        const skipped = recipientIds.filter((id) => !consentedIds.has(id));
        const allowedIds = recipientIds.filter((id) => consentedIds.has(id));

        const recipients = await fetchRecipients(ctx.supabaseAdmin, allowedIds);
        const logs: LogRow[] = [];

        for (const r of recipients) {
          const params = {
            NOMBRE: r.name ?? "",
            ...(payload.params ?? {}),
          };

          const res = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: [{ email: r.email, name: r.name ?? undefined }],
              templateId: payload.brevo_template_id,
              params,
            }),
          });

          const ok = res.ok;
          const bodyText = ok ? null : await res.text();

          logs.push({
            provider: "brevo",
            email_type: "commercial",
            recipient_user_id: r.id,
            recipient_email: r.email,
            subject: "(definido por la plantilla)",
            external_template_id: String(payload.brevo_template_id),
            sent_by: callerId,
            status: ok ? "sent" : "failed",
            error_message: ok ? null : bodyText,
          });
        }

        if (logs.length > 0) {
          await (ctx.supabaseAdmin.from("email_log") as unknown as {
            insert: (v: unknown) => Promise<{ error: unknown }>;
          }).insert(logs);
        }

        return Response.json({
          success: true,
          sent: logs.filter((l) => l.status === "sent").length,
          failed: logs.filter((l) => l.status === "failed").length,
          skipped_no_consent: skipped.length,
        });
      }

      return Response.json({ error: "Acción no reconocida" }, { status: 400 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      return Response.json({ error: message }, { status: 500 });
    }
  }),
};
