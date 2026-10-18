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
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      analysis_error_logs: {
        Row: {
          context: Json | null
          created_at: string
          district: string | null
          error_message: string
          error_type: string
          id: string
          kabupaten_kota_input: string
          kabupaten_kota_resolved: string | null
          province: string | null
          source: string
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          district?: string | null
          error_message: string
          error_type?: string
          id?: string
          kabupaten_kota_input: string
          kabupaten_kota_resolved?: string | null
          province?: string | null
          source?: string
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          district?: string | null
          error_message?: string
          error_type?: string
          id?: string
          kabupaten_kota_input?: string
          kabupaten_kota_resolved?: string | null
          province?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_results: {
        Row: {
          content: Json
          generated_at: string | null
          id: string
          project_id: string
          section: string
        }
        Insert: {
          content: Json
          generated_at?: string | null
          id?: string
          project_id: string
          section: string
        }
        Update: {
          content?: Json
          generated_at?: string | null
          id?: string
          project_id?: string
          section?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_runs: {
        Row: {
          completed_at: string | null
          districts_analyzed: string[] | null
          duration_ms: number | null
          error_message: string | null
          id: string
          project_id: string
          run_number: number
          status: string
          triggered_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          districts_analyzed?: string[] | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          project_id: string
          run_number?: number
          status?: string
          triggered_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          districts_analyzed?: string[] | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          project_id?: string
          run_number?: number
          status?: string
          triggered_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string | null
          auto_kab_kota: string | null
          canonical_url: string | null
          category: string
          content: string
          cover_image_url: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          is_auto_generated: boolean | null
          meta_description: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_name?: string | null
          auto_kab_kota?: string | null
          canonical_url?: string | null
          category?: string
          content: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_auto_generated?: boolean | null
          meta_description?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_name?: string | null
          auto_kab_kota?: string | null
          canonical_url?: string | null
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_auto_generated?: boolean | null
          meta_description?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bps_food_data: {
        Row: {
          id: number
          is_total: boolean | null
          kabupaten_kota: string
          kelompok: string
          kelompok_label: string
          metric_type: string
          sub_komoditas: string
          value_amount: number
          year: number
        }
        Insert: {
          id?: number
          is_total?: boolean | null
          kabupaten_kota: string
          kelompok: string
          kelompok_label: string
          metric_type: string
          sub_komoditas: string
          value_amount?: number
          year?: number
        }
        Update: {
          id?: number
          is_total?: boolean | null
          kabupaten_kota?: string
          kelompok?: string
          kelompok_label?: string
          metric_type?: string
          sub_komoditas?: string
          value_amount?: number
          year?: number
        }
        Relationships: []
      }
      bps_national_averages: {
        Row: {
          avg_nasional: number
          count_kab: number
          id: number
          kelompok: string
          metric_type: string
          sub_komoditas: string
          year: number
        }
        Insert: {
          avg_nasional?: number
          count_kab?: number
          id?: number
          kelompok: string
          metric_type: string
          sub_komoditas: string
          year?: number
        }
        Update: {
          avg_nasional?: number
          count_kab?: number
          id?: number
          kelompok?: string
          metric_type?: string
          sub_komoditas?: string
          year?: number
        }
        Relationships: []
      }
      bundles: {
        Row: {
          badge: string | null
          code: string
          created_at: string | null
          description: string | null
          discount_pct: number | null
          id: string
          is_active: boolean | null
          items: Json
          name: string
          original_price: number
          price: number
          sort_order: number | null
        }
        Insert: {
          badge?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          discount_pct?: number | null
          id?: string
          is_active?: boolean | null
          items: Json
          name: string
          original_price: number
          price: number
          sort_order?: number | null
        }
        Update: {
          badge?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          discount_pct?: number | null
          id?: string
          is_active?: boolean | null
          items?: Json
          name?: string
          original_price?: number
          price?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      business_inputs: {
        Row: {
          business_scale: string | null
          city: string
          created_at: string | null
          districts: string[]
          id: string
          known_competitors: string | null
          monthly_budget: number | null
          price_range_max: number | null
          price_range_min: number | null
          product_category: string
          product_description: string | null
          product_name: string
          project_id: string
          province: string
          specific_locations: string | null
          target_age_max: number | null
          target_age_min: number | null
          target_gender: string | null
          target_segments: string[] | null
          unique_selling_point: string | null
        }
        Insert: {
          business_scale?: string | null
          city: string
          created_at?: string | null
          districts: string[]
          id?: string
          known_competitors?: string | null
          monthly_budget?: number | null
          price_range_max?: number | null
          price_range_min?: number | null
          product_category: string
          product_description?: string | null
          product_name: string
          project_id: string
          province: string
          specific_locations?: string | null
          target_age_max?: number | null
          target_age_min?: number | null
          target_gender?: string | null
          target_segments?: string[] | null
          unique_selling_point?: string | null
        }
        Update: {
          business_scale?: string | null
          city?: string
          created_at?: string | null
          districts?: string[]
          id?: string
          known_competitors?: string | null
          monthly_budget?: number | null
          price_range_max?: number | null
          price_range_min?: number | null
          product_category?: string
          product_description?: string | null
          product_name?: string
          project_id?: string
          province?: string
          specific_locations?: string | null
          target_age_max?: number | null
          target_age_min?: number | null
          target_gender?: string | null
          target_segments?: string[] | null
          unique_selling_point?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_inputs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      capex_opex_benchmarks: {
        Row: {
          business_scale: string
          capex_items: string | null
          capex_max: number
          capex_min: number
          category: string
          data_source: string | null
          id: string
          opex_items: string | null
          opex_max: number
          opex_min: number
          updated_at: string | null
        }
        Insert: {
          business_scale: string
          capex_items?: string | null
          capex_max: number
          capex_min: number
          category: string
          data_source?: string | null
          id?: string
          opex_items?: string | null
          opex_max: number
          opex_min: number
          updated_at?: string | null
        }
        Update: {
          business_scale?: string
          capex_items?: string | null
          capex_max?: number
          capex_min?: number
          category?: string
          data_source?: string | null
          id?: string
          opex_items?: string | null
          opex_max?: number
          opex_min?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      commodity_prices: {
        Row: {
          harga_sebelumnya: number | null
          harga_terkini: number
          het: number | null
          id: string
          kabupaten_kota: string
          kabupaten_kota_raw: string | null
          kode_wilayah: string
          komoditas: string
          perubahan_pct: number | null
          provinsi: string
          tanggal_data: string
          tanggal_sebelumnya: string | null
          updated_at: string | null
        }
        Insert: {
          harga_sebelumnya?: number | null
          harga_terkini: number
          het?: number | null
          id?: string
          kabupaten_kota: string
          kabupaten_kota_raw?: string | null
          kode_wilayah: string
          komoditas: string
          perubahan_pct?: number | null
          provinsi: string
          tanggal_data: string
          tanggal_sebelumnya?: string | null
          updated_at?: string | null
        }
        Update: {
          harga_sebelumnya?: number | null
          harga_terkini?: number
          het?: number | null
          id?: string
          kabupaten_kota?: string
          kabupaten_kota_raw?: string | null
          kode_wilayah?: string
          komoditas?: string
          perubahan_pct?: number | null
          provinsi?: string
          tanggal_data?: string
          tanggal_sebelumnya?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          notes: string | null
          replied_at: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          notes?: string | null
          replied_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          notes?: string | null
          replied_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      decision_results: {
        Row: {
          calculated_at: string | null
          competitor_gap_score: number | null
          decision: string | null
          decision_reason: string | null
          density_score: number | null
          district: string
          id: string
          income_score: number | null
          insight_recommendation: string | null
          insight_strength: string | null
          insight_summary: string | null
          insight_weakness: string | null
          market_score: number | null
          population_score: number | null
          project_id: string
          tradeoff_detail: string | null
          tradeoff_label: string | null
          traffic_score: number | null
        }
        Insert: {
          calculated_at?: string | null
          competitor_gap_score?: number | null
          decision?: string | null
          decision_reason?: string | null
          density_score?: number | null
          district: string
          id?: string
          income_score?: number | null
          insight_recommendation?: string | null
          insight_strength?: string | null
          insight_summary?: string | null
          insight_weakness?: string | null
          market_score?: number | null
          population_score?: number | null
          project_id: string
          tradeoff_detail?: string | null
          tradeoff_label?: string | null
          traffic_score?: number | null
        }
        Update: {
          calculated_at?: string | null
          competitor_gap_score?: number | null
          decision?: string | null
          decision_reason?: string | null
          density_score?: number | null
          district?: string
          id?: string
          income_score?: number | null
          insight_recommendation?: string | null
          insight_strength?: string | null
          insight_summary?: string | null
          insight_weakness?: string | null
          market_score?: number | null
          population_score?: number | null
          project_id?: string
          tradeoff_detail?: string | null
          tradeoff_label?: string | null
          traffic_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "decision_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_results: {
        Row: {
          alamat: string | null
          created_at: string | null
          id: number
          jam_buka: Json | null
          kabkota: string | null
          keyword: string | null
          lat: number | null
          lng: number | null
          nama: string | null
          place_id: string
          provinsi: string | null
          rating: number | null
          status: string | null
          telepon: string | null
          total_review: number | null
          website: string | null
        }
        Insert: {
          alamat?: string | null
          created_at?: string | null
          id?: number
          jam_buka?: Json | null
          kabkota?: string | null
          keyword?: string | null
          lat?: number | null
          lng?: number | null
          nama?: string | null
          place_id: string
          provinsi?: string | null
          rating?: number | null
          status?: string | null
          telepon?: string | null
          total_review?: number | null
          website?: string | null
        }
        Update: {
          alamat?: string | null
          created_at?: string | null
          id?: number
          jam_buka?: Json | null
          kabkota?: string | null
          keyword?: string | null
          lat?: number | null
          lng?: number | null
          nama?: string | null
          place_id?: string
          provinsi?: string | null
          rating?: number | null
          status?: string | null
          telepon?: string | null
          total_review?: number | null
          website?: string | null
        }
        Relationships: []
      }
      economic_results: {
        Row: {
          avg_transaction: number | null
          base_price: number | null
          bep_days: number | null
          calculated_at: string | null
          capture_rate: number | null
          category_spending_ratio: number | null
          city_expenditure_avg: number | null
          competitor_quality_factor: number | null
          conversion_rate: number | null
          district: string
          estimated_daily_customers: number | null
          estimated_daily_revenue: number | null
          estimated_district_income: number | null
          estimated_margin_pct: number | null
          estimated_monthly_cost: number | null
          estimated_monthly_profit: number | null
          estimated_monthly_revenue: number | null
          expenditure_level: string | null
          id: string
          income_multiplier: number | null
          initial_capital: number | null
          location_type: string | null
          mobility_rate: number | null
          omzet_bottomup: number | null
          omzet_konservatif: number | null
          omzet_moderat: number | null
          omzet_optimistis: number | null
          omzet_topdown: number | null
          population_total: number | null
          pricing_strategy: string | null
          project_id: string
          recommended_price_max: number | null
          recommended_price_min: number | null
          rural_village_count: number | null
          target_ratio: number | null
          urban_village_count: number | null
          village_count: number | null
        }
        Insert: {
          avg_transaction?: number | null
          base_price?: number | null
          bep_days?: number | null
          calculated_at?: string | null
          capture_rate?: number | null
          category_spending_ratio?: number | null
          city_expenditure_avg?: number | null
          competitor_quality_factor?: number | null
          conversion_rate?: number | null
          district: string
          estimated_daily_customers?: number | null
          estimated_daily_revenue?: number | null
          estimated_district_income?: number | null
          estimated_margin_pct?: number | null
          estimated_monthly_cost?: number | null
          estimated_monthly_profit?: number | null
          estimated_monthly_revenue?: number | null
          expenditure_level?: string | null
          id?: string
          income_multiplier?: number | null
          initial_capital?: number | null
          location_type?: string | null
          mobility_rate?: number | null
          omzet_bottomup?: number | null
          omzet_konservatif?: number | null
          omzet_moderat?: number | null
          omzet_optimistis?: number | null
          omzet_topdown?: number | null
          population_total?: number | null
          pricing_strategy?: string | null
          project_id: string
          recommended_price_max?: number | null
          recommended_price_min?: number | null
          rural_village_count?: number | null
          target_ratio?: number | null
          urban_village_count?: number | null
          village_count?: number | null
        }
        Update: {
          avg_transaction?: number | null
          base_price?: number | null
          bep_days?: number | null
          calculated_at?: string | null
          capture_rate?: number | null
          category_spending_ratio?: number | null
          city_expenditure_avg?: number | null
          competitor_quality_factor?: number | null
          conversion_rate?: number | null
          district?: string
          estimated_daily_customers?: number | null
          estimated_daily_revenue?: number | null
          estimated_district_income?: number | null
          estimated_margin_pct?: number | null
          estimated_monthly_cost?: number | null
          estimated_monthly_profit?: number | null
          estimated_monthly_revenue?: number | null
          expenditure_level?: string | null
          id?: string
          income_multiplier?: number | null
          initial_capital?: number | null
          location_type?: string | null
          mobility_rate?: number | null
          omzet_bottomup?: number | null
          omzet_konservatif?: number | null
          omzet_moderat?: number | null
          omzet_optimistis?: number | null
          omzet_topdown?: number | null
          population_total?: number | null
          pricing_strategy?: string | null
          project_id?: string
          recommended_price_max?: number | null
          recommended_price_min?: number | null
          rural_village_count?: number | null
          target_ratio?: number | null
          urban_village_count?: number | null
          village_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "economic_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      engine_parameters: {
        Row: {
          category: string
          confidence: string | null
          data_source: string | null
          description: string | null
          id: string
          param_key: string
          param_max: number | null
          param_min: number | null
          param_value: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category: string
          confidence?: string | null
          data_source?: string | null
          description?: string | null
          id?: string
          param_key: string
          param_max?: number | null
          param_min?: number | null
          param_value: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          confidence?: string | null
          data_source?: string | null
          description?: string | null
          id?: string
          param_key?: string
          param_max?: number | null
          param_min?: number | null
          param_value?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      engine_parameters_backup_sprint2: {
        Row: {
          category: string | null
          confidence: string | null
          data_source: string | null
          description: string | null
          id: string | null
          param_key: string | null
          param_max: number | null
          param_min: number | null
          param_value: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          confidence?: string | null
          data_source?: string | null
          description?: string | null
          id?: string | null
          param_key?: string | null
          param_max?: number | null
          param_min?: number | null
          param_value?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          confidence?: string | null
          data_source?: string | null
          description?: string | null
          id?: string | null
          param_key?: string | null
          param_max?: number | null
          param_min?: number | null
          param_value?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      expenditure_per_capita: {
        Row: {
          city: string | null
          created_at: string | null
          female_expenditure: number
          id: string
          level: string
          male_expenditure: number
          name_csv: string | null
          province: string | null
          year: number
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          female_expenditure?: number
          id?: string
          level?: string
          male_expenditure?: number
          name_csv?: string | null
          province?: string | null
          year?: number
        }
        Update: {
          city?: string | null
          created_at?: string | null
          female_expenditure?: number
          id?: string
          level?: string
          male_expenditure?: number
          name_csv?: string | null
          province?: string | null
          year?: number
        }
        Relationships: []
      }
      food_business_ideas: {
        Row: {
          business_category: string
          business_ideas: string[]
          cross_commodity_deps: Json | null
          icon: string | null
          id: number
          kelompok: string
          marketintel_category: string | null
          sub_komoditas: string
        }
        Insert: {
          business_category: string
          business_ideas: string[]
          cross_commodity_deps?: Json | null
          icon?: string | null
          id?: number
          kelompok: string
          marketintel_category?: string | null
          sub_komoditas: string
        }
        Update: {
          business_category?: string
          business_ideas?: string[]
          cross_commodity_deps?: Json | null
          icon?: string | null
          id?: number
          kelompok?: string
          marketintel_category?: string | null
          sub_komoditas?: string
        }
        Relationships: []
      }
      foodintel_results: {
        Row: {
          analysis_data: Json
          created_at: string | null
          credits_used: number
          id: string
          kabupaten_kota: string
          user_id: string
        }
        Insert: {
          analysis_data: Json
          created_at?: string | null
          credits_used?: number
          id?: string
          kabupaten_kota: string
          user_id: string
        }
        Update: {
          analysis_data?: Json
          created_at?: string | null
          credits_used?: number
          id?: string
          kabupaten_kota?: string
          user_id?: string
        }
        Relationships: []
      }
      location_mapping: {
        Row: {
          created_at: string | null
          id: string
          kode_wilayah: string | null
          nama_app: string
          nama_bps: string | null
          nama_kemendag: string | null
          nama_normalized: string
          provinsi: string | null
          tipe: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kode_wilayah?: string | null
          nama_app: string
          nama_bps?: string | null
          nama_kemendag?: string | null
          nama_normalized: string
          provinsi?: string | null
          tipe?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kode_wilayah?: string | null
          nama_app?: string
          nama_bps?: string | null
          nama_kemendag?: string | null
          nama_normalized?: string
          provinsi?: string | null
          tipe?: string | null
        }
        Relationships: []
      }
      location_scores_cache: {
        Row: {
          api_calls_used: number | null
          api_cost_usd: number | null
          cached_at: string | null
          district: string
          expires_at: string | null
          id: string
          latitude: number
          location_label: string
          longitude: number
          product_type_searched: string | null
          project_id: string
          radius_meters: number | null
          raw_avg_competitor_rating: number | null
          raw_avg_review_volume: number | null
          raw_competitor_count: number | null
          raw_competitor_names: Json | null
          raw_congestion_ratio: number | null
          raw_landmark_count: number | null
          raw_landmarks: Json | null
          raw_traffic_generators: number | null
          score_competitor_density: number | null
          score_landmark_potential: number | null
          score_rating_gap: number | null
          score_total: number | null
          score_traffic_level: number | null
        }
        Insert: {
          api_calls_used?: number | null
          api_cost_usd?: number | null
          cached_at?: string | null
          district: string
          expires_at?: string | null
          id?: string
          latitude: number
          location_label: string
          longitude: number
          product_type_searched?: string | null
          project_id: string
          radius_meters?: number | null
          raw_avg_competitor_rating?: number | null
          raw_avg_review_volume?: number | null
          raw_competitor_count?: number | null
          raw_competitor_names?: Json | null
          raw_congestion_ratio?: number | null
          raw_landmark_count?: number | null
          raw_landmarks?: Json | null
          raw_traffic_generators?: number | null
          score_competitor_density?: number | null
          score_landmark_potential?: number | null
          score_rating_gap?: number | null
          score_total?: number | null
          score_traffic_level?: number | null
        }
        Update: {
          api_calls_used?: number | null
          api_cost_usd?: number | null
          cached_at?: string | null
          district?: string
          expires_at?: string | null
          id?: string
          latitude?: number
          location_label?: string
          longitude?: number
          product_type_searched?: string | null
          project_id?: string
          radius_meters?: number | null
          raw_avg_competitor_rating?: number | null
          raw_avg_review_volume?: number | null
          raw_competitor_count?: number | null
          raw_competitor_names?: Json | null
          raw_congestion_ratio?: number | null
          raw_landmark_count?: number | null
          raw_landmarks?: Json | null
          raw_traffic_generators?: number | null
          score_competitor_density?: number | null
          score_landmark_potential?: number | null
          score_rating_gap?: number | null
          score_total?: number | null
          score_traffic_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "location_scores_cache_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      population_data: {
        Row: {
          city: string
          city_csv: string | null
          created_at: string | null
          data_date: string | null
          density_per_km2: number | null
          district: string
          district_csv: string | null
          female_population: number | null
          household_count: number | null
          id: string
          male_population: number | null
          province: string
          province_csv: string | null
          status: string | null
          total_population: number | null
          village: string
          village_code: string | null
        }
        Insert: {
          city: string
          city_csv?: string | null
          created_at?: string | null
          data_date?: string | null
          density_per_km2?: number | null
          district: string
          district_csv?: string | null
          female_population?: number | null
          household_count?: number | null
          id?: string
          male_population?: number | null
          province: string
          province_csv?: string | null
          status?: string | null
          total_population?: number | null
          village: string
          village_code?: string | null
        }
        Update: {
          city?: string
          city_csv?: string | null
          created_at?: string | null
          data_date?: string | null
          density_per_km2?: number | null
          district?: string
          district_csv?: string | null
          female_population?: number | null
          household_count?: number | null
          id?: string
          male_population?: number | null
          province?: string
          province_csv?: string | null
          status?: string | null
          total_population?: number | null
          village?: string
          village_code?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          features: Json
          id: string
          is_active: boolean | null
          name: string
          price: number
          product_type: string
          sort_order: number | null
          tier: string
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          product_type: string
          sort_order?: number | null
          tier: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          product_type?: string
          sort_order?: number | null
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          created_at: string | null
          credits_remaining: number | null
          full_name: string
          id: string
          phone: string | null
          plan: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string | null
          credits_remaining?: number | null
          full_name: string
          id: string
          phone?: string | null
          plan?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string | null
          credits_remaining?: number | null
          full_name?: string
          id?: string
          phone?: string | null
          plan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          id: string
          project_name: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_name: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          applicable_bundles: string[] | null
          applicable_products: string[] | null
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount: number | null
          max_uses: number | null
          max_uses_per_user: number | null
          min_purchase: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_bundles?: string[] | null
          applicable_products?: string[] | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_bundles?: string[] | null
          applicable_products?: string[] | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      promo_usage: {
        Row: {
          id: string
          promo_code_id: string
          transaction_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          promo_code_id: string
          transaction_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          promo_code_id?: string
          transaction_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_usage_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      sfa_activities: {
        Row: {
          activity_type: string
          company_id: string
          created_at: string | null
          id: number
          lat: number | null
          lead_id: number
          lng: number | null
          notes: string | null
          order_amount: number | null
          order_items: Json | null
          photo_urls: string[] | null
          result: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          company_id: string
          created_at?: string | null
          id?: number
          lat?: number | null
          lead_id: number
          lng?: number | null
          notes?: string | null
          order_amount?: number | null
          order_items?: Json | null
          photo_urls?: string[] | null
          result?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          company_id?: string
          created_at?: string | null
          id?: number
          lat?: number | null
          lead_id?: number
          lng?: number | null
          notes?: string | null
          order_amount?: number | null
          order_items?: Json | null
          photo_urls?: string[] | null
          result?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sfa_activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "sfa_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfa_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sfa_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sfa_companies: {
        Row: {
          address: string | null
          app_type: string
          company_code: string | null
          company_name: string
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          max_users: number | null
          owner_user_id: string
          phone: string | null
          settings: Json | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          app_type: string
          company_code?: string | null
          company_name: string
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_users?: number | null
          owner_user_id: string
          phone?: string | null
          settings?: Json | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          app_type?: string
          company_code?: string | null
          company_name?: string
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_users?: number | null
          owner_user_id?: string
          phone?: string | null
          settings?: Json | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sfa_company_users: {
        Row: {
          area_coverage: string[] | null
          company_id: string
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          role: string
          user_id: string
        }
        Insert: {
          area_coverage?: string[] | null
          company_id: string
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role: string
          user_id: string
        }
        Update: {
          area_coverage?: string[] | null
          company_id?: string
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sfa_company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "sfa_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sfa_leads: {
        Row: {
          alamat: string | null
          assigned_at: string | null
          assigned_to_id: string | null
          company_id: string
          created_at: string | null
          id: number
          kabkota: string | null
          keyword: string | null
          last_order_at: string | null
          last_visited_at: string | null
          lat: number | null
          lead_status: string | null
          lng: number | null
          nama: string | null
          notes: string | null
          place_id: string
          priority: string | null
          provinsi: string | null
          rating: number | null
          tags: string[] | null
          telepon: string | null
          total_order_value: number | null
          total_review: number | null
          updated_at: string | null
          visit_count: number | null
          website: string | null
        }
        Insert: {
          alamat?: string | null
          assigned_at?: string | null
          assigned_to_id?: string | null
          company_id: string
          created_at?: string | null
          id?: number
          kabkota?: string | null
          keyword?: string | null
          last_order_at?: string | null
          last_visited_at?: string | null
          lat?: number | null
          lead_status?: string | null
          lng?: number | null
          nama?: string | null
          notes?: string | null
          place_id: string
          priority?: string | null
          provinsi?: string | null
          rating?: number | null
          tags?: string[] | null
          telepon?: string | null
          total_order_value?: number | null
          total_review?: number | null
          updated_at?: string | null
          visit_count?: number | null
          website?: string | null
        }
        Update: {
          alamat?: string | null
          assigned_at?: string | null
          assigned_to_id?: string | null
          company_id?: string
          created_at?: string | null
          id?: number
          kabkota?: string | null
          keyword?: string | null
          last_order_at?: string | null
          last_visited_at?: string | null
          lat?: number | null
          lead_status?: string | null
          lng?: number | null
          nama?: string | null
          notes?: string | null
          place_id?: string
          priority?: string | null
          provinsi?: string | null
          rating?: number | null
          tags?: string[] | null
          telepon?: string | null
          total_order_value?: number | null
          total_review?: number | null
          updated_at?: string | null
          visit_count?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sfa_leads_assigned_to_id_fkey"
            columns: ["assigned_to_id"]
            isOneToOne: false
            referencedRelation: "sfa_company_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sfa_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "sfa_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sfa_products: {
        Row: {
          category: string | null
          company_id: string
          created_at: string | null
          id: number
          image_url: string | null
          is_active: boolean | null
          price: number | null
          product_code: string | null
          product_name: string
          sort_order: number | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean | null
          price?: number | null
          product_code?: string | null
          product_name: string
          sort_order?: number | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string | null
          id?: number
          image_url?: string | null
          is_active?: boolean | null
          price?: number | null
          product_code?: string | null
          product_name?: string
          sort_order?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sfa_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "sfa_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_locations: {
        Row: {
          blind_spot_reason: string | null
          district: string | null
          id: string
          innovations: string[] | null
          is_blind_spot: boolean | null
          lat: number | null
          lng: number | null
          location_name: string
          project_id: string
          rank: number | null
          score: number | null
          score_breakdown: Json | null
          strengths: string[] | null
          weaknesses: string[] | null
        }
        Insert: {
          blind_spot_reason?: string | null
          district?: string | null
          id?: string
          innovations?: string[] | null
          is_blind_spot?: boolean | null
          lat?: number | null
          lng?: number | null
          location_name: string
          project_id: string
          rank?: number | null
          score?: number | null
          score_breakdown?: Json | null
          strengths?: string[] | null
          weaknesses?: string[] | null
        }
        Update: {
          blind_spot_reason?: string | null
          district?: string | null
          id?: string
          innovations?: string[] | null
          is_blind_spot?: boolean | null
          lat?: number | null
          lng?: number | null
          location_name?: string
          project_id?: string
          rank?: number | null
          score?: number | null
          score_breakdown?: Json | null
          strengths?: string[] | null
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "strategic_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_leads: {
        Row: {
          alamat: string | null
          assigned_to: string | null
          converted_at: string | null
          created_at: string | null
          id: number
          kabkota: string
          keyword: string
          lead_status: string | null
          nama: string | null
          notes: string | null
          place_id: string
          provinsi: string | null
          rating: number | null
          status_toko: string | null
          telepon: string | null
          total_review: number | null
          updated_at: string | null
          user_id: string
          visited_at: string | null
          website: string | null
        }
        Insert: {
          alamat?: string | null
          assigned_to?: string | null
          converted_at?: string | null
          created_at?: string | null
          id?: number
          kabkota: string
          keyword: string
          lead_status?: string | null
          nama?: string | null
          notes?: string | null
          place_id: string
          provinsi?: string | null
          rating?: number | null
          status_toko?: string | null
          telepon?: string | null
          total_review?: number | null
          updated_at?: string | null
          user_id: string
          visited_at?: string | null
          website?: string | null
        }
        Update: {
          alamat?: string | null
          assigned_to?: string | null
          converted_at?: string | null
          created_at?: string | null
          id?: number
          kabkota?: string
          keyword?: string
          lead_status?: string | null
          nama?: string | null
          notes?: string | null
          place_id?: string
          provinsi?: string | null
          rating?: number | null
          status_toko?: string | null
          telepon?: string | null
          total_review?: number | null
          updated_at?: string | null
          user_id?: string
          visited_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          category: string
          config_key: string
          config_type: string | null
          config_value: string | null
          description: string | null
          id: string
          is_sensitive: boolean | null
          label: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          category: string
          config_key: string
          config_type?: string | null
          config_value?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          label: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string
          config_key?: string
          config_type?: string | null
          config_value?: string | null
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          label?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          bundle_code: string | null
          created_at: string | null
          discount_amount: number | null
          expired_at: string | null
          final_amount: number
          gateway_response: Json | null
          gateway_transaction_id: string | null
          id: string
          invoice_number: string | null
          paid_at: string | null
          payment_gateway: string | null
          payment_method: string | null
          payment_status: string | null
          product_code: string | null
          promo_code: string | null
          purchase_type: string
          upgrade_from: string | null
          upgrade_from_purchase_id: string | null
          upgrade_to: string | null
          user_id: string
        }
        Insert: {
          amount: number
          bundle_code?: string | null
          created_at?: string | null
          discount_amount?: number | null
          expired_at?: string | null
          final_amount: number
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          payment_status?: string | null
          product_code?: string | null
          promo_code?: string | null
          purchase_type: string
          upgrade_from?: string | null
          upgrade_from_purchase_id?: string | null
          upgrade_to?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          bundle_code?: string | null
          created_at?: string | null
          discount_amount?: number | null
          expired_at?: string | null
          final_amount?: number
          gateway_response?: Json | null
          gateway_transaction_id?: string | null
          id?: string
          invoice_number?: string | null
          paid_at?: string | null
          payment_gateway?: string | null
          payment_method?: string | null
          payment_status?: string | null
          product_code?: string | null
          promo_code?: string | null
          purchase_type?: string
          upgrade_from?: string | null
          upgrade_from_purchase_id?: string | null
          upgrade_to?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_purchases: {
        Row: {
          analysis_id: string | null
          bundle_id: string | null
          created_at: string | null
          id: string
          price_paid: number
          product_code: string
          product_type: string
          source: string
          status: string | null
          tier: string
          transaction_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          bundle_id?: string | null
          created_at?: string | null
          id?: string
          price_paid?: number
          product_code: string
          product_type: string
          source?: string
          status?: string | null
          tier: string
          transaction_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          bundle_id?: string | null
          created_at?: string | null
          id?: string
          price_paid?: number
          product_code?: string
          product_type?: string
          source?: string
          status?: string | null
          tier?: string
          transaction_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_purchases_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_purchases_product_code_fkey"
            columns: ["product_code"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["code"]
          },
        ]
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
    }
    Views: {
      subscriber_leads_dedup: {
        Row: {
          alamat: string | null
          assigned_to: string | null
          converted_at: string | null
          created_at: string | null
          id: number | null
          kabkota: string | null
          lead_status: string | null
          nama: string | null
          notes: string | null
          place_id: string | null
          provinsi: string | null
          rating: number | null
          status_toko: string | null
          telepon: string | null
          total_review: number | null
          user_id: string | null
          visited_at: string | null
          website: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bps_distinct_values: { Args: { col_name: string }; Returns: string[] }
      deduct_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: number
      }
      generate_invoice_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      resolve_location_name: {
        Args: { input_name: string; source_type?: string }
        Returns: {
          kode_wilayah: string
          nama_app: string
          nama_bps: string
          nama_kemendag: string
        }[]
      }
      sfa_user_admin_company_ids: {
        Args: { _user_id: string }
        Returns: string[]
      }
      sfa_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin"
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
      app_role: ["user", "admin", "super_admin"],
    },
  },
} as const
