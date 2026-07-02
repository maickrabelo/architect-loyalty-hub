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
      empresas: {
        Row: {
          ativa: boolean | null
          cidade: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativa?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativa?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      premiacoes: {
        Row: {
          ativa: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          imagem_url: string | null
          nome: string
          ordem: number | null
          pontos_necessarios: number
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number | null
          pontos_necessarios: number
        }
        Update: {
          ativa?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number | null
          pontos_necessarios?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          apresentacao: string | null
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string | null
          complemento: string | null
          created_at: string | null
          email: string
          endereco: string | null
          estado: string | null
          facebook: string | null
          id: string
          imagem_profissional: string | null
          instagram: string | null
          nascimento: string | null
          nome: string
          nome_divulgacao: string | null
          numero: string | null
          observacao: string | null
          profissao: string | null
          rg: string | null
          sexo: Database["public"]["Enums"]["sexo_type"] | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          apresentacao?: string | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          complemento?: string | null
          created_at?: string | null
          email: string
          endereco?: string | null
          estado?: string | null
          facebook?: string | null
          id: string
          imagem_profissional?: string | null
          instagram?: string | null
          nascimento?: string | null
          nome: string
          nome_divulgacao?: string | null
          numero?: string | null
          observacao?: string | null
          profissao?: string | null
          rg?: string | null
          sexo?: Database["public"]["Enums"]["sexo_type"] | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          apresentacao?: string | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          complemento?: string | null
          created_at?: string | null
          email?: string
          endereco?: string | null
          estado?: string | null
          facebook?: string | null
          id?: string
          imagem_profissional?: string | null
          instagram?: string | null
          nascimento?: string | null
          nome?: string
          nome_divulgacao?: string | null
          numero?: string | null
          observacao?: string | null
          profissao?: string | null
          rg?: string | null
          sexo?: Database["public"]["Enums"]["sexo_type"] | null
          telefone?: string | null
          updated_at?: string | null
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
      vendas: {
        Row: {
          arquiteto_id: string
          created_at: string | null
          data_venda: string
          empresa_id: string
          id: string
          observacao: string | null
          pontos_calculados: number
          updated_at: string | null
          valor_venda: number
        }
        Insert: {
          arquiteto_id: string
          created_at?: string | null
          data_venda?: string
          empresa_id: string
          id?: string
          observacao?: string | null
          pontos_calculados: number
          updated_at?: string | null
          valor_venda: number
        }
        Update: {
          arquiteto_id?: string
          created_at?: string | null
          data_venda?: string
          empresa_id?: string
          id?: string
          observacao?: string | null
          pontos_calculados?: number
          updated_at?: string | null
          valor_venda?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendas_arquiteto_id_fkey"
            columns: ["arquiteto_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_arquiteto_id_fkey"
            columns: ["arquiteto_id"]
            isOneToOne: false
            referencedRelation: "profissionais_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profissionais_publicos: {
        Row: {
          cidade: string | null
          estado: string | null
          id: string | null
          imagem_profissional: string | null
          nome: string | null
          nome_divulgacao: string | null
          profissao: string | null
        }
        Insert: {
          cidade?: string | null
          estado?: string | null
          id?: string | null
          imagem_profissional?: string | null
          nome?: string | null
          nome_divulgacao?: string | null
          profissao?: string | null
        }
        Update: {
          cidade?: string | null
          estado?: string | null
          id?: string | null
          imagem_profissional?: string | null
          nome?: string | null
          nome_divulgacao?: string | null
          profissao?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      arquiteto_tem_venda_com_empresa: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
      get_ranking_arquitetos: {
        Args: never
        Returns: {
          ano: number
          arquiteto_id: string
          mes: number
          nome: string
          total: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_empresa_owner: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "arquiteto" | "empresa" | "gestor"
      sexo_type: "masculino" | "feminino" | "outro" | "prefiro_nao_informar"
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
      app_role: ["arquiteto", "empresa", "gestor"],
      sexo_type: ["masculino", "feminino", "outro", "prefiro_nao_informar"],
    },
  },
} as const
