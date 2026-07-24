/** Tipos de domínio — ACID Finance */

export type TipoProjeto = "Filme" | "KV" | "Social" | "Campanha" | "Outro";
export type StatusCustoExterno = "Orçado" | "Aprovado" | "Pago";

export type CategoriaExterna =
  | "3D" | "AI Designer" | "Motion" | "Motion AI" | "GP"
  | "Pós-produção" | "Finalização" | "Cor" | "Trilha" | "Locução"
  | "Retoque" | "Produção" | "Coordenação" | "Reserva Técnica" | "Outros";

export interface Projeto {
  id?: string;
  cliente: string;
  projeto: string;
  numeroServico: string;
  tipo: TipoProjeto;
  responsavel: string;
  data: string; // ISO
  status: string;
  valorBruto: number;
  impostosPct: number;   // padrão 11
  comissaoPct: number;   // padrão 3
  overheadPct: number;   // padrão 50
  prazo: string;
  condicaoPagamento: string;
  validadeProposta: string;
  observacoes: string;
  titulo: string; // título comercial da proposta
}

export interface CustoExterno {
  id: string | number;
  nome: string;
  funcao: string;
  categoria: CategoriaExterna;
  valor: number;
  status: StatusCustoExterno;
  nf: boolean;
  dataPagamento: string;
  obs: string;
}

export interface StaffInterno {
  id: string | number;
  nome: string;
  funcao: string;
  salario: number;      // custo mensal
  baseHoras: number;    // base mensal de horas
  horasProjeto: number; // horas previstas no projeto
}

export interface StaffInternoCalc extends StaffInterno {
  custoHora: number;    // salario / baseHoras
  custoProjeto: number; // custoHora * horasProjeto
}

export interface MarcoCronograma {
  data: string;
  marco: string;
}

/** Blocos de texto editáveis da proposta comercial */
export interface BlocosProposta {
  servicoInclui: string;
  entrega: string;
  exclusoes: string;
  alteracoes: string;
  observacoes: string;
  clausulaIA: string;
  materiais: string;
}

export interface DREResultado {
  receitaBruta: number;
  impostos: number;
  receitaLiquida: number;
  comissao: number;
  receitaOperacional: number;
  internosCalc: StaffInternoCalc[];
  custosExternos: number;
  staffInterno: number;
  overhead: number;
  custoTotal: number;
  lucroOperacional: number;
  margemBruta: number;        // sobre receita bruta (0–1)
  margemOperacional: number;  // sobre receita operacional (0–1)
  pctProducaoExterna: number; // externos / receita bruta
  retidoACID: number;         // staff + overhead + lucro
  pctRetido: number;
}

/** Formato do arquivo JSON de projeto (compatível com o protótipo) */
export interface ProjetoArquivo {
  app: "acid-finance";
  versao: 1;
  salvoEm: string;
  proj: Projeto;
  externos: CustoExterno[];
  internos: StaffInterno[];
  cronograma: MarcoCronograma[];
  blocos: BlocosProposta;
}
