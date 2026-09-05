// Tipos generados a partir de supabase/migrations/*.
// Regenerar con Docker instalado localmente:
//   npx supabase start
//   npx supabase gen types typescript --local > src/lib/database.types.ts
// o contra el proyecto remoto ya enlazado:
//   npx supabase gen types typescript --linked > src/lib/database.types.ts

export type ProfessionalRole =
  | "developer"
  | "designer"
  | "entrepreneur"
  | "marketing"
  | "consultant"
  | "lender"
  | "logistics"
  | "recruiter"
  | "influencer";

export type MatchStatus = "active" | "unmatched";
export type ReportTargetType = "profile" | "chat";
export type AppRole = "admin";

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
          briefcase_url: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      user_roles: {
        Row: { user_id: string; role: AppRole; created_at: string };
        Insert: { user_id: string; role: AppRole };
        Update: Partial<{ user_id: string; role: AppRole }>;
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
      likes: {
        Row: {
          id: string;
          from_profile: string;
          to_profile: string;
          is_like: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_profile: string;
          to_profile: string;
          is_like: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["likes"]["Row"]>;
      };
      matches: {
        Row: {
          id: string;
          profile_a: string;
          profile_b: string;
          status: MatchStatus;
          created_at: string;
          unmatched_at: string | null;
          unmatched_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["matches"]["Row"]> & {
          profile_a: string;
          profile_b: string;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Row"]>;
      };
      chat_messages: {
        Row: {
          id: string;
          match_id: string;
          sender_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          sender_id: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Row"]>;
      };
      global_chat_messages: {
        Row: {
          id: string;
          sender_id: string;
          content: string;
          is_blocked: boolean;
          block_reason: string | null;
          created_at: string;
        };
        Insert: { id?: string; sender_id: string; content: string };
        Update: Partial<Database["public"]["Tables"]["global_chat_messages"]["Row"]>;
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: ReportTargetType;
          target_profile_id: string | null;
          target_match_id: string | null;
          reason: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["reports"]["Row"], "id" | "created_at"> & {
          id?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
      };
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: "ios" | "android" | "web";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          platform: "ios" | "android" | "web";
        };
        Update: Partial<Database["public"]["Tables"]["push_tokens"]["Row"]>;
      };
      email_templates: {
        Row: {
          id: string;
          name: string;
          subject: string;
          body_html: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject: string;
          body_html: string;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["email_templates"]["Row"]>;
      };
      email_log: {
        Row: {
          id: string;
          template_id: string | null;
          sent_by: string | null;
          recipient_email: string;
          subject: string;
          status: "queued" | "sent" | "failed";
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id?: string | null;
          sent_by?: string | null;
          recipient_email: string;
          subject: string;
          status?: "queued" | "sent" | "failed";
        };
        Update: Partial<Database["public"]["Tables"]["email_log"]["Row"]>;
      };
    };
    Functions: {
      is_admin: { Args: { uid?: string }; Returns: boolean };
      likes_used_last_24h: { Args: { uid?: string }; Returns: number };
    };
    Views: Record<string, never>;
    Enums: {
      professional_role: ProfessionalRole;
      match_status: MatchStatus;
      report_target_type: ReportTargetType;
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
}
