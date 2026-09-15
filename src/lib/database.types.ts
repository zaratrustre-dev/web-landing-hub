export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          match_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          match_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          match_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          created_at: string
          email_type: string | null
          error_message: string | null
          external_template_id: string | null
          id: string
          provider: string | null
          recipient_email: string
          recipient_user_id: string | null
          sent_by: string | null
          status: string
          subject: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          email_type?: string | null
          error_message?: string | null
          external_template_id?: string | null
          id?: string
          provider?: string | null
          recipient_email: string
          recipient_user_id?: string | null
          sent_by?: string | null
          status?: string
          subject: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          email_type?: string | null
          error_message?: string | null
          external_template_id?: string | null
          id?: string
          provider?: string | null
          recipient_email?: string
          recipient_user_id?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_chat_messages: {
        Row: {
          block_reason: string | null
          content: string
          created_at: string
          id: string
          is_blocked: boolean
          sender_id: string
        }
        Insert: {
          block_reason?: string | null
          content: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          sender_id: string
        }
        Update: {
          block_reason?: string | null
          content?: string
          created_at?: string
          id?: string
          is_blocked?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      global_chat_rate_limits: {
        Row: {
          last_message_at: string | null
          mode: string
          mode_expires_at: string | null
          slow_mode_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          last_message_at?: string | null
          mode?: string
          mode_expires_at?: string | null
          slow_mode_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          last_message_at?: string | null
          mode?: string
          mode_expires_at?: string | null
          slow_mode_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_chat_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          from_profile: string
          id: string
          is_like: boolean
          to_profile: string
        }
        Insert: {
          created_at?: string
          from_profile: string
          id?: string
          is_like: boolean
          to_profile: string
        }
        Update: {
          created_at?: string
          from_profile?: string
          id?: string
          is_like?: boolean
          to_profile?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_from_profile_fkey"
            columns: ["from_profile"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_to_profile_fkey"
            columns: ["to_profile"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          id: string
          profile_a: string
          profile_b: string
          status: Database["public"]["Enums"]["match_status"]
          unmatched_at: string | null
          unmatched_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_a: string
          profile_b: string
          status?: Database["public"]["Enums"]["match_status"]
          unmatched_at?: string | null
          unmatched_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_a?: string
          profile_b?: string
          status?: Database["public"]["Enums"]["match_status"]
          unmatched_at?: string | null
          unmatched_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_profile_a_fkey"
            columns: ["profile_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_profile_b_fkey"
            columns: ["profile_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_unmatched_by_fkey"
            columns: ["unmatched_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_skills: {
        Row: {
          created_at: string
          profile_id: string
          skill_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          skill_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          blocked_at: string | null
          blocked_by: string | null
          blocked_reason: string | null
          bulk_imported: boolean
          country: string | null
          created_at: string
          description: string | null
          id: string
          is_blocked: boolean
          marketing_consent: boolean
          marketing_consent_at: string | null
          name: string | null
          onboarding_completed: boolean
          photo_url: string | null
          portfolio_url: string | null
          profession: string | null
          radar_enabled: boolean
          role: Database["public"]["Enums"]["professional_role"] | null
          role_sought: Database["public"]["Enums"]["professional_role"] | null
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          bulk_imported?: boolean
          country?: string | null
          created_at?: string
          description?: string | null
          id: string
          is_blocked?: boolean
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          name?: string | null
          onboarding_completed?: boolean
          photo_url?: string | null
          portfolio_url?: string | null
          profession?: string | null
          radar_enabled?: boolean
          role?: Database["public"]["Enums"]["professional_role"] | null
          role_sought?: Database["public"]["Enums"]["professional_role"] | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          bulk_imported?: boolean
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_blocked?: boolean
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          name?: string | null
          onboarding_completed?: boolean
          photo_url?: string | null
          portfolio_url?: string | null
          profession?: string | null
          radar_enabled?: boolean
          role?: Database["public"]["Enums"]["professional_role"] | null
          role_sought?: Database["public"]["Enums"]["professional_role"] | null
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_log: {
        Row: {
          body: string
          created_at: string
          error_message: string | null
          id: string
          recipient_user_id: string | null
          sent_by: string | null
          status: string
          title: string
          token: string
        }
        Insert: {
          body: string
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_user_id?: string | null
          sent_by?: string | null
          status: string
          title: string
          token: string
        }
        Update: {
          body?: string
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_user_id?: string | null
          sent_by?: string | null
          status?: string
          title?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_log_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          target_match_id: string | null
          target_profile_id: string | null
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          target_match_id?: string | null
          target_profile_id?: string | null
          target_type: Database["public"]["Enums"]["report_target_type"]
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          target_match_id?: string | null
          target_profile_id?: string | null
          target_type?: Database["public"]["Enums"]["report_target_type"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_match_id_fkey"
            columns: ["target_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      sponsored_content: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_shown_at: string | null
          link_url: string | null
          media_type: string
          media_url: string
          periodicity_likes: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_shown_at?: string | null
          link_url?: string | null
          media_type: string
          media_url: string
          periodicity_likes?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_shown_at?: string | null
          link_url?: string | null
          media_type?: string
          media_url?: string
          periodicity_likes?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_chat_messages: {
        Args: { match_id_param: string }
        Returns: {
          content: string
          created_at: string
          id: string
          sender_id: string
          sender_name: string
        }[]
      }
      admin_get_profile: {
        Args: { target_user_id: string }
        Returns: {
          age: number
          blocked_at: string
          country: string
          created_at: string
          description: string
          email: string
          id: string
          is_blocked: boolean
          is_reported: boolean
          marketing_consent: boolean
          marketing_consent_at: string
          name: string
          onboarding_completed: boolean
          photo_url: string
          portfolio_url: string
          profession: string
          radar_enabled: boolean
          role: Database["public"]["Enums"]["professional_role"]
          role_sought: Database["public"]["Enums"]["professional_role"]
          skill_ids: string[]
          skill_names: string[]
        }[]
      }
      admin_get_user_reports: {
        Args: { target_user_id: string }
        Returns: {
          created_at: string
          match_id: string
          reason: string
          report_id: string
          reporter_email: string
          reporter_id: string
          reporter_name: string
          target_type: Database["public"]["Enums"]["report_target_type"]
        }[]
      }
      admin_list_profiles: {
        Args: {
          blocked_filter?: boolean
          bulk_imported_filter?: boolean
          country_filter?: string
          page_limit?: number
          page_offset?: number
          radar_filter?: boolean
          reported_filter?: boolean
          role_filter?: Database["public"]["Enums"]["professional_role"]
          search_text?: string
          skill_filter?: string
        }
        Returns: {
          age: number
          blocked_at: string
          bulk_imported: boolean
          country: string
          created_at: string
          email: string
          id: string
          is_blocked: boolean
          is_reported: boolean
          marketing_consent: boolean
          name: string
          onboarding_completed: boolean
          photo_url: string
          profession: string
          radar_enabled: boolean
          role: Database["public"]["Enums"]["professional_role"]
          role_sought: Database["public"]["Enums"]["professional_role"]
          total_count: number
        }[]
      }
      admin_set_user_blocked: {
        Args: {
          new_is_blocked: boolean
          reason?: string
          target_user_id: string
        }
        Returns: undefined
      }
      get_due_sponsored_content: {
        Args: { likes_count: number }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_shown_at: string | null
          link_url: string | null
          media_type: string
          media_url: string
          periodicity_likes: number
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sponsored_content"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_public_profile: {
        Args: { p_id: string }
        Returns: {
          id: string
          name: string
          photo_url: string
          profession: string
          skills: string[]
        }[]
      }
      is_admin: { Args: { uid?: string }; Returns: boolean }
      is_reported: { Args: { target_user_id: string }; Returns: boolean }
      likes_used_last_24h: { Args: { uid?: string }; Returns: number }
      pick_and_rotate_sponsored_content_for_group: {
        Args: { target_periodicity: number }
        Returns: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_shown_at: string | null
          link_url: string | null
          media_type: string
          media_url: string
          periodicity_likes: number
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "sponsored_content"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin"
      match_status: "active" | "unmatched"
      professional_role:
        | "developer"
        | "designer"
        | "entrepreneur"
        | "marketing"
        | "consultant"
        | "lender"
        | "logistics"
        | "recruiter"
        | "influencer"
        | "apprentice"
      report_target_type: "profile" | "chat"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
      match_status: ["active", "unmatched"],
      professional_role: [
        "developer",
        "designer",
        "entrepreneur",
        "marketing",
        "consultant",
        "lender",
        "logistics",
        "recruiter",
        "influencer",
        "apprentice",
      ],
      report_target_type: ["profile", "chat"],
    },
  },
} as const
