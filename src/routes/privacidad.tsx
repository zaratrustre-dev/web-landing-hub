import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Privacidad — Connect-it" },
      {
        name: "description",
        content:
          "Qué datos recoge Connect-it, cómo se usan para el discovery profesional y cómo puedes eliminarlos.",
      },
      { property: "og:title", content: "Privacidad — Connect-it" },
      {
        property: "og:description",
        content: "Datos que recogemos, cómo se usan y cómo ejercer tus derechos en Connect-it.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacidad"
      intro="Explicación provisional de cómo tratamos tus datos. Sustituye este texto por la política definitiva antes de publicar."
    >
      <LegalSection heading="Datos que recogemos">
        <p>
          Datos de acceso proporcionados por Google o Apple (nombre y correo), los datos de perfil
          que introduces y la actividad necesaria para el producto: Likes, Matches y mensajes.
        </p>
      </LegalSection>
      <LegalSection heading="Cómo los usamos">
        <p>
          Para mostrar tu perfil a otros profesionales, aplicar los filtros de categoría, skill y
          país, generar Matches, habilitar el chat y moderar el Global Chat.
        </p>
      </LegalSection>
      <LegalSection heading="Qué ven otras personas">
        <p>
          Tu foto, nombre, edad, profesión, skills, descripción y Briefcase. Tu correo electrónico
          nunca se muestra en la aplicación.
        </p>
      </LegalSection>
      <LegalSection heading="Tus derechos">
        <p>
          Puedes editar tu perfil, deshacer Matches y eliminar la cuenta en cualquier momento. Para
          cualquier solicitud sobre tus datos, escríbenos desde la página de Soporte.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
