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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      categories: {
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
      monthly_incomes: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          is_fixed: boolean | null
          person: string
          updated_at: string | null
          year_month: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          is_fixed?: boolean | null
          person: string
          updated_at?: string | null
          year_month: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          is_fixed?: boolean | null
          person?: string
          updated_at?: string | null
          year_month?: string
        }
        Relationships: []
      }
      participant_tokens: {
        Row: {
          created_at: string
          kind: string
          label: string | null
          participant_id: string | null
          revoked_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          kind: string
          label?: string | null
          participant_id?: string | null
          revoked_at?: string | null
          token: string
        }
        Update: {
          created_at?: string
          kind?: string
          label?: string | null
          participant_id?: string | null
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_tokens_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          color: string
          created_at: string
          id: string
          is_archived: boolean
          kind: string
          name: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_archived?: boolean
          kind: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          kind?: string
          name?: string
        }
        Relationships: []
      }
      shared_transactions: {
        Row: {
          amount: number | null
          amount_owed: number | null
          category: string | null
          created_at: string
          custom_shares: Json | null
          date: string
          description: string
          id: string
          is_hidden: boolean | null
          last_edited_at: string | null
          last_edited_by: string | null
          paid_by: string
          participants: string[] | null
          receipt_url: string | null
        }
        Insert: {
          amount?: number | null
          amount_owed?: number | null
          category?: string | null
          created_at?: string
          custom_shares?: Json | null
          date: string
          description: string
          id?: string
          is_hidden?: boolean | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          paid_by: string
          participants?: string[] | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number | null
          amount_owed?: number | null
          category?: string | null
          created_at?: string
          custom_shares?: Json | null
          date?: string
          description?: string
          id?: string
          is_hidden?: boolean | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          paid_by?: string
          participants?: string[] | null
          receipt_url?: string | null
        }
        Relationships: []
      }
      transaction_audit: {
        Row: {
          action: string
          actor: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: number
          transaction_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: number
          transaction_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: number
          transaction_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
