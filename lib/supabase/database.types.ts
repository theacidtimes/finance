export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      briefings: {
        Row: {
          arquivo_path: string | null
          cliente_nome: string | null
          created_at: string
          created_by: string | null
          dados: Json
          id: string
          project_id: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          arquivo_path?: string | null
          cliente_nome?: string | null
          created_at?: string
          created_by?: string | null
          dados?: Json
          id?: string
          project_id?: string | null
          status?: string
          token: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["briefings"]["Insert"]>
        Relationships: []
      }
      external_costs: {
        Row: {
          categoria: string | null
          data_pagamento: string | null
          friend_id: string | null
          funcao: string | null
          id: string
          nf: boolean
          nome: string
          obs: string | null
          ordem: number
          pedido_id: string | null
          project_id: string
          status: string
          valor: number
          valor_realizado: number | null
        }
        Insert: {
          categoria?: string | null
          data_pagamento?: string | null
          friend_id?: string | null
          funcao?: string | null
          id?: string
          nf?: boolean
          nome?: string
          obs?: string | null
          ordem?: number
          pedido_id?: string | null
          project_id: string
          status?: string
          valor?: number
          valor_realizado?: number | null
        }
        Update: Partial<Database["public"]["Tables"]["external_costs"]["Insert"]>
        Relationships: []
      }
      internal_staff: {
        Row: {
          base_horas: number
          funcao: string | null
          horas_projeto: number
          horas_realizadas: number | null
          id: string
          nome: string
          ordem: number
          project_id: string
          salario: number
          team_member_id: string | null
        }
        Insert: {
          base_horas?: number
          funcao?: string | null
          horas_projeto?: number
          horas_realizadas?: number | null
          id?: string
          nome?: string
          ordem?: number
          project_id: string
          salario?: number
          team_member_id?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["internal_staff"]["Insert"]>
        Relationships: []
      }
      milestones: {
        Row: {
          data_label: string
          id: string
          marco: string
          ordem: number
          project_id: string
        }
        Insert: {
          data_label?: string
          id?: string
          marco?: string
          ordem?: number
          project_id: string
        }
        Update: Partial<Database["public"]["Tables"]["milestones"]["Insert"]>
        Relationships: []
      }
      friends: {
        Row: {
          agencia: string
          ativo: boolean
          banco_codigo: string
          banco_nome: string
          categorias: Json
          cnpj: string
          conta: string
          contato: string
          created_at: string
          created_by: string | null
          email: string
          id: string
          nome: string
          observacoes: string
          pix: string
          portfolio: string
          razao_social: string
          receita: Json | null
          site: string
          telefone: string
          tipo: string
          tipo_conta: string
          updated_at: string
        }
        Insert: {
          agencia?: string
          ativo?: boolean
          banco_codigo?: string
          banco_nome?: string
          categorias?: Json
          cnpj?: string
          conta?: string
          contato?: string
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          nome?: string
          observacoes?: string
          pix?: string
          portfolio?: string
          razao_social?: string
          receita?: Json | null
          site?: string
          telefone?: string
          tipo?: string
          tipo_conta?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["friends"]["Insert"]>
        Relationships: []
      }
      team_members: {
        Row: {
          anexos: Json
          ativo: boolean
          base_horas_mes: number
          beneficios_mensais: number
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          data_admissao: string | null
          email: string | null
          encargos: Json
          endereco: string | null
          funcao: string | null
          id: string
          nome: string
          observacoes: string | null
          pix: string | null
          razao_social: string | null
          salario_mensal: number
          telefone: string | null
          tipo_contrato: string
          updated_at: string
        }
        Insert: {
          anexos?: Json
          ativo?: boolean
          base_horas_mes?: number
          beneficios_mensais?: number
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          email?: string | null
          encargos?: Json
          endereco?: string | null
          funcao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          pix?: string | null
          razao_social?: string | null
          salario_mensal?: number
          telefone?: string | null
          tipo_contrato?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>
        Relationships: []
      }
      clients: {
        Row: {
          contato: string
          created_at: string
          created_by: string | null
          email: string
          id: string
          nome: string
          observacoes: string
          telefone: string
          updated_at: string
        }
        Insert: {
          contato?: string
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          nome: string
          observacoes?: string
          telefone?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nome: string
          permissions: Json
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          nome?: string
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
        Relationships: []
      }
      projects: {
        Row: {
          blocos: Json
          cambio: number
          cambio_data: string
          cliente: string
          client_id: string | null
          contato: string | null
          comissao_pct: number
          condicao_pagamento: string | null
          created_at: string
          created_by: string | null
          custo_cambio_pct: number
          data: string | null
          id: string
          idioma_proposta: string
          impostos_pct: number
          moeda: string
          marca: string | null
          numero_servico: string
          observacoes: string | null
          overhead_pct: number
          prazo: string | null
          projeto: string
          responsavel: string | null
          roteiro_url: string | null
          roteiro_label: string | null
          sem_clausula_ia: boolean
          status: string | null
          tipo: string
          titulo: string | null
          updated_at: string
          validade_proposta: string | null
          valor_bruto: number
          valor_moeda: number
        }
        Insert: {
          blocos?: Json
          cambio?: number
          cambio_data?: string
          cliente: string
          client_id?: string | null
          contato?: string | null
          comissao_pct?: number
          condicao_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          custo_cambio_pct?: number
          data?: string | null
          id?: string
          idioma_proposta?: string
          impostos_pct?: number
          moeda?: string
          marca?: string | null
          numero_servico: string
          observacoes?: string | null
          overhead_pct?: number
          prazo?: string | null
          projeto: string
          responsavel?: string | null
          roteiro_url?: string | null
          roteiro_label?: string | null
          sem_clausula_ia?: boolean
          status?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
          validade_proposta?: string | null
          valor_bruto?: number
          valor_moeda?: number
        }
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>
        Relationships: []
      }
      proposal_options: {
        Row: {
          escolhida: boolean
          id: string
          label: string
          ordem: number
          project_id: string
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          escolhida?: boolean
          id?: string
          label?: string
          ordem?: number
          project_id: string
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Update: Partial<Database["public"]["Tables"]["proposal_options"]["Insert"]>
        Relationships: []
      }
      project_versions: {
        Row: {
          autor_email: string
          created_at: string
          created_by: string | null
          custos_externos: number
          id: string
          label: string
          lucro_operacional: number
          margem_operacional: number
          origem: string
          project_id: string
          snapshot: Json
          status: string
          valor_bruto: number
          versao: number
        }
        Insert: {
          autor_email?: string
          created_at?: string
          created_by?: string | null
          custos_externos?: number
          id?: string
          label?: string
          lucro_operacional?: number
          margem_operacional?: number
          origem?: string
          project_id: string
          snapshot: Json
          status?: string
          valor_bruto?: number
          versao: number
        }
        Update: Partial<Database["public"]["Tables"]["project_versions"]["Insert"]>
        Relationships: []
      }
      supplier_quotes: {
        Row: {
          created_at: string
          created_by: string | null
          dados: Json
          enviado_em: string | null
          friend_id: string | null
          id: string
          numero: number
          project_id: string
          respondido_em: string | null
          status: string
          updated_at: string
          valor_cotado: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dados?: Json
          enviado_em?: string | null
          friend_id?: string | null
          id?: string
          numero?: number
          project_id: string
          respondido_em?: string | null
          status?: string
          updated_at?: string
          valor_cotado?: number
        }
        Update: Partial<Database["public"]["Tables"]["supplier_quotes"]["Insert"]>
        Relationships: []
      }
      friend_invites: {
        Row: {
          created_at: string
          created_by: string | null
          dados: Json | null
          expira_em: string
          friend_id: string | null
          id: string
          nome: string
          receita: Json | null
          recebido_em: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dados?: Json | null
          expira_em?: string
          friend_id?: string | null
          id?: string
          nome?: string
          receita?: Json | null
          recebido_em?: string | null
          status?: string
          token: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["friend_invites"]["Insert"]>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
