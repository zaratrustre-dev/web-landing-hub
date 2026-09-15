// 9 roles profesionales elegibles (PDR §5, Master Prompt §5, skill
// connect-it-product) — se usan idénticos para Role y Role Sought (PDR §6):
// el usuario elige su propio rol y, por separado, qué rol busca, del mismo
// catálogo de 9.
//
// Actualización 15/09/2026: se añadió una 10ª categoría, "Apprentice", que
// NO aparece en este grid de 9 — nunca se elige a mano en Role ni en Role
// Sought. Se asigna automáticamente cuando, en la nueva pregunta de
// onboarding "Do you have experience as an entrepreneur?" (entre Terms y
// Role), el usuario responde "No": salta la pantalla de Role y su categoría
// queda fijada en "apprentice", continuando el registro en Role Sought.
// Sigue siendo editable después desde Edit Profile (selector simple, con
// las 10 categorías) para cualquier usuario, incluido volver de Apprentice a
// una de las 9 o viceversa.
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

export const APPRENTICE_ROLE = "apprentice" as const;

export type ProfessionalRole = (typeof PROFESSIONAL_ROLES)[number] | typeof APPRENTICE_ROLE;

/** Las 10 categorías, para selectores que sí deben ofrecer Apprentice (Edit Profile). */
export const ALL_PROFESSIONAL_ROLES = [...PROFESSIONAL_ROLES, APPRENTICE_ROLE] as const;

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
  apprentice: "Apprentice",
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
  apprentice: "school-outline",
};
