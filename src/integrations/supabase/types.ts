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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      accommodation_rooms: {
        Row: {
          accommodation_id: string
          capacity: number
          created_at: string
          gender_restriction: string | null
          id: string
          name: string
          notes: string | null
          order_index: number | null
          room_type: string
          updated_at: string
        }
        Insert: {
          accommodation_id: string
          capacity?: number
          created_at?: string
          gender_restriction?: string | null
          id?: string
          name: string
          notes?: string | null
          order_index?: number | null
          room_type?: string
          updated_at?: string
        }
        Update: {
          accommodation_id?: string
          capacity?: number
          created_at?: string
          gender_restriction?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number | null
          room_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_rooms_accommodation_id_fkey"
            columns: ["accommodation_id"]
            isOneToOne: false
            referencedRelation: "tour_accommodations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          event_at: string
          event_category: string | null
          event_label: string | null
          event_name: string
          event_value: number | null
          id: string
          session_id: string
        }
        Insert: {
          event_at?: string
          event_category?: string | null
          event_label?: string | null
          event_name: string
          event_value?: number | null
          id?: string
          session_id: string
        }
        Update: {
          event_at?: string
          event_category?: string | null
          event_label?: string | null
          event_name?: string
          event_value?: number | null
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_pageviews: {
        Row: {
          clicked_main_cta: boolean | null
          cta_type: string | null
          id: string
          page_path: string
          page_title: string | null
          scroll_depth_percent: number | null
          session_id: string
          time_on_page_seconds: number | null
          viewed_at: string
        }
        Insert: {
          clicked_main_cta?: boolean | null
          cta_type?: string | null
          id?: string
          page_path: string
          page_title?: string | null
          scroll_depth_percent?: number | null
          session_id: string
          time_on_page_seconds?: number | null
          viewed_at?: string
        }
        Update: {
          clicked_main_cta?: boolean | null
          cta_type?: string | null
          id?: string
          page_path?: string
          page_title?: string | null
          scroll_depth_percent?: number | null
          session_id?: string
          time_on_page_seconds?: number | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_pageviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "analytics_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_sessions: {
        Row: {
          browser: string | null
          city: string | null
          conversion_goal: string | null
          converted: boolean | null
          country: string | null
          created_at: string
          device_type: string | null
          first_visit_at: string
          id: string
          is_new_visitor: boolean | null
          last_visit_at: string
          os: string | null
          pages_per_session: number | null
          referer_domain: string | null
          session_duration_seconds: number | null
          state: string | null
          user_id_anon: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          conversion_goal?: string | null
          converted?: boolean | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          first_visit_at?: string
          id?: string
          is_new_visitor?: boolean | null
          last_visit_at?: string
          os?: string | null
          pages_per_session?: number | null
          referer_domain?: string | null
          session_duration_seconds?: number | null
          state?: string | null
          user_id_anon?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          conversion_goal?: string | null
          converted?: boolean | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          first_visit_at?: string
          id?: string
          is_new_visitor?: boolean | null
          last_visit_at?: string
          os?: string | null
          pages_per_session?: number | null
          referer_domain?: string | null
          session_duration_seconds?: number | null
          state?: string | null
          user_id_anon?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      atendimento_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      atendimento_folders: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_folders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "atendimento_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      atendimento_messages: {
        Row: {
          body: string
          created_at: string
          folder_id: string
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          folder_id: string
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          folder_id?: string
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atendimento_messages_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "atendimento_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          operation: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          points_reward: number
          requirement_type: string
          requirement_value: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          points_reward?: number
          requirement_type: string
          requirement_value?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          points_reward?: number
          requirement_type?: string
          requirement_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          etiqueta: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          order_index: number
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          etiqueta?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          order_index?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          etiqueta?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          order_index?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      boarding_export_templates: {
        Row: {
          boarding_point_template: string
          created_at: string
          header_template: string
          id: string
          is_default: boolean
          name: string
          participant_template: string
          updated_at: string
        }
        Insert: {
          boarding_point_template?: string
          created_at?: string
          header_template?: string
          id?: string
          is_default?: boolean
          name?: string
          participant_template?: string
          updated_at?: string
        }
        Update: {
          boarding_point_template?: string
          created_at?: string
          header_template?: string
          id?: string
          is_default?: boolean
          name?: string
          participant_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_export_templates: {
        Row: {
          background_color: string | null
          border_radius: number | null
          cell_height: number | null
          cell_padding: number | null
          commemorative_badge_color: string | null
          created_at: string
          day_font_size: number | null
          font_family: string | null
          grid_line_color: string | null
          header_bg_color: string | null
          id: string
          is_default: boolean | null
          logo_url: string | null
          month_font_size: number | null
          name: string
          show_grid_lines: boolean | null
          show_logo: boolean | null
          subtitle_text: string | null
          text_color: string | null
          title_font_size: number | null
          title_text: string | null
          tour_badge_color: string | null
          updated_at: string
          weekend_bg_color: string | null
        }
        Insert: {
          background_color?: string | null
          border_radius?: number | null
          cell_height?: number | null
          cell_padding?: number | null
          commemorative_badge_color?: string | null
          created_at?: string
          day_font_size?: number | null
          font_family?: string | null
          grid_line_color?: string | null
          header_bg_color?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          month_font_size?: number | null
          name: string
          show_grid_lines?: boolean | null
          show_logo?: boolean | null
          subtitle_text?: string | null
          text_color?: string | null
          title_font_size?: number | null
          title_text?: string | null
          tour_badge_color?: string | null
          updated_at?: string
          weekend_bg_color?: string | null
        }
        Update: {
          background_color?: string | null
          border_radius?: number | null
          cell_height?: number | null
          cell_padding?: number | null
          commemorative_badge_color?: string | null
          created_at?: string
          day_font_size?: number | null
          font_family?: string | null
          grid_line_color?: string | null
          header_bg_color?: string | null
          id?: string
          is_default?: boolean | null
          logo_url?: string | null
          month_font_size?: number | null
          name?: string
          show_grid_lines?: boolean | null
          show_logo?: boolean | null
          subtitle_text?: string | null
          text_color?: string | null
          title_font_size?: number | null
          title_text?: string | null
          tour_badge_color?: string | null
          updated_at?: string
          weekend_bg_color?: string | null
        }
        Relationships: []
      }
      calendar_only_tours: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      calendar_opportunities: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      Camaleões: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      client_accounts: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_accounts_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_badges: {
        Row: {
          badge_id: string
          client_account_id: string
          earned_at: string
          id: string
          reserva_id: string | null
        }
        Insert: {
          badge_id: string
          client_account_id: string
          earned_at?: string
          id?: string
          reserva_id?: string | null
        }
        Update: {
          badge_id?: string
          client_account_id?: string
          earned_at?: string
          id?: string
          reserva_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_badges_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_badges_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      client_communications: {
        Row: {
          client_account_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
        }
        Insert: {
          client_account_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
        }
        Update: {
          client_account_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_communications_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "client_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credits: {
        Row: {
          amount: number
          cancellation_date: string | null
          cliente_id: string
          coupon_id: string | null
          created_at: string
          created_by: string | null
          id: string
          original_value: number | null
          percentage_applied: number | null
          reason: string | null
          reserva_id: string | null
          tour_id: string | null
          tour_name: string | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          cancellation_date?: string | null
          cliente_id: string
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          original_value?: number | null
          percentage_applied?: number | null
          reason?: string | null
          reserva_id?: string | null
          tour_id?: string | null
          tour_name?: string | null
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cancellation_date?: string | null
          cliente_id?: string
          coupon_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          original_value?: number | null
          percentage_applied?: number | null
          reason?: string | null
          reserva_id?: string | null
          tour_id?: string | null
          tour_name?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_credits_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      client_journey: {
        Row: {
          cliente_id: string
          created_at: string
          current_phase: Database["public"]["Enums"]["journey_phase"]
          id: string
          notes: string | null
          phase_entered_at: string
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          current_phase?: Database["public"]["Enums"]["journey_phase"]
          id?: string
          notes?: string | null
          phase_entered_at?: string
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          current_phase?: Database["public"]["Enums"]["journey_phase"]
          id?: string
          notes?: string | null
          phase_entered_at?: string
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_journey_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      client_journey_history: {
        Row: {
          cliente_id: string
          created_at: string
          from_phase: Database["public"]["Enums"]["journey_phase"] | null
          id: string
          to_phase: Database["public"]["Enums"]["journey_phase"]
          tour_id: string | null
          trigger_description: string | null
          trigger_type: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          from_phase?: Database["public"]["Enums"]["journey_phase"] | null
          id?: string
          to_phase: Database["public"]["Enums"]["journey_phase"]
          tour_id?: string | null
          trigger_description?: string | null
          trigger_type?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          from_phase?: Database["public"]["Enums"]["journey_phase"] | null
          id?: string
          to_phase?: Database["public"]["Enums"]["journey_phase"]
          tour_id?: string | null
          trigger_description?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_journey_history_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_history_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      client_journey_tasks: {
        Row: {
          assigned_to: string | null
          cliente_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          phase: Database["public"]["Enums"]["journey_phase"]
          status: string
          task_type: string
          template_id: string | null
          title: string
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cliente_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          phase: Database["public"]["Enums"]["journey_phase"]
          status?: string
          task_type?: string
          template_id?: string | null
          title: string
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cliente_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          phase?: Database["public"]["Enums"]["journey_phase"]
          status?: string
          task_type?: string
          template_id?: string | null
          title?: string
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_journey_tasks_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "journey_task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_journey_tasks_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      client_points_history: {
        Row: {
          client_account_id: string
          created_at: string
          description: string
          id: string
          points: number
          reserva_id: string | null
          transaction_type: string
        }
        Insert: {
          client_account_id: string
          created_at?: string
          description: string
          id?: string
          points: number
          reserva_id?: string | null
          transaction_type: string
        }
        Update: {
          client_account_id?: string
          created_at?: string
          description?: string
          id?: string
          points?: number
          reserva_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_points_history_client_account_id_fkey"
            columns: ["client_account_id"]
            isOneToOne: false
            referencedRelation: "client_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_points_history_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          capture_method: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          cpf: string
          created_at: string
          data_nascimento: string
          descricao_problema_saude: string | null
          email: string
          id: string
          nome_completo: string
          order_nsu: string | null
          problema_saude: boolean | null
          slug: string | null
          transaction_id: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          capture_method?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf: string
          created_at?: string
          data_nascimento: string
          descricao_problema_saude?: string | null
          email: string
          id?: string
          nome_completo: string
          order_nsu?: string | null
          problema_saude?: boolean | null
          slug?: string | null
          transaction_id?: string | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          capture_method?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string
          created_at?: string
          data_nascimento?: string
          descricao_problema_saude?: string | null
          email?: string
          id?: string
          nome_completo?: string
          order_nsu?: string | null
          problema_saude?: boolean | null
          slug?: string | null
          transaction_id?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      commemorative_dates: {
        Row: {
          created_at: string
          date: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_ai_suggestions: {
        Row: {
          acao_tomada: string | null
          created_at: string
          data_sugerida: string | null
          id: string
          ideia_criada_id: string | null
          mensagem: string
          post_criado_id: string | null
          resolvida: boolean | null
          sugestao_formato: string | null
          sugestao_tema: string | null
          tipo: string
        }
        Insert: {
          acao_tomada?: string | null
          created_at?: string
          data_sugerida?: string | null
          id?: string
          ideia_criada_id?: string | null
          mensagem: string
          post_criado_id?: string | null
          resolvida?: boolean | null
          sugestao_formato?: string | null
          sugestao_tema?: string | null
          tipo: string
        }
        Update: {
          acao_tomada?: string | null
          created_at?: string
          data_sugerida?: string | null
          id?: string
          ideia_criada_id?: string | null
          mensagem?: string
          post_criado_id?: string | null
          resolvida?: boolean | null
          sugestao_formato?: string | null
          sugestao_tema?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_ai_suggestions_ideia_criada_id_fkey"
            columns: ["ideia_criada_id"]
            isOneToOne: false
            referencedRelation: "content_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ai_suggestions_post_criado_id_fkey"
            columns: ["post_criado_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_campaigns: {
        Row: {
          ativa: boolean | null
          cor: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean | null
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean | null
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_ideas: {
        Row: {
          created_at: string
          formato: string
          gancho: string | null
          id: string
          notas: string | null
          objetivo: string
          prioridade: string
          status: string
          tags: string[] | null
          tema: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          formato: string
          gancho?: string | null
          id?: string
          notas?: string | null
          objetivo: string
          prioridade?: string
          status?: string
          tags?: string[] | null
          tema: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          formato?: string
          gancho?: string | null
          id?: string
          notas?: string | null
          objetivo?: string
          prioridade?: string
          status?: string
          tags?: string[] | null
          tema?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_posts: {
        Row: {
          campanha: string | null
          campanha_id: string | null
          created_at: string
          data_publicacao: string | null
          formato: string
          hashtags: string[] | null
          horario: string | null
          id: string
          idea_id: string | null
          legenda: string | null
          midia_referencia: string | null
          midia_url: string | null
          notas: string | null
          objetivo: string
          ordem_dia: number | null
          plataforma: string
          status: string
          tema: string
          tour_id: string | null
          updated_at: string
        }
        Insert: {
          campanha?: string | null
          campanha_id?: string | null
          created_at?: string
          data_publicacao?: string | null
          formato: string
          hashtags?: string[] | null
          horario?: string | null
          id?: string
          idea_id?: string | null
          legenda?: string | null
          midia_referencia?: string | null
          midia_url?: string | null
          notas?: string | null
          objetivo: string
          ordem_dia?: number | null
          plataforma?: string
          status?: string
          tema: string
          tour_id?: string | null
          updated_at?: string
        }
        Update: {
          campanha?: string | null
          campanha_id?: string | null
          created_at?: string
          data_publicacao?: string | null
          formato?: string
          hashtags?: string[] | null
          horario?: string | null
          id?: string
          idea_id?: string | null
          legenda?: string | null
          midia_referencia?: string | null
          midia_url?: string | null
          notas?: string | null
          objetivo?: string
          ordem_dia?: number | null
          plataforma?: string
          status?: string
          tema?: string
          tour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "content_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "content_ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          ativo: boolean
          cliente_id: string | null
          codigo: string
          created_at: string
          credit_remaining: number | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          is_credit_coupon: boolean | null
          maximo_usos: number | null
          meses_validade: number | null
          tipo: string
          tour_id: string | null
          updated_at: string
          usos_atual: number
          valor: number
        }
        Insert: {
          ativo?: boolean
          cliente_id?: string | null
          codigo: string
          created_at?: string
          credit_remaining?: number | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          is_credit_coupon?: boolean | null
          maximo_usos?: number | null
          meses_validade?: number | null
          tipo: string
          tour_id?: string | null
          updated_at?: string
          usos_atual?: number
          valor: number
        }
        Update: {
          ativo?: boolean
          cliente_id?: string | null
          codigo?: string
          created_at?: string
          credit_remaining?: number | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          is_credit_coupon?: boolean | null
          maximo_usos?: number | null
          meses_validade?: number | null
          tipo?: string
          tour_id?: string | null
          updated_at?: string
          usos_atual?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupons_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          last_sent_at: string | null
          name: string
          send_count: number
          subject: string
          template_key: string
          trigger_description: string | null
          trigger_event: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          body_html: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name: string
          send_count?: number
          subject: string
          template_key: string
          trigger_description?: string | null
          trigger_event?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          body_html?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name?: string
          send_count?: number
          subject?: string
          template_key?: string
          trigger_description?: string | null
          trigger_event?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      email_verification_codes: {
        Row: {
          cliente_id: string | null
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          verified_at: string | null
        }
        Insert: {
          cliente_id?: string | null
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          verified_at?: string | null
        }
        Update: {
          cliente_id?: string | null
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_verification_codes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          created_at: string
          id: string
          nome: string
          presente: boolean | null
          stop_id: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          presente?: boolean | null
          stop_id: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          presente?: boolean | null
          stop_id?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_journey_stages: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      experience_processes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          stage_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          stage_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          stage_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_processes_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "experience_journey_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_subprocesses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          process_id: string
          trigger_event: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index?: number
          process_id: string
          trigger_event?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          process_id?: string
          trigger_event?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_subprocesses_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "experience_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      experience_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_days: number | null
          id: string
          is_automatic: boolean | null
          name: string
          order_index: number
          priority: string | null
          responsible: string | null
          status: string | null
          subprocess_id: string
          trigger_event: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_days?: number | null
          id?: string
          is_automatic?: boolean | null
          name: string
          order_index?: number
          priority?: string | null
          responsible?: string | null
          status?: string | null
          subprocess_id: string
          trigger_event?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_days?: number | null
          id?: string
          is_automatic?: boolean | null
          name?: string
          order_index?: number
          priority?: string | null
          responsible?: string | null
          status?: string | null
          subprocess_id?: string
          trigger_event?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experience_tasks_subprocess_id_fkey"
            columns: ["subprocess_id"]
            isOneToOne: false
            referencedRelation: "experience_subprocesses"
            referencedColumns: ["id"]
          },
        ]
      }
      form_abandonment_tracking: {
        Row: {
          completed: boolean
          converted_to_reserva: boolean
          cpf: string | null
          created_at: string
          device_type: string | null
          email: string | null
          id: string
          last_activity_at: string
          last_field: string | null
          nome: string | null
          reserva_id: string | null
          seen_by_admin: boolean
          session_id: string
          started_at: string
          step_reached: number
          tour_id: string | null
          tour_name: string | null
          whatsapp: string | null
        }
        Insert: {
          completed?: boolean
          converted_to_reserva?: boolean
          cpf?: string | null
          created_at?: string
          device_type?: string | null
          email?: string | null
          id?: string
          last_activity_at?: string
          last_field?: string | null
          nome?: string | null
          reserva_id?: string | null
          seen_by_admin?: boolean
          session_id: string
          started_at?: string
          step_reached?: number
          tour_id?: string | null
          tour_name?: string | null
          whatsapp?: string | null
        }
        Update: {
          completed?: boolean
          converted_to_reserva?: boolean
          cpf?: string | null
          created_at?: string
          device_type?: string | null
          email?: string | null
          id?: string
          last_activity_at?: string
          last_field?: string | null
          nome?: string | null
          reserva_id?: string | null
          seen_by_admin?: boolean
          session_id?: string
          started_at?: string
          step_reached?: number
          tour_id?: string | null
          tour_name?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_abandonment_tracking_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_abandonment_tracking_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      form_question_history: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          question_id: string
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          question_id: string
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_question_history_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "form_question_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_question_templates: {
        Row: {
          allow_tour_edit: boolean
          condition_field_key: string | null
          condition_value: string | null
          created_at: string
          description: string | null
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          options: Json | null
          order_index: number
          standard_field_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_tour_edit?: boolean
          condition_field_key?: string | null
          condition_value?: string | null
          created_at?: string
          description?: string | null
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json | null
          order_index?: number
          standard_field_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_tour_edit?: boolean
          condition_field_key?: string | null
          condition_value?: string | null
          created_at?: string
          description?: string | null
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          options?: Json | null
          order_index?: number
          standard_field_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      interessados: {
        Row: {
          aceite_novidades: boolean
          created_at: string
          id: string
          nome: string
          origem: string
          passeio_id: string
          whatsapp: string
        }
        Insert: {
          aceite_novidades?: boolean
          created_at?: string
          id?: string
          nome: string
          origem?: string
          passeio_id: string
          whatsapp: string
        }
        Update: {
          aceite_novidades?: boolean
          created_at?: string
          id?: string
          nome?: string
          origem?: string
          passeio_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "interessados_passeio_id_fkey"
            columns: ["passeio_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_map_entries: {
        Row: {
          content: string | null
          created_at: string
          dimension: string
          id: string
          items: Json | null
          mood_score: number | null
          order_index: number | null
          phase: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          dimension: string
          id?: string
          items?: Json | null
          mood_score?: number | null
          order_index?: number | null
          phase: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          dimension?: string
          id?: string
          items?: Json | null
          mood_score?: number | null
          order_index?: number | null
          phase?: string
          updated_at?: string
        }
        Relationships: []
      }
      journey_phase_processes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          order_index: number
          phase: Database["public"]["Enums"]["journey_phase"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_index?: number
          phase: Database["public"]["Enums"]["journey_phase"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          phase?: Database["public"]["Enums"]["journey_phase"]
          updated_at?: string
        }
        Relationships: []
      }
      journey_task_templates: {
        Row: {
          created_at: string
          default_days_offset: number | null
          description: string | null
          id: string
          is_active: boolean
          order_index: number
          phase: Database["public"]["Enums"]["journey_phase"]
          process_id: string | null
          task_type: string
          title: string
          trigger_rule: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_days_offset?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          phase: Database["public"]["Enums"]["journey_phase"]
          process_id?: string | null
          task_type?: string
          title: string
          trigger_rule?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_days_offset?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          phase?: Database["public"]["Enums"]["journey_phase"]
          process_id?: string | null
          task_type?: string
          title?: string
          trigger_rule?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_task_templates_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "journey_phase_processes"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_blocks: {
        Row: {
          block_type: string
          content: Json | null
          created_at: string
          id: string
          is_visible: boolean | null
          order_index: number
          page_id: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          block_type: string
          content?: Json | null
          created_at?: string
          id?: string
          is_visible?: boolean | null
          order_index?: number
          page_id: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          block_type?: string
          content?: Json | null
          created_at?: string
          id?: string
          is_visible?: boolean | null
          order_index?: number
          page_id?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_regions: {
        Row: {
          attractions: Json | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          includes: Json | null
          logistics: Json | null
          name: string
          order_index: number | null
          page_id: string
          subtitle: string | null
          tour_filter_tag: string | null
          updated_at: string
        }
        Insert: {
          attractions?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          includes?: Json | null
          logistics?: Json | null
          name: string
          order_index?: number | null
          page_id: string
          subtitle?: string | null
          tour_filter_tag?: string | null
          updated_at?: string
        }
        Update: {
          attractions?: Json | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          includes?: Json | null
          logistics?: Json | null
          name?: string
          order_index?: number | null
          page_id?: string
          subtitle?: string | null
          tour_filter_tag?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_regions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_tours: {
        Row: {
          created_at: string
          id: string
          order_index: number | null
          page_id: string
          tour_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number | null
          page_id: string
          tour_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number | null
          page_id?: string
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_tours_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "landing_page_tours_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_published: boolean | null
          meta_description: string | null
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      level_definitions: {
        Row: {
          benefits: string | null
          color: string
          created_at: string
          icon: string
          id: string
          max_points: number | null
          min_points: number
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          benefits?: string | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          max_points?: number | null
          min_points: number
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          benefits?: string | null
          color?: string
          created_at?: string
          icon?: string
          id?: string
          max_points?: number | null
          min_points?: number
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          open_in_new_tab: boolean
          order_index: number
          parent_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          open_in_new_tab?: boolean
          order_index?: number
          parent_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          open_in_new_tab?: boolean
          order_index?: number
          parent_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      month_messages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message: string
          month: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          month: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          month?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      monthly_general_costs: {
        Row: {
          created_at: string
          current_installment: number | null
          expense_name: string
          expense_type: string
          id: string
          month: string
          order_index: number
          parent_expense_id: string | null
          payment_method: string | null
          purchase_date: string | null
          quantity: number
          total_installments: number | null
          total_value: number | null
          unit_value: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          current_installment?: number | null
          expense_name: string
          expense_type?: string
          id?: string
          month: string
          order_index?: number
          parent_expense_id?: string | null
          payment_method?: string | null
          purchase_date?: string | null
          quantity?: number
          total_installments?: number | null
          total_value?: number | null
          unit_value?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          current_installment?: number | null
          expense_name?: string
          expense_type?: string
          id?: string
          month?: string
          order_index?: number
          parent_expense_id?: string | null
          payment_method?: string | null
          purchase_date?: string | null
          quantity?: number
          total_installments?: number | null
          total_value?: number | null
          unit_value?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_general_costs_parent_expense_id_fkey"
            columns: ["parent_expense_id"]
            isOneToOne: false
            referencedRelation: "monthly_general_costs"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_seat_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assignment_type: string
          created_at: string
          id: string
          notes: string | null
          participant_id: string | null
          reserva_id: string | null
          seat_id: string
          tour_id: string
          transport_config_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          participant_id?: string | null
          reserva_id?: string | null
          seat_id: string
          tour_id: string
          transport_config_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assignment_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          participant_id?: string | null
          reserva_id?: string | null
          seat_id?: string
          tour_id?: string
          transport_config_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participant_seat_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "reservation_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_seat_assignments_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_seat_assignments_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "vehicle_seats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_seat_assignments_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_seat_assignments_transport_config_id_fkey"
            columns: ["transport_config_id"]
            isOneToOne: false
            referencedRelation: "tour_transport_config"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_logs: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          event_message: string | null
          event_status: string | null
          event_type: string
          id: string
          mp_payment_id: string | null
          payment_method: string | null
          raw_data: Json | null
          refund_amount: number | null
          reserva_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          event_message?: string | null
          event_status?: string | null
          event_type: string
          id?: string
          mp_payment_id?: string | null
          payment_method?: string | null
          raw_data?: Json | null
          refund_amount?: number | null
          reserva_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          event_message?: string | null
          event_status?: string | null
          event_type?: string
          id?: string
          mp_payment_id?: string | null
          payment_method?: string | null
          raw_data?: Json | null
          refund_amount?: number | null
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      pontos_embarque: {
        Row: {
          ativo: boolean
          created_at: string
          endereco: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      process_maps: {
        Row: {
          area: string
          canvas_settings: Json | null
          connections: Json
          created_at: string
          elements: Json
          id: string
          is_template: boolean
          name: string
          stages: Json | null
          status: string
          tour_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area?: string
          canvas_settings?: Json | null
          connections?: Json
          created_at?: string
          elements?: Json
          id?: string
          is_template?: boolean
          name: string
          stages?: Json | null
          status?: string
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area?: string
          canvas_settings?: Json | null
          connections?: Json
          created_at?: string
          elements?: Json
          id?: string
          is_template?: boolean
          name?: string
          stages?: Json | null
          status?: string
          tour_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_maps_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_costs: {
        Row: {
          created_at: string
          end_date: string | null
          expense_name: string
          expense_type: string
          id: string
          notes: string | null
          start_date: string
          status: string
          unit_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          expense_name: string
          expense_type?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: string
          unit_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          expense_name?: string
          expense_type?: string
          id?: string
          notes?: string | null
          start_date?: string
          status?: string
          unit_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      reserva_parcelas: {
        Row: {
          created_at: string
          data_pagamento: string
          forma_pagamento: string
          id: string
          reserva_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string
          forma_pagamento?: string
          id?: string
          reserva_id: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string
          forma_pagamento?: string
          id?: string
          reserva_id?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "reserva_parcelas_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          adicionais: Json | null
          capture_method: string | null
          card_fee_amount: number | null
          cliente_id: string
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          coupon_code: string | null
          coupon_discount: number | null
          created_at: string
          data_cancelamento: string | null
          data_confirmacao: string | null
          data_pagamento: string | null
          data_reserva: string
          descricao_problema_saude: string | null
          id: string
          infinitepay_checkout_url: string | null
          infinitepay_invoice_slug: string | null
          infinitepay_transaction_nsu: string | null
          installments: number | null
          motivo_cancelamento: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          mp_status: string | null
          nome_plano_saude: string | null
          numero_participantes: number | null
          observacoes: string | null
          opcionais: Json | null
          order_nsu: string | null
          payment_method: string | null
          payment_status: string
          plano_saude: boolean | null
          ponto_embarque_id: string | null
          problema_saude: boolean
          receipt_url: string | null
          refund_amount: number | null
          refund_date: string | null
          refund_reason: string | null
          refunded_by: string | null
          reserva_numero: string | null
          seen_by_admin: boolean
          selected_optional_items: Json | null
          slug: string | null
          status: string
          ticket_enviado: boolean | null
          tickets_generated: boolean | null
          tour_id: string
          transaction_id: string | null
          updated_at: string
          valor_pago: number | null
          valor_passeio: number | null
          valor_total_com_opcionais: number | null
        }
        Insert: {
          adicionais?: Json | null
          capture_method?: string | null
          card_fee_amount?: number | null
          cliente_id: string
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          data_cancelamento?: string | null
          data_confirmacao?: string | null
          data_pagamento?: string | null
          data_reserva?: string
          descricao_problema_saude?: string | null
          id?: string
          infinitepay_checkout_url?: string | null
          infinitepay_invoice_slug?: string | null
          infinitepay_transaction_nsu?: string | null
          installments?: number | null
          motivo_cancelamento?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          mp_status?: string | null
          nome_plano_saude?: string | null
          numero_participantes?: number | null
          observacoes?: string | null
          opcionais?: Json | null
          order_nsu?: string | null
          payment_method?: string | null
          payment_status?: string
          plano_saude?: boolean | null
          ponto_embarque_id?: string | null
          problema_saude?: boolean
          receipt_url?: string | null
          refund_amount?: number | null
          refund_date?: string | null
          refund_reason?: string | null
          refunded_by?: string | null
          reserva_numero?: string | null
          seen_by_admin?: boolean
          selected_optional_items?: Json | null
          slug?: string | null
          status?: string
          ticket_enviado?: boolean | null
          tickets_generated?: boolean | null
          tour_id: string
          transaction_id?: string | null
          updated_at?: string
          valor_pago?: number | null
          valor_passeio?: number | null
          valor_total_com_opcionais?: number | null
        }
        Update: {
          adicionais?: Json | null
          capture_method?: string | null
          card_fee_amount?: number | null
          cliente_id?: string
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          coupon_code?: string | null
          coupon_discount?: number | null
          created_at?: string
          data_cancelamento?: string | null
          data_confirmacao?: string | null
          data_pagamento?: string | null
          data_reserva?: string
          descricao_problema_saude?: string | null
          id?: string
          infinitepay_checkout_url?: string | null
          infinitepay_invoice_slug?: string | null
          infinitepay_transaction_nsu?: string | null
          installments?: number | null
          motivo_cancelamento?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          mp_status?: string | null
          nome_plano_saude?: string | null
          numero_participantes?: number | null
          observacoes?: string | null
          opcionais?: Json | null
          order_nsu?: string | null
          payment_method?: string | null
          payment_status?: string
          plano_saude?: boolean | null
          ponto_embarque_id?: string | null
          problema_saude?: boolean
          receipt_url?: string | null
          refund_amount?: number | null
          refund_date?: string | null
          refund_reason?: string | null
          refunded_by?: string | null
          reserva_numero?: string | null
          seen_by_admin?: boolean
          selected_optional_items?: Json | null
          slug?: string | null
          status?: string
          ticket_enviado?: boolean | null
          tickets_generated?: boolean | null
          tour_id?: string
          transaction_id?: string | null
          updated_at?: string
          valor_pago?: number | null
          valor_passeio?: number | null
          valor_total_com_opcionais?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_reservas_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reservas_ponto_embarque"
            columns: ["ponto_embarque_id"]
            isOneToOne: false
            referencedRelation: "tour_boarding_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reservas_tour"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_ponto_embarque_id_fkey"
            columns: ["ponto_embarque_id"]
            isOneToOne: false
            referencedRelation: "tour_boarding_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_custom_answers: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          question_id: string
          reserva_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          question_id: string
          reserva_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          question_id?: string
          reserva_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_custom_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "tour_custom_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_custom_answers_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_custom_column_values: {
        Row: {
          column_id: string
          created_at: string
          id: string
          reserva_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          column_id: string
          created_at?: string
          id?: string
          reserva_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          column_id?: string
          created_at?: string
          id?: string
          reserva_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_custom_column_values_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "tour_custom_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_custom_column_values_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_participants: {
        Row: {
          assistencia_diferenciada: boolean | null
          como_conheceu: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          cpf: string | null
          created_at: string
          data_cadastro: string | null
          data_nascimento: string | null
          descricao_assistencia_diferenciada: string | null
          descricao_problema_saude: string | null
          email: string | null
          id: string
          is_staff: boolean | null
          nivel_condicionamento: string | null
          nome_completo: string | null
          nome_plano_saude: string | null
          observacoes: string | null
          participant_index: number
          plano_saude: boolean | null
          ponto_embarque_id: string | null
          ponto_embarque_personalizado: string | null
          pricing_option_id: string | null
          pricing_option_name: string | null
          problema_saude: boolean | null
          reserva_id: string
          selected_optionals: Json | null
          staff_role: string | null
          ticket_enviado: boolean | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          assistencia_diferenciada?: boolean | null
          como_conheceu?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string | null
          created_at?: string
          data_cadastro?: string | null
          data_nascimento?: string | null
          descricao_assistencia_diferenciada?: string | null
          descricao_problema_saude?: string | null
          email?: string | null
          id?: string
          is_staff?: boolean | null
          nivel_condicionamento?: string | null
          nome_completo?: string | null
          nome_plano_saude?: string | null
          observacoes?: string | null
          participant_index?: number
          plano_saude?: boolean | null
          ponto_embarque_id?: string | null
          ponto_embarque_personalizado?: string | null
          pricing_option_id?: string | null
          pricing_option_name?: string | null
          problema_saude?: boolean | null
          reserva_id: string
          selected_optionals?: Json | null
          staff_role?: string | null
          ticket_enviado?: boolean | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          assistencia_diferenciada?: boolean | null
          como_conheceu?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string | null
          created_at?: string
          data_cadastro?: string | null
          data_nascimento?: string | null
          descricao_assistencia_diferenciada?: string | null
          descricao_problema_saude?: string | null
          email?: string | null
          id?: string
          is_staff?: boolean | null
          nivel_condicionamento?: string | null
          nome_completo?: string | null
          nome_plano_saude?: string | null
          observacoes?: string | null
          participant_index?: number
          plano_saude?: boolean | null
          ponto_embarque_id?: string | null
          ponto_embarque_personalizado?: string | null
          pricing_option_id?: string | null
          pricing_option_name?: string | null
          problema_saude?: boolean | null
          reserva_id?: string
          selected_optionals?: Json | null
          staff_role?: string | null
          ticket_enviado?: boolean | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_participants_ponto_embarque_id_fkey"
            columns: ["ponto_embarque_id"]
            isOneToOne: false
            referencedRelation: "tour_boarding_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_participants_pricing_option_id_fkey"
            columns: ["pricing_option_id"]
            isOneToOne: false
            referencedRelation: "tour_pricing_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_participants_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      roca_execution_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          error_details: Json | null
          id: string
          raw_request: Json | null
          raw_response: Json | null
          total_active: number | null
          total_confirmed: number | null
          total_errors: number | null
          total_sent: number | null
          trip_id: string | null
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          error_details?: Json | null
          id?: string
          raw_request?: Json | null
          raw_response?: Json | null
          total_active?: number | null
          total_confirmed?: number | null
          total_errors?: number | null
          total_sent?: number | null
          trip_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          error_details?: Json | null
          id?: string
          raw_request?: Json | null
          raw_response?: Json | null
          total_active?: number | null
          total_confirmed?: number | null
          total_errors?: number | null
          total_sent?: number | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roca_execution_logs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      roca_settings: {
        Row: {
          auto_execute_enabled: boolean
          auto_execute_time: string
          carta_oferta: string | null
          created_at: string
          id: string
          jwt_secret: string | null
          jwt_updated_at: string | null
          senha_secret: string | null
          tokenusuario_secret: string | null
          updated_at: string
        }
        Insert: {
          auto_execute_enabled?: boolean
          auto_execute_time?: string
          carta_oferta?: string | null
          created_at?: string
          id?: string
          jwt_secret?: string | null
          jwt_updated_at?: string | null
          senha_secret?: string | null
          tokenusuario_secret?: string | null
          updated_at?: string
        }
        Update: {
          auto_execute_enabled?: boolean
          auto_execute_time?: string
          carta_oferta?: string | null
          created_at?: string
          id?: string
          jwt_secret?: string | null
          jwt_updated_at?: string | null
          senha_secret?: string | null
          tokenusuario_secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      room_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          id: string
          notes: string | null
          participant_id: string | null
          participant_index: number
          reserva_id: string | null
          room_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          participant_id?: string | null
          participant_index?: number
          reserva_id?: string | null
          room_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          participant_id?: string | null
          participant_index?: number
          reserva_id?: string | null
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_assignments_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "reservation_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_assignments_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_assignments_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "accommodation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          order_index: number | null
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          order_index?: number | null
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          order_index?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "shop_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_attributes: {
        Row: {
          created_at: string
          id: string
          name: string
          order_index: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_index?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_index?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          product_name: string
          quantity: number
          reserva_id: string
          subtotal: number
          unit_price: number
          variation_id: string | null
          variation_label: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          product_name: string
          quantity?: number
          reserva_id: string
          subtotal: number
          unit_price: number
          variation_id?: string | null
          variation_label?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          reserva_id?: string
          subtotal?: number
          unit_price?: number
          variation_id?: string | null
          variation_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "shop_product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_attributes: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "shop_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_cover: boolean | null
          order_index: number | null
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_cover?: boolean | null
          order_index?: number | null
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_cover?: boolean | null
          order_index?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_tours: {
        Row: {
          created_at: string
          id: string
          product_id: string
          tour_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          tour_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_tours_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_product_tours_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_product_variations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          price_adjustment: number | null
          product_id: string
          sku: string | null
          stock_quantity: number | null
          updated_at: string
          variation_values: Json
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          price_adjustment?: number | null
          product_id: string
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          variation_values?: Json
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          price_adjustment?: number | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
          variation_values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "shop_product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          category_id: string | null
          checkout_order: number | null
          created_at: string
          full_description: string | null
          has_stock_control: boolean | null
          has_variations: boolean | null
          id: string
          is_active: boolean | null
          name: string
          out_of_stock_behavior: string | null
          price: number
          short_description: string | null
          show_in_all_tours: boolean | null
          show_in_checkout: boolean | null
          slug: string
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          checkout_order?: number | null
          created_at?: string
          full_description?: string | null
          has_stock_control?: boolean | null
          has_variations?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          out_of_stock_behavior?: string | null
          price?: number
          short_description?: string | null
          show_in_all_tours?: boolean | null
          show_in_checkout?: boolean | null
          slug: string
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          checkout_order?: number | null
          created_at?: string
          full_description?: string | null
          has_stock_control?: boolean | null
          has_variations?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          out_of_stock_behavior?: string | null
          price?: number
          short_description?: string | null
          show_in_all_tours?: boolean | null
          show_in_checkout?: boolean | null
          slug?: string
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stops: {
        Row: {
          apelido_curto: string | null
          created_at: string
          horario: string | null
          id: string
          ordem: number | null
          titulo: string
          trip_id: string
        }
        Insert: {
          apelido_curto?: string | null
          created_at?: string
          horario?: string | null
          id?: string
          ordem?: number | null
          titulo: string
          trip_id: string
        }
        Update: {
          apelido_curto?: string | null
          created_at?: string
          horario?: string | null
          id?: string
          ordem?: number | null
          titulo?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stops_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      support_topics: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          order_index: number
          redirect_url: string | null
          title: string
          updated_at: string
          whatsapp_message: string | null
        }
        Insert: {
          action_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          redirect_url?: string | null
          title: string
          updated_at?: string
          whatsapp_message?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          redirect_url?: string | null
          title?: string
          updated_at?: string
          whatsapp_message?: string | null
        }
        Relationships: []
      }
      task_ideas: {
        Row: {
          color: string | null
          content: string
          created_at: string
          id: string
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          content: string
          created_at?: string
          id?: string
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_steps: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          order_index: number | null
          task_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          order_index?: number | null
          task_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          order_index?: number | null
          task_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_ticktick_mapping: {
        Row: {
          created_at: string
          id: string
          task_id: string
          ticktick_project_id: string | null
          ticktick_task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          task_id: string
          ticktick_project_id?: string | null
          ticktick_task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          task_id?: string
          ticktick_project_id?: string | null
          ticktick_task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_ticktick_mapping_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          amanda_status: string | null
          assignee: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          duration_minutes: number | null
          id: string
          isaias_status: string | null
          order_index: number
          process_element_id: string | null
          process_instance_id: string | null
          process_map_id: string | null
          process_stage: string | null
          quadrant: string
          status: string
          title: string
          tour_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amanda_status?: string | null
          assignee?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          isaias_status?: string | null
          order_index?: number
          process_element_id?: string | null
          process_instance_id?: string | null
          process_map_id?: string | null
          process_stage?: string | null
          quadrant?: string
          status?: string
          title: string
          tour_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amanda_status?: string | null
          assignee?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          id?: string
          isaias_status?: string | null
          order_index?: number
          process_element_id?: string | null
          process_instance_id?: string | null
          process_map_id?: string | null
          process_stage?: string | null
          quadrant?: string
          status?: string
          title?: string
          tour_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_process_map_id_fkey"
            columns: ["process_map_id"]
            isOneToOne: false
            referencedRelation: "process_maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_templates: {
        Row: {
          accent_color: string | null
          attention_items: string | null
          attention_title: string | null
          background_color: string | null
          boarding_label: string | null
          cover_image_url: string | null
          created_at: string
          divider_color: string | null
          footer_text: string | null
          header_gradient_end: string | null
          header_gradient_start: string | null
          id: string
          instagram_text: string | null
          is_default: boolean
          logo_url: string | null
          name: string
          passenger_label: string | null
          phone_text: string | null
          price_label: string | null
          qr_label_text: string | null
          rules_text: string | null
          show_qr_label: boolean | null
          subtitle_text: string | null
          text_color: string | null
          ticket_number_label: string | null
          title_text: string | null
          tour_id: string | null
          updated_at: string
          website_text: string | null
        }
        Insert: {
          accent_color?: string | null
          attention_items?: string | null
          attention_title?: string | null
          background_color?: string | null
          boarding_label?: string | null
          cover_image_url?: string | null
          created_at?: string
          divider_color?: string | null
          footer_text?: string | null
          header_gradient_end?: string | null
          header_gradient_start?: string | null
          id?: string
          instagram_text?: string | null
          is_default?: boolean
          logo_url?: string | null
          name: string
          passenger_label?: string | null
          phone_text?: string | null
          price_label?: string | null
          qr_label_text?: string | null
          rules_text?: string | null
          show_qr_label?: boolean | null
          subtitle_text?: string | null
          text_color?: string | null
          ticket_number_label?: string | null
          title_text?: string | null
          tour_id?: string | null
          updated_at?: string
          website_text?: string | null
        }
        Update: {
          accent_color?: string | null
          attention_items?: string | null
          attention_title?: string | null
          background_color?: string | null
          boarding_label?: string | null
          cover_image_url?: string | null
          created_at?: string
          divider_color?: string | null
          footer_text?: string | null
          header_gradient_end?: string | null
          header_gradient_start?: string | null
          id?: string
          instagram_text?: string | null
          is_default?: boolean
          logo_url?: string | null
          name?: string
          passenger_label?: string | null
          phone_text?: string | null
          price_label?: string | null
          qr_label_text?: string | null
          rules_text?: string | null
          show_qr_label?: boolean | null
          subtitle_text?: string | null
          text_color?: string | null
          ticket_number_label?: string | null
          title_text?: string | null
          tour_id?: string | null
          updated_at?: string
          website_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_templates_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          amount_paid: number | null
          boarding_point_address: string | null
          boarding_point_name: string | null
          boarding_time: string | null
          checkin_at: string | null
          checkin_by: string | null
          created_at: string
          id: string
          participant_cpf: string | null
          participant_id: string | null
          participant_name: string
          qr_token: string
          reserva_id: string
          reservation_number: string | null
          status: string
          ticket_number: string
          tour_id: string
          trip_date: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          boarding_point_address?: string | null
          boarding_point_name?: string | null
          boarding_time?: string | null
          checkin_at?: string | null
          checkin_by?: string | null
          created_at?: string
          id?: string
          participant_cpf?: string | null
          participant_id?: string | null
          participant_name: string
          qr_token?: string
          reserva_id: string
          reservation_number?: string | null
          status?: string
          ticket_number: string
          tour_id: string
          trip_date: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          boarding_point_address?: string | null
          boarding_point_name?: string | null
          boarding_time?: string | null
          checkin_at?: string | null
          checkin_by?: string | null
          created_at?: string
          id?: string
          participant_cpf?: string | null
          participant_id?: string | null
          participant_name?: string
          qr_token?: string
          reserva_id?: string
          reservation_number?: string | null
          status?: string
          ticket_number?: string
          tour_id?: string
          trip_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "reservation_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      ticktick_integrations: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          scope: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tour_accommodations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          order_index: number | null
          phone: string | null
          tour_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          order_index?: number | null
          phone?: string | null
          tour_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          order_index?: number | null
          phone?: string | null
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_accommodations_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_boarding_points: {
        Row: {
          created_at: string
          endereco: string | null
          horario: string | null
          id: string
          nome: string
          order_index: number
          tour_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          endereco?: string | null
          horario?: string | null
          id?: string
          nome: string
          order_index?: number
          tour_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          endereco?: string | null
          horario?: string | null
          id?: string
          nome?: string
          order_index?: number
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_boarding_points_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_cost_payments: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          payment_date: string | null
          tour_cost_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_date?: string | null
          tour_cost_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          payment_date?: string | null
          tour_cost_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_cost_payments_tour_cost_id_fkey"
            columns: ["tour_cost_id"]
            isOneToOne: false
            referencedRelation: "tour_costs"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_costs: {
        Row: {
          auto_scale_optional_item_id: string | null
          auto_scale_participants: boolean
          auto_scale_pricing_option_id: string | null
          created_at: string
          expense_type: string
          id: string
          order_index: number
          payment_date: string | null
          product_service: string
          quantity: number
          tour_id: string
          unit_value: number
          updated_at: string
          valor_pago: number
        }
        Insert: {
          auto_scale_optional_item_id?: string | null
          auto_scale_participants?: boolean
          auto_scale_pricing_option_id?: string | null
          created_at?: string
          expense_type?: string
          id?: string
          order_index?: number
          payment_date?: string | null
          product_service: string
          quantity?: number
          tour_id: string
          unit_value?: number
          updated_at?: string
          valor_pago?: number
        }
        Update: {
          auto_scale_optional_item_id?: string | null
          auto_scale_participants?: boolean
          auto_scale_pricing_option_id?: string | null
          created_at?: string
          expense_type?: string
          id?: string
          order_index?: number
          payment_date?: string | null
          product_service?: string
          quantity?: number
          tour_id?: string
          unit_value?: number
          updated_at?: string
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "tour_costs_auto_scale_optional_item_id_fkey"
            columns: ["auto_scale_optional_item_id"]
            isOneToOne: false
            referencedRelation: "tour_optional_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_costs_auto_scale_pricing_option_id_fkey"
            columns: ["auto_scale_pricing_option_id"]
            isOneToOne: false
            referencedRelation: "tour_pricing_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_costs_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_custom_columns: {
        Row: {
          column_name: string
          column_type: string
          created_at: string
          id: string
          options: string[] | null
          order_index: number
          tour_id: string
          updated_at: string
        }
        Insert: {
          column_name: string
          column_type: string
          created_at?: string
          id?: string
          options?: string[] | null
          order_index?: number
          tour_id: string
          updated_at?: string
        }
        Update: {
          column_name?: string
          column_type?: string
          created_at?: string
          id?: string
          options?: string[] | null
          order_index?: number
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_custom_columns_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_custom_questions: {
        Row: {
          condition_field_key: string | null
          condition_value: string | null
          created_at: string
          id: string
          is_active: boolean | null
          is_required: boolean
          options: string[] | null
          order_index: number
          question_category: string | null
          question_text: string
          question_type: string
          standard_field_key: string | null
          template_id: string | null
          tour_id: string
          updated_at: string
        }
        Insert: {
          condition_field_key?: string | null
          condition_value?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean
          options?: string[] | null
          order_index?: number
          question_category?: string | null
          question_text: string
          question_type?: string
          standard_field_key?: string | null
          template_id?: string | null
          tour_id: string
          updated_at?: string
        }
        Update: {
          condition_field_key?: string | null
          condition_value?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean
          options?: string[] | null
          order_index?: number
          question_category?: string | null
          question_text?: string
          question_type?: string
          standard_field_key?: string | null
          template_id?: string | null
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_custom_questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_question_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_custom_questions_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_gallery_images: {
        Row: {
          caption: string | null
          created_at: string
          crop_position: Json | null
          id: string
          image_url: string
          is_cover: boolean | null
          order_index: number
          tour_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          crop_position?: Json | null
          id?: string
          image_url: string
          is_cover?: boolean | null
          order_index?: number
          tour_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          crop_position?: Json | null
          id?: string
          image_url?: string
          is_cover?: boolean | null
          order_index?: number
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_gallery_images_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_optional_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          order_index: number
          price: number
          tour_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          order_index?: number
          price?: number
          tour_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          order_index?: number
          price?: number
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_optional_items_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_pontos_embarque: {
        Row: {
          created_at: string
          id: string
          ponto_embarque_id: string
          tour_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ponto_embarque_id: string
          tour_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ponto_embarque_id?: string
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_pontos_embarque_ponto_embarque_id_fkey"
            columns: ["ponto_embarque_id"]
            isOneToOne: false
            referencedRelation: "pontos_embarque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_pontos_embarque_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_pricing_options: {
        Row: {
          card_price: number
          created_at: string
          description: string | null
          id: string
          option_name: string
          pix_price: number
          tour_id: string
          updated_at: string
        }
        Insert: {
          card_price: number
          created_at?: string
          description?: string | null
          id?: string
          option_name: string
          pix_price: number
          tour_id: string
          updated_at?: string
        }
        Update: {
          card_price?: number
          created_at?: string
          description?: string | null
          id?: string
          option_name?: string
          pix_price?: number
          tour_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_pricing_options_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_transport_config: {
        Row: {
          auto_assign_seats: boolean
          created_at: string
          id: string
          seat_selection_enabled: boolean
          tour_id: string
          updated_at: string
          vehicle_id: string
          vehicle_order: number
        }
        Insert: {
          auto_assign_seats?: boolean
          created_at?: string
          id?: string
          seat_selection_enabled?: boolean
          tour_id: string
          updated_at?: string
          vehicle_id: string
          vehicle_order?: number
        }
        Update: {
          auto_assign_seats?: boolean
          created_at?: string
          id?: string
          seat_selection_enabled?: boolean
          tour_id?: string
          updated_at?: string
          vehicle_id?: string
          vehicle_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tour_transport_config_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_transport_config_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "transport_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          about: string | null
          buy_url: string | null
          city: string
          created_at: string
          departures: string | null
          end_date: string | null
          etiqueta: string | null
          gastos_manutencao: number | null
          gastos_viagem: number | null
          has_accommodation: boolean | null
          id: string
          image_url: string | null
          imposto_renda: number | null
          includes: string | null
          is_active: boolean
          is_exclusive: boolean
          is_featured: boolean | null
          itinerary: string | null
          link_pagamento: string | null
          month: string
          mp_card_fee_percent: number
          mp_installments_max: number
          name: string
          not_includes: string | null
          payment_mode: string
          pdf_file_path: string | null
          pix_discount_percent: number | null
          policy: string | null
          pro_labore: number | null
          start_date: string
          state: string
          updated_at: string
          vagas: number | null
          vagas_fechadas: boolean
          valor_padrao: number | null
          what_to_bring: string | null
          whatsapp_group_link: string | null
        }
        Insert: {
          about?: string | null
          buy_url?: string | null
          city: string
          created_at?: string
          departures?: string | null
          end_date?: string | null
          etiqueta?: string | null
          gastos_manutencao?: number | null
          gastos_viagem?: number | null
          has_accommodation?: boolean | null
          id?: string
          image_url?: string | null
          imposto_renda?: number | null
          includes?: string | null
          is_active?: boolean
          is_exclusive?: boolean
          is_featured?: boolean | null
          itinerary?: string | null
          link_pagamento?: string | null
          month: string
          mp_card_fee_percent?: number
          mp_installments_max?: number
          name: string
          not_includes?: string | null
          payment_mode?: string
          pdf_file_path?: string | null
          pix_discount_percent?: number | null
          policy?: string | null
          pro_labore?: number | null
          start_date: string
          state: string
          updated_at?: string
          vagas?: number | null
          vagas_fechadas?: boolean
          valor_padrao?: number | null
          what_to_bring?: string | null
          whatsapp_group_link?: string | null
        }
        Update: {
          about?: string | null
          buy_url?: string | null
          city?: string
          created_at?: string
          departures?: string | null
          end_date?: string | null
          etiqueta?: string | null
          gastos_manutencao?: number | null
          gastos_viagem?: number | null
          has_accommodation?: boolean | null
          id?: string
          image_url?: string | null
          imposto_renda?: number | null
          includes?: string | null
          is_active?: boolean
          is_exclusive?: boolean
          is_featured?: boolean | null
          itinerary?: string | null
          link_pagamento?: string | null
          month?: string
          mp_card_fee_percent?: number
          mp_installments_max?: number
          name?: string
          not_includes?: string | null
          payment_mode?: string
          pdf_file_path?: string | null
          pix_discount_percent?: number | null
          policy?: string | null
          pro_labore?: number | null
          start_date?: string
          state?: string
          updated_at?: string
          vagas?: number | null
          vagas_fechadas?: boolean
          valor_padrao?: number | null
          what_to_bring?: string | null
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      transport_vehicles: {
        Row: {
          aisle_position: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          layout_config: Json | null
          layout_json: string | null
          name: string
          rows_count: number
          seats_per_row: number
          total_capacity: number
          updated_at: string
        }
        Insert: {
          aisle_position?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          layout_config?: Json | null
          layout_json?: string | null
          name: string
          rows_count?: number
          seats_per_row?: number
          total_capacity?: number
          updated_at?: string
        }
        Update: {
          aisle_position?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          layout_config?: Json | null
          layout_json?: string | null
          name?: string
          rows_count?: number
          seats_per_row?: number
          total_capacity?: number
          updated_at?: string
        }
        Relationships: []
      }
      trip_roca_event: {
        Row: {
          created_at: string
          enabled: boolean
          error_message: string | null
          id: string
          last_sync_at: string | null
          raw_request: Json | null
          raw_response: Json | null
          status: string
          token_evento: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          status?: string
          token_evento?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          status?: string
          token_evento?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_roca_event_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_roca_participant: {
        Row: {
          cpf: string
          created_at: string
          error_message: string | null
          id: string
          id_participante: string | null
          last_sync_at: string | null
          nome: string | null
          participant_id: string | null
          raw_request: Json | null
          raw_response: Json | null
          reserva_id: string | null
          sent_at: string | null
          status: string
          token_participante: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          cpf: string
          created_at?: string
          error_message?: string | null
          id?: string
          id_participante?: string | null
          last_sync_at?: string | null
          nome?: string | null
          participant_id?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          reserva_id?: string | null
          sent_at?: string | null
          status?: string
          token_participante?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          cpf?: string
          created_at?: string
          error_message?: string | null
          id?: string
          id_participante?: string | null
          last_sync_at?: string | null
          nome?: string | null
          participant_id?: string | null
          raw_request?: Json | null
          raw_response?: Json | null
          reserva_id?: string | null
          sent_at?: string | null
          status?: string
          token_participante?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_roca_participant_reserva_id_fkey"
            columns: ["reserva_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_roca_participant_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          data: string
          id: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          titulo?: string
          updated_at?: string
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      vehicle_seats: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          position_x: number
          position_y: number
          row_number: number
          seat_label: string
          seat_letter: string
          seat_type: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          position_x?: number
          position_y?: number
          row_number: number
          seat_label: string
          seat_letter: string
          seat_type?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          position_x?: number
          position_y?: number
          row_number?: number
          seat_label?: string
          seat_letter?: string
          seat_type?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_seats_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "transport_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          created_at: string
          id: string
          nome_completo: string
          numero_vagas: number
          status: string
          tour_id: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_completo: string
          numero_vagas?: number
          status?: string
          tour_id: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_completo?: string
          numero_vagas?: number
          status?: string
          tour_id?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_tour_points: { Args: { valor_pago: number }; Returns: number }
      cancelar_reserva: {
        Args: { motivo?: string; reserva_id: string }
        Returns: boolean
      }
      check_and_award_badges: {
        Args: { p_client_account_id: string }
        Returns: undefined
      }
      check_tour_availability: {
        Args: { p_requested_spots?: number; p_tour_id: string }
        Returns: boolean
      }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      confirmar_pagamento: {
        Args: { reserva_id: string; valor_pago_input?: number }
        Returns: boolean
      }
      create_admin_user: { Args: { target_user_id: string }; Returns: boolean }
      create_tickets_for_reservation: {
        Args: { p_reserva_id: string }
        Returns: undefined
      }
      generate_vehicle_seats: {
        Args: {
          p_aisle_position: number
          p_rows: number
          p_seats_per_row: number
          p_vehicle_id: string
        }
        Returns: undefined
      }
      get_available_seats: {
        Args: { p_tour_id: string }
        Returns: {
          is_occupied: boolean
          occupant_name: string
          position_x: number
          position_y: number
          row_number: number
          seat_id: string
          seat_label: string
          seat_letter: string
          seat_type: string
          vehicle_id: string
          vehicle_name: string
        }[]
      }
      get_available_spots: { Args: { p_tour_id: string }; Returns: number }
      get_client_by_cpf: {
        Args: { lookup_cpf: string }
        Returns: {
          contato_emergencia_nome: string
          contato_emergencia_telefone: string
          cpf: string
          data_nascimento: string
          descricao_problema_saude: string
          email: string
          id: string
          nome_completo: string
          problema_saude: boolean
          whatsapp: string
        }[]
      }
      get_client_credit_balance: {
        Args: { p_cliente_id: string }
        Returns: number
      }
      get_client_level: {
        Args: { total_points: number }
        Returns: {
          level_benefits: string
          level_color: string
          level_icon: string
          level_name: string
        }[]
      }
      get_client_stats: {
        Args: { p_cliente_id: string }
        Returns: {
          badges_count: number
          level_color: string
          level_name: string
          total_points: number
          total_spent: number
          tours_count: number
        }[]
      }
      get_cliente_reservas: {
        Args: { cliente_cpf: string }
        Returns: {
          data_reserva: string
          payment_status: string
          ponto_embarque: string
          reserva_id: string
          reserva_numero: string
          status: string
          tour_data_inicio: string
          tour_nome: string
          valor_total: number
        }[]
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_reservas_completa: {
        Args: never
        Returns: {
          adicionais: Json
          cliente_whatsapp: string
          contato_emergencia_nome: string
          contato_emergencia_telefone: string
          cpf: string
          created_at: string
          data_cancelamento: string
          data_confirmacao: string
          data_nascimento: string
          data_pagamento: string
          data_reserva: string
          descricao_problema_saude: string
          email: string
          id: string
          motivo_cancelamento: string
          nome_completo: string
          numero_participantes: number
          observacoes: string
          opcionais: Json
          payment_method: string
          payment_status: string
          ponto_embarque_endereco: string
          ponto_embarque_nome: string
          problema_saude: boolean
          reserva_numero: string
          status: string
          ticket_enviado: boolean
          tour_cidade: string
          tour_data_fim: string
          tour_data_inicio: string
          tour_estado: string
          tour_nome: string
          updated_at: string
          valor_pago: number
          valor_passeio: number
          valor_total_com_opcionais: number
        }[]
      }
      get_reservas_stats: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          clientes_unicos: number
          reservas_canceladas: number
          reservas_confirmadas: number
          reservas_pendentes: number
          total_reservas: number
          valor_total_pago: number
          valor_total_pendente: number
        }[]
      }
      get_room_occupancy: { Args: { p_room_id: string }; Returns: number }
      get_ticket_by_qr: {
        Args: { qr_token_param: string }
        Returns: {
          amount_paid: number
          boarding_point_address: string
          boarding_point_name: string
          boarding_time: string
          checkin_at: string
          id: string
          participant_name: string
          qr_token: string
          reserva_id: string
          reservation_number: string
          status: string
          ticket_number: string
          tour_id: string
          trip_date: string
        }[]
      }
      get_tour_occupied_spots: { Args: { p_tour_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_client_by_cpf: {
        Args: { search_cpf: string }
        Returns: {
          data_nascimento: string
          email: string
          id: string
          nome_completo: string
          whatsapp: string
        }[]
      }
      lookup_client_by_email: {
        Args: { search_email: string }
        Returns: {
          id: string
        }[]
      }
      move_client_journey_phase: {
        Args: {
          p_cliente_id: string
          p_to_phase: Database["public"]["Enums"]["journey_phase"]
          p_tour_id?: string
          p_trigger_description?: string
          p_trigger_type?: string
        }
        Returns: undefined
      }
      populate_default_questions_for_tour: {
        Args: { p_tour_id: string }
        Returns: undefined
      }
      process_completed_tour: {
        Args: { p_reserva_id: string }
        Returns: undefined
      }
      revoke_admin_access: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      sync_template_to_tour_questions: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      validate_auth_attempt: {
        Args: { email_input: string; ip_address?: string }
        Returns: boolean
      }
      validate_cpf: { Args: { cpf_input: string }; Returns: boolean }
      validate_cpf_lookup: {
        Args: { cpf_input: string; ip_address?: string }
        Returns: boolean
      }
      validate_email: { Args: { email_input: string }; Returns: boolean }
      validate_financeiro_password: {
        Args: { input_password: string }
        Returns: boolean
      }
      validate_phone: { Args: { phone_input: string }; Returns: boolean }
      verify_email_code: {
        Args: { lookup_code: string; lookup_email: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      journey_phase:
        | "descobre"
        | "confia"
        | "compra"
        | "se_prepara"
        | "vive"
        | "compartilha"
        | "volta"
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
      app_role: ["admin", "user"],
      journey_phase: [
        "descobre",
        "confia",
        "compra",
        "se_prepara",
        "vive",
        "compartilha",
        "volta",
      ],
    },
  },
} as const
