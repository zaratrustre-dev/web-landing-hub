import { createFileRoute } from "@tanstack/react-router";

import avatarMarco from "@/assets/avatar-marco.jpg";
import profileCard from "@/assets/profile-card.jpg";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Connect-it — Networking profesional con match y chat" },
      {
        name: "description",
        content:
          "Descubre profesionales por categoría, skill y país. Conecta con Likes mutuos, haz Match y empieza a conversar. Acceso con Google o Apple.",
      },
      { property: "og:title", content: "Connect-it — Networking profesional con match y chat" },
      {
        property: "og:description",
        content:
          "Descubre profesionales por categoría, skill y país, conecta con Likes mutuos y conversa.",
      },
    ],
  }),
  component: Landing,
});

const categories = [
  "Developer",
  "Designer",
  "Entrepreneur",
  "Marketing",
  "Consultant",
  "Lender",
  "Logistics",
  "Recruiter",
  "Influencer",
];

const steps = [
  {
    n: "01",
    title: "Crea tu perfil",
    text: "Foto, rol, profesión y hasta tres skills. En un minuto.",
  },
  {
    n: "02",
    title: "Filtra y descubre",
    text: "Busca por categoría, skill y país, y combina los filtros.",
  },
  { n: "03", title: "Haz Match", text: "Cuando el Like es mutuo, se abre la conexión." },
  { n: "04", title: "Conversa", text: "Chat individual desde el primer Match, sin esperas." },
];

const chatFilters = ["Por categoría", "Por skill", "Por país", "Moderado"];

