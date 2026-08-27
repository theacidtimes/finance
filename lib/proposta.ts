import type {
  Projeto,
  BlocosProposta,
  MarcoCronograma,
  IdiomaProposta,
  TipoProjeto,
} from "@/types";
import { idiomaDe, moedaDe, nomeMoeda, propostaInternacional } from "@/lib/moeda";

/**
 * Cabeçalho da proposta comercial — fonte única para a tela e para o PDF.
 *
 * Os dois renderizadores (components/screens/Orcamento.tsx e lib/pdf/proposta.tsx)
 * precisam mostrar exatamente a mesma coisa: o que o cliente vê na tela é o que
 * ele recebe em PDF. Manter duas listas paralelas garantia divergência, então a
 * ordem e as regras de omissão moram aqui.
 *
 * Regras:
 *  - `Marca` só aparece quando existe e é diferente do cliente. Repetir o mesmo
 *    nome em dois rótulos ("Cliente: Vivo / Marca: Vivo") só polui.
 *  - `Contato` só aparece quando preenchido — cabeçalho com rótulo vazio passa
 *    impressão de descuido justamente no documento que deveria dar segurança.
 */
export interface MetaProposta {
  rotulo: string;
  valor: string;
}

/**
 * Rótulos do cabeçalho, por idioma.
 *
 * O idioma é do DOCUMENTO, não do sistema: a tela de cadastro, o DRE e o
 * dashboard continuam em português para quem trabalha aqui. Só a proposta —
 * o que sai para o cliente — troca de língua.
 */
const META_ROTULOS: Record<IdiomaProposta, Record<string, string>> = {
  pt: {
    data: "Data",
    cliente: "Cliente",
    marca: "Marca",
    contato: "Contato",
    projeto: "Projeto",
    validade: "Validade",
  },
  en: {
    data: "Date",
    cliente: "Client",
    marca: "Brand",
    contato: "Contact",
    projeto: "Project",
    validade: "Valid for",
  },
};

export function metaProposta(proj: Projeto): MetaProposta[] {
  const R = META_ROTULOS[idiomaDe(proj)];
  const itens: MetaProposta[] = [
    { rotulo: R.data, valor: proj.data },
    { rotulo: R.cliente, valor: proj.cliente },
  ];

  const marca = proj.marca?.trim();
  if (marca && marca.toLowerCase() !== proj.cliente.trim().toLowerCase()) {
    itens.push({ rotulo: R.marca, valor: marca });
  }

  const contato = proj.contato?.trim();
  if (contato) itens.push({ rotulo: R.contato, valor: contato });

  // Sem nº de serviço, o parêntese fica vazio ("Nike Football ()") — mesma
  // regra de Marca e Contato: rótulo sem conteúdo não entra no cabeçalho.
  const numero = proj.numeroServico?.trim();
  itens.push(
    {
      rotulo: R.projeto,
      valor: numero ? `${proj.projeto} (${numero})` : proj.projeto,
    },
    { rotulo: R.validade, valor: proj.validadeProposta }
  );

  return itens;
}

/**
 * Para quem o trabalho é feito, na prática: a marca quando existe, senão o
 * cliente. Quem contrata é a agência; quem aparece no filme é a marca.
 * Entra no corpo da proposta via `linhaProjeto`.
 */
export function destinatario(proj: Projeto): string {
  return proj.marca?.trim() || proj.cliente;
}

