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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      batch_update_priority_order: {
        Args: { ids: string[]; orders: number[] }
        Returns: undefined
      }
      lookup_patrimonio: { Args: { p_patrimonio: string }; Returns: Json }
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
