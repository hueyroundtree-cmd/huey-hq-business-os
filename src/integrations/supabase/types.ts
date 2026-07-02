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
      ai_commands: {
        Row: {
          active: boolean
          command: string
          created_at: string
          department: string | null
          id: string
          title: string
          updated_at: string
          usage_notes: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          command: string
          created_at?: string
          department?: string | null
          id?: string
          title: string
          updated_at?: string
          usage_notes?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          command?: string
          created_at?: string
          department?: string | null
          id?: string
          title?: string
          updated_at?: string
          usage_notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      automations: {
        Row: {
          agent_name: string
          created_at: string
          id: string
          last_run_at: string | null
          next_run_at: string | null
          owner: string | null
          platform: string | null
          proof: string | null
          status: Database["public"]["Enums"]["automation_status"]
          trigger: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_name: string
          created_at?: string
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          owner?: string | null
          platform?: string | null
          proof?: string | null
          status?: Database["public"]["Enums"]["automation_status"]
          trigger?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          owner?: string | null
          platform?: string | null
          proof?: string | null
          status?: Database["public"]["Enums"]["automation_status"]
          trigger?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          name: string
          notes: string | null
          paid: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          name: string
          notes?: string | null
          paid?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          name?: string
          notes?: string | null
          paid?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_projects: {
        Row: {
          business: string | null
          created_at: string
          due_date: string | null
          id: string
          next_action: string | null
          notes: string | null
          owner: string | null
          priority: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          next_action?: string | null
          notes?: string | null
          owner?: string | null
          priority?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          next_action?: string | null
          notes?: string | null
          owner?: string | null
          priority?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_items: {
        Row: {
          analytics_json: Json
          created_at: string
          hook: string | null
          id: string
          notes: string | null
          posted_url: string | null
          scheduled_for: string | null
          script: string | null
          stage: Database["public"]["Enums"]["content_stage"]
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics_json?: Json
          created_at?: string
          hook?: string | null
          id?: string
          notes?: string | null
          posted_url?: string | null
          scheduled_for?: string | null
          script?: string | null
          stage?: Database["public"]["Enums"]["content_stage"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics_json?: Json
          created_at?: string
          hook?: string | null
          id?: string
          notes?: string | null
          posted_url?: string | null
          scheduled_for?: string | null
          script?: string | null
          stage?: Database["public"]["Enums"]["content_stage"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          cash_on_hand: number | null
          check_date: string
          created_at: string
          id: string
          kind: string
          notes: string | null
          summary_json: Json
          user_id: string
        }
        Insert: {
          cash_on_hand?: number | null
          check_date?: string
          created_at?: string
          id?: string
          kind: string
          notes?: string | null
          summary_json?: Json
          user_id: string
        }
        Update: {
          cash_on_hand?: number | null
          check_date?: string
          created_at?: string
          id?: string
          kind?: string
          notes?: string | null
          summary_json?: Json
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          provider: string
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider: string
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider?: string
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          notes: string | null
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_docs: {
        Row: {
          category: string
          content_md: string
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          content_md?: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content_md?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          kind: string
          lead_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          kind: string
          lead_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          booking_at: string | null
          business: string | null
          created_at: string
          deposit: number | null
          email: string | null
          id: string
          last_contact_at: string | null
          name: string
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          estimated_value: number | null
          lead_type: string
          quote_amount: number | null
          service_needed: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_at?: string | null
          business?: string | null
          created_at?: string
          deposit?: number | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          estimated_value?: number | null
          lead_type?: string
          quote_amount?: number | null
          service_needed?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_at?: string | null
          business?: string | null
          created_at?: string
          deposit?: number | null
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name?: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          estimated_value?: number | null
          lead_type?: string
          quote_amount?: number | null
          service_needed?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_entries: {
        Row: {
          amount: number
          created_at: string
          entry_date: string
          id: string
          notes: string | null
          payment_method: string | null
          proof_url: string | null
          stream: Database["public"]["Enums"]["income_stream"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          entry_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          proof_url?: string | null
          stream: Database["public"]["Enums"]["income_stream"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          entry_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          proof_url?: string | null
          stream?: Database["public"]["Enums"]["income_stream"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          is_template: boolean
          placeholders: string[]
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          id?: string
          is_template?: boolean
          placeholders?: string[]
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          is_template?: boolean
          placeholders?: string[]
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sync_audit: {
        Row: {
          created_at: string
          detail: string | null
          entity: string | null
          id: string
          outcome: string
          provider: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          entity?: string | null
          id?: string
          outcome: string
          provider: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          entity?: string | null
          id?: string
          outcome?: string
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_mappings: {
        Row: {
          created_at: string
          entity: string
          field_map: Json
          id: string
          last_error: string | null
          last_sync_at: string | null
          provider: string
          status: Database["public"]["Enums"]["integration_status"]
          target_ref: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          entity: string
          field_map?: Json
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider: string
          status?: Database["public"]["Enums"]["integration_status"]
          target_ref: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          entity?: string
          field_map?: Json
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          provider?: string
          status?: Database["public"]["Enums"]["integration_status"]
          target_ref?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          done: boolean
          for_date: string
          id: string
          is_top_priority: boolean
          proof_note: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          for_date?: string
          id?: string
          is_top_priority?: boolean
          proof_note?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          for_date?: string
          id?: string
          is_top_priority?: boolean
          proof_note?: string | null
          title?: string
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
      [_ in never]: never
    }
    Enums: {
      automation_status: "Not Connected" | "Active" | "Paused" | "Error"
      content_stage:
        | "Idea"
        | "Script"
        | "Record"
        | "Edit"
        | "Review"
        | "Scheduled"
        | "Posted"
        | "Repurpose"
      income_stream:
        | "Detailing"
        | "Logistics"
        | "Shopify"
        | "Stan Store"
        | "Gig Work"
        | "Content"
        | "Investing"
        | "Other"
      integration_status: "Not Connected" | "Connected" | "Error"
      lead_status:
        | "New Lead"
        | "Contacted"
        | "Quoted"
        | "Booked"
        | "Completed"
        | "Review Requested"
        | "Closed/Lost"
        | "Quote Sent"
        | "Lost"
        | "Follow-Up Needed"
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
      automation_status: ["Not Connected", "Active", "Paused", "Error"],
      content_stage: [
        "Idea",
        "Script",
        "Record",
        "Edit",
        "Review",
        "Scheduled",
        "Posted",
        "Repurpose",
      ],
      income_stream: [
        "Detailing",
        "Logistics",
        "Shopify",
        "Stan Store",
        "Gig Work",
        "Content",
        "Investing",
        "Other",
      ],
      integration_status: ["Not Connected", "Connected", "Error"],
      lead_status: [
        "New Lead",
        "Contacted",
        "Quoted",
        "Booked",
        "Completed",
        "Review Requested",
        "Closed/Lost",
        "Quote Sent",
        "Lost",
        "Follow-Up Needed",
      ],
    },
  },
} as const