/** Sem acento, minúsculo — para comparar nomes sem tropeçar em grafia. */
const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** `nome` já aparece em `texto` como palavra inteira? */
function contemNome(texto: string, nome: string): boolean {
  const n = normal(nome);
  if (!n) return false;
  const escapado = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escapado}([^a-z0-9]|$)`).test(normal(texto));
}

/**
 * A frase de abertura do bloco "Projeto".
 *
 * Era `${projeto} — ${tipo} para ${destinatário}`, montada direto no JSX, e
 * produzia coisas como "Wellhub - Check-in do Bem — Outro para Wellhub":
 *  - "Outro" é a opção de escape do cadastro, não um tipo de peça. Não é algo
 *    que se escreva para o cliente ler.
 *  - o nome do projeto já começava com "Wellhub", então o "para Wellhub"
 *    repetia — e o cabeçalho já traz cliente e marca logo acima.
 *
 * Então cada parte só entra quando acrescenta informação.
 */
/**
 * Tipo de peça em inglês. "Outro" não entra em nenhum idioma — é a opção de
 * escape do cadastro, não um tipo que se escreva para o cliente ler.
 */
const TIPO_EN: Record<TipoProjeto, string> = {
  Filme: "Film",
  KV: "Key visual",
  Social: "Social",
  Campanha: "Campaign",
  Outro: "",
};

export function linhaProjeto(proj: Projeto): string {
  const idioma = idiomaDe(proj);
  const nome = (proj.projeto || "").trim().replace(/[.\s]+$/, "");
  const bruto = proj.tipo && proj.tipo !== "Outro" ? proj.tipo : "";
  const tipo = bruto ? (idioma === "en" ? TIPO_EN[bruto] : bruto) : "";
  const para = destinatario(proj).trim();
  // Repetir o nome que já está no título do projeto não informa nada.
  const alvo = para && !contemNome(nome, para) ? para : "";

  if (idioma === "en") {
    if (!nome) return alvo ? `Project for ${alvo}.` : "Project.";
    if (tipo && alvo) return `${nome} — ${tipo} for ${alvo}.`;
    if (tipo) return `${nome} — ${tipo}.`;
    if (alvo) return `${nome} for ${alvo}.`;
    return `${nome}.`;
  }

  if (!nome) return alvo ? `Projeto para ${alvo}.` : "Projeto.";
  if (tipo && alvo) return `${nome} — ${tipo} para ${alvo}.`;
  if (tipo) return `${nome} — ${tipo}.`;
  if (alvo) return `${nome} para ${alvo}.`;
  return `${nome}.`;
}

/* ============================================================
 * Ficha — "Rótulo: valor", um campo por linha
 * ========================================================== */

/**
 * Uma linha da "Especificação da entrega".
 *
 * `rotulo` vazio = linha livre (prosa, bullet, URL, ou linha em branco usada
 * como separador entre produtos). O texto inteiro fica em `valor`.
 */
export interface LinhaFicha {
  rotulo: string;
  valor: string;
}

// Um rótulo tem no máximo 32 caracteres e não contém ":". O limite baixo é o
// que separa "Duração: 30s" (campo) de uma frase que por acaso tem dois-pontos.
// Aceita 1 caractere para não quebrar a digitação do primeiro caractere no
// editor — com {2,} a linha "D: valor" viraria texto livre no meio do que se
// está escrevendo.
const RE_FICHA = /^\s*([^:]{1,32}):\s?(.*)$/;

/**
 * Quebra a ficha em linhas estruturadas.
 *
 * Este é o único parser: a tela, o editor e o PDF usam todos este. Havia duas
 * cópias do mesmo regex em arquivos diferentes — bastava alguém ajustar uma
 * para o cliente receber um PDF diferente do que foi revisado na tela.
 */
export function parseFicha(texto: string): LinhaFicha[] {
  return (texto ?? "").split("\n").map((linha) => {
    const m = linha.match(RE_FICHA);
    // "https://..." casa o regex com rótulo "https" — não é campo, é URL.
    if (!m || m[2].startsWith("//")) return { rotulo: "", valor: linha };
    return { rotulo: m[1].trim(), valor: m[2] };
  });
}

/**
 * Volta ao texto. Inverso de `parseFicha` — inclusive para linhas em branco,
 * que o catálogo usa como separador entre produtos e não podem sumir.
 */
export function serializarFicha(linhas: LinhaFicha[]): string {
  return linhas
    .map((l) => {
      if (!l.rotulo) return l.valor;
      // Sem valor, sem espaço sobrando: é o caso das linhas de cabeçalho que o
      // catálogo gera ("Filme IA (2x):"). Um espaço a cada edição faria o texto
      // mudar sozinho toda vez que alguém abrisse a proposta.
      return l.valor ? `${l.rotulo}: ${l.valor}` : `${l.rotulo}:`;
    })
    .join("\n");
}

/** A ficha tem algo para imprimir? Só espaço e linha em branco não conta. */
export function fichaVisivel(texto: string): boolean {
  return parseFicha(texto).some((l) => Boolean(l.rotulo.trim() || l.valor.trim()));
}

/** Rótulos usados nas fichas da ACID — sugestão no editor, para não divergir. */
export const ROTULOS_FICHA = [
  "Entregável",
  "Duração",
  "Formato",
  "Território",
  "Tempo de uso",
  "Mídia",
  "Trilha",
  "Locução",
  "Acessibilidade",
  "Deliveries de imagem",
  "Deliveries de áudio",
];

/** Os mesmos campos, na proposta em inglês. Mesma ordem — é a mesma ficha. */
export const ROTULOS_FICHA_EN = [
  "Deliverable",
  "Duration",
  "Format",
  "Territory",
  "Usage term",
  "Media",
  "Music",
  "Voice-over",
  "Accessibility",
  "Image deliverables",
  "Audio deliverables",
];

export function rotulosFicha(idioma: IdiomaProposta): string[] {
  return idioma === "en" ? ROTULOS_FICHA_EN : ROTULOS_FICHA;
}

/* ============================================================
 * Blocos da proposta — quais entram e com que número
 * ========================================================== */

export type ChaveBloco =
  | "projeto"
  | "servicoInclui"
  | "entrega"
  | "investimento"
  | "pagamento"
  | "cronograma"
  | "exclusoes"
  | "alteracoes"
  | "observacoes"
  | "cancelamento"
  | "clausulaIA"
  | "materiais"
  | "validade";

export interface BlocoProposta {
  chave: ChaveBloco;
  titulo: string;
  /** Entra na proposta enviada ao cliente. Bloco vazio fica de fora. */
  incluso: boolean;
  /** Número de exibição, contado só entre os blocos inclusos. "" quando fora. */
  n: string;
  /** Termos e condições: corpo em corpo menor que o resto da proposta. */
  miudo: boolean;
}

/**
 * Ordem canônica da proposta.
 *  `sempre` — bloco derivado ou fixo, nunca fica vazio nem some.
 *  `miudo`  — termos e condições. São o fecho jurídico da proposta, não o
 *             argumento de venda: entram em corpo menor para não competir com
 *             escopo e investimento, que é o que o cliente precisa ler.
 */
type Titulo = Record<IdiomaProposta, string>;

const ORDEM: { chave: ChaveBloco; titulo: Titulo; sempre?: true; miudo?: true }[] = [
  { chave: "projeto", titulo: { pt: "Projeto", en: "Project" }, sempre: true },
  { chave: "servicoInclui", titulo: { pt: "O serviço inclui", en: "The service includes" } },
  { chave: "entrega", titulo: { pt: "Especificação da entrega", en: "Deliverables" } },
  { chave: "investimento", titulo: { pt: "Investimento", en: "Investment" }, sempre: true },
  { chave: "pagamento", titulo: { pt: "Condições de pagamento", en: "Payment terms" } },
  { chave: "cronograma", titulo: { pt: "Cronograma", en: "Schedule" } },
  { chave: "exclusoes", titulo: { pt: "Não está incluso", en: "Not included" } },
  { chave: "alteracoes", titulo: { pt: "Alterações e refações", en: "Revisions and rework" } },
  { chave: "observacoes", titulo: { pt: "Observações", en: "Notes" } },
  {
    chave: "cancelamento",
    titulo: { pt: "Cancelamento", en: "Cancellation" },
    sempre: true,
    miudo: true,
  },
  {
    chave: "clausulaIA",
    titulo: {
      pt: "Imagens e limitações técnicas em IA",
      en: "AI imagery and technical limitations",
    },
    sempre: true,
    miudo: true,
  },
  {
    chave: "materiais",
    titulo: { pt: "Materiais de apoio", en: "Supporting materials" },
    sempre: true,
    miudo: true,
  },
  { chave: "validade", titulo: { pt: "Validade", en: "Validity" }, sempre: true, miudo: true },
];

const cheio = (v?: string) => Boolean(v && v.trim());

/**
 * Decide quais blocos entram na proposta e renumera os que sobraram.
 *
 * Bloco vazio saía como "—", ocupando linha e empurrando página. Uma proposta
 * de 4 páginas em que uma delas só diz "6. Cronograma —" passa a impressão de
 * documento não revisado, além do custo óbvio de papel e rolagem. Então bloco
 * sem conteúdo simplesmente não existe no documento.
 *
 * A numeração é sequencial entre os inclusos — nunca 1,2,3,4,5,9. Por isso ela
 * mora aqui e não em literais espalhados pelos dois renderizadores: a tela e o
 * PDF têm de imprimir exatamente os mesmos números.
 *
 * Os blocos `sempre` (Projeto, Investimento, os três textos-mestre e Validade)
 * são derivados ou fixos: não dependem de preenchimento e nunca somem.
 */
export function blocosProposta(
  proj: Projeto,
  blocos: BlocosProposta,
  cronograma: MarcoCronograma[]
): Record<ChaveBloco, BlocoProposta> {
  const temConteudo: Record<ChaveBloco, boolean> = {
    projeto: true,
    servicoInclui: cheio(blocos.servicoInclui),
    // A entrega é uma ficha: só linha em branco ou "\n" solto não é conteúdo.
    entrega: fichaVisivel(blocos.entrega),
    investimento: true,
    pagamento: cheio(proj.condicaoPagamento),
    // Marco em branco (linha adicionada e não preenchida) não conta como
    // cronograma — senão o bloco entra vazio, que é o que queremos evitar.
    cronograma: cronograma.some((m) => cheio(m.data) || cheio(m.marco)),
    exclusoes: cheio(blocos.exclusoes),
    alteracoes: cheio(blocos.alteracoes),
    observacoes: cheio(blocos.observacoes),
    cancelamento: true,
    // Único bloco fixo que sai do documento por decisão do projeto. Ver
    // `Projeto.semClausulaIA`: só faz sentido quando não há imagem gerada.
    clausulaIA: !proj.semClausulaIA,
    materiais: true,
    validade: true,
  };

  const idioma = idiomaDe(proj);
  const out = {} as Record<ChaveBloco, BlocoProposta>;
  let n = 0;
  for (const item of ORDEM) {
    // `sempre` em ORDEM documenta a intenção; a decisão sai de `temConteudo`,
    // onde esses blocos são `true` fixo — com uma exceção, a cláusula de IA,
    // que o projeto pode desligar.
    const incluso = temConteudo[item.chave];
    if (incluso) n += 1;
    out[item.chave] = {
      chave: item.chave,
      titulo: item.titulo[idioma],
      incluso,
      n: incluso ? String(n) : "",
      miudo: Boolean(item.miudo),
    };
  }
  return out;
}

/**
 * O corpo do bloco "Projeto".
 *
 * Texto livre quando existe; a frase derivada quando não. Fonte única para a
 * tela e o PDF — sem isto, um dos dois imprimiria a descrição escrita à mão e o
 * outro "Nike Football — Film.".
 */
export function textoProjeto(proj: Projeto, blocos: BlocosProposta): string {
  const escrito = blocos.projeto?.trim();
  return escrito || linhaProjeto(proj);
}

/* ============================================================
 * Frases fixas do documento
 * ========================================================== */

/**
 * O que a tela e o PDF escrevem por conta própria — rótulo do investimento,
 * nota de moeda, frase de validade, rótulo do link do roteiro.
 *
 * Estavam como literais duplicados nos dois renderizadores. Enquanto era só
 * português dava para conviver; com dois idiomas, uma frase traduzida em um
 * lado e esquecida no outro produziria um PDF diferente do que foi revisado na
 * tela — exatamente o que `blocosProposta` existe para impedir.
 */
export interface TextosProposta {
  investimentoLabel: string;
  investimentoNota: string;
  validade: string;
  roteiroLabel: string;
}

export function textosProposta(proj: Projeto): TextosProposta {
  const idioma = idiomaDe(proj);
  const moeda = moedaDe(proj);
  // Em moeda estrangeira a cifra sozinha é ambígua (US$ e $ australiano usam o
  // mesmo símbolo em muitos teclados). O nome por extenso + o código ISO tiram
  // a dúvida no único número que o cliente vai levar para a aprovação interna.
  const nota =
    idioma === "en"
      ? `Gross amount, taxes included.${
          propostaInternacional(proj)
            ? ` All amounts in ${nomeMoeda(moeda, "en")} (${moeda}).`
            : ""
        }`
      : `Valor bruto, impostos inclusos.${
          propostaInternacional(proj) ? ` Valores em ${nomeMoeda(moeda, "pt")} (${moeda}).` : ""
        }`;

  if (idioma === "en") {
    return {
      investimentoLabel: "Total project investment",
      investimentoNota: nota,
      validade: `This proposal is valid for ${proj.validadeProposta} from the date of issue.`,
      roteiroLabel: "Reference script",
    };
  }

  return {
    investimentoLabel: "Investimento total do projeto",
    investimentoNota: nota,
    validade: `Esta proposta é válida por ${proj.validadeProposta} a partir da data de emissão.`,
    roteiroLabel: "Roteiro de referência",
  };
}
