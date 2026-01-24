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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          date: string | null
          description: string | null
          group_id: string | null
          id: string | null
          paid_by: string | null
          repeat: string | null
          splits: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          group_id?: string | null
          id?: string | null
          paid_by?: string | null
          repeat?: string | null
          splits?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          group_id?: string | null
          id?: string | null
          paid_by?: string | null
          repeat?: string | null
          splits?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string | null
          id: string | null
          joined_at: string | null
          user_id: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string | null
          joined_at?: string | null
          user_id?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string | null
          joined_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string | null
          invite_code: string | null
          is_temporary: boolean | null
          name: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          invite_code?: string | null
          is_temporary?: boolean | null
          name?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string | null
          invite_code?: string | null
          is_temporary?: boolean | null
          name?: string | null
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          created_at: string
          date: string
          group_id: string
          id: string
          included_in_split: boolean
          note: string | null
          recipient: string
          repeat: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          group_id: string
          id?: string
          included_in_split?: boolean
          note?: string | null
          recipient: string
          repeat?: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          group_id?: string
          id?: string
          included_in_split?: boolean
          note?: string | null
          recipient?: string
          repeat?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string | null
          expires_at: string | null
          group_id: string | null
          id: string | null
          inviter_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string | null
          inviter_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string | null
          inviter_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      playgrounds: {
        Row: {
          city: string
          created_at: string
          id: string
          name: string
          visited: boolean
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          name: string
          visited?: boolean
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          name?: string
          visited?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      savings_contributions: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          note: string | null
          project_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          id?: string
          note?: string | null
          project_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_contributions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "savings_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_projects: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          group_id: string
          id: string
          name: string
          target_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          group_id: string
          id?: string
          name: string
          target_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string
          id?: string
          name?: string
          target_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      settlements: {
        Row: {
          amount: number | null
          created_at: string | null
          date: string | null
          from_user: string | null
          group_id: string | null
          id: string | null
          month: string | null
          to_user: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          date?: string | null
          from_user?: string | null
          group_id?: string | null
          id?: string | null
          month?: string | null
          to_user?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          date?: string | null
          from_user?: string | null
          group_id?: string | null
          id?: string | null
          month?: string | null
          to_user?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      join_group_by_invite_code: {
        Args: { _invite_code: string }
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
  public: {
    Enums: {},
  },
} as const
