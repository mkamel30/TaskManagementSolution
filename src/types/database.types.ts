export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bakery_quota_history: {
        Row: {
          branch_name: string | null
          change_description: string
          changed_at: string | null
          id: string
          new_quota_value: number | null
          notes: string | null
          old_quota_value: number | null
          quota_id: string | null
          trunc_a_ope_date_: string | null
          user_id: string
        }
        Insert: {
          branch_name?: string | null
          change_description: string
          changed_at?: string | null
          id?: string
          new_quota_value?: number | null
          notes?: string | null
          old_quota_value?: number | null
          quota_id?: string | null
          trunc_a_ope_date_?: string | null
          user_id: string
        }
        Update: {
          branch_name?: string | null
          change_description?: string
          changed_at?: string | null
          id?: string
          new_quota_value?: number | null
          notes?: string | null
          old_quota_value?: number | null
          quota_id?: string | null
          trunc_a_ope_date_?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bakery_quota_history_quota_id_fkey"
            columns: ["quota_id"]
            isOneToOne: false
            referencedRelation: "bakery_quotas"
            referencedColumns: ["id"]
          },
        ]
      }
      bakery_quotas: {
        Row: {
          branch_name: string
          client_id: string
          client_name: string
          created_at: string | null
          discount_type: string | null
          id: string
          notes: string | null
          quota_date: string
          quota_value: number
          updated_at: string | null
        }
        Insert: {
          branch_name?: string
          client_id: string
          client_name: string
          created_at?: string | null
          discount_type?: string | null
          id?: string
          notes?: string | null
          quota_date: string
          quota_value: number
          updated_at?: string | null
        }
        Update: {
          branch_name?: string
          client_id?: string
          client_name?: string
          created_at?: string | null
          discount_type?: string | null
          id?: string
          notes?: string | null
          quota_date?: string
          quota_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          comment_text: string
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_task_sequences: {
        Row: {
          last_value: number
          sequence_date: string
        }
        Insert: {
          last_value: number
          sequence_date: string
        }
        Update: {
          last_value?: number
          sequence_date?: string
        }
        Relationships: []
      }
      email_schedules: {
        Row: {
          created_at: string | null
          day_of_month: number | null
          day_of_week: number | null
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean | null
          last_sent: string | null
          name: string
          next_send_date: string
          reminder_minutes_before: number[] | null
          require_approval: boolean | null
          send_count: number | null
          send_time: string
          start_date: string
          status: string
          template_id: string | null
          timezone: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          end_date?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          last_sent?: string | null
          name: string
          next_send_date: string
          reminder_minutes_before?: number[] | null
          require_approval?: boolean | null
          send_count?: number | null
          send_time: string
          start_date: string
          status?: string
          template_id?: string | null
          timezone?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_month?: number | null
          day_of_week?: number | null
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_sent?: string | null
          name?: string
          next_send_date?: string
          reminder_minutes_before?: number[] | null
          require_approval?: boolean | null
          send_count?: number | null
          send_time?: string
          start_date?: string
          status?: string
          template_id?: string | null
          timezone?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_logs: {
        Row: {
          cc_recipients: string[] | null
          created_at: string | null
          error_message: string | null
          id: string
          provider: string | null
          provider_message_id: string | null
          schedule_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          to_recipients: string[]
          user_id: string | null
        }
        Insert: {
          cc_recipients?: string[] | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          provider?: string | null
          provider_message_id?: string | null
          schedule_id?: string | null
          sent_at?: string | null
          status: string
          subject: string
          template_id?: string | null
          to_recipients: string[]
          user_id?: string | null
        }
        Update: {
          cc_recipients?: string[] | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          provider?: string | null
          provider_message_id?: string | null
          schedule_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          to_recipients?: string[]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_logs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "email_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          cc_recipients: string[] | null
          created_at: string | null
          id: string
          name: string
          subject: string
          to_recipients: string[]
          updated_at: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          body: string
          cc_recipients?: string[] | null
          created_at?: string | null
          id?: string
          name: string
          subject: string
          to_recipients: string[]
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          body?: string
          cc_recipients?: string[] | null
          created_at?: string | null
          id?: string
          name?: string
          subject?: string
          to_recipients?: string[]
          updated_at?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          branch_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          branch_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          body: string | null
          cc: string | null
          created_at: string
          frequency: string | null
          id: string
          reminder: string | null
          send_at: string
          status: string | null
          subject: string | null
          template_name: string | null
          to: string
        }
        Insert: {
          body?: string | null
          cc?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          reminder?: string | null
          send_at: string
          status?: string | null
          subject?: string | null
          template_name?: string | null
          to: string
        }
        Update: {
          body?: string | null
          cc?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          reminder?: string | null
          send_at?: string
          status?: string | null
          subject?: string | null
          template_name?: string | null
          to?: string
        }
        Relationships: []
      }
      task_history: {
        Row: {
          change_description: string
          changed_at: string | null
          id: string
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          change_description: string
          changed_at?: string | null
          id?: string
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          change_description?: string
          changed_at?: string | null
          id?: string
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          branch_name: string
          created_at: string | null
          customer_code: string | null
          file_paths: string[] | null
          id: string
          notes: string | null
          reminder_at: string | null
          requesting_party: string | null
          required_action: string
          responsible_employee: string | null
          status: string
          task_number: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          branch_name?: string
          created_at?: string | null
          customer_code?: string | null
          file_paths?: string[] | null
          id?: string
          notes?: string | null
          reminder_at?: string | null
          requesting_party?: string | null
          required_action: string
          responsible_employee?: string | null
          status?: string
          task_number: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          branch_name?: string
          created_at?: string | null
          customer_code?: string | null
          file_paths?: string[] | null
          id?: string
          notes?: string | null
          reminder_at?: string | null
          requesting_party?: string | null
          required_action?: string
          responsible_employee?: string | null
          status?: string
          task_number?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_bakery_quotas: {
        Args: never
        Returns: {
          branch_name: string
          client_id: string
          client_name: string
          created_at: string | null
          discount_type: string | null
          id: string
          notes: string | null
          quota_date: string
          quota_value: number
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "bakery_quotas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_bakery_quota_edit_stats_month: {
        Args: never
        Returns: {
          total_edits: number
        }[]
      }
      get_bakery_quota_edit_stats_per_client_today: {
        Args: never
        Returns: {
          client_id: string
          edit_count: number
        }[]
      }
      get_bakery_quota_edit_stats_per_client_yesterday: {
        Args: never
        Returns: {
          client_id: string
          edit_count: number
        }[]
      }
      get_bakery_quota_edit_stats_today: {
        Args: never
        Returns: {
          total_edits: number
        }[]
      }
      get_bakery_quota_edit_stats_week: {
        Args: never
        Returns: {
          total_edits: number
        }[]
      }
      get_bakery_quota_history_with_user: {
        Args: { p_quota_id: string }
        Returns: {
          change_description: string
          changed_at: string
          id: string
          new_quota_value: number
          notes: string
          old_quota_value: number
          quota_id: string
          trunc_a_ope_date_: string
          user_email: string
          user_id: string
        }[]
      }
      get_bakery_quotas_with_operation_date: {
        Args: never
        Returns: {
          client_id: string
          client_name: string
          created_at: string
          id: string
          notes: string
          operation_date: string
          quota_date: string
          quota_value: number
          updated_at: string
        }[]
      }
      get_client_history_counts: {
        Args: never
        Returns: {
          change_count: number
          client_id: string
        }[]
      }
      get_next_task_number_for_date: {
        Args: { p_date: string }
        Returns: number
      }
      get_paginated_bakery_quotas: {
        Args: {
          end_date?: string
          items_per_page?: number
          p_branch?: string
          page?: number
          search_query?: string
          sort_by?: string
          sort_order?: string
          start_date?: string
        }
        Returns: Json
      }
      get_task_history_with_user: {
        Args: { p_task_id: string }
        Returns: {
          change_description: string
          changed_at: string
          id: string
          task_id: string
          user_email: string
          user_id: string
        }[]
      }
      get_tasks_with_creator_email: {
        Args: never
        Returns: {
          branch_name: string
          created_at: string
          creator_email: string
          customer_code: string
          file_paths: string[]
          id: string
          notes: string
          reminder_at: string
          requesting_party: string
          required_action: string
          responsible_employee: string
          status: string
          task_number: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_role: { Args: { user_id: string }; Returns: string }
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
> = DefaultSchemaTableNameOrOptions extends {
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