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
      external_costs: {
        Row: {
          categoria: string | null
          data_pagamento: string | null
          funcao: string | null
          id: string
          nf: boolean
          nome: string
          obs: string | null
          ordem: number
          project_id: string
          status: string
          valor: number
          valor_realizado: number | null
        }
        Insert: {
          categoria?: string | null
          data_pagamento?: string | null
          funcao?: string | null
          id?: string
          nf?: boolean
          nome?: string
          obs?: string | null
          ordem?: number
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
      projects: {
        Row: {
          blocos: Json
          cliente: string
          client_id: string | null
          comissao_pct: number
          condicao_pagamento: string | null
          created_at: string
          created_by: string | null
          data: string | null
          id: string
          impostos_pct: number
          numero_servico: string
          observacoes: string | null
          overhead_pct: number
          prazo: string | null
          projeto: string
          responsavel: string | null
          status: string | null
          tipo: string
          titulo: string | null
          updated_at: string
          validade_proposta: string | null
          valor_bruto: number
        }
        Insert: {
          blocos?: Json
          cliente: string
          client_id?: string | null
          comissao_pct?: number
          condicao_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data?: string | null
          id?: string
          impostos_pct?: number
          numero_servico: string
          observacoes?: string | null
          overhead_pct?: number
          prazo?: string | null
          projeto: string
          responsavel?: string | null
          status?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
          validade_proposta?: string | null
          valor_bruto?: number
        }
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
