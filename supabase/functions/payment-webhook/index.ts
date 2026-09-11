// Edge Function payment-webhook: recibe el webhook de la pasarela de pago
// (Stripe) cuando se confirma un cobro, y envía el recibo por email.
//
// IMPORTANTE: este endpoint NO comprueba ningún JWT de Supabase — lo llama
// Stripe directamente, sin sesión de usuario. La seguridad viene de
// verificar la FIRMA del webhook con STRIPE_WEBHOOK_SECRET (por eso hay que
// desplegarlo con verify_jwt = false, ver supabase/config.toml).
//
// Requiere los secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
// RESEND_API_KEY. Todavía no hay pagos activos en Connect-it (PDR §23:
// Store desactivada) — esta función queda preparada para cuando se active.
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  PAYMENT_RECEIPT_EMAIL_SUBJECT,
  paymentReceiptEmailHtml,
} from "./_shared/email-templates.ts";

const RESEND_FROM = "Connect-it <onboarding@resend.dev>";
const DEFAULT_APP_URL =
  "https://zaratrustre-dev-web-landing-hub.connect-it-app.workers.dev";

function formatAmount(amountInSmallestUnit: number, currency: string): string {
  const value = amountInSmallestUnit / 100;
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency.toUpperCase(),
    })
      .format(value);
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

Deno.serve(async (req) => {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!stripeSecretKey || !webhookSecret || !resendApiKey) {
    return Response.json(
      {
        error:
          "Faltan secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET o RESEND_API_KEY.",
      },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Falta la cabecera stripe-signature." }, {
      status: 400,
    });
  }

  // Stripe necesita el cuerpo EN CRUDO (sin parsear) para validar la firma.
  const rawBody = await req.text();

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Firma inválida";
    return Response.json({ error: `Webhook inválido: ${message}` }, {
      status: 400,
    });
  }

  // Solo nos interesan los eventos de cobro confirmado. Se contemplan los
  // dos más comunes según cómo esté montado el checkout/suscripción.
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "invoice.payment_succeeded"
  ) {
    return Response.json({ success: true, ignored: event.type });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let email: string | null = null;
  let amount = 0;
  let currency = "eur";
  let planName = "Suscripción";
  let receiptId = event.id;
  let createdUnix = event.created;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    email = session.customer_details?.email ?? session.customer_email ?? null;
    amount = session.amount_total ?? 0;
    currency = session.currency ?? "eur";
    planName = session.metadata?.plan_name ?? planName;
    receiptId = session.id;
  } else {
    const invoice = event.data.object as Stripe.Invoice;
    email = invoice.customer_email ?? null;
    amount = invoice.amount_paid ?? 0;
    currency = invoice.currency ?? "eur";
    planName = invoice.lines?.data?.[0]?.description ?? planName;
    receiptId = invoice.id ?? event.id;
    createdUnix = invoice.created ?? event.created;
  }

  if (!email) {
    return Response.json({
      error: "El evento de Stripe no trae un email de cliente.",
    }, {
      status: 400,
    });
  }

  // Busca el nombre del usuario en Connect-it, si el email coincide con
  // alguno (opcional — el recibo se manda igualmente aunque no coincida).
  let recipientName = "";
  let recipientUserId: string | null = null;
  const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
  const matchedUser = userList?.users.find((u) => u.email === email);
  if (matchedUser) {
    recipientUserId = matchedUser.id;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", matchedUser.id)
      .maybeSingle();
    recipientName = profile?.name ?? "";
  }

  const html = paymentReceiptEmailHtml({
    nombre: recipientName,
    planName,
    amount: formatAmount(amount, currency),
    date: formatDate(createdUnix),
    receiptId,
    dashboardUrl: `${Deno.env.get("PUBLIC_APP_URL") ?? DEFAULT_APP_URL}/admin`,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: email,
      subject: PAYMENT_RECEIPT_EMAIL_SUBJECT,
      html,
    }),
  });

  const ok = res.ok;
  const errorText = ok ? null : await res.text();

  await supabaseAdmin.from("email_log").insert({
    provider: "resend",
    email_type: "transactional",
    recipient_user_id: recipientUserId,
    recipient_email: email,
    subject: PAYMENT_RECEIPT_EMAIL_SUBJECT,
    external_template_id: "code:payment_receipt",
    status: ok ? "sent" : "failed",
    error_message: ok ? null : errorText,
  });

  return Response.json({ success: ok });
});
