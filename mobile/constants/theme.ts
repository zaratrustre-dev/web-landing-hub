export const colors = {
  background: "#121414",
  backgroundGradientEnd: "#0d0e0f",
  surface: "#1F2020",
  surfaceElevated: "#27272A",
  border: "rgba(255,255,255,0.05)",
  primary: "#FF6B2C",
  primaryForeground: "#0A0A0A",
  text: "#E3E2E2",
  textMuted: "#E2BFB3",
  textSecondary: "#C8C6C5",
  textFaint: "#71717A",
  // Fondo de la profile card (Discovery, PDR §04) — distinto de `surface`,
  // tomado del export de Figma.
  cardBackground: "#1B1C1C",
  cardButtonBackground: "#292A2A",
  destructive: "#EF4444",
  success: "#22C55E",
  googleButtonBg: "#FFFFFF",
  googleButtonText: "#000000",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  display: 48,
} as const;

export const fontFamily = {
  heading: "Inter_800ExtraBold",
  body: "Inter_400Regular",
  mono: "JetBrainsMono_700Bold",
} as const;
