// Tipos escritos a mano, reflejando el esquema REAL de connect-it (proyecto
// único compartido con el panel admin — verificado contra la base de datos
// de producción antes de escribirlos). Mismo patrón que
// src/lib/database.types.ts del panel admin (Partial<Row> para Update),
// y misma versión de @supabase/supabase-js fijada (2.115.0) para evitar
// discrepancias de tipos entre versiones.
export type ProfessionalRole =
  | "developer"
  | "designer"
  | "entrepreneur"
  | "marketing"
  | "consultant"
  | "lender"
  | "logistics"
  | "recruiter"
  | "influencer"
  // "Apprentice" (Aprendiz), añadida 15/09/2026 — ver constants/roles.ts.
  | "apprentice";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string | null;
          age: number | null;
          photo_url: string | null;
          role: ProfessionalRole | null;
          role_sought: ProfessionalRole | null;
          profession: string | null;
          description: string | null;
          portfolio_url: string | null;
          terms_accepted_at: string | null;
          onboarding_completed: boolean;
          is_blocked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      skills: {
        Row: { id: string; name: string };
        Insert: { id?: string; name: string };
        Update: Partial<{ id: string; name: string }>;
      };
      profile_skills: {
        Row: { profile_id: string; skill_id: string; created_at: string };
        Insert: { profile_id: string; skill_id: string };
        Update: Partial<{ profile_id: string; skill_id: string }>;
      };
    };
    Functions: Record<string, never>;
    Views: Record<string, never>;
  };
}
