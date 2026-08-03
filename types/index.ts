/** Tipos de domínio — ACID Finance */

export type TipoProjeto = "Filme" | "KV" | "Social" | "Campanha" | "Outro";
export type StatusCustoExterno = "Orçado" | "Aprovado" | "Pago";

export type CategoriaExterna =
  | "3D" | "AI Designer" | "Motion" | "Motion AI" | "GP"
  | "Pós-produção" | "Finalização" | "Cor" | "Trilha" | "Locução"
  | "Retoque" | "Produção" | "Coordenação" | "Reserva Técnica" | "Outros";

export interface Projeto {
  id?: string;
  /** Quem contrata e paga a ACID — muitas vezes uma agência. */
  cliente: string;
  clienteId?: string | null; // FK para a entidade Cliente (agrupamento)
  /** Marca / cliente final. Vazio quando o cliente já é a própria marca. */
  marca?: string;
  /** Pessoa que pediu o orçamento. Vai fixa no cabeçalho da proposta. */
  contato?: string;
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
  roteiroUrl?: string;   // link do roteiro aprovado (Google Docs/Slides/Drive) — "lock" do escopo
  roteiroLabel?: string; // rótulo do link (ex.: "Roteiro v3 — aprovado 20/07")
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
  salario: number;      // custo mensal (carregado, quando vindo do cadastro de time)
  baseHoras: number;    // base mensal de horas
  horasProjeto: number; // horas previstas no projeto
  teamMemberId?: string | null; // vínculo com o cadastro global; null = avulso
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

/* ================= TIME / FUNCIONÁRIOS ACID (global) ================= */

export type TipoContrato = "CLT" | "PJ" | "Estágio" | "Sócio" | "Freelancer" | "Outro";

/** Linha de encargo/provisão sobre o salário base (percentual editável). */
export interface Encargo {
  label: string; // ex.: "13º salário", "INSS patronal", "FGTS"
  pct: number;   // % sobre o salário base
}

/** Anexo (contrato/documento) — metadados; arquivo fica no Storage. */
export interface TeamAnexo {
  nome: string;     // nome original do arquivo
  path: string;     // caminho no bucket team-files
  size: number;     // bytes
  tipo: string;     // mime type
  criadoEm: string; // ISO
}

export interface TeamMember {
  id: string;
  nome: string;
  funcao: string;
  tipoContrato: TipoContrato;
  ativo: boolean;

  // custo carregado
  salarioMensal: number;      // base CLT / pró-labore / valor PJ
  baseHorasMes: number;       // base mensal de horas (padrão 160)
  encargos: Encargo[];        // provisões editáveis (13º, INSS, FGTS…)
  beneficiosMensais: number;  // VR/VT/saúde fixos R$/mês

  // ficha cadastral
  cpfCnpj: string;
  razaoSocial: string; // p/ PJ
  email: string;
  telefone: string;
  pix: string;
  endereco: string;
  dataAdmissao: string; // ISO ou ""
  observacoes: string;

  anexos: TeamAnexo[];
}

/** Cliente — entidade de agrupamento de projetos/orçamentos */
export interface Cliente {
  id: string;
  nome: string;
  contato: string;
  email: string;
  telefone: string;
  observacoes: string;
}

/** Cliente com métricas agregadas dos seus projetos (para os bentos da home) */
export interface ClienteResumo extends Cliente {
  nProjetos: number;
  totalBruto: number;
  ultimaAtualizacao: string; // ISO ou ""
}

/** Papéis de acesso do sistema */
export type Role = "master" | "gestor";

/** Chaves de permissão configuráveis por perfil (master sempre tem todas) */
export type PermissionKey = "criar_clientes" | "gerar_orcamento";

export type Permissions = Partial<Record<PermissionKey, boolean>>;

/** Perfil de usuário (1:1 com o auth.user do Supabase) */
export interface Perfil {
  id: string;
  email: string;
  nome: string;
  role: Role;
  permissions: Permissions;
}

/** Rótulos das permissões para a UI de administração */
export const PERMISSOES: { key: PermissionKey; label: string; desc: string }[] = [
  { key: "criar_clientes", label: "Adicionar clientes", desc: "Pode criar novos clientes" },
  { key: "gerar_orcamento", label: "Gerar orçamento", desc: "Pode exportar a proposta em PDF" },
];

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
