// Plantillas de email para los 3 flujos automáticos de Connect-it.
// HTML + CSS inline (máxima compatibilidad con clientes de correo) con
// soporte de modo oscuro/claro vía `prefers-color-scheme`. Se importan
// desde las Edge Functions que disparan cada envío.

const BRAND_COLOR = "#f97316"; // naranja de marca de Connect-it

function layout(bodyHtml: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>Connect-it</title>
<style>
  body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  .wrapper { width: 100%; background-color: #f4f4f5; padding: 32px 16px; }
  .card { max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; }
  .header { background-color: ${BRAND_COLOR}; padding: 24px 32px; }
  .header h1 { color: #ffffff; font-size: 20px; margin: 0; font-weight: 700; }
  .content { padding: 32px; color: #27272a; font-size: 15px; line-height: 1.6; }
  .content h2 { font-size: 20px; margin: 0 0 16px; color: #18181b; }
  .content p { margin: 0 0 16px; }
  .button { display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff !important; text-decoration: none; font-weight: 600; padding: 12px 28px; border-radius: 8px; font-size: 15px; }
  .summary { background-color: #f4f4f5; border-radius: 8px; padding: 16px 20px; margin: 0 0 24px; }
  .summary-row { display: flex; justify-content: space-between; font-size: 14px; padding: 4px 0; color: #52525b; }
  .summary-row strong { color: #18181b; }
  .footer { padding: 24px 32px; font-size: 12px; color: #a1a1aa; border-top: 1px solid #e4e4e7; }
  .preheader { display: none; max-height: 0; overflow: hidden; }

  @media (prefers-color-scheme: dark) {
    body, .wrapper { background-color: #18181b !important; }
    .card { background-color: #27272a !important; border-color: #3f3f46 !important; }
    .content { color: #e4e4e7 !important; }
    .content h2 { color: #fafafa !important; }
    .summary { background-color: #18181b !important; }
    .summary-row { color: #a1a1aa !important; }
    .summary-row strong { color: #fafafa !important; }
    .footer { color: #71717a !important; border-color: #3f3f46 !important; }
  }
</style>
</head>
<body>
  <span class="preheader">${preheader}</span>
  <div class="wrapper">
    <div class="card">
      <div class="header"><h1>Connect-it</h1></div>
      <div class="content">
        ${bodyHtml}
      </div>
      <div class="footer">
        Connect-it · Este correo se ha enviado automáticamente, no es necesario responder.
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// 1. Bienvenida / verificación (ver nota: Connect-it solo usa Google OAuth,
// que ya verifica el email por sí mismo — este correo es informativo, con
// un botón a "Ir a mi perfil". Si en el futuro se añade registro por
// email/contraseña, reutilizar tal cual como verificación real: solo hay
// que cambiar el texto del botón y hacer que verificationUrl confirme la
// cuenta en vez de solo enlazar al perfil).
// ---------------------------------------------------------------------------
export interface WelcomeEmailVars {
  nombre: string;
  verificationUrl: string;
}

export function welcomeEmailHtml(
  { nombre, verificationUrl }: WelcomeEmailVars,
): string {
  return layout(
    `
      <h2>¡Hola${nombre ? `, ${nombre}` : ""}! 🎉</h2>
      <p>Te damos la bienvenida a <strong>Connect-it</strong>. Tu cuenta ya está lista para empezar a descubrir profesionales afines a ti.</p>
      <p style="text-align:center; margin: 28px 0;">
        <a class="button" href="${verificationUrl}">Ir a mi perfil</a>
      </p>
      <p style="font-size:13px; color:#71717a;">
        Si no has creado esta cuenta, puedes ignorar este correo con total tranquilidad — no se ha compartido ninguna información tuya.
      </p>
    `,
    "Te damos la bienvenida a Connect-it",
  );
}

export const WELCOME_EMAIL_SUBJECT = "Bienvenido a Connect-it";

// ---------------------------------------------------------------------------
// 2. Confirmación de borrado de cuenta
// ---------------------------------------------------------------------------
export interface AccountDeletedEmailVars {
  nombre: string;
  feedbackUrl?: string;
}

export function accountDeletedEmailHtml(
  { nombre, feedbackUrl }: AccountDeletedEmailVars,
): string {
  return layout(
    `
      <h2>Tu cuenta se ha eliminado</h2>
      <p>Hola${
      nombre ? ` ${nombre}` : ""
    }, te confirmamos que tu cuenta y todos tus datos en Connect-it se han eliminado correctamente. Esta acción no se puede deshacer.</p>
      <p>Gracias por haber formado parte de Connect-it. Esperamos haberte sido útiles mientras estuviste con nosotros.</p>
      ${
      feedbackUrl
        ? `<p style="text-align:center; margin: 28px 0;">
              <a class="button" href="${feedbackUrl}">Contarnos por qué te vas (1 min)</a>
            </p>`
        : ""
    }
      <p style="font-size:13px; color:#71717a;">
        Si no has sido tú quien ha solicitado esto, escríbenos de inmediato respondiendo a este correo.
      </p>
    `,
    "Tu cuenta de Connect-it se ha eliminado",
  );
}

export const ACCOUNT_DELETED_EMAIL_SUBJECT =
  "Tu cuenta de Connect-it se ha eliminado";

// ---------------------------------------------------------------------------
// 3. Recibo de pago de suscripción
// ---------------------------------------------------------------------------
export interface PaymentReceiptEmailVars {
  nombre: string;
  planName: string;
  amount: string; // ya formateado, p.ej. "9,99 €"
  date: string; // ya formateado, p.ej. "7 de septiembre de 2026"
  receiptId: string;
  dashboardUrl: string;
}

export function paymentReceiptEmailHtml({
  nombre,
  planName,
  amount,
  date,
  receiptId,
  dashboardUrl,
}: PaymentReceiptEmailVars): string {
  return layout(
    `
      <h2>Pago confirmado ✅</h2>
      <p>Hola${
      nombre ? ` ${nombre}` : ""
    }, hemos recibido tu pago correctamente. Aquí tienes el resumen:</p>
      <div class="summary">
        <div class="summary-row"><span>Plan</span><strong>${planName}</strong></div>
        <div class="summary-row"><span>Importe</span><strong>${amount}</strong></div>
        <div class="summary-row"><span>Fecha</span><strong>${date}</strong></div>
        <div class="summary-row"><span>Nº de recibo</span><strong>${receiptId}</strong></div>
      </div>
      <p style="text-align:center; margin: 28px 0;">
        <a class="button" href="${dashboardUrl}">Ir a Connect-it</a>
      </p>
      <p style="font-size:13px; color:#71717a;">
        Guarda este correo como justificante de tu pago. Si tienes cualquier duda sobre el cargo, respóndenos.
      </p>
    `,
    `Recibo de tu pago de ${amount} — Connect-it`,
  );
}

export const PAYMENT_RECEIPT_EMAIL_SUBJECT =
  "Recibo de tu suscripción a Connect-it";
