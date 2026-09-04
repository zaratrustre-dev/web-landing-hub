import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/legal-page";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos y Condiciones — Connect-it" },
      {
        name: "description",
        content:
          "Condiciones de uso de Connect-it: cuentas, contenido del perfil, normas del Global Chat, reportes y eliminación de cuenta.",
      },
      { property: "og:title", content: "Términos y Condiciones — Connect-it" },
      {
        property: "og:description",
        content: "Condiciones de uso, normas de convivencia y gestión de la cuenta en Connect-it.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Términos y Condiciones"
      intro="Al crear una cuenta en Connect-it aceptas estas condiciones. Resumen provisional: revísalo con tu equipo legal antes de publicar."
    >
      <LegalSection heading="1. Cuenta y acceso">
        <p>
          El acceso se realiza mediante Google o Apple. No se permite el registro con email y
          contraseña. Debes tener 18 años o más y usar información veraz en tu perfil.
        </p>
      </LegalSection>
      <LegalSection heading="2. Perfil profesional">
        <p>
          Tu perfil incluye foto, nombre, edad, profesión (máximo 20 caracteres), hasta 3 skills,
          una descripción de hasta 200 caracteres y un enlace profesional (Briefcase). Nombre y
          edad no pueden modificarse después del registro.
        </p>
      </LegalSection>
      <LegalSection heading="3. Uso aceptable">
        <p>
          Connect-it es una red profesional. No se permite contenido romántico o sexual, acoso,
          suplantación de identidad, spam ni enlaces en el Global Chat. El Global Chat aplica
          moderación de lenguaje y un límite de 5 mensajes cada 10 segundos.
        </p>
      </LegalSection>
      <LegalSection heading="4. Conexiones y límites">
        <p>
          Las cuentas gratuitas disponen de 3 Likes al día, que se recuperan en una ventana de 24
          horas. Un Like mutuo genera un Match y habilita el chat individual.
        </p>
      </LegalSection>
      <LegalSection heading="5. Seguridad y reportes">
        <p>
          Puedes reportar perfiles y conversaciones, así como deshacer un Match (Unmatch) en
          cualquier momento. Las cuentas que incumplan estas normas pueden ser suspendidas.
        </p>
      </LegalSection>
      <LegalSection heading="6. Eliminación de cuenta">
        <p>
          Puedes cerrar sesión sin perder la cuenta, o eliminarla de forma permanente desde
          Ajustes. La eliminación requiere confirmación explícita y borra tu perfil y tus
          conversaciones.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
