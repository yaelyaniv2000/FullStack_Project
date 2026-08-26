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
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          expiring_soon_days: number
          id: string
          updated_at: string
        }
        Insert: {
          expiring_soon_days?: number
          id?: string
          updated_at?: string
        }
        Update: {
          expiring_soon_days?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          created_at: string
          created_by: string | null
          position_id: string
          shift_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          position_id: string
          shift_id: string
          worker_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          position_id?: string
          shift_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_shift_id_position_id_fkey"
            columns: ["shift_id", "position_id"]
            isOneToOne: false
            referencedRelation: "shift_positions"
            referencedColumns: ["shift_id", "position_id"]
          },
          {
            foreignKeyName: "assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability: {
        Row: {
          id: string
          is_available: boolean
          responded_at: string
          shift_id: string
          worker_id: string
        }
        Insert: {
          id?: string
          is_available: boolean
          responded_at?: string
          shift_id: string
          worker_id: string
        }
        Update: {
          id?: string
          is_available?: boolean
          responded_at?: string
          shift_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_windows: {
        Row: {
          closes_at: string
          created_at: string
          id: string
          label: string
          opens_at: string
        }
        Insert: {
          closes_at: string
          created_at?: string
          id?: string
          label: string
          opens_at: string
        }
        Update: {
          closes_at?: string
          created_at?: string
          id?: string
          label?: string
          opens_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          shift_id: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          shift_id?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          shift_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      position_qualifications: {
        Row: {
          option_id: string | null
          position_id: string
          qualification_id: string
        }
        Insert: {
          option_id?: string | null
          position_id: string
          qualification_id: string
        }
        Update: {
          option_id?: string | null
          position_id?: string
          qualification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_qualifications_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "qualification_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_qualifications_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_qualifications_qualification_id_fkey"
            columns: ["qualification_id"]
            isOneToOne: false
            referencedRelation: "qualifications"
            referencedColumns: ["id"]
          },
        ]
      }
      position_renews_qualifications: {
        Row: {
          position_id: string
          qualification_id: string
        }
        Insert: {
          position_id: string
          qualification_id: string
        }
        Update: {
          position_id?: string
          qualification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_renews_qualifications_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_renews_qualifications_qualification_id_fkey"
            columns: ["qualification_id"]
            isOneToOne: false
            referencedRelation: "qualifications"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          role: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      qualification_options: {
        Row: {
          created_at: string
          id: string
          label: string
          qualification_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          qualification_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          qualification_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "qualification_options_qualification_id_fkey"
            columns: ["qualification_id"]
            isOneToOne: false
            referencedRelation: "qualifications"
            referencedColumns: ["id"]
          },
        ]
      }
      qualifications: {
        Row: {
          created_at: string
          id: string
          name: string
          renewal_interval_days: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          renewal_interval_days?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          renewal_interval_days?: number | null
        }
        Relationships: []
      }
      scheduling_constraints: {
        Row: {
          enabled: boolean
          id: string
          qualification_option_id: string | null
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          enabled?: boolean
          id?: string
          qualification_option_id?: string | null
          type: string
          updated_at?: string
          value: number
        }
        Update: {
          enabled?: boolean
          id?: string
          qualification_option_id?: string | null
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_constraints_qualification_option_id_fkey"
            columns: ["qualification_option_id"]
            isOneToOne: false
            referencedRelation: "qualification_options"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_positions: {
        Row: {
          headcount_needed: number
          position_id: string
          shift_id: string
        }
        Insert: {
          headcount_needed: number
          position_id: string
          shift_id: string
        }
        Update: {
          headcount_needed?: number
          position_id?: string
          shift_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_positions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_positions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_template_positions: {
        Row: {
          headcount_needed: number
          position_id: string
          template_id: string
        }
        Insert: {
          headcount_needed: number
          position_id: string
          template_id: string
        }
        Update: {
          headcount_needed?: number
          position_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_template_positions_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_template_positions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "shift_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_templates: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      shifts: {
        Row: {
          availability_window_id: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          location: string | null
          published_at: string | null
          start_time: string
        }
        Insert: {
          availability_window_id?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          location?: string | null
          published_at?: string | null
          start_time: string
        }
        Update: {
          availability_window_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          location?: string | null
          published_at?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_availability_window_id_fkey"
            columns: ["availability_window_id"]
            isOneToOne: false
            referencedRelation: "availability_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_pairing_preferences: {
        Row: {
          created_at: string
          id: string
          preference: string
          worker_id_1: string
          worker_id_2: string
        }
        Insert: {
          created_at?: string
          id?: string
          preference: string
          worker_id_1: string
          worker_id_2: string
        }
        Update: {
          created_at?: string
          id?: string
          preference?: string
          worker_id_1?: string
          worker_id_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_pairing_preferences_worker_id_1_fkey"
            columns: ["worker_id_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_pairing_preferences_worker_id_2_fkey"
            columns: ["worker_id_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_qualifications: {
        Row: {
          created_at: string
          id: string
          obtained_at: string
          option_id: string | null
          qualification_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          obtained_at: string
          option_id?: string | null
          qualification_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: string
          status?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          obtained_at?: string
          option_id?: string | null
          qualification_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_qualifications_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "qualification_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_qualifications_qualification_id_fkey"
            columns: ["qualification_id"]
            isOneToOne: false
            referencedRelation: "qualifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_qualifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_qualifications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
