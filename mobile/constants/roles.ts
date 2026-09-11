// Exactamente 9 roles profesionales — regla inmutable (PDR §5, Master Prompt
// §5, skill connect-it-product). Se usan idénticos para Role y Role Sought
// (PDR §6): el usuario elige su propio rol y, por separado, qué rol busca,
// del mismo catálogo de 9.
export const PROFESSIONAL_ROLES = [
  "developer",
  "designer",
  "entrepreneur",
  "marketing",
  "consultant",
  "lender",
  "logistics",
  "recruiter",
  "influencer",
] as const;

export type ProfessionalRole = (typeof PROFESSIONAL_ROLES)[number];

export const ROLE_LABELS: Record<ProfessionalRole, string> = {
  developer: "Developer",
  designer: "Designer",
  entrepreneur: "Entrepreneur",
  marketing: "Marketing",
  consultant: "Consultant",
  lender: "Lender",
  logistics: "Logistics",
  recruiter: "Recruiter",
  influencer: "Influencer",
};

// Icono representativo de cada rol (Ionicons). Elección propia, no viene
// especificada en el PDR ni en Figma con precisión suficiente para
// extraerla de la metadata — puede ajustarse sin romper nada funcional.
export const ROLE_ICONS: Record<ProfessionalRole, string> = {
  developer: "code-slash-outline",
  designer: "color-palette-outline",
  entrepreneur: "rocket-outline",
  marketing: "megaphone-outline",
  consultant: "briefcase-outline",
  lender: "cash-outline",
  logistics: "cube-outline",
  recruiter: "people-outline",
  influencer: "megaphone-outline",
};
