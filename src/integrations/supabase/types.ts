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
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      avaliacao_fotos: {
        Row: {
          avaliacao_id: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          peca: string | null
          storage_path: string
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          peca?: string | null
          storage_path: string
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          peca?: string | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacao_fotos_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes: {
        Row: {
          ano: string | null
          avaliacao: number | null
          avarias: Json | null
          chassi: string | null
          cliente: string | null
          created_at: string
          created_by: string | null
          custo: number | null
          data_avaliacao: string | null
          empresa: Database["public"]["Enums"]["empresa"]
          estado_geral: string | null
          fipe: number | null
          historico: Json | null
          id: string
          km: number | null
          marca: string | null
          modalidade: string | null
          modelo: string | null
          nivel_avarias: string | null
          numero: number
          observacoes: string | null
          opcionais: Json | null
          origem: Database["public"]["Enums"]["origem"] | null
          placa: string
          status: Database["public"]["Enums"]["status_avaliacao"]
          tags_obs: Json | null
          updated_at: string
          updated_by: string | null
          vendedor: string | null
          versao: string | null
        }
        Insert: {
          ano?: string | null
          avaliacao?: number | null
          avarias?: Json | null
          chassi?: string | null
          cliente?: string | null
          created_at?: string
          created_by?: string | null
          custo?: number | null
          data_avaliacao?: string | null
          empresa: Database["public"]["Enums"]["empresa"]
          estado_geral?: string | null
          fipe?: number | null
          historico?: Json | null
          id?: string
          km?: number | null
          marca?: string | null
          modalidade?: string | null
          modelo?: string | null
          nivel_avarias?: string | null
          numero?: number
          observacoes?: string | null
          opcionais?: Json | null
          origem?: Database["public"]["Enums"]["origem"] | null
          placa: string
          status?: Database["public"]["Enums"]["status_avaliacao"]
          tags_obs?: Json | null
          updated_at?: string
          updated_by?: string | null
          vendedor?: string | null
          versao?: string | null
        }
        Update: {
          ano?: string | null
          avaliacao?: number | null
          avarias?: Json | null
          chassi?: string | null
          cliente?: string | null
          created_at?: string
          created_by?: string | null
          custo?: number | null
          data_avaliacao?: string | null
          empresa?: Database["public"]["Enums"]["empresa"]
          estado_geral?: string | null
          fipe?: number | null
          historico?: Json | null
          id?: string
          km?: number | null
          marca?: string | null
          modalidade?: string | null
          modelo?: string | null
          nivel_avarias?: string | null
          numero?: number
          observacoes?: string | null
          opcionais?: Json | null
          origem?: Database["public"]["Enums"]["origem"] | null
          placa?: string
          status?: Database["public"]["Enums"]["status_avaliacao"]
          tags_obs?: Json | null
          updated_at?: string
          updated_by?: string | null
          vendedor?: string | null
          versao?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
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
      vendedores: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          empresa: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          empresa?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          empresa?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "ti" | "gestor" | "avaliador"
      empresa: "Ceolin" | "Viva"
      origem: "WhatsApp" | "Presencial"
      status_avaliacao:
        | "Em Avaliação"
        | "Finalizada"
        | "Comprado"
        | "Não Comprado"
        | "Cancelado"
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
      app_role: ["super_admin", "ti", "gestor", "avaliador"],
      empresa: ["Ceolin", "Viva"],
      origem: ["WhatsApp", "Presencial"],
      status_avaliacao: [
        "Em Avaliação",
        "Finalizada",
        "Comprado",
        "Não Comprado",
        "Cancelado",
      ],
    },
  },
} as const
