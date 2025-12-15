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
      admin_section_views: {
        Row: {
          admin_user_id: string
          created_at: string
          id: string
          last_viewed_at: string
          section_name: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          id?: string
          last_viewed_at?: string
          section_name: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          id?: string
          last_viewed_at?: string
          section_name?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          blocked: boolean
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked?: boolean
          created_at?: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked?: boolean
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment_url: string | null
          conversation_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      country_gold_prices: {
        Row: {
          buy_price_per_gram: number
          country: string
          created_at: string
          id: string
          is_active: boolean
          sell_price_per_gram: number
          updated_at: string
        }
        Insert: {
          buy_price_per_gram: number
          country: string
          created_at?: string
          id?: string
          is_active?: boolean
          sell_price_per_gram: number
          updated_at?: string
        }
        Update: {
          buy_price_per_gram?: number
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sell_price_per_gram?: number
          updated_at?: string
        }
        Relationships: []
      }
      gold_purchases: {
        Row: {
          created_at: string
          gold_amount_grams: number
          id: string
          lock_period_days: number
          maturity_date: string
          price_per_gram: number
          status: string
          total_cost: number
          user_id: string
        }
        Insert: {
          created_at?: string
          gold_amount_grams: number
          id?: string
          lock_period_days?: number
          maturity_date?: string
          price_per_gram: number
          status?: string
          total_cost: number
          user_id: string
        }
        Update: {
          created_at?: string
          gold_amount_grams?: number
          id?: string
          lock_period_days?: number
          maturity_date?: string
          price_per_gram?: number
          status?: string
          total_cost?: number
          user_id?: string
        }
        Relationships: []
      }
      gold_rates: {
        Row: {
          change_22k: number
          change_24k: number
          country: string
          created_at: string
          id: string
          rate_22k_per_10g: number
          rate_24k_per_10g: number
          updated_at: string
        }
        Insert: {
          change_22k?: number
          change_24k?: number
          country: string
          created_at?: string
          id?: string
          rate_22k_per_10g?: number
          rate_24k_per_10g?: number
          updated_at?: string
        }
        Update: {
          change_22k?: number
          change_24k?: number
          country?: string
          created_at?: string
          id?: string
          rate_22k_per_10g?: number
          rate_24k_per_10g?: number
          updated_at?: string
        }
        Relationships: []
      }
      gold_sales: {
        Row: {
          created_at: string
          gold_amount_grams: number
          id: string
          price_per_gram: number
          profit_amount: number
          purchase_id: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string
          gold_amount_grams: number
          id?: string
          price_per_gram: number
          profit_amount?: number
          purchase_id?: string | null
          total_amount: number
          user_id: string
        }
        Update: {
          created_at?: string
          gold_amount_grams?: number
          id?: string
          price_per_gram?: number
          profit_amount?: number
          purchase_id?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gold_sales_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "gold_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      gold_settings: {
        Row: {
          buy_platform_fee_percentage: number
          buy_price_per_gram: number
          current_price_per_gram: number
          daily_profit_percentage: number
          id: string
          lock_period_180_days_rate: number | null
          lock_period_30_days_rate: number | null
          lock_period_365_days_rate: number | null
          lock_period_60_days_rate: number | null
          lock_period_90_days_rate: number | null
          lock_period_days: number
          minimum_sell_grams: number
          minimum_topup_amount: number
          minimum_withdrawal_amount: number
          sell_platform_fee_percentage: number
          sell_price_per_gram: number
          updated_at: string
        }
        Insert: {
          buy_platform_fee_percentage?: number
          buy_price_per_gram?: number
          current_price_per_gram?: number
          daily_profit_percentage?: number
          id?: string
          lock_period_180_days_rate?: number | null
          lock_period_30_days_rate?: number | null
          lock_period_365_days_rate?: number | null
          lock_period_60_days_rate?: number | null
          lock_period_90_days_rate?: number | null
          lock_period_days?: number
          minimum_sell_grams?: number
          minimum_topup_amount?: number
          minimum_withdrawal_amount?: number
          sell_platform_fee_percentage?: number
          sell_price_per_gram?: number
          updated_at?: string
        }
        Update: {
          buy_platform_fee_percentage?: number
          buy_price_per_gram?: number
          current_price_per_gram?: number
          daily_profit_percentage?: number
          id?: string
          lock_period_180_days_rate?: number | null
          lock_period_30_days_rate?: number | null
          lock_period_365_days_rate?: number | null
          lock_period_60_days_rate?: number | null
          lock_period_90_days_rate?: number | null
          lock_period_days?: number
          minimum_sell_grams?: number
          minimum_topup_amount?: number
          minimum_withdrawal_amount?: number
          sell_platform_fee_percentage?: number
          sell_price_per_gram?: number
          updated_at?: string
        }
        Relationships: []
      }
      investment_plans: {
        Row: {
          created_at: string
          description: string
          duration_days: number
          id: string
          is_active: boolean
          plan_name: string
          price: number
          returns_percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          duration_days: number
          id?: string
          is_active?: boolean
          plan_name: string
          price: number
          returns_percentage: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          duration_days?: number
          id?: string
          is_active?: boolean
          plan_name?: string
          price?: number
          returns_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      lock_periods: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          period_days: number
          profit_percentage: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          period_days: number
          profit_percentage: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          period_days?: number
          profit_percentage?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_details: string
          created_at: string
          id: string
          is_active: boolean
          method_name: string
          updated_at: string
        }
        Insert: {
          account_details: string
          created_at?: string
          id?: string
          is_active?: boolean
          method_name: string
          updated_at?: string
        }
        Update: {
          account_details?: string
          created_at?: string
          id?: string
          is_active?: boolean
          method_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_number: string | null
          account_status: string
          country: string
          created_at: string
          custom_user_id: string | null
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          id: string
          is_hidden: boolean
          kyc_proof_type: string | null
          kyc_proof_url: string | null
          kyc_status: string | null
          last_name: string | null
          phone_number: string | null
          profile_picture: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          account_number?: string | null
          account_status?: string
          country: string
          created_at?: string
          custom_user_id?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_hidden?: boolean
          kyc_proof_type?: string | null
          kyc_proof_url?: string | null
          kyc_status?: string | null
          last_name?: string | null
          phone_number?: string | null
          profile_picture?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          account_number?: string | null
          account_status?: string
          country?: string
          created_at?: string
          custom_user_id?: string | null
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_hidden?: boolean
          kyc_proof_type?: string | null
          kyc_proof_url?: string | null
          kyc_status?: string | null
          last_name?: string | null
          phone_number?: string | null
          profile_picture?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      promotional_offers: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_method_id: string
          screenshot_url: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_method_id: string
          screenshot_url: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_method_id?: string
          screenshot_url?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      user_investments: {
        Row: {
          amount_invested: number
          created_at: string
          end_date: string
          id: string
          plan_id: string
          start_date: string
          status: string
          user_id: string
        }
        Insert: {
          amount_invested: number
          created_at?: string
          end_date: string
          id?: string
          plan_id: string
          start_date?: string
          status?: string
          user_id: string
        }
        Update: {
          amount_invested?: number
          created_at?: string
          end_date?: string
          id?: string
          plan_id?: string
          start_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_investments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "investment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["user_permission"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: Database["public"]["Enums"]["user_permission"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["user_permission"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_balances: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          withdrawable_balance: number
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          withdrawable_balance?: number
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          withdrawable_balance?: number
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_number: string | null
          admin_message: string | null
          amount: number
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          admin_message?: string | null
          amount: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          admin_message?: string | null
          amount?: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          p_message: string
          p_related_id?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      generate_custom_user_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "staff"
      user_permission:
        | "transactions"
        | "withdrawals"
        | "payment_methods"
        | "investment_plans"
        | "gold_settings"
        | "users"
        | "promotions"
        | "support"
        | "user_roles"
        | "customer_status"
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
    Enums: {
      app_role: ["admin", "user", "staff"],
      user_permission: [
        "transactions",
        "withdrawals",
        "payment_methods",
        "investment_plans",
        "gold_settings",
        "users",
        "promotions",
        "support",
        "user_roles",
        "customer_status",
      ],
    },
  },
} as const
