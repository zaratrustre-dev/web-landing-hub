// Edge Function user-lifecycle-emails: envía los emails automáticos de
// ciclo de vida de usuario (bienvenida al crear cuenta, confirmación al
// borrarla). La dispara un trigger de Postgres (pg_net), NO un usuario
// logueado — por eso NO usa auth de tipo "user": en su lugar comprueba un
// secreto compartido (X-Webhook-Secret) para saber que la llamada viene de
// verdad de nuestra base de datos.
//
// Requiere los secrets: RESEND_API_KEY, WEBHOOK_SHARED_SECRET (el mismo
// valor que se generó en la migración 15, tabla public.internal_config),
// y opcionalmente PUBLIC_APP_URL (si no se pone, usa un valor por defecto).
import { createClient } from "@supabase/supabase-js";
import {
  ACCOUNT_DELETED_EMAIL_SUBJECT,
  accountDeletedEmailHtml,
  WELCOME_EMAIL_SUBJECT,
  welcomeEmailHtml,
} from "./_shared/email-templates.ts";

const RESEND_FROM = "Connect-it <onboarding@resend.dev>";
const DEFAULT_APP_URL =
  "https://zaratrustre-dev-web-landing-hub.connect-it-app.workers.dev";

interface UserCreatedPayload {
  event: "user_created";
  user_id: string;
  email: string;
  name: string | null;
}

interface AccountDeletedPayload {
  event: "account_deleted";
  email: string;
  name: string | null;
}

type Payload = UserCreatedPayload | AccountDeletedPayload;

async function sendResendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; errorText: string | null }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
  return { ok: res.ok, errorText: res.ok ? null : await res.text() };
}

Deno.serve(async (req) => {
  const sharedSecret = Deno.env.get("WEBHOOK_SHARED_SECRET");
  const providedSecret = req.headers.get("X-Webhook-Secret");
  if (!sharedSecret || providedSecret !== sharedSecret) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return Response.json(
      { error: "Falta el secret RESEND_API_KEY en el proyecto de Supabase." },
      { status: 500 },
    );
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const appUrl = Deno.env.get("PUBLIC_APP_URL") ?? DEFAULT_APP_URL;

  let subject: string;
  let html: string;
  let recipientEmail: string;
  let recipientUserId: string | null;

  if (payload.event === "user_created") {
    subject = WELCOME_EMAIL_SUBJECT;
    html = welcomeEmailHtml({
      nombre: payload.name ?? "",
      verificationUrl: `${appUrl}/admin`,
    });
    recipientEmail = payload.email;
    recipientUserId = payload.user_id;
  } else if (payload.event === "account_deleted") {
    subject = ACCOUNT_DELETED_EMAIL_SUBJECT;
    html = accountDeletedEmailHtml({ nombre: payload.name ?? "" });
    recipientEmail = payload.email;
    // El perfil ya no existe (se borró en cascada): no hay a qué referenciar.
    recipientUserId = null;
  } else {
    return Response.json({ error: "event no reconocido" }, { status: 400 });
  }

  const { ok, errorText } = await sendResendEmail(
    apiKey,
    recipientEmail,
    subject,
    html,
  );

  await supabaseAdmin.from("email_log").insert({
    provider: "resend",
    email_type: "transactional",
    recipient_user_id: recipientUserId,
    recipient_email: recipientEmail,
    subject,
    external_template_id: `code:${payload.event}`,
    status: ok ? "sent" : "failed",
    error_message: ok ? null : errorText,
  });

  return Response.json({ success: ok });
});
