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
      ad_metrics: {
        Row: {
          ad_id: string
          clicks_count: number
          id: string
          last_recorded_at: string
          views_count: number
        }
        Insert: {
          ad_id: string
          clicks_count?: number
          id?: string
          last_recorded_at?: string
          views_count?: number
        }
        Update: {
          ad_id?: string
          clicks_count?: number
          id?: string
          last_recorded_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_metrics_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: true
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          end_date: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          placement: Database["public"]["Enums"]["ad_placement"]
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          end_date: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          start_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          end_date?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      driver_bank_accounts: {
        Row: {
          account_holder: string
          account_number: string
          bank_name: string
          created_at: string
          driver_id: string
          id: string
          is_default: boolean
          updated_at: string
        }
        Insert: {
          account_holder: string
          account_number: string
          bank_name: string
          created_at?: string
          driver_id: string
          id?: string
          is_default?: boolean
          updated_at?: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          bank_name?: string
          created_at?: string
          driver_id?: string
          id?: string
          is_default?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_bank_accounts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_documents: {
        Row: {
          created_at: string
          document_type: string
          driver_id: string
          expiry_date: string | null
          file_url: string
          id: string
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          driver_id: string
          expiry_date?: string | null
          file_url: string
          id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          driver_id?: string
          expiry_date?: string | null
          file_url?: string
          id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_earnings: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          driver_id: string
          gross_fare: number
          id: string
          net_earning: number
          ride_id: string
          status: string
        }
        Insert: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          driver_id: string
          gross_fare?: number
          id?: string
          net_earning?: number
          ride_id: string
          status?: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          driver_id?: string
          gross_fare?: number
          id?: string
          net_earning?: number
          ride_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_earnings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_earnings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_settings: {
        Row: {
          auto_accept_rides: boolean
          auto_accept_timeout_seconds: number
          available_friday: boolean
          available_monday: boolean
          available_saturday: boolean
          available_sunday: boolean
          available_thursday: boolean
          available_tuesday: boolean
          available_wednesday: boolean
          created_at: string
          driver_id: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          id: string
          preferred_payment_method: string
          service_area_radius_km: number
          updated_at: string
          working_hours_enabled: boolean
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          auto_accept_rides?: boolean
          auto_accept_timeout_seconds?: number
          available_friday?: boolean
          available_monday?: boolean
          available_saturday?: boolean
          available_sunday?: boolean
          available_thursday?: boolean
          available_tuesday?: boolean
          available_wednesday?: boolean
          created_at?: string
          driver_id: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          preferred_payment_method?: string
          service_area_radius_km?: number
          updated_at?: string
          working_hours_enabled?: boolean
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          auto_accept_rides?: boolean
          auto_accept_timeout_seconds?: number
          available_friday?: boolean
          available_monday?: boolean
          available_saturday?: boolean
          available_sunday?: boolean
          available_thursday?: boolean
          available_tuesday?: boolean
          available_wednesday?: boolean
          created_at?: string
          driver_id?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          preferred_payment_method?: string
          service_area_radius_km?: number
          updated_at?: string
          working_hours_enabled?: boolean
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_settings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          current_lat: number | null
          current_lng: number | null
          current_vehicle_id: string | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          id: string
          is_verified: boolean
          ktp_number: string | null
          ktp_url: string | null
          ktp_verified_at: string | null
          license_number: string | null
          location: unknown
          phone: string
          pin_hash: string | null
          prefers_bike: boolean
          prefers_bike_women: boolean
          prefers_car: boolean
          rating: number | null
          registration_status:
            | Database["public"]["Enums"]["registration_status"]
            | null
          rejection_reason: string | null
          sim_expiry_date: string | null
          sim_url: string | null
          sim_verified_at: string | null
          status: Database["public"]["Enums"]["driver_status"]
          updated_at: string
          user_id: string
          vehicle_stnk_url: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          current_vehicle_id?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"]
          id?: string
          is_verified?: boolean
          ktp_number?: string | null
          ktp_url?: string | null
          ktp_verified_at?: string | null
          license_number?: string | null
          location?: unknown
          phone: string
          pin_hash?: string | null
          prefers_bike?: boolean
          prefers_bike_women?: boolean
          prefers_car?: boolean
          rating?: number | null
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          rejection_reason?: string | null
          sim_expiry_date?: string | null
          sim_url?: string | null
          sim_verified_at?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id: string
          vehicle_stnk_url?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          current_vehicle_id?: string | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"]
          id?: string
          is_verified?: boolean
          ktp_number?: string | null
          ktp_url?: string | null
          ktp_verified_at?: string | null
          license_number?: string | null
          location?: unknown
          phone?: string
          pin_hash?: string | null
          prefers_bike?: boolean
          prefers_bike_women?: boolean
          prefers_car?: boolean
          rating?: number | null
          registration_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          rejection_reason?: string | null
          sim_expiry_date?: string | null
          sim_url?: string | null
          sim_verified_at?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          updated_at?: string
          user_id?: string
          vehicle_stnk_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_current_vehicle_id_fkey"
            columns: ["current_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_blacklist: {
        Row: {
          bounce_subtype: string | null
          bounce_type: string | null
          created_at: string
          email: string
          id: string
          notes: string | null
          reason: string | null
          related_event_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bounce_subtype?: string | null
          bounce_type?: string | null
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          reason?: string | null
          related_event_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bounce_subtype?: string | null
          bounce_type?: string | null
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          reason?: string | null
          related_event_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_blacklist_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "email_webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_metrics: {
        Row: {
          bounce_rate: number | null
          delivery_rate: number | null
          id: number
          metric_date: string
          open_rate: number | null
          total_bounced: number | null
          total_complained: number | null
          total_delivered: number | null
          total_opened: number | null
          total_sent: number | null
          updated_at: string | null
        }
        Insert: {
          bounce_rate?: number | null
          delivery_rate?: number | null
          id?: number
          metric_date?: string
          open_rate?: number | null
          total_bounced?: number | null
          total_complained?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_sent?: number | null
          updated_at?: string | null
        }
        Update: {
          bounce_rate?: number | null
          delivery_rate?: number | null
          id?: number
          metric_date?: string
          open_rate?: number | null
          total_bounced?: number | null
          total_complained?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_sent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          attempts: number
          body_html: string
          created_at: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          metadata: Json | null
          recipient_email: string
          recipient_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_type: string
        }
        Insert: {
          attempts?: number
          body_html: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json | null
          recipient_email: string
          recipient_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_type: string
        }
        Update: {
          attempts?: number
          body_html?: string
          created_at?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json | null
          recipient_email?: string
          recipient_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_template_type_fkey"
            columns: ["template_type"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["type"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          id: string
          is_active: boolean
          preview: string | null
          subject: string
          type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          preview?: string | null
          subject: string
          type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          preview?: string | null
          subject?: string
          type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      email_webhook_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_test_at: string | null
          last_test_status: string | null
          provider: string
          updated_at: string
          webhook_secret: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_test_at?: string | null
          last_test_status?: string | null
          provider: string
          updated_at?: string
          webhook_secret: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_test_at?: string | null
          last_test_status?: string | null
          provider?: string
          updated_at?: string
          webhook_secret?: string
          webhook_url?: string
        }
        Relationships: []
      }
      email_webhook_events: {
        Row: {
          bounce_subtype: string | null
          bounce_type: string | null
          created_at: string
          email_log_id: string | null
          error_code: string | null
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          provider: string
          provider_event_id: string | null
          recipient_email: string | null
        }
        Insert: {
          bounce_subtype?: string | null
          bounce_type?: string | null
          created_at?: string
          email_log_id?: string | null
          error_code?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          provider: string
          provider_event_id?: string | null
          recipient_email?: string | null
        }
        Update: {
          bounce_subtype?: string | null
          bounce_type?: string | null
          created_at?: string
          email_log_id?: string | null
          error_code?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          provider?: string
          provider_event_id?: string | null
          recipient_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_webhook_events_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      external_drivers: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          plate_number: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          plate_number: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          plate_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hotel_bookings: {
        Row: {
          booking_ref: string
          check_in: string
          check_out: string
          created_at: string
          guest_name: string | null
          guest_phone: string | null
          guests: number
          hotel_id: string
          id: string
          room_id: string
          special_requests: string | null
          status: Database["public"]["Enums"]["hotel_booking_status"]
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_ref?: string
          check_in: string
          check_out: string
          created_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          guests?: number
          hotel_id: string
          id?: string
          room_id: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["hotel_booking_status"]
          total_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_ref?: string
          check_in?: string
          check_out?: string
          created_at?: string
          guest_name?: string | null
          guest_phone?: string | null
          guests?: number
          hotel_id?: string
          id?: string
          room_id?: string
          special_requests?: string | null
          status?: Database["public"]["Enums"]["hotel_booking_status"]
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hotel_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_rooms: {
        Row: {
          active: boolean
          amenities: string[] | null
          available_rooms: number
          created_at: string
          description: string | null
          hotel_id: string
          id: string
          image_url: string | null
          max_guests: number
          name: string
          price_per_night: number
          total_rooms: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amenities?: string[] | null
          available_rooms?: number
          created_at?: string
          description?: string | null
          hotel_id: string
          id?: string
          image_url?: string | null
          max_guests?: number
          name: string
          price_per_night?: number
          total_rooms?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amenities?: string[] | null
          available_rooms?: number
          created_at?: string
          description?: string | null
          hotel_id?: string
          id?: string
          image_url?: string | null
          max_guests?: number
          name?: string
          price_per_night?: number
          total_rooms?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          active: boolean
          address: string
          amenities: string[] | null
          city: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          name: string
          rating: number | null
          star_rating: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          amenities?: string[] | null
          city: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          rating?: number | null
          star_rating?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          amenities?: string[] | null
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          rating?: number | null
          star_rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          target: string
          type: string
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          target: string
          type: string
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          target?: string
          type?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      payment_config_audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string | null
          environment: string
          gateway: string
          id: string
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string | null
          environment: string
          gateway: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string | null
          environment?: string
          gateway?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: []
      }
      payment_gateway_configs: {
        Row: {
          client_key: string
          created_at: string | null
          environment: string
          gateway: string
          id: string
          is_active: boolean | null
          server_key_encrypted: string
          updated_at: string | null
        }
        Insert: {
          client_key: string
          created_at?: string | null
          environment: string
          gateway: string
          id?: string
          is_active?: boolean | null
          server_key_encrypted: string
          updated_at?: string | null
        }
        Update: {
          client_key?: string
          created_at?: string | null
          environment?: string
          gateway?: string
          id?: string
          is_active?: boolean | null
          server_key_encrypted?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          active_environment: string | null
          commission_rate: number
          config: Json
          created_at: string
          gateway: string
          id: string
          is_active: boolean
          is_default: boolean
          updated_at: string
        }
        Insert: {
          active_environment?: string | null
          commission_rate?: number
          config?: Json
          created_at?: string
          gateway: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
        }
        Update: {
          active_environment?: string | null
          commission_rate?: number
          config?: Json
          created_at?: string
          gateway?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email_verified: boolean | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          id_number: string | null
          nationality: string | null
          phone: string | null
          phone_verified: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          id_number?: string | null
          nationality?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email_verified?: boolean | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          id_number?: string | null
          nationality?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          created_at: string
          discount_amount: number
          id: string
          promo_id: string
          reference_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_amount: number
          id?: string
          promo_id: string
          reference_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_amount?: number
          id?: string
          promo_id?: string
          reference_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "promos"
            referencedColumns: ["id"]
          },
        ]
      }
      promos: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["promo_discount_type"]
          discount_value: number
          end_date: string
          id: string
          is_active: boolean
          max_discount: number | null
          min_purchase: number | null
          quota: number
          start_date: string
          target_service: Database["public"]["Enums"]["promo_target_service"]
          target_user_segment: Database["public"]["Enums"]["promo_user_segment"]
          title: string
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["promo_discount_type"]
          discount_value: number
          end_date: string
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_purchase?: number | null
          quota?: number
          start_date?: string
          target_service?: Database["public"]["Enums"]["promo_target_service"]
          target_user_segment?: Database["public"]["Enums"]["promo_user_segment"]
          title: string
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["promo_discount_type"]
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_purchase?: number | null
          quota?: number
          start_date?: string
          target_service?: Database["public"]["Enums"]["promo_target_service"]
          target_user_segment?: Database["public"]["Enums"]["promo_user_segment"]
          title?: string
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      ride_ratings: {
        Row: {
          comment: string | null
          created_at: string
          driver_id: string
          id: string
          rating: number
          ride_id: string
          rider_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          driver_id: string
          id?: string
          rating: number
          ride_id: string
          rider_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          rating?: number
          ride_id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_ratings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: true
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          created_at: string
          distance_km: number | null
          driver_id: string | null
          dropoff_address: string | null
          dropoff_lat: number
          dropoff_lng: number
          dropoff_location: unknown
          external_driver_name: string | null
          external_driver_plate: string | null
          fare: number | null
          id: string
          pickup_address: string | null
          pickup_lat: number
          pickup_lng: number
          pickup_location: unknown
          rider_id: string
          service_type: Database["public"]["Enums"]["ride_service_type"]
          status: Database["public"]["Enums"]["ride_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: string | null
          dropoff_lat: number
          dropoff_lng: number
          dropoff_location?: unknown
          external_driver_name?: string | null
          external_driver_plate?: string | null
          fare?: number | null
          id?: string
          pickup_address?: string | null
          pickup_lat: number
          pickup_lng: number
          pickup_location?: unknown
          rider_id: string
          service_type?: Database["public"]["Enums"]["ride_service_type"]
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          distance_km?: number | null
          driver_id?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number
          dropoff_lng?: number
          dropoff_location?: unknown
          external_driver_name?: string | null
          external_driver_plate?: string | null
          fare?: number | null
          id?: string
          pickup_address?: string | null
          pickup_lat?: number
          pickup_lng?: number
          pickup_location?: unknown
          rider_id?: string
          service_type?: Database["public"]["Enums"]["ride_service_type"]
          status?: Database["public"]["Enums"]["ride_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_booking_seats: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          seat_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          seat_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          seat_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_booking_seats_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shuttle_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_booking_seats_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "shuttle_seats"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_bookings: {
        Row: {
          base_amount: number | null
          booking_notes: string | null
          booking_ref: string
          booking_status: string | null
          created_at: string
          distance_amount: number | null
          email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          passenger_count: number | null
          payment_method: string | null
          payment_status: string
          pickup_driver_name: string | null
          pickup_driver_plate: string | null
          pickup_point_id: string | null
          pickup_status: string | null
          rayon_id: string | null
          rayon_surcharge: number | null
          schedule_id: string
          seat_count: number
          service_premium: number | null
          service_type_id: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"]
          total_fare: number
          updated_at: string
          user_id: string | null
          vehicle_type: string | null
        }
        Insert: {
          base_amount?: number | null
          booking_notes?: string | null
          booking_ref?: string
          booking_status?: string | null
          created_at?: string
          distance_amount?: number | null
          email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          passenger_count?: number | null
          payment_method?: string | null
          payment_status?: string
          pickup_driver_name?: string | null
          pickup_driver_plate?: string | null
          pickup_point_id?: string | null
          pickup_status?: string | null
          rayon_id?: string | null
          rayon_surcharge?: number | null
          schedule_id: string
          seat_count?: number
          service_premium?: number | null
          service_type_id?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_fare?: number
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Update: {
          base_amount?: number | null
          booking_notes?: string | null
          booking_ref?: string
          booking_status?: string | null
          created_at?: string
          distance_amount?: number | null
          email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          passenger_count?: number | null
          payment_method?: string | null
          payment_status?: string
          pickup_driver_name?: string | null
          pickup_driver_plate?: string | null
          pickup_point_id?: string | null
          pickup_status?: string | null
          rayon_id?: string | null
          rayon_surcharge?: number | null
          schedule_id?: string
          seat_count?: number
          service_premium?: number | null
          service_type_id?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          total_fare?: number
          updated_at?: string
          user_id?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_bookings_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "shuttle_pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_bookings_rayon_id_fkey"
            columns: ["rayon_id"]
            isOneToOne: false
            referencedRelation: "shuttle_rayons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_bookings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "shuttle_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_bookings_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "shuttle_service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_booking_details: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          passenger_name: string
          passenger_phone: string
          seat_number: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          passenger_name: string
          passenger_phone: string
          seat_number: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          passenger_name?: string
          passenger_phone?: string
          seat_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_booking_details_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shuttle_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_booking_audit: {
        Row: {
          action: string
          booking_id: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          booking_id: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          booking_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_booking_audit_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "shuttle_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_pickup_points: {
        Row: {
          active: boolean
          created_at: string
          departure_time: string | null
          distance_meters: number
          fare: number
          id: string
          name: string
          point_type: string
          rayon_id: string
          stop_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          departure_time?: string | null
          distance_meters?: number
          fare?: number
          id?: string
          name: string
          point_type?: string
          rayon_id: string
          stop_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          departure_time?: string | null
          distance_meters?: number
          fare?: number
          id?: string
          name?: string
          point_type?: string
          rayon_id?: string
          stop_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_pickup_points_rayon_id_fkey"
            columns: ["rayon_id"]
            isOneToOne: false
            referencedRelation: "shuttle_rayons"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_rayons: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          route_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          route_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          route_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_rayons_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "shuttle_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_routes: {
        Row: {
          active: boolean
          base_fare: number
          created_at: string
          destination: string
          distance_km: number | null
          id: string
          name: string
          origin: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_fare?: number
          created_at?: string
          destination: string
          distance_km?: number | null
          id?: string
          name: string
          origin: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_fare?: number
          created_at?: string
          destination?: string
          distance_km?: number | null
          id?: string
          name?: string
          origin?: string
          updated_at?: string
        }
        Relationships: []
      }
      shuttle_schedules: {
        Row: {
          active: boolean
          arrival_time: string | null
          available_seats: number
          created_at: string
          departure_time: string
          driver_id: string | null
          id: string
          route_id: string
          service_type_id: string | null
          total_seats: number
          updated_at: string
          vehicle_id: string | null
          vehicle_type: string | null
        }
        Insert: {
          active?: boolean
          arrival_time?: string | null
          available_seats?: number
          created_at?: string
          departure_time: string
          driver_id?: string | null
          id?: string
          route_id: string
          service_type_id?: string | null
          total_seats?: number
          updated_at?: string
          vehicle_id?: string | null
          vehicle_type?: string | null
        }
        Update: {
          active?: boolean
          arrival_time?: string | null
          available_seats?: number
          created_at?: string
          departure_time?: string
          driver_id?: string | null
          id?: string
          route_id?: string
          service_type_id?: string | null
          total_seats?: number
          updated_at?: string
          vehicle_id?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_schedules_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "shuttle_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_schedules_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "shuttle_service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shuttle_schedules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_seats: {
        Row: {
          created_at: string
          id: string
          reserved_at: string | null
          reserved_by_session: string | null
          schedule_id: string
          seat_number: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reserved_at?: string | null
          reserved_by_session?: string | null
          schedule_id: string
          seat_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reserved_at?: string | null
          reserved_by_session?: string | null
          schedule_id?: string
          seat_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_seats_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "shuttle_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_service_types: {
        Row: {
          active: boolean
          baggage_info: string
          created_at: string
          description: string | null
          id: string
          name: Database["public"]["Enums"]["shuttle_service_category"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          baggage_info: string
          created_at?: string
          description?: string | null
          id?: string
          name: Database["public"]["Enums"]["shuttle_service_category"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          baggage_info?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: Database["public"]["Enums"]["shuttle_service_category"]
          updated_at?: string
        }
        Relationships: []
      }
      shuttle_service_vehicle_types: {
        Row: {
          active: boolean
          capacity: number
          created_at: string
          description: string | null
          facilities: string[] | null
          id: string
          service_type_id: string
          updated_at: string
          vehicle_name: string
          vehicle_type: string
        }
        Insert: {
          active?: boolean
          capacity: number
          created_at?: string
          description?: string | null
          facilities?: string[] | null
          id?: string
          service_type_id: string
          updated_at?: string
          vehicle_name: string
          vehicle_type: string
        }
        Update: {
          active?: boolean
          capacity?: number
          created_at?: string
          description?: string | null
          facilities?: string[] | null
          id?: string
          service_type_id?: string
          updated_at?: string
          vehicle_name?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          currency: string
          data_sharing_analytics: boolean
          id: string
          language: string
          notification_email: boolean
          notification_promotions: boolean
          notification_push: boolean
          notification_ride_updates: boolean
          notification_sms: boolean
          privacy_show_location: boolean
          privacy_show_profile: boolean
          theme: string
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          data_sharing_analytics?: boolean
          id?: string
          language?: string
          notification_email?: boolean
          notification_promotions?: boolean
          notification_push?: boolean
          notification_ride_updates?: boolean
          notification_sms?: boolean
          privacy_show_location?: boolean
          privacy_show_profile?: boolean
          theme?: string
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          data_sharing_analytics?: boolean
          id?: string
          language?: string
          notification_email?: boolean
          notification_promotions?: boolean
          notification_push?: boolean
          notification_ride_updates?: boolean
          notification_sms?: boolean
          privacy_show_location?: boolean
          privacy_show_profile?: boolean
          theme?: string
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vehicle_documents: {
        Row: {
          created_at: string
          document_type: string
          expiry_date: string | null
          file_url: string
          id: string
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string
          updated_at: string
          vehicle_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          expiry_date?: string | null
          file_url: string
          id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          vehicle_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          expiry_date?: string | null
          file_url?: string
          id?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          vehicle_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          capacity: number
          color: string | null
          created_at: string
          driver_id: string
          id: string
          image_url: string | null
          is_verified: boolean | null
          model: string | null
          plate_number: string
          updated_at: string
          vehicle_type: string
          year: number | null
        }
        Insert: {
          capacity?: number
          color?: string | null
          created_at?: string
          driver_id: string
          id?: string
          image_url?: string | null
          is_verified?: boolean | null
          model?: string | null
          plate_number: string
          updated_at?: string
          vehicle_type?: string
          year?: number | null
        }
        Update: {
          capacity?: number
          color?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          image_url?: string | null
          is_verified?: boolean | null
          model?: string | null
          plate_number?: string
          updated_at?: string
          vehicle_type?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          gateway_transaction_id: string | null
          id: string
          payment_gateway: string | null
          reference_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          description?: string | null
          gateway_transaction_id?: string | null
          id?: string
          payment_gateway?: string | null
          reference_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          gateway_transaction_id?: string | null
          id?: string
          payment_gateway?: string | null
          reference_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          wallet_type: Database["public"]["Enums"]["wallet_type"]
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          wallet_type?: Database["public"]["Enums"]["wallet_type"]
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          wallet_type?: Database["public"]["Enums"]["wallet_type"]
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          bank_account_id: string
          created_at: string
          driver_id: string
          id: string
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          bank_account_id: string
          created_at?: string
          driver_id: string
          id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          bank_account_id?: string
          created_at?: string
          driver_id?: string
          id?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "driver_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      shuttle_pricing_rules: {
        Row: {
          active: boolean
          base_fare_multiplier: number
          created_at: string
          description: string | null
          distance_cost_per_km: number
          effective_date: string
          id: string
          peak_hours_end: string | null
          peak_hours_multiplier: number | null
          peak_hours_start: string | null
          rayon_base_surcharge: number
          service_type_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_fare_multiplier?: number
          created_at?: string
          description?: string | null
          distance_cost_per_km?: number
          effective_date?: string
          id?: string
          peak_hours_end?: string | null
          peak_hours_multiplier?: number | null
          peak_hours_start?: string | null
          rayon_base_surcharge?: number
          service_type_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_fare_multiplier?: number
          created_at?: string
          description?: string | null
          distance_cost_per_km?: number
          effective_date?: string
          id?: string
          peak_hours_end?: string | null
          peak_hours_multiplier?: number | null
          peak_hours_start?: string | null
          rayon_base_surcharge?: number
          service_type_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shuttle_pricing_rules_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "shuttle_service_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_driver_to_shuttle: {
        Args: { p_driver_id: string; p_schedule_id: string }
        Returns: boolean
      }
      calculate_shuttle_booking_price: {
        Args: {
          p_schedule_id: string
          p_service_type_id: string
          p_rayon_id: string
          p_seat_count: number
        }
        Returns: {
          base_amount: number
          service_premium: number
          rayon_surcharge: number
          distance_amount: number
          peak_multiplier: number
          total_amount: number
        }[]
      }
      cleanup_expired_seat_reservations: { Args: never; Returns: undefined }
      create_shuttle_booking_atomic: {
        Args: {
          p_booking_ref?: string
          p_guest_name?: string
          p_guest_phone?: string
          p_payment_method?: string
          p_payment_status?: string
          p_pickup_point_id?: string
          p_rayon_id?: string
          p_schedule_id: string
          p_seat_numbers?: string[]
          p_total_fare?: number
          p_user_id?: string
        }
        Returns: string
      }
      create_shuttle_booking_atomic_v2: {
        Args: {
          p_expected_total: number
          p_guest_name: string
          p_guest_phone: string
          p_passenger_names: string[]
          p_passenger_phones: string[]
          p_payment_method: string
          p_pickup_point_id: string
          p_rayon_id: string
          p_schedule_id: string
          p_seat_numbers: number[]
          p_service_type_id: string
          p_user_id: string
          p_vehicle_type: string
        }
        Returns: string
      }
      get_available_services_for_schedule: {
        Args: { p_schedule_id: string }
        Returns: Json
      }
      get_current_pricing_for_service: {
        Args: { p_service_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_ad_metric: {
        Args: { p_ad_id: string; p_type: string }
        Returns: undefined
      }
      process_wallet_transaction: {
        Args: {
          p_amount: number
          p_description?: string
          p_gateway_transaction_id?: string
          p_payment_gateway?: string
          p_reference_id?: string
          p_status?: Database["public"]["Enums"]["transaction_status"]
          p_type: Database["public"]["Enums"]["transaction_type"]
          p_wallet_id: string
        }
        Returns: string
      }
      reserve_shuttle_seats: {
        Args: {
          p_schedule_id: string
          p_seat_numbers: string[]
          p_session_id: string
        }
        Returns: boolean
      }
      sync_available_seats_on_schedule: {
        Args: { p_schedule_id: string }
        Returns: undefined
      }
      update_email_delivery_metrics: { Args: never; Returns: undefined }
    }
    Enums: {
      ad_placement: "dashboard_banner" | "sidebar" | "popup" | "ride_completion"
      app_role: "admin" | "moderator" | "user"
      booking_status: "confirmed" | "cancelled" | "completed"
      driver_status: "available" | "busy" | "offline"
      gender_type: "male" | "female"
      hotel_booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      promo_discount_type: "percentage" | "fixed_amount"
      promo_target_service: "ride" | "shuttle" | "hotel" | "all"
      promo_user_segment: "all" | "new_user" | "loyal_user" | "inactive_user"
      registration_status: "pending" | "approved" | "rejected"
      ride_service_type: "bike" | "bike_women" | "car"
      ride_status:
        | "pending"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
      shuttle_service_category: "Reguler" | "Semi Executive" | "Executive"
      transaction_status: "pending" | "completed" | "failed"
      transaction_type:
        | "top_up"
        | "ride_payment"
        | "ride_earning"
        | "withdrawal"
        | "refund"
        | "admin_adjustment"
      wallet_type: "user" | "driver"
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
      ad_placement: ["dashboard_banner", "sidebar", "popup", "ride_completion"],
      app_role: ["admin", "driver", "user"],
      booking_status: ["confirmed", "cancelled", "completed"],
      driver_status: ["available", "busy", "offline"],
      gender_type: ["male", "female"],
      hotel_booking_status: ["pending", "confirmed", "cancelled", "completed"],
      promo_discount_type: ["percentage", "fixed_amount"],
      promo_target_service: ["ride", "shuttle", "hotel", "all"],
      promo_user_segment: ["all", "new_user", "loyal_user", "inactive_user"],
      registration_status: ["pending", "approved", "rejected"],
      ride_service_type: ["bike", "bike_women", "car"],
      ride_status: [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
      ],
      shuttle_service_category: ["Reguler", "Semi Executive", "Executive"],
      transaction_status: ["pending", "completed", "failed"],
      transaction_type: [
        "top_up",
        "ride_payment",
        "ride_earning",
        "withdrawal",
        "refund",
        "admin_adjustment",
      ],
      wallet_type: ["user", "driver"],
    },
  },
} as const