function Landing() {
  return (
    <div className="page-gradient min-h-screen font-body text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-5">
        <section
          id="acceder"
          className="grid items-center gap-10 pt-4 pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-4 lg:pt-10"
        >
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-mint/60 px-3 py-1 text-xs font-semibold text-mint-ink ring-1 ring-mint-ink/10">
              Red para profesionales
            </span>
            <h1 className="mt-5 font-display text-[2.1rem] leading-[1.06] font-bold tracking-tight text-balance text-ink sm:text-4xl lg:text-[3.2rem]">
              Conecta con quien mueve tu industria.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-pretty text-ink-soft">
              Descubre perfiles profesionales, filtra por categoría, skill y país, y empieza una
              conversación en segundos. Sin feed, sin ruido.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-semibold text-primary-foreground shadow-coral transition-transform hover:-translate-y-0.5"
              >
                <span className="grid size-4 place-items-center rounded-full bg-surface/25">
                  <span className="size-1.5 rounded-full bg-surface" />
                </span>
                Continuar con Google
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-surface px-6 py-3 text-sm font-semibold text-ink ring-1 ring-line transition-transform hover:-translate-y-0.5"
              >
                <span className="grid size-4 place-items-center rounded-full bg-ink/10">
                  <span className="size-1.5 rounded-full bg-ink" />
                </span>
                Continuar con Apple
              </button>
            </div>
            <p className="mt-4 text-xs text-ink-soft">
              Al continuar aceptas los Términos y Condiciones de Connect-it.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-xs sm:max-w-sm">
            <div className="absolute -top-4 -left-3 z-10 -rotate-6 rounded-2xl bg-surface/70 px-3 py-2 shadow-xl ring-1 ring-ink/5 backdrop-blur-md">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-ink-soft">
                Match
              </span>
              <p className="text-sm font-semibold text-ink">Nueva conexión</p>
            </div>
            <article className="animate-float relative rounded-[28px] bg-surface p-4 shadow-card ring-1 ring-ink/5">
              <div className="relative aspect-[10/11] w-full overflow-hidden rounded-2xl bg-sky/50">
                <img
                  src={profileCard}
                  alt="Perfil de Lucía Ferreyra, Product Designer"
                  width={1024}
                  height={1120}
                  className="size-full object-cover"
                />
                <span className="absolute top-3 left-3 rounded-full bg-surface/85 px-2.5 py-1 text-xs font-semibold text-ink ring-1 ring-ink/5">
                  Designer
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <h2 className="truncate font-display text-xl font-bold tracking-tight">
                  Lucía Ferreyra
                </h2>
                <span className="text-sm text-ink-soft">31</span>
              </div>
              <p className="mt-0.5 max-w-full truncate text-sm font-medium text-ink-soft">
                Product Designer · AR
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="max-w-[9rem] truncate rounded-full bg-butter px-2.5 py-1 text-xs font-semibold text-butter-ink">
                  UI Design
                </span>
                <span className="max-w-[9rem] truncate rounded-full bg-sky px-2.5 py-1 text-xs font-semibold text-sky-ink">
                  Figma
                </span>
                <span className="max-w-[9rem] truncate rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-mint-ink">
                  UX Research
                </span>
              </div>
              <div className="mt-5 flex items-center justify-center gap-8">
                <button
                  type="button"
                  aria-label="Dislike"
                  className="grid size-12 place-items-center rounded-full bg-surface text-lg font-bold text-ink-soft ring-1 ring-line transition-transform hover:-translate-y-0.5 hover:ring-ink/30"
                >
                  ×
                </button>
                <button
                  type="button"
                  aria-label="Ver perfil completo"
                  className="grid size-12 place-items-center rounded-full bg-surface text-lg font-bold text-ink-soft ring-1 ring-line transition-transform hover:-translate-y-0.5 hover:ring-ink/30"
                >
                  ☆
                </button>
                <button
                  type="button"
                  aria-label="Like"
                  className="grid size-14 place-items-center rounded-full bg-coral text-xl font-bold text-primary-foreground shadow-coral-sm transition-transform hover:-translate-y-0.5"
                >
                  ♥
                </button>
              </div>
            </article>
          </div>
        </section>

        <section id="categorias" className="border-t border-line">
          <div className="flex items-end justify-between py-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-balance">
              Explora por categoría
            </h2>
            <span className="text-sm font-semibold text-coral">9 categorías</span>
          </div>
          <div className="flex flex-wrap gap-2.5 pb-14">
            {categories.map((category) => (
              <span
                key={category}
                className="rounded-full bg-surface px-4 py-2 text-sm font-medium ring-1 ring-line"
              >
                {category}
              </span>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="border-t border-line py-14">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Del Match al chat en cuatro pasos
            </h2>
            <p className="mt-3 text-pretty text-ink-soft">
              Un recorrido corto y claro para avanzar sin fricción.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.n} className="rounded-2xl bg-surface p-5 ring-1 ring-line">
                <span className="font-display text-3xl font-bold text-coral/30">{step.n}</span>
                <h3 className="mt-2 font-display text-base font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="global-chat" className="border-t border-line py-14">
          <div className="grid gap-8 rounded-[28px] bg-mint/40 p-7 ring-1 ring-mint-ink/10 sm:p-10 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="text-xs font-semibold tracking-wider uppercase text-mint-ink">
                Global Chat
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                Conversaciones profesionales en cualquier lugar.
              </h2>
              <p className="mt-3 text-pretty text-ink-soft">
                Un espacio compartido y moderado: sin enlaces, sin spam y con límite de mensajes
                para que la conversación siga siendo útil.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {chatFilters.map((filter) => (
                  <span
                    key={filter}
                    className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink ring-1 ring-line"
                  >
                    {filter}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-3 rounded-2xl bg-surface/80 p-3 ring-1 ring-ink/5">
                <img
                  src={avatarMarco}
                  alt="Marco, Developer"
                  width={512}
                  height={512}
                  loading="lazy"
                  className="size-10 shrink-0 rounded-full object-cover"
                />
                <p className="text-sm leading-relaxed text-ink-soft">
                  <span className="font-semibold text-ink">Marco:</span> Busco alguien con
                  experiencia en design systems para un proyecto de tres meses.
                </p>
              </div>
              <div className="ml-8 rounded-2xl bg-coral/10 p-3 ring-1 ring-coral/10">
                <p className="text-sm leading-relaxed text-ink">
                  <span className="font-semibold text-coral-deep">Tú:</span> He trabajado en tres.
                  Te comparto mi Briefcase.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
