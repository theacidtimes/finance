import type { BlocosProposta } from "@/types";

/**
 * Catálogo de produtos ACID — padronização dos serviços já vendidos.
 *
 * Derivado da análise de 53 propostas (docs/catalogo-parte-A.md / -B.md).
 * Este arquivo NÃO contém lógica financeira: apenas monta o TEXTO/estrutura da
 * proposta (blocos). A escolha de um produto pré-preenche os blocos; tudo
 * permanece editável por projeto.
 *
 * Regra de negócio observada nos PDFs reais: a política de cancelamento é
 * redigida dentro do bloco "Observações" (ATTO nº24/25), por isso injetamos o
 * texto de cancelamento em `observacoes` em vez de criar um bloco novo.
 */

export type FamiliaProduto =
  | "video-ia" // Família A — peças em vídeo IA
  | "imagem-ia" // Família B — imagem/design IA
  | "copy" // Família C — copy/estático (sem cláusulas de IA)
  | "comercial" // Família D — direitos/licenciamento (sem produção)
  | "especial"; // Família E — modelos de precificação próprios

/** Estrutura da proposta que o produto gera. */
export type FormatoProposta = "completo" | "simplificado" | "custom";

/** Como o produto é precificado (não altera a DRE — só orienta a UI). */
export type ModeloPreco = "valor" | "diarias" | "dev" | "midia";

export interface ProdutoCatalogo {
  id: string;
  label: string;
  familia: FamiliaProduto;
  descricao: string;
  formatoProposta: FormatoProposta;
  /** true → aplica cláusula de IA + materiais de apoio nos blocos. */
  blocosIA: boolean;
  modeloPreco: ModeloPreco;
  /** Itens do bloco "O serviço inclui". */
  modulosPadrao: string[];
  /** Itens do bloco "Não está incluso". */
  exclusoesPadrao: string[];
  /** Texto-base do bloco "Especificação da entrega". */
  entregaTemplate: string;
  /**
   * Campos especiais que a Família E exige na UI (fora do molde de filme).
   * Documental — a tela usa isso p/ decidir quais inputs mostrar.
   */
  camposEspeciais?: string[];
}

/* ============================================================
 * TEXTOS-MESTRE (formato NOVO/EXPANDIDO — padrão atual 2026)
 * Transcritos verbatim das propostas canônicas (Accenture/ATTO/ANJL/Droga5).
 * Edite AQUI para atualizar a política em todos os produtos de uma vez.
 * ========================================================== */
export const TEXTOS_MESTRE = {
  clausulaIA: `As imagens entregues são criadas por plataformas de inteligência artificial que utilizam modelos generativos amplamente empregados na indústria criativa. Adotamos processos e ferramentas que seguem boas práticas de segurança e ética. Ainda assim, pela natureza desses modelos:
1. Não é possível garantir exclusividade absoluta ou ausência total de similaridades com indivíduos reais, conhecidos ou desconhecidos.
2. As peças não seguem lógica de pré-produção, produção e pós-produção tradicional, podendo haver limitações na execução de ajustes específicos.`,

  materiais: `Materiais de apoio e assets da marca: A contratante deverá fornecer todos os materiais de apoio fundamentais para a produção (trilha, fontes, cartelas, logotipos, lockups, imagens de produto) logo após aprovação do orçamento para o início da criação dos concepts e stills.`,

  /** Bloco "Alterações e refações" (rounds + escopo). {rounds} é substituído. */
  alteracoes: `- {rounds} rodada(s) de ajustes por etapa aprovada
- Alterações em elementos já aprovados serão consideradas retrabalho com orçamento à parte
- Os feedbacks devem respeitar o cronograma, pois as horas dos profissionais foram calculadas dentro da timeline do projeto
- Rounds extras mediante orçamento à parte
- Alterações de escopo ou roteiro após aprovação da proposta geram custos extras, orçados caso a caso`,

  /** Política de cancelamento — vai dentro de "Observações" (padrão ATTO). */
  cancelamento: `Caso o orçamento seja aprovado e, durante a produção, por qualquer motivo o projeto seja paralisado ou cancelado por parte do Cliente ou Agência, será cobrado 50% ou 100% do valor do trabalho — a ser negociado com a produtora — dependendo da fase em que estiver a produção.`,
} as const;

/** Módulos IA reutilizados nas famílias A e B. */
const MODULOS_VIDEO_IA = [
  "A.I Concepting e direção — direção criativa, desenho de cenas/cenários/frames com IA, retoque e refinamento",
  "Animação IA — fine tuning, texturização e upscaling de stills; geração e animação de cenas; refinamento de movimento e consistência visual",
  "Pós-produção e finalização — edição, trilha (stock/IA), motion graphics/compositing/cartelas, correção de cor, masterização e entregas finais",
];

