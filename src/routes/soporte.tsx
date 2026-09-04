import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/soporte")({
  head: () => ({
    meta: [
      { title: "Soporte — Connect-it" },
      {
        name: "description",
        content:
          "Contacta con el equipo de Connect-it para reportar un perfil, recuperar el acceso o resolver dudas sobre tu cuenta.",
      },
      { property: "og:title", content: "Soporte — Connect-it" },
      {
        property: "og:description",
        content: "Escríbenos para reportes, acceso a la cuenta o cualquier duda del producto.",
      },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <LegalPage
      title="Soporte"
      intro="Estamos para ayudarte con el acceso, tu perfil, los reportes y cualquier duda sobre Connect-it."
    >
      <LegalSection heading="Escríbenos">
        <p>
          Correo de soporte:{" "}
          <a
            href="mailto:support@connect-it.app"
            className="font-semibold text-coral-deep underline underline-offset-4"
          >
            support@connect-it.app
          </a>
        </p>
        <p>
          Respondemos en horario laboral. Confírmanos si esta dirección es la definitiva o si
          prefieres otra.
        </p>
      </LegalSection>
      <LegalSection heading="Reportar un perfil o una conversación">
        <p>
          Desde la aplicación puedes reportar un perfil o un chat, y deshacer un Match. Si necesitas
          intervención urgente, indícanoslo en el asunto del correo.
        </p>
      </LegalSection>
      <LegalSection heading="Problemas de acceso">
        <p>
          El acceso funciona con Google y Apple. Si tu proveedor no responde, prueba con el otro y
          escríbenos indicando el correo con el que te registraste.
        </p>
      </LegalSection>
      <LegalSection heading="Cuenta y datos">
        <p>
          Puedes editar tu perfil, cerrar sesión o eliminar la cuenta desde Ajustes. La eliminación
          es permanente y requiere confirmación.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
