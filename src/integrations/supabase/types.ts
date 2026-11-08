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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agent_tasks: {
        Row: {
          action: string
          approved_by_owner: boolean
          assigned_agent_id: string
          created_at: string
          department: string
          evidence_url: string | null
          id: string
          source: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          approved_by_owner?: boolean
          assigned_agent_id: string
          created_at?: string
          department: string
          evidence_url?: string | null
          id?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          approved_by_owner?: boolean
          assigned_agent_id?: string
          created_at?: string
          department?: string
          evidence_url?: string | null
          id?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      business_units: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
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
      crm_backup_before_balf_batch1_20260714: {
        Row: {
          address_service_area: string | null
          appointment_status: string | null
          booking_at: string | null
          business: string | null
          business_unit_id: string | null
          city: string | null
          contact_date: string | null
          contact_method: string | null
          contacted_by: string | null
          created_at: string | null
          crm_id: string | null
          date_added: string | null
          deposit: number | null
          deposit_status: string | null
          email: string | null
          email_body: string | null
          email_sent_at: string | null
          email_subject: string | null
          estimated_value: number | null
          id: string | null
          industry: string | null
          last_contact_at: string | null
          lead_score: number | null
          lead_type: string | null
          name: string | null
          next_action: string | null
          next_follow_up_at: string | null
          notes: string | null
          outreach_status: string | null
          phone: string | null
          priority: string | null
          quote_amount: number | null
          service_needed: string | null
          source: string | null
          source_record_id: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          text_message_template: string | null
          text_sent_at: string | null
          updated_at: string | null
          user_id: string | null
          vehicle: string | null
          verification_source: string | null
          zoho_email_sent: boolean | null
          zoho_last_message_id: string | null
          zoho_last_reply_at: string | null
          zoho_last_sent_at: string | null
          zoho_last_subject: string | null
        }
        Insert: {
          address_service_area?: string | null
          appointment_status?: string | null
          booking_at?: string | null
          business?: string | null
          business_unit_id?: string | null
          city?: string | null
          contact_date?: string | null
          contact_method?: string | null
          contacted_by?: string | null
          created_at?: string | null
          crm_id?: string | null
          date_added?: string | null
          deposit?: number | null
          deposit_status?: string | null
          email?: string | null
          email_body?: string | null
          email_sent_at?: string | null
          email_subject?: string | null
          estimated_value?: number | null
          id?: string | null
          industry?: string | null
          last_contact_at?: string | null
          lead_score?: number | null
          lead_type?: string | null
          name?: string | null
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          outreach_status?: string | null
          phone?: string | null
          priority?: string | null
          quote_amount?: number | null
          service_needed?: string | null
          source?: string | null
          source_record_id?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          text_message_template?: string | null
          text_sent_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle?: string | null
          verification_source?: string | null
          zoho_email_sent?: boolean | null
          zoho_last_message_id?: string | null
          zoho_last_reply_at?: string | null
          zoho_last_sent_at?: string | null
          zoho_last_subject?: string | null
        }
        Update: {
          address_service_area?: string | null
          appointment_status?: string | null
          booking_at?: string | null
          business?: string | null
          business_unit_id?: string | null
          city?: string | null
          contact_date?: string | null
          contact_method?: string | null
          contacted_by?: string | null
          created_at?: string | null
          crm_id?: string | null
          date_added?: string | null
          deposit?: number | null
          deposit_status?: string | null
          email?: string | null
          email_body?: string | null
          email_sent_at?: string | null
          email_subject?: string | null
          estimated_value?: number | null
          id?: string | null
          industry?: string | null
          last_contact_at?: string | null
          lead_score?: number | null
          lead_type?: string | null
          name?: string | null
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          outreach_status?: string | null
          phone?: string | null
          priority?: string | null
          quote_amount?: number | null
          service_needed?: string | null
          source?: string | null
          source_record_id?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          text_message_template?: string | null
          text_sent_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle?: string | null
          verification_source?: string | null
          zoho_email_sent?: boolean | null
          zoho_last_message_id?: string | null
          zoho_last_reply_at?: string | null
          zoho_last_sent_at?: string | null
          zoho_last_subject?: string | null
        }
        Relationships: []
      }
      crm_backup_before_balf_batch2_20260715: {
        Row: {
          address_service_area: string | null
          appointment_status: string | null
          booking_at: string | null
          business: string | null
          business_unit_id: string | null
          city: string | null
          contact_date: string | null
          contact_method: string | null
          contacted_by: string | null
          created_at: string | null
          crm_id: string | null
          date_added: string | null
          deposit: number | null
          deposit_status: string | null
          email: string | null
          email_body: string | null
          email_sent_at: string | null
          email_subject: string | null
          estimated_value: number | null
          id: string | null
          industry: string | null
          last_contact_at: string | null
          lead_score: number | null
          lead_type: string | null
          name: string | null
          next_action: string | null
          next_follow_up_at: string | null
          notes: string | null
          outreach_status: string | null
          phone: string | null
          priority: string | null
          quote_amount: number | null
          service_needed: string | null
          source: string | null
          source_record_id: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          text_message_template: string | null
          text_sent_at: string | null
          updated_at: string | null
          user_id: string | null
          vehicle: string | null
          verification_source: string | null
          zoho_email_sent: boolean | null
          zoho_last_message_id: string | null
          zoho_last_reply_at: string | null
          zoho_last_sent_at: string | null
          zoho_last_subject: string | null
        }
        Insert: {
          address_service_area?: string | null
          appointment_status?: string | null
          booking_at?: string | null
          business?: string | null
          business_unit_id?: string | null
          city?: string | null
          contact_date?: string | null
          contact_method?: string | null
          contacted_by?: string | null
          created_at?: string | null
          crm_id?: string | null
          date_added?: string | null
          deposit?: number | null
          deposit_status?: string | null
          email?: string | null
          email_body?: string | null
          email_sent_at?: string | null
          email_subject?: string | null
          estimated_value?: number | null
          id?: string | null
          industry?: string | null
          last_contact_at?: string | null
          lead_score?: number | null
          lead_type?: string | null
          name?: string | null
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          outreach_status?: string | null
          phone?: string | null
          priority?: string | null
          quote_amount?: number | null
          service_needed?: string | null
          source?: string | null
          source_record_id?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          text_message_template?: string | null
          text_sent_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle?: string | null
          verification_source?: string | null
          zoho_email_sent?: boolean | null
          zoho_last_message_id?: string | null
          zoho_last_reply_at?: string | null
          zoho_last_sent_at?: string | null
          zoho_last_subject?: string | null
        }
        Update: {
          address_service_area?: string | null
          appointment_status?: string | null
          booking_at?: string | null
          business?: string | null
          business_unit_id?: string | null
          city?: string | null
          contact_date?: string | null
          contact_method?: string | null
          contacted_by?: string | null
          created_at?: string | null
          crm_id?: string | null
          date_added?: string | null
          deposit?: number | null
          deposit_status?: string | null
          email?: string | null
          email_body?: string | null
          email_sent_at?: string | null
          email_subject?: string | null
          estimated_value?: number | null
          id?: string | null
          industry?: string | null
          last_contact_at?: string | null
          lead_score?: number | null
          lead_type?: string | null
          name?: string | null
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          outreach_status?: string | null
          phone?: string | null
          priority?: string | null
          quote_amount?: number | null
          service_needed?: string | null
          source?: string | null
          source_record_id?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          text_message_template?: string | null
          text_sent_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle?: string | null
          verification_source?: string | null
          zoho_email_sent?: boolean | null
          zoho_last_message_id?: string | null
          zoho_last_reply_at?: string | null
          zoho_last_sent_at?: string | null
          zoho_last_subject?: string | null
        }
        Relationships: []
      }
      crm_backup_before_concord_20260711: {
        Row: {
          address_service_area: string | null
          appointment_status: string | null
          booking_at: string | null
          business: string | null
          business_unit_id: string | null
          city: string | null
          contact_date: string | null
          contact_method: string | null
          contacted_by: string | null
          created_at: string | null
          crm_id: string | null
          date_added: string | null
          deposit: number | null
          deposit_status: string | null
          email: string | null
          email_body: string | null
          email_sent_at: string | null
          email_subject: string | null
          estimated_value: number | null
          id: string | null
          industry: string | null
          last_contact_at: string | null
          lead_score: number | null
          lead_type: string | null
          name: string | null
          next_action: string | null
          next_follow_up_at: string | null
          notes: string | null
          outreach_status: string | null
          phone: string | null
          priority: string | null
          quote_amount: number | null
          service_needed: string | null
          source: string | null
          source_record_id: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          text_message_template: string | null
          text_sent_at: string | null
          updated_at: string | null
          user_id: string | null
          vehicle: string | null
          verification_source: string | null
          zoho_email_sent: boolean | null
        }
        Insert: {
          address_service_area?: string | null
          appointment_status?: string | null
          booking_at?: string | null
          business?: string | null
          business_unit_id?: string | null
          city?: string | null
          contact_date?: string | null
          contact_method?: string | null
          contacted_by?: string | null
          created_at?: string | null
          crm_id?: string | null
          date_added?: string | null
          deposit?: number | null
          deposit_status?: string | null
          email?: string | null
          email_body?: string | null
          email_sent_at?: string | null
          email_subject?: string | null
          estimated_value?: number | null
          id?: string | null
          industry?: string | null
          last_contact_at?: string | null
          lead_score?: number | null
          lead_type?: string | null
          name?: string | null
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          outreach_status?: string | null
          phone?: string | null
          priority?: string | null
          quote_amount?: number | null
          service_needed?: string | null
          source?: string | null
          source_record_id?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          text_message_template?: string | null
          text_sent_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle?: string | null
          verification_source?: string | null
          zoho_email_sent?: boolean | null
        }
        Update: {
          address_service_area?: string | null
          appointment_status?: string | null
          booking_at?: string | null
          business?: string | null
          business_unit_id?: string | null
          city?: string | null
          contact_date?: string | null
          contact_method?: string | null
          contacted_by?: string | null
          created_at?: string | null
          crm_id?: string | null
          date_added?: string | null
          deposit?: number | null
          deposit_status?: string | null
          email?: string | null
          email_body?: string | null
          email_sent_at?: string | null
          email_subject?: string | null
          estimated_value?: number | null
          id?: string | null
          industry?: string | null
          last_contact_at?: string | null
          lead_score?: number | null
          lead_type?: string | null
          name?: string | null
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          outreach_status?: string | null
          phone?: string | null
          priority?: string | null
          quote_amount?: number | null
          service_needed?: string | null
          source?: string | null
          source_record_id?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          text_message_template?: string | null
          text_sent_at?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle?: string | null
          verification_source?: string | null
          zoho_email_sent?: boolean | null
        }
        Relationships: []
      }
      crm_email_messages: {
        Row: {
          body: string
          created_at: string
          direction: string
          follow_up_at: string | null
          from_address: string
          id: string
          lead_id: string | null
          provider: string
          provider_payload: Json
          replied_at: string | null
          sent_at: string | null
          status: string
          subject: string
          to_address: string
          updated_at: string
          user_id: string
          zoho_draft_id: string | null
          zoho_message_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          direction?: string
          follow_up_at?: string | null
          from_address: string
          id?: string
          lead_id?: string | null
          provider?: string
          provider_payload?: Json
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_address: string
          updated_at?: string
          user_id: string
          zoho_draft_id?: string | null
          zoho_message_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          direction?: string
          follow_up_at?: string | null
          from_address?: string
          id?: string
          lead_id?: string | null
          provider?: string
          provider_payload?: Json
          replied_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_address?: string
          updated_at?: string
          user_id?: string
          zoho_draft_id?: string | null
          zoho_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_email_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_import_batches: {
        Row: {
          batch_name: string
          completed_at: string | null
          created_at: string
          failed_rows: number
          id: string
          imported_rows: number
          latest_error: string | null
          merged_rows: number
          original_headers: string | null
          skipped_rows: number
          source: string
          status: string
          total_rows: number
          user_id: string
        }
        Insert: {
          batch_name: string
          completed_at?: string | null
          created_at?: string
          failed_rows?: number
          id?: string
          imported_rows?: number
          latest_error?: string | null
          merged_rows?: number
          original_headers?: string | null
          skipped_rows?: number
          source: string
          status?: string
          total_rows?: number
          user_id: string
        }
        Update: {
          batch_name?: string
          completed_at?: string | null
          created_at?: string
          failed_rows?: number
          id?: string
          imported_rows?: number
          latest_error?: string | null
          merged_rows?: number
          original_headers?: string | null
          skipped_rows?: number
          source?: string
          status?: string
          total_rows?: number
          user_id?: string
        }
        Relationships: []
      }
      crm_import_reconciliation: {
        Row: {
          error_message: string | null
          id: string
          import_batch_id: string
          lead_id: string | null
          missing_fields: string[]
          original_data: Json
          outcome: string
          previous_values: Json | null
          reconciled_at: string
          source_record_id: string
          user_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          import_batch_id: string
          lead_id?: string | null
          missing_fields?: string[]
          original_data: Json
          outcome: string
          previous_values?: Json | null
          reconciled_at?: string
          source_record_id: string
          user_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          import_batch_id?: string
          lead_id?: string | null
          missing_fields?: string[]
          original_data?: Json
          outcome?: string
          previous_values?: Json | null
          reconciled_at?: string
          source_record_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_import_reconciliation_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "crm_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_import_reconciliation_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
      daily_performance_manual_corrections: {
        Row: {
          business_unit: string
          created_at: string
          field_name: string
          id: string
          new_value: Json | null
          previous_value: Json | null
          progress_date: string
          reason: string | null
          snapshot_id: string | null
          user_id: string
        }
        Insert: {
          business_unit?: string
          created_at?: string
          field_name: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          progress_date: string
          reason?: string | null
          snapshot_id?: string | null
          user_id: string
        }
        Update: {
          business_unit?: string
          created_at?: string
          field_name?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          progress_date?: string
          reason?: string | null
          snapshot_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_performance_manual_corrections_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "daily_performance_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_performance_score_settings: {
        Row: {
          booking_points: number
          booking_target: number
          created_at: string
          follow_up_points: number
          follow_up_target: number
          id: string
          income_activity_points: number
          income_target_amount: number
          minimum_score_for_streak: number
          monthly_income_goal: number
          outreach_points: number
          outreach_target: number
          planning_points: number
          updated_at: string
          user_id: string
          weekly_income_goal: number
        }
        Insert: {
          booking_points?: number
          booking_target?: number
          created_at?: string
          follow_up_points?: number
          follow_up_target?: number
          id?: string
          income_activity_points?: number
          income_target_amount?: number
          minimum_score_for_streak?: number
          monthly_income_goal?: number
          outreach_points?: number
          outreach_target?: number
          planning_points?: number
          updated_at?: string
          user_id: string
          weekly_income_goal?: number
        }
        Update: {
          booking_points?: number
          booking_target?: number
          created_at?: string
          follow_up_points?: number
          follow_up_target?: number
          id?: string
          income_activity_points?: number
          income_target_amount?: number
          minimum_score_for_streak?: number
          monthly_income_goal?: number
          outreach_points?: number
          outreach_target?: number
          planning_points?: number
          updated_at?: string
          user_id?: string
          weekly_income_goal?: number
        }
        Relationships: []
      }
      daily_performance_snapshots: {
        Row: {
          appointments_completed: number
          bookings_created: number
          business_unit: string
          calls_made: number
          content_posts: number
          created_at: string
          daily_score: number
          deposits_collected: number
          emails_sent: number
          end_of_day_review_completed: boolean
          estimates_sent: number
          finalized_at: string | null
          followups_completed: number
          goal_completion_percentage: number
          id: string
          incomplete_historical_data: boolean
          leads_contacted: number
          manual_adjustments: Json
          new_leads: number
          notes: string | null
          planning_completed: boolean
          problems: string | null
          progress_date: string
          replies_received: number
          revenue_collected: number
          reviews_received: number
          reviews_requested: number
          source_breakdown: Json
          texts_sent: number
          tomorrow_first_actions: string[]
          updated_at: string
          user_id: string
          wins: string | null
        }
        Insert: {
          appointments_completed?: number
          bookings_created?: number
          business_unit?: string
          calls_made?: number
          content_posts?: number
          created_at?: string
          daily_score?: number
          deposits_collected?: number
          emails_sent?: number
          end_of_day_review_completed?: boolean
          estimates_sent?: number
          finalized_at?: string | null
          followups_completed?: number
          goal_completion_percentage?: number
          id?: string
          incomplete_historical_data?: boolean
          leads_contacted?: number
          manual_adjustments?: Json
          new_leads?: number
          notes?: string | null
          planning_completed?: boolean
          problems?: string | null
          progress_date: string
          replies_received?: number
          revenue_collected?: number
          reviews_received?: number
          reviews_requested?: number
          source_breakdown?: Json
          texts_sent?: number
          tomorrow_first_actions?: string[]
          updated_at?: string
          user_id: string
          wins?: string | null
        }
        Update: {
          appointments_completed?: number
          bookings_created?: number
          business_unit?: string
          calls_made?: number
          content_posts?: number
          created_at?: string
          daily_score?: number
          deposits_collected?: number
          emails_sent?: number
          end_of_day_review_completed?: boolean
          estimates_sent?: number
          finalized_at?: string | null
          followups_completed?: number
          goal_completion_percentage?: number
          id?: string
          incomplete_historical_data?: boolean
          leads_contacted?: number
          manual_adjustments?: Json
          new_leads?: number
          notes?: string | null
          planning_completed?: boolean
          problems?: string | null
          progress_date?: string
          replies_received?: number
          revenue_collected?: number
          reviews_received?: number
          reviews_requested?: number
          source_breakdown?: Json
          texts_sent?: number
          tomorrow_first_actions?: string[]
          updated_at?: string
          user_id?: string
          wins?: string | null
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
          address_service_area: string | null
          appointment_status: string
          booking_at: string | null
          business: string | null
          business_unit_id: string
          city: string | null
          contact_date: string | null
          contact_method: string | null
          contacted_by: string | null
          created_at: string
          crm_id: string | null
          date_added: string | null
          deposit: number | null
          deposit_status: string
          email: string | null
          email_body: string | null
          email_sent_at: string | null
          email_subject: string | null
          estimated_value: number | null
          id: string
          import_batch_id: string | null
          industry: string | null
          last_contact_at: string | null
          lead_score: number
          lead_type: string
          name: string
          next_action: string | null
          next_follow_up_at: string | null
          notes: string | null
          outreach_status: string
          phone: string | null
          priority: string | null
          quote_amount: number | null
          service_needed: string | null
          source: string | null
          source_record_id: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["lead_status"]
          text_message_template: string | null
          text_sent_at: string | null
          updated_at: string
          user_id: string
          vehicle: string | null
          verification_source: string | null
          zoho_email_sent: boolean
          zoho_last_message_id: string | null
          zoho_last_reply_at: string | null
          zoho_last_sent_at: string | null
          zoho_last_subject: string | null
        }
        Insert: {
          address_service_area?: string | null
          appointment_status?: string
          booking_at?: string | null
          business?: string | null
          business_unit_id?: string
          city?: string | null
          contact_date?: string | null
          contact_method?: string | null
          contacted_by?: string | null
          created_at?: string
          crm_id?: string | null
          date_added?: string | null
          deposit?: number | null
          deposit_status?: string
          email?: string | null
          email_body?: string | null
          email_sent_at?: string | null
          email_subject?: string | null
          estimated_value?: number | null
          id?: string
          import_batch_id?: string | null
          industry?: string | null
          last_contact_at?: string | null
          lead_score?: number
          lead_type?: string
          name: string
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          outreach_status?: string
          phone?: string | null
          priority?: string | null
          quote_amount?: number | null
          service_needed?: string | null
          source?: string | null
          source_record_id?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          text_message_template?: string | null
          text_sent_at?: string | null
          updated_at?: string
          user_id: string
          vehicle?: string | null
          verification_source?: string | null
          zoho_email_sent?: boolean
          zoho_last_message_id?: string | null
          zoho_last_reply_at?: string | null
          zoho_last_sent_at?: string | null
          zoho_last_subject?: string | null
        }
        Update: {
          address_service_area?: string | null
          appointment_status?: string
          booking_at?: string | null
          business?: string | null
          business_unit_id?: string
          city?: string | null
          contact_date?: string | null
          contact_method?: string | null
          contacted_by?: string | null
          created_at?: string
          crm_id?: string | null
          date_added?: string | null
          deposit?: number | null
          deposit_status?: string
          email?: string | null
          email_body?: string | null
          email_sent_at?: string | null
          email_subject?: string | null
          estimated_value?: number | null
          id?: string
          import_batch_id?: string | null
          industry?: string | null
          last_contact_at?: string | null
          lead_score?: number
          lead_type?: string
          name?: string
          next_action?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          outreach_status?: string
          phone?: string | null
          priority?: string | null
          quote_amount?: number | null
          service_needed?: string | null
          source?: string | null
          source_record_id?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          text_message_template?: string | null
          text_sent_at?: string | null
          updated_at?: string
          user_id?: string
          vehicle?: string | null
          verification_source?: string | null
          zoho_email_sent?: boolean
          zoho_last_message_id?: string | null
          zoho_last_reply_at?: string | null
          zoho_last_sent_at?: string | null
          zoho_last_subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_unit_id_fkey"
            columns: ["business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "crm_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_events: {
        Row: {
          created_at: string
          detail: string | null
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          source: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          source?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          source?: string
          title?: string
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
          available_amount: number | null
          created_at: string
          entry_date: string
          gross_amount: number | null
          id: string
          income_lane: Database["public"]["Enums"]["income_stream"] | null
          month_start: string | null
          notes: string | null
          payment_method: string | null
          proof_url: string | null
          source: string | null
          stream: Database["public"]["Enums"]["income_stream"]
          updated_at: string
          user_id: string
          week_start: string | null
        }
        Insert: {
          amount: number
          available_amount?: number | null
          created_at?: string
          entry_date?: string
          gross_amount?: number | null
          id?: string
          income_lane?: Database["public"]["Enums"]["income_stream"] | null
          month_start?: string | null
          notes?: string | null
          payment_method?: string | null
          proof_url?: string | null
          source?: string | null
          stream: Database["public"]["Enums"]["income_stream"]
          updated_at?: string
          user_id: string
          week_start?: string | null
        }
        Update: {
          amount?: number
          available_amount?: number | null
          created_at?: string
          entry_date?: string
          gross_amount?: number | null
          id?: string
          income_lane?: Database["public"]["Enums"]["income_stream"] | null
          month_start?: string | null
          notes?: string | null
          payment_method?: string | null
          proof_url?: string | null
          source?: string | null
          stream?: Database["public"]["Enums"]["income_stream"]
          updated_at?: string
          user_id?: string
          week_start?: string | null
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
      zoho_mail_connections: {
        Row: {
          access_token: string | null
          access_token_expires_at: string | null
          account_id: string | null
          accounts_domain: string
          api_domain: string
          connected_at: string | null
          created_at: string
          disconnected_at: string | null
          email_address: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          refresh_token: string | null
          scopes: string[]
          status: string
          updated_at: string
          user_id: string
          zoho_dc: string
        }
        Insert: {
          access_token?: string | null
          access_token_expires_at?: string | null
          account_id?: string | null
          accounts_domain?: string
          api_domain?: string
          connected_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          email_address: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          refresh_token?: string | null
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id: string
          zoho_dc?: string
        }
        Update: {
          access_token?: string | null
          access_token_expires_at?: string | null
          account_id?: string | null
          accounts_domain?: string
          api_domain?: string
          connected_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          email_address?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          refresh_token?: string | null
          scopes?: string[]
          status?: string
          updated_at?: string
          user_id?: string
          zoho_dc?: string
        }
        Relationships: []
      }
      zoho_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          state_token: string
          used_at: string | null
          user_id: string
          zoho_dc: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          state_token: string
          used_at?: string | null
          user_id: string
          zoho_dc?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          state_token?: string
          used_at?: string | null
          user_id?: string
          zoho_dc?: string
        }
        Relationships: []
      }
    }
    Views: {
      crm_activity: {
        Row: {
          activity_source: string | null
          created_at: string | null
          detail: string | null
          event_type: string | null
          id: string | null
          lead_id: string | null
          metadata: Json | null
          occurred_at: string | null
          source: string | null
          title: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_business_days: {
        Args: { business_days: number; start_at: string }
        Returns: string
      }
      daily_progress_business_unit_from_stream: {
        Args: { p_stream: string }
        Returns: string
      }
      daily_progress_date_pacific: {
        Args: { p_value: string }
        Returns: string
      }
      refresh_daily_performance_snapshot: {
        Args: {
          p_business_unit: string
          p_progress_date: string
          p_user_id: string
        }
        Returns: undefined
      }
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
      integration_status:
        | "Needs Setup"
        | "Verified Live"
        | "Error"
        | "Manual Only"
        | "Not Implemented"
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
      integration_status: [
        "Needs Setup",
        "Verified Live",
        "Error",
        "Manual Only",
        "Not Implemented",
      ],
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