const EXCLUSOES_IA = [
  "Arquivo aberto para edição",
  "Gravação e captação Live Action",
  "Trilhas compostas e sound effects",
  "Áudio produzido e locução humana",
  "Registro ANCINE",
];

/* ============================================================
 * PRODUTOS (14)
 * ========================================================== */
export const CATALOGO: ProdutoCatalogo[] = [
  // ---- Família A: vídeo IA ----
  {
    id: "filme",
    label: "Filme",
    familia: "video-ia",
    descricao: "Filme hero produzido em IA (single ou pacote de múltiplos filmes).",
    formatoProposta: "completo",
    blocosIA: true,
    modeloPreco: "valor",
    modulosPadrao: MODULOS_VIDEO_IA,
    exclusoesPadrao: EXCLUSOES_IA,
    entregaTemplate: `1 filme — secundagem 30" (+ reduções conforme cronograma)
Formatos: MP4 16:9 / 9:16 · Território: Nacional · Direitos de uso: 12 meses
Trilha: stock/IA`,
  },
  {
    id: "vinheta",
    label: "Vinheta",
    familia: "video-ia",
    descricao: "Peça curta / assinatura animada em IA e motion.",
    formatoProposta: "completo",
    blocosIA: true,
    modeloPreco: "valor",
    modulosPadrao: MODULOS_VIDEO_IA,
    exclusoesPadrao: EXCLUSOES_IA,
    entregaTemplate: `1 vinheta — secundagem 5"–15"
Formatos: MP4 16:9 / 9:16 · Território: Nacional · Direitos de uso: 12 meses`,
  },
  {
    id: "video-reel",
    label: "Video Reel",
    familia: "video-ia",
    descricao: "Peça vertical para redes sociais (reels/conteúdo IA).",
    formatoProposta: "completo",
    blocosIA: true,
    modeloPreco: "valor",
    modulosPadrao: MODULOS_VIDEO_IA,
    exclusoesPadrao: EXCLUSOES_IA,
    entregaTemplate: `1 reel — secundagem 15"–60"
Formatos: MP4 9:16 · Território: Nacional · Direitos de uso: 6 meses · Mídia: Digital / Instagram`,
  },
  {
    id: "video-ugc",
    label: "Vídeo UGC",
    familia: "video-ia",
    descricao: "Conteúdo estilo user-generated produzido em IA.",
    formatoProposta: "completo",
    blocosIA: true,
    modeloPreco: "valor",
    modulosPadrao: MODULOS_VIDEO_IA,
    exclusoesPadrao: EXCLUSOES_IA,
    entregaTemplate: `Peças UGC — secundagem curta (15"–30")
Formatos: MP4 9:16 · Território: Nacional · Direitos de uso: 6 meses · Mídia: Redes sociais`,
  },

  // ---- Família B: imagem/design IA ----
  {
    id: "key-visual",
    label: "Key Visual",
    familia: "imagem-ia",
    descricao: "KV animado e/ou estático (3D + IA).",
    formatoProposta: "completo",
    blocosIA: true,
    modeloPreco: "valor",
    modulosPadrao: [
      "A.I Concepting e direção — desenho de cenas/frames com IA, retoque e refinamento",
      "3D — modelagem, texturização com IA, animação e render (quando aplicável)",
      "Finalização — pós-produção e motion de cartelas; formatos estáticos e animados",
    ],
    exclusoesPadrao: [
      "Arquivo aberto para edição",
      "Gravação e captação Live Action",
      "Trilhas compostas e sound effects",
      "Registro ANCINE",
    ],
    entregaTemplate: `KV animados: 10" — 16:9 / 9:16 · KV estáticos: TIFF/PSD 1:1 300 DPI
Território: Nacional · Direitos de uso: 12 meses · Mídia: Digital, redes e OOH`,
  },
  {
    id: "brand-assets",
    label: "Brand Assets",
    familia: "imagem-ia",
    descricao: "Ícones, elementos e grafismos generativos de marca.",
    formatoProposta: "completo",
    blocosIA: true,
    modeloPreco: "valor",
    modulosPadrao: [
      "Direção visual e pesquisa",
      "Produção de assets com IA (ícones, elementos, grafismos)",
      "Retoque, refinamento e finalização em formatos digitais",
    ],
    exclusoesPadrao: [
      "Arquivo aberto para edição",
      "Trilhas compostas e sound effects",
      "Registro ANCINE",
    ],
    entregaTemplate: `Conjunto de assets de marca — formatos digitais (PNG/SVG/TIFF conforme uso)
Território: Nacional · Direitos de uso: 12 meses`,
  },
  {
    id: "banco-imagens",
    label: "Banco de imagens generativo",
    familia: "imagem-ia",
    descricao: "Direção e produção de banco de imagens (image bank) em IA.",
    formatoProposta: "completo",
    blocosIA: true,
    modeloPreco: "valor",
    modulosPadrao: [
      "Direção visual e pesquisa",
      "Produção de stills em IA (lote de imagens hero + variações)",
      "Retoque leve e finalização (150/300 DPI)",
    ],
    exclusoesPadrao: [
      "Arquivo aberto para edição",
      "Gravação e captação Live Action",
      "Registro ANCINE",
      "Fotografia em estúdio",
    ],
    entregaTemplate: `Lote de imagens — TIFF/PSD, 150/300 DPI
Território: Nacional · Direitos de uso: 12 meses`,
  },

  // ---- Família C: copy/estático (SEM blocos de IA) ----
  {
    id: "layouts",
    label: "Layouts",
    familia: "copy",
    descricao: "Layout e redação de anúncio / peça gráfica.",
    formatoProposta: "simplificado",
    blocosIA: false,
    modeloPreco: "valor",
    modulosPadrao: ["Criação de layout e redação para peça institucional/publicitária"],
    exclusoesPadrao: [],
    entregaTemplate: `1 layout — formato conforme peça (ex.: 210×280mm)
Formato de arquivo: PSD · Território: Nacional · Direitos: 3 meses
Obs.: finalização para os meios feita internamente pelo contratante`,
  },
  {
    id: "spots",
    label: "Spots",
    familia: "copy",
    descricao: "Roteiro de spot / texto-cabine de rádio.",
    formatoProposta: "simplificado",
    blocosIA: false,
    modeloPreco: "valor",
    modulosPadrao: ["Criação de roteiro para spot/texto-cabine"],
    exclusoesPadrao: [],
    entregaTemplate: `1 roteiro para spot — secundagem 30"
Território: Nacional · Direitos: 6 meses · Mídia: Rádio`,
  },
  {
    id: "anuncios",
    label: "Anúncios",
    familia: "copy",
    descricao: "Texto/criação para anúncio impresso ou digital.",
    formatoProposta: "simplificado",
    blocosIA: false,
    modeloPreco: "valor",
    modulosPadrao: ["Criação de texto para anúncio (impresso/digital)"],
    exclusoesPadrao: [],
    entregaTemplate: `1 anúncio — formato conforme veículo
Território: Nacional · Direitos: 3 meses · Mídia: Impresso / Digital`,
  },

  // ---- Família D: comercial/sem produção ----
  {
    id: "extensao-direitos",
    label: "Extensão de direitos e tempo",
    familia: "comercial",
    descricao: "Renovação de prazo/praça de peça já entregue (+ variante TV/ANCINE).",
    formatoProposta: "simplificado",
    blocosIA: false,
    modeloPreco: "valor",
    modulosPadrao: ["Extensão do prazo de veiculação / ampliação de praça"],
    exclusoesPadrao: [],
    entregaTemplate: `Extensão dos direitos de uso da peça — novo período/praça a definir
Variante "+TV": finalização para TV + registro ANCINE, emissão CRT e recolhimento CONDECINE`,
  },

  // ---- Família E: modelos próprios (campos especiais na UI) ----
  {
    id: "concept-sprint",
    label: "AI Concept Sprint",
    familia: "especial",
    descricao: "Pacote de diárias para gerar concepts visuais (vídeo ou imagem).",
    formatoProposta: "custom",
    blocosIA: true,
    modeloPreco: "diarias",
    modulosPadrao: [
      "Direção criativa e exploração de concepts em IA",
      "Geração de stills e/ou animações de referência",
      "Sessões de refinamento conforme diárias contratadas",
    ],
    exclusoesPadrao: [
      "Peça final finalizada (o sprint entrega concepts/exploração)",
      "Registro ANCINE",
    ],
    entregaTemplate: `Concepts visuais em IA — entregues por diária alocada
Modelo: 1 diária avulsa ou pacote mínimo de diárias atrelado a volume/horas`,
    camposEspeciais: ["nº de diárias", "valor por diária", "volume/horas mínimas"],
  },
  {
    id: "publicidade-acid",
    label: "Publicidade ACID",
    familia: "especial",
    descricao: "Posts em parceria com o perfil @acid (carrossel, reel, post).",
    formatoProposta: "custom",
    blocosIA: false,
    modeloPreco: "midia",
    modulosPadrao: [
      "Produção de conteúdo para o perfil @acid",
      "Publicação em parceria (carrossel / reel / post)",
    ],
    exclusoesPadrao: [],
    entregaTemplate: `Entregáveis de mídia no perfil @acid — definir formato e volume:
carrossel, reel e/ou post estático (quantidade a combinar)`,
    camposEspeciais: ["tipo de post (carrossel/reel/post)", "quantidade"],
  },
  {
    id: "ai-mini-app",
    label: "AI mini-app",
    familia: "especial",
    descricao: "App/ferramenta de IA sob medida (escopo de desenvolvimento definido).",
    formatoProposta: "custom",
    blocosIA: false,
    modeloPreco: "dev",
    modulosPadrao: [
      "Definição de escopo e funcionalidades",
      "Desenvolvimento do mini-app de IA",
      "Testes, ajustes e entrega",
    ],
    exclusoesPadrao: [
      "Manutenção evolutiva após a entrega (contratada à parte)",
      "Custos recorrentes de infraestrutura/APIs de terceiros",
    ],
    entregaTemplate: `Mini-app de IA — escopo e funcionalidades definidos na proposta
Entrega: aplicação funcional conforme escopo · prazo de desenvolvimento a definir`,
    camposEspeciais: ["escopo/funcionalidades", "prazo de dev"],
  },
];

