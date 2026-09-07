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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      bloqueios_empresa: {
        Row: {
          acao: string
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          justificativa: string
          origem: string
        }
        Insert: {
          acao: string
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          justificativa: string
          origem?: string
        }
        Update: {
          acao?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          justificativa?: string
          origem?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloqueios_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      caixas_mensais: {
        Row: {
          created_at: string
          fechado_em: string | null
          fechado_por: string | null
          id: string
          mes: string
          observacao: string | null
          status: string
          total_faturado: number
          total_inadimplencia: number
          total_pago: number
          total_recebido: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          mes: string
          observacao?: string | null
          status?: string
          total_faturado?: number
          total_inadimplencia?: number
          total_pago?: number
          total_recebido?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          mes?: string
          observacao?: string | null
          status?: string
          total_faturado?: number
          total_inadimplencia?: number
          total_pago?: number
          total_recebido?: number
          updated_at?: string
        }
        Relationships: []
      }
      cobrancas_extras: {
        Row: {
          ativa: boolean
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          mes_inicial: string
          meses: number
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          mes_inicial: string
          meses?: number
          updated_at?: string
          valor_mensal?: number
        }
        Update: {
          ativa?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          mes_inicial?: string
          meses?: number
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      cobrancas_extras_empresas: {
        Row: {
          cobranca_id: string
          created_at: string
          empresa_id: string
          id: string
          valor_mensal: number | null
        }
        Insert: {
          cobranca_id: string
          created_at?: string
          empresa_id: string
          id?: string
          valor_mensal?: number | null
        }
        Update: {
          cobranca_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_extras_empresas_cobranca_id_fkey"
            columns: ["cobranca_id"]
            isOneToOne: false
            referencedRelation: "cobrancas_extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_extras_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_financeiras: {
        Row: {
          campanha_fim: string
          campanha_inicio: string
          created_at: string
          dia_vencimento: number
          id: string
          percentual_mensal: number
          salario_minimo: number
          updated_at: string
          valor_ponto: number
          vencimento_saldo: string
        }
        Insert: {
          campanha_fim?: string
          campanha_inicio?: string
          created_at?: string
          dia_vencimento?: number
          id?: string
          percentual_mensal?: number
          salario_minimo?: number
          updated_at?: string
          valor_ponto?: number
          vencimento_saldo?: string
        }
        Update: {
          campanha_fim?: string
          campanha_inicio?: string
          created_at?: string
          dia_vencimento?: number
          id?: string
          percentual_mensal?: number
          salario_minimo?: number
          updated_at?: string
          valor_ponto?: number
          vencimento_saldo?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          ativa: boolean | null
          bloqueada: boolean
          cidade: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          motivo_bloqueio: string | null
          nome: string
          telefone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativa?: boolean | null
          bloqueada?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          motivo_bloqueio?: string | null
          nome: string
          telefone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativa?: boolean | null
          bloqueada?: boolean
          cidade?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          motivo_bloqueio?: string | null
          nome?: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fatura_itens: {
        Row: {
          cobranca_extra_id: string | null
          created_at: string
          descricao: string
          fatura_id: string
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          cobranca_extra_id?: string | null
          created_at?: string
          descricao: string
          fatura_id: string
          id?: string
          tipo: string
          valor?: number
        }
        Update: {
          cobranca_extra_id?: string | null
          created_at?: string
          descricao?: string
          fatura_id?: string
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fatura_itens_cobranca_extra_id_fkey"
            columns: ["cobranca_extra_id"]
            isOneToOne: false
            referencedRelation: "cobrancas_extras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fatura_itens_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          created_at: string
          custo_pontos_total: number
          empresa_id: string
          id: string
          mes: string
          observacao: string | null
          pago_em: string | null
          pontos: number
          status: string
          updated_at: string
          valor_extras: number
          valor_mensalidade: number
          valor_pago: number
          valor_pontos_mes: number
          valor_total: number
          vencimento: string
        }
        Insert: {
          created_at?: string
          custo_pontos_total?: number
          empresa_id: string
          id?: string
          mes: string
          observacao?: string | null
          pago_em?: string | null
          pontos?: number
          status?: string
          updated_at?: string
          valor_extras?: number
          valor_mensalidade?: number
          valor_pago?: number
          valor_pontos_mes?: number
          valor_total?: number
          vencimento: string
        }
        Update: {
          created_at?: string
          custo_pontos_total?: number
          empresa_id?: string
          id?: string
          mes?: string
          observacao?: string | null
          pago_em?: string | null
          pontos?: number
          status?: string
          updated_at?: string
          valor_extras?: number
          valor_mensalidade?: number
          valor_pago?: number
          valor_pontos_mes?: number
          valor_total?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "faturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_financeiras: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          data: string
          descricao: string
          empresa_id: string | null
          fatura_id: string | null
          id: string
          mes: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descricao: string
          empresa_id?: string | null
          fatura_id?: string | null
          id?: string
          mes: string
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string
          empresa_id?: string | null
          fatura_id?: string | null
          id?: string
          mes?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_financeiras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_financeiras_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
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
      premiacoes_snapshot: {
        Row: {
          arquiteto_id: string
          categoria_premio: number
          created_at: string
          custo: number
          empresa_id: string
          id: string
          pontos: number
          vendas: number
        }
        Insert: {
          arquiteto_id: string
          categoria_premio?: number
          created_at?: string
          custo?: number
          empresa_id: string
          id?: string
          pontos?: number
          vendas?: number
        }
        Update: {
          arquiteto_id?: string
          categoria_premio?: number
          created_at?: string
          custo?: number
          empresa_id?: string
          id?: string
          pontos?: number
          vendas?: number
        }
        Relationships: [
          {
            foreignKeyName: "premiacoes_snapshot_arquiteto_id_fkey"
            columns: ["arquiteto_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premiacoes_snapshot_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
      saldo_campanha: {
        Row: {
          ano: number
          created_at: string
          empresa_id: string
          id: string
          quitado: boolean
          updated_at: string
          valor_acumulado: number
          valor_pago: number
          vencimento: string | null
        }
        Insert: {
          ano: number
          created_at?: string
          empresa_id: string
          id?: string
          quitado?: boolean
          updated_at?: string
          valor_acumulado?: number
          valor_pago?: number
          vencimento?: string | null
        }
        Update: {
          ano?: number
          created_at?: string
          empresa_id?: string
          id?: string
          quitado?: boolean
          updated_at?: string
          valor_acumulado?: number
          valor_pago?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saldo_campanha_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
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
      [_ in never]: never
    }
    Functions: {
      arquiteto_tem_venda_com_empresa: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
      definir_bloqueio_empresa: {
        Args: {
          _bloquear: boolean
          _empresa_id: string
          _justificativa: string
        }
        Returns: undefined
      }
      empresa_esta_bloqueada: {
        Args: { _empresa_id: string }
        Returns: boolean
      }
      fechar_caixa: { Args: { _mes: string }; Returns: Json }
      gerar_faturas_mes: { Args: { _mes: string }; Returns: Json }
      get_admin_overview: { Args: never; Returns: Json }
      get_profissionais_publicos: {
        Args: never
        Returns: {
          cidade: string
          estado: string
          id: string
          imagem_profissional: string
          nome: string
          nome_divulgacao: string
          profissao: string
        }[]
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
      get_relatorio_financeiro_empresa: {
        Args: { _empresa_id: string; _mes: string }
        Returns: Json
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
      is_financeiro: { Args: { _user_id: string }; Returns: boolean }
      marcar_faturas_vencidas: { Args: never; Returns: Json }
      reabrir_caixa: { Args: { _mes: string }; Returns: undefined }
    }
    Enums: {
      app_role: "arquiteto" | "empresa" | "gestor" | "financeiro"
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
      app_role: ["arquiteto", "empresa", "gestor", "financeiro"],
      sexo_type: ["masculino", "feminino", "outro", "prefiro_nao_informar"],
    },
  },
} as const
