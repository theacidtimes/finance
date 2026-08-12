/** Tipos de domínio — ACID Finance */

export type TipoProjeto = "Filme" | "KV" | "Social" | "Campanha" | "Outro";
export type StatusCustoExterno = "Orçado" | "Aprovado" | "Pago";

/**
 * Taxonomia única de entrega: classifica tanto a linha de custo externo do
 * projeto quanto o que cada Friend sabe fazer. Duas listas separadas fariam
 * "quem faz retoque?" não bater com o que foi lançado no projeto.
 * Só acrescente valores — os existentes já estão gravados em external_costs.
 */
export type CategoriaExterna =
  | "3D" | "AI Designer" | "ComfyUI" | "Motion" | "Motion AI" | "GP"
  | "Pós-produção" | "Finalização" | "Cor" | "Trilha" | "Locução" | "Áudio"
  | "Retoque" | "Ilustração" | "Direção de Arte" | "Edição"
  | "Produção" | "Coordenação" | "Atendimento"
  | "Programação" | "UX Design"
  | "Reserva Técnica" | "Outros";

/** Ordem canônica para selects e filtros — mesma lista, um lugar só. */
export const CATEGORIAS_EXTERNAS: CategoriaExterna[] = [
  "3D", "AI Designer", "ComfyUI", "Motion", "Motion AI", "GP",
  "Pós-produção", "Finalização", "Cor", "Trilha", "Locução", "Áudio",
  "Retoque", "Ilustração", "Direção de Arte", "Edição",
  "Produção", "Coordenação", "Atendimento",
  "Programação", "UX Design",
  "Reserva Técnica", "Outros",
];

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
  /** Vínculo com o cadastro Acid Friends; null = fornecedor avulso. */
  friendId?: string | null;
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

/* ================= ACID FRIENDS (fornecedores / parceiros) ================= */

export type TipoFriend = "Empresa" | "MEI" | "Freelancer PJ" | "Coletivo" | "Outro";

export type TipoConta = "Corrente" | "Poupança" | "Pagamento";

/**
 * Conta de recebimento. Sempre no CNPJ do Friend — a ACID não paga em CPF,
 * então não existe campo de titular pessoa física aqui de propósito.
 */
export interface ContaBancaria {
  bancoCodigo: string; // COMPE, 3 dígitos
  bancoNome: string;   // gravado junto: o nome no comprovante não pode depender da lista
  agencia: string;
  conta: string;
  tipoConta: TipoConta;
  pix: string;
}

/**
 * Retrato da Receita no momento da consulta do CNPJ.
 * `consultadoEm` não é enfeite: situação cadastral muda, e dado sem carimbo
 * de data passa por atual quando já não é.
 */
export interface DadosReceita {
  razaoSocial: string;
  nomeFantasia: string;
  situacao: string;      // ATIVA | BAIXADA | INAPTA | SUSPENSA | NULA
  dataAbertura: string;  // ISO
  cnaePrincipal: string;
  porte: string;
  municipio: string;
  uf: string;
  consultadoEm: string;  // ISO
}

export interface Friend {
  id: string;
  nome: string;        // como a ACID chama no dia a dia
  cnpj: string;        // só dígitos
  razaoSocial: string;
  tipo: TipoFriend;
  /** O que esse Friend entrega — mesma taxonomia dos custos externos. */
  categorias: CategoriaExterna[];
  ativo: boolean;

  contato: string;
  email: string;
  telefone: string;
  site: string;
  portfolio: string;
  observacoes: string;

  conta: ContaBancaria;
  receita: DadosReceita | null;
}

/** Friend com o que já passou por ele — derivado dos custos externos. */
export interface FriendResumo extends Friend {
  nProjetos: number;
  totalFaturado: number;
  ultimoProjeto: string; // ISO ou ""
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

/* ================= HISTÓRICO DE VERSÕES DO ORÇAMENTO ================= */

/**
 * Por que a versão foi criada.
 * - `pdf`         — proposta exportada; é o número que saiu para o cliente
 * - `status`      — projeto mudou de status (Aprovado, Declinado…)
 * - `manual`      — alguém clicou em "Salvar versão"
 * - `restauracao` — retrato do estado anterior, gravado antes de restaurar
 */
export type OrigemVersao = "pdf" | "status" | "manual" | "restauracao";

/** Linha do histórico — o resumo que a lista mostra, sem abrir o snapshot. */
export interface VersaoResumo {
  id: string;
  versao: number;
  criadoEm: string; // ISO
  autorEmail: string;
  origem: OrigemVersao;
  label: string;
  status: string;
  valorBruto: number;
  custosExternos: number;
  lucroOperacional: number;
  margemOperacional: number; // 0–1
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