export const CATALOGO_POR_ID: Record<string, ProdutoCatalogo> = Object.fromEntries(
  CATALOGO.map((p) => [p.id, p])
);

/** Um item da proposta: produto do catálogo + quantidade. */
export interface ItemProposta {
  produtoId: string;
  quantidade?: number; // default 1
}

const BLOCOS_VAZIOS: BlocosProposta = {
  servicoInclui: "",
  entrega: "",
  exclusoes: "",
  alteracoes: "",
  observacoes: "",
  clausulaIA: "",
  materiais: "",
};

/**
 * Monta os blocos da proposta a partir de UM OU VÁRIOS produtos do catálogo
 * (ex.: "Filme + Video Reel"). Não toca em nada financeiro — só devolve textos.
 *
 * Regras de mesclagem:
 * - "O serviço inclui" e "Especificação da entrega" → agrupados por produto;
 * - "Não está incluso" → união sem duplicatas;
 * - blocos legais (alterações, cancelamento, cláusula IA, materiais) → uma vez só;
 * - cláusula de IA / materiais entram se QUALQUER item for produto de IA.
 *
 * @param rounds nº de rodadas de ajuste por etapa (default 1)
 */
export function blocosParaProdutos(itens: ItemProposta[], rounds = 1): BlocosProposta {
  const produtos = itens
    .map((it) => ({ p: CATALOGO_POR_ID[it.produtoId], qtd: it.quantidade ?? 1 }))
    .filter((x): x is { p: ProdutoCatalogo; qtd: number } => Boolean(x.p));

  if (!produtos.length) return { ...BLOCOS_VAZIOS };

  const multi = produtos.length > 1;
  const qtdLabel = (qtd: number) => (qtd > 1 ? ` (${qtd}x)` : "");

  // "O serviço inclui" — agrupado por produto quando há mais de um
  const servicoInclui = produtos
    .map(({ p, qtd }) => {
      const modulos = p.modulosPadrao.map((m, i) => `${i + 1}. ${m}`).join("\n\n");
      return multi ? `${p.label.toUpperCase()}${qtdLabel(qtd)}\n${modulos}` : modulos;
    })
    .join("\n\n\n");

  // "Especificação da entrega" — uma linha/bloco por produto
  const entrega = produtos
    .map(({ p, qtd }) => (multi ? `${p.label}${qtdLabel(qtd)}:\n${p.entregaTemplate}` : p.entregaTemplate))
    .join("\n\n");

  // "Não está incluso" — união preservando ordem, sem duplicatas
  const exclSet = new Set<string>();
  produtos.forEach(({ p }) => p.exclusoesPadrao.forEach((e) => exclSet.add(e)));
  const exclusoes = exclSet.size ? [...exclSet].map((x) => `- ${x}`).join("\n") : "";

  // blocos legais — uma vez só; dependem de haver algum produto "completo"/IA
  const algumCompleto = produtos.some(({ p }) => p.formatoProposta !== "simplificado");
  const algumIA = produtos.some(({ p }) => p.blocosIA);

  return {
    servicoInclui,
    entrega,
    exclusoes,
    alteracoes: algumCompleto ? TEXTOS_MESTRE.alteracoes.replace("{rounds}", String(rounds)) : "",
    observacoes: algumCompleto ? TEXTOS_MESTRE.cancelamento : "",
    clausulaIA: algumIA ? TEXTOS_MESTRE.clausulaIA : "",
    materiais: algumIA ? TEXTOS_MESTRE.materiais : "",
  };
}

/** Conveniência: monta os blocos de um único produto. */
export function blocosParaProduto(produtoId: string, rounds = 1): BlocosProposta {
  return blocosParaProdutos([{ produtoId }], rounds);
}
