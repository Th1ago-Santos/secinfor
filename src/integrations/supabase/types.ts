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
      alerts: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          item_patrimonio: string | null
          item_tipo: string | null
          mensagem: string
          nivel: string
          resolvido_em: string | null
          resolvido_por: string | null
          secao: string | null
          status: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_patrimonio?: string | null
          item_tipo?: string | null
          mensagem: string
          nivel?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          secao?: string | null
          status?: string
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          item_patrimonio?: string | null
          item_tipo?: string | null
          mensagem?: string
          nivel?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          secao?: string | null
          status?: string
          tipo?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      computer_priorities: {
        Row: {
          created_at: string
          data_encerramento: string | null
          data_solicitacao: string | null
          id: string
          motivo: string | null
          observacoes: string | null
          ordem: number
          responsavel: string | null
          secao: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_encerramento?: string | null
          data_solicitacao?: string | null
          id?: string
          motivo?: string | null
          observacoes?: string | null
          ordem?: number
          responsavel?: string | null
          secao: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_encerramento?: string | null
          data_solicitacao?: string | null
          id?: string
          motivo?: string | null
          observacoes?: string | null
          ordem?: number
          responsavel?: string | null
          secao?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          conferido_em: string
          created_at: string
          id: string
          item_id: string | null
          item_tipo: string | null
          patrimonio: string
          session_id: string
          status: string
          usuario_id: string
        }
        Insert: {
          conferido_em?: string
          created_at?: string
          id?: string
          item_id?: string | null
          item_tipo?: string | null
          patrimonio: string
          session_id: string
          status?: string
          usuario_id: string
        }
        Update: {
          conferido_em?: string
          created_at?: string
          id?: string
          item_id?: string | null
          item_tipo?: string | null
          patrimonio?: string
          session_id?: string
          status?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "inventory_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_sessions: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          id: string
          secao_alvo: string | null
          status: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          secao_alvo?: string | null
          status?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          secao_alvo?: string | null
          status?: string
          usuario_id?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          codigo_material: string
          created_at: string
          id: string
          nome: string
          numero_ficha: string
          patrimonio: string
          updated_at: string
        }
        Insert: {
          codigo_material: string
          created_at?: string
          id?: string
          nome: string
          numero_ficha: string
          patrimonio: string
          updated_at?: string
        }
        Update: {
          codigo_material?: string
          created_at?: string
          id?: string
          nome?: string
          numero_ficha?: string
          patrimonio?: string
          updated_at?: string
        }
        Relationships: []
      }
      movements: {
        Row: {
          created_at: string
          data_hora: string
          id: string
          item_id: string
          item_tipo: string
          observacao: string | null
          responsavel_anterior: string | null
          responsavel_novo: string | null
          secao_destino: string | null
          secao_origem: string | null
          tipo_evento: string
          usuario_sistema: string | null
        }
        Insert: {
          created_at?: string
          data_hora?: string
          id?: string
          item_id: string
          item_tipo: string
          observacao?: string | null
          responsavel_anterior?: string | null
          responsavel_novo?: string | null
          secao_destino?: string | null
          secao_origem?: string | null
          tipo_evento: string
          usuario_sistema?: string | null
        }
        Update: {
          created_at?: string
          data_hora?: string
          id?: string
          item_id?: string
          item_tipo?: string
          observacao?: string | null
          responsavel_anterior?: string | null
          responsavel_novo?: string | null
          secao_destino?: string | null
          secao_origem?: string | null
          tipo_evento?: string
          usuario_sistema?: string | null
        }
        Relationships: []
      }
      notebooks: {
        Row: {
          created_at: string
          data_entrada_manutencao: string | null
          data_saida_manutencao: string | null
          foto_url: string | null
          id: string
          militar: string
          modelo: string
          motivo_manutencao: string | null
          observacoes_manutencao: string | null
          patrimonio: string
          secao: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_entrada_manutencao?: string | null
          data_saida_manutencao?: string | null
          foto_url?: string | null
          id?: string
          militar: string
          modelo: string
          motivo_manutencao?: string | null
          observacoes_manutencao?: string | null
          patrimonio: string
          secao: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_entrada_manutencao?: string | null
          data_saida_manutencao?: string | null
          foto_url?: string | null
          id?: string
          militar?: string
          modelo?: string
          motivo_manutencao?: string | null
          observacoes_manutencao?: string | null
          patrimonio?: string
          secao?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      sections: {
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
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          kind: string
          ticket_id: string
          uploaded_by: string | null
          visibility: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          kind?: string
          ticket_id: string
          uploaded_by?: string | null
          visibility?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          kind?: string
          ticket_id?: string
          uploaded_by?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          assigned_user_id_snapshot: string | null
          author_id: string | null
          author_name: string | null
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          message_type: string
          queue_id_snapshot: string | null
          status_id_snapshot: string | null
          ticket_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          assigned_user_id_snapshot?: string | null
          author_id?: string | null
          author_name?: string | null
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          message_type?: string
          queue_id_snapshot?: string | null
          status_id_snapshot?: string | null
          ticket_id: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          assigned_user_id_snapshot?: string | null
          author_id?: string | null
          author_name?: string | null
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          message_type?: string
          queue_id_snapshot?: string | null
          status_id_snapshot?: string | null
          ticket_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_queues: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_sla: {
        Row: {
          created_at: string
          id: string
          priority: string
          resolution_minutes: number
          response_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          priority: string
          resolution_minutes?: number
          response_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          priority?: string
          resolution_minutes?: number
          response_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      ticket_statuses: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          display_order: number
          id: string
          is_closed: boolean
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_closed?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_closed?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          assigned_user_id: string | null
          assigned_user_name: string | null
          category: string | null
          checklist: Json
          client_section_id: string | null
          client_section_name: string
          closed_at: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          deleted_at: string | null
          description: string
          equipment_id: string | null
          equipment_patrimonio: string | null
          equipment_type: string | null
          first_response_at: string | null
          id: string
          plate_name: string | null
          priority: string
          public_summary: string | null
          public_token: string
          queue_id: string | null
          status_id: string | null
          subject: string
          ticket_number: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          assigned_user_name?: string | null
          category?: string | null
          checklist?: Json
          client_section_id?: string | null
          client_section_name: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          deleted_at?: string | null
          description: string
          equipment_id?: string | null
          equipment_patrimonio?: string | null
          equipment_type?: string | null
          first_response_at?: string | null
          id?: string
          plate_name?: string | null
          priority?: string
          public_summary?: string | null
          public_token?: string
          queue_id?: string | null
          status_id?: string | null
          subject: string
          ticket_number: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          assigned_user_name?: string | null
          category?: string | null
          checklist?: Json
          client_section_id?: string | null
          client_section_name?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          deleted_at?: string | null
          description?: string
          equipment_id?: string | null
          equipment_patrimonio?: string | null
          equipment_type?: string | null
          first_response_at?: string | null
          id?: string
          plate_name?: string | null
          priority?: string
          public_summary?: string | null
          public_token?: string
          queue_id?: string | null
          status_id?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_client_section_id_fkey"
            columns: ["client_section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "ticket_queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "ticket_statuses"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_ticket_update: {
        Args: {
          p_assigned_user_id?: string
          p_assigned_user_name?: string
          p_content: string
          p_message_type?: string
          p_priority?: string
          p_queue_id?: string
          p_status_id?: string
          p_ticket_id: string
          p_visibility?: string
        }
        Returns: Json
      }
      assign_ticket_self: { Args: { p_ticket_id: string }; Returns: Json }
      batch_update_priority_order: {
        Args: { ids: string[]; orders: number[] }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_ticket_messages_public: {
        Args: { p_limit?: number; p_token: string }
        Returns: Json
      }
      lookup_patrimonio: { Args: { p_patrimonio: string }; Returns: Json }
      lookup_ticket_public: { Args: { p_token: string }; Returns: Json }
      soft_delete_ticket: { Args: { p_ticket_id: string }; Returns: string }
      update_ticket_attachment_metadata: {
        Args: {
          p_attachment_id: string
          p_kind?: string
          p_visibility?: string
        }
        Returns: Json
      }
      update_ticket_checklist: {
        Args: { p_checklist: Json; p_ticket_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "operador" | "visualizador" | "chefe_secao"
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
      app_role: ["admin", "operador", "visualizador", "chefe_secao"],
    },
  },
} as const
