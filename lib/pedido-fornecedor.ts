import type {
  BlocosProposta,
  CategoriaExterna,
  CustoExterno,
  DocumentoPedido,
  Friend,
  PedidoFornecedor,
  Projeto,
  ServicoPedido,
} from "@/types";
import { parseFicha, serializarFicha, type LinhaFicha } from "@/lib/proposta";
import {
  SERVICO_PADRAO,
  MODELOS_CONTRATACAO,
  PAGAMENTO_PADRAO,
  ORCAMENTO_DEVE_PADRAO,
  ROTULOS_ESPECIFICACAO,
} from "@/data/servicos-fornecedor";

/**
 * Pedido de orçamento ao fornecedor (o caminho inverso da proposta: aqui a
 * ACID é quem pede).
 *
 * Tudo que decide o que o fornecedor lê mora aqui — a tela, o PDF e o texto
 * para e-mail chamam as mesmas funções, pelo mesmo motivo de `blocosProposta`:
 * o que se revisa na tela tem que ser o que sai.
 *
 * Zero lógica financeira. O único número é o valor cotado, que só vira custo
 * do projeto quando alguém aprova (ver `externoDoPedido`).
 */

let seq = 0;
export const novoIdServico = () => `sv-${Date.now()}-${++seq}`;

export function servicoNovo(categoria: CategoriaExterna = "Outros"): ServicoPedido {
  return { id: novoIdServico(), categoria, texto: SERVICO_PADRAO[categoria] ?? "" };
}

/* ============================================================
 * Especificação herdada da proposta ao cliente
 * ========================================================== */

/** Sem acento, minúsculo, espaço único — para comparar o que o humano escreveu. */
const normal = (s: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Rótulo da ficha da proposta (pt ou en) → rótulo da especificação ao
 * fornecedor. Só o que tem par: "Trilha" e "Locução" são entregas, não
 * condições de uso, e não fazem sentido para quem vai fotografar.
 */
const DE_PARA: Record<string, string> = {
  "tempo de uso": "Tempo de uso",
  "usage term": "Tempo de uso",
  midia: "Mídias",
  midias: "Mídias",
  media: "Mídias",
  territorio: "Território",
  territory: "Território",
  formato: "Formatos",
  formatos: "Formatos",
  format: "Formatos",
  duracao: "Duração",
  duration: "Duração",
};

/**
 * Condições que o cliente comprou, lidas da "Especificação da entrega" da
 * proposta. Uma proposta com dois produtos tem duas linhas "Tempo de uso" —
 * os valores distintos entram juntos, para ninguém perder o maior deles.
 */
export function condicoesDaProposta(entrega: string): Record<string, string> {
  const acc = new Map<string, string[]>();
  for (const l of parseFicha(entrega)) {
    const alvo = DE_PARA[normal(l.rotulo)];
    const v = l.valor.trim();
    if (!alvo || !v) continue;
    const lista = acc.get(alvo) ?? [];
    if (!lista.some((x) => normal(x) === normal(v))) lista.push(v);
    acc.set(alvo, lista);
  }
  return Object.fromEntries([...acc].map(([k, vs]) => [k, vs.join(" / ")]));
}

/** Ficha inicial do pedido: os campos de sempre, já com o que a proposta sabe. */
export function especificacaoDoProjeto(entrega: string): string {
  const herdado = condicoesDaProposta(entrega);
  const linhas: LinhaFicha[] = ROTULOS_ESPECIFICACAO.map((rotulo) => ({
    rotulo,
    valor: herdado[rotulo] ?? (rotulo === "Suporte" ? "Digital" : ""),
  }));
  return serializarFicha(linhas);
}

/**
 * Onde o pedido ao fornecedor compra MENOS (ou diferente) do que a proposta
 * vendeu ao cliente. É o erro caro deste fluxo: vender 12 meses de uso e
 * comprar 6 do fotógrafo só aparece quando a campanha já está no ar.
 *
 * Compara texto, não interpreta prazo — "12 meses" e "1 ano" acusam
 * diferença. Falso alarme custa uma olhada; falso silêncio custa uma multa.
 */
export const CAMPOS_DE_DIREITO = ["Tempo de uso", "Mídias", "Território"] as const;

export interface Divergencia {
  campo: string;
  cliente: string;
  fornecedor: string; // "" = o pedido não diz
}

export function divergencias(especificacao: string, entregaProposta: string): Divergencia[] {
  const cliente = condicoesDaProposta(entregaProposta);
  const pedido = new Map<string, string>();
  for (const l of parseFicha(especificacao)) {
    if (l.rotulo.trim()) pedido.set(normal(l.rotulo), l.valor.trim());
  }
  const out: Divergencia[] = [];
  for (const campo of CAMPOS_DE_DIREITO) {
    const c = cliente[campo];
    if (!c) continue;
    const f = pedido.get(normal(campo)) ?? "";
    if (normal(f) !== normal(c)) out.push({ campo, cliente: c, fornecedor: f });
  }
  return out;
}

/* ============================================================
 * Criação
 * ========================================================== */

/**
 * Descrição inicial do projeto, sem cliente nem marca.
 *
 * Não reaproveita a frase da proposta (`linhaProjeto`) de propósito: ela
 * termina em "para <marca>", e o pedido esconde o cliente por padrão. O texto
 * escrito à mão na proposta pode ser copiado na tela, por decisão de alguém.
 */
export function descricaoNeutra(proj: Pick<Projeto, "projeto" | "tipo">): string {
  const nome = (proj.projeto || "").trim().replace(/[.\s]+$/, "");
  const tipo = proj.tipo && proj.tipo !== "Outro" ? proj.tipo : "";
  if (!nome) return "";
  return tipo ? `${nome} — ${tipo}.` : `${nome}.`;
}

export function documentoInicial(
  proj: Projeto,
  blocos: BlocosProposta,
  friend: Friend | null
): DocumentoPedido {
  return {
    empresa: friend ? friend.razaoSocial || friend.nome : "",
    aosCuidados: friend?.contato ?? "",
    email: friend?.email ?? "",
    descricao: descricaoNeutra(proj),
    modelo: MODELOS_CONTRATACAO[0],
    // Friend com uma entrega só já sabe o que vai ser pedido; com várias, a
    // linha começa em "Outros" e a categoria é escolhida no pedido.
    servicos: [servicoNovo(friend?.categorias.length === 1 ? friend.categorias[0] : "Outros")],
    especificacao: especificacaoDoProjeto(blocos.entrega),
    execucao: "",
    prazoEntrega: "",
    prazoResposta: "",
    pagamento: PAGAMENTO_PADRAO,
    orcamentoDeve: ORCAMENTO_DEVE_PADRAO,
    observacoes: "",
    mostrarCliente: false,
  };
}

/** Próximo número dentro do projeto. Apagar um pedido não reaproveita o número. */
export function proximoNumero(pedidos: Pick<PedidoFornecedor, "numero">[]): number {
  return pedidos.reduce((m, p) => Math.max(m, p.numero), 0) + 1;
}

/** "ACID-0142 · F02" — como o pedido é citado no e-mail e na nota. */
export function codigoPedido(proj: Pick<Projeto, "numeroServico">, numero: number): string {
  const n = `F${String(numero).padStart(2, "0")}`;
  const base = proj.numeroServico?.trim();
  return base ? `${base} · ${n}` : n;
}

/* ============================================================
 * O documento — tela, PDF e texto
 * ========================================================== */

export interface MetaPedido {
  rotulo: string;
  valor: string;
}

const dataBR = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

/** Cabeçalho. Rótulo sem conteúdo não entra — mesma regra da proposta. */
export function metaPedido(
  p: Pick<PedidoFornecedor, "empresa" | "aosCuidados" | "mostrarCliente" | "numero" | "prazoResposta" | "criadoEm">,
  proj: Projeto
): MetaPedido[] {
  const itens: MetaPedido[] = [
    { rotulo: "Data", valor: dataBR(p.criadoEm || new Date().toISOString()) },
    { rotulo: "Pedido", valor: codigoPedido(proj, p.numero) },
    { rotulo: "Empresa", valor: p.empresa.trim() },
    { rotulo: "A/C", valor: p.aosCuidados.trim() },
    { rotulo: "Projeto", valor: proj.projeto?.trim() ?? "" },
  ];
  if (p.mostrarCliente) {
    const marca = proj.marca?.trim();
    const cliente = proj.cliente?.trim();
    itens.push({
      rotulo: "Cliente",
      valor: marca && normal(marca) !== normal(cliente) ? `${cliente} / ${marca}` : cliente,
    });
  }
  itens.push({ rotulo: "Responder até", valor: p.prazoResposta.trim() });
  return itens.filter((m) => m.valor);
}

/** Ficha sem os campos que ninguém preencheu — o modelo tem 7, o job usa 3. */
export function fichaPreenchida(texto: string): string {
  return serializarFicha(parseFicha(texto).filter((l) => l.valor.trim()));
}

export type BlocoPedido =
  | { n: number; titulo: string; tipo: "texto"; texto: string }
  | { n: number; titulo: string; tipo: "ficha"; texto: string }
  | { n: number; titulo: string; tipo: "servicos"; servicos: ServicoPedido[] };

type BlocoSemNumero =
  | { titulo: string; tipo: "texto"; texto: string }
  | { titulo: string; tipo: "ficha"; texto: string }
  | { titulo: string; tipo: "servicos"; servicos: ServicoPedido[] };

/**
 * Os blocos que o fornecedor lê, na ordem e com o número final. Bloco vazio
 * não sai e os demais são renumerados — o mesmo contrato da proposta.
 */
export function blocosPedido(p: DocumentoPedido): BlocoPedido[] {
  const servicos = p.servicos.filter((s) => s.texto.trim());
  const execucao = serializarFicha(
    [
      { rotulo: "Data e local", valor: p.execucao.trim() },
      { rotulo: "Entrega", valor: p.prazoEntrega.trim() },
    ].filter((l) => l.valor)
  );

  const todos: BlocoSemNumero[] = [
    { titulo: "Projeto / parceria", tipo: "texto", texto: p.descricao.trim() },
    { titulo: "Modelo", tipo: "texto", texto: p.modelo.trim() },
    { titulo: "Serviços necessários", tipo: "servicos", servicos },
    { titulo: "Especificação", tipo: "ficha", texto: fichaPreenchida(p.especificacao) },
    { titulo: "Execução e entrega", tipo: "ficha", texto: execucao },
    { titulo: "Pagamento", tipo: "texto", texto: p.pagamento.trim() },
    { titulo: "O orçamento deve conter", tipo: "texto", texto: p.orcamentoDeve.trim() },
    { titulo: "Observações", tipo: "texto", texto: p.observacoes.trim() },
  ];

  const cheios = todos.filter((b) => (b.tipo === "servicos" ? b.servicos.length > 0 : b.texto));
  return cheios.map((b, i) => ({ ...b, n: i + 1 }) as BlocoPedido);
}

/** Um serviço como se lê: "Fotografia — 01 diária de shooting…". */
export function linhaServico(s: ServicoPedido): string {
  const cat = s.categoria === "Outros" ? "" : s.categoria;
  return cat ? `${cat} — ${s.texto.trim()}` : s.texto.trim();
}

/**
 * O mesmo pedido em texto corrido, para colar no corpo do e-mail ou no
 * WhatsApp. Sai dos mesmos blocos do PDF.
 */
export function textoPedido(p: PedidoFornecedor, proj: Projeto): string {
  const saudacao = p.aosCuidados.trim() ? `Olá, ${p.aosCuidados.trim().split(/\s+/)[0]}!` : "Olá!";
  const linhas: string[] = [
    saudacao,
    "",
    `Gostaríamos de um orçamento para o projeto abaixo (pedido ${codigoPedido(proj, p.numero)}).`,
  ];
  for (const b of blocosPedido(p)) {
    linhas.push("", `${b.n}. ${b.titulo.toUpperCase()}`);
    if (b.tipo === "servicos") b.servicos.forEach((s) => linhas.push(`• ${linhaServico(s)}`));
    else linhas.push(b.texto);
  }
  if (p.prazoResposta.trim()) {
    linhas.push("", `Pedimos o retorno até ${p.prazoResposta.trim()}.`);
  }
  linhas.push("", "Obrigado!", "ACID — THE ACID TIMES LTDA");
  return linhas.join("\n");
}

/* ============================================================
 * Cotação → custo externo
 * ========================================================== */

/**
 * O pedido tem que aparecer em Pessoas & Custos? Só quando há um valor e o
 * fornecedor não foi recusado. Recusar é como se tira do DRE a cotação que
 * perdeu — sem isso, cotar o mesmo serviço com três fornecedores somaria os
 * três no custo do projeto.
 */
export function pedidoNoCusto(p: Pick<PedidoFornecedor, "valorCotado" | "status">): boolean {
  return p.valorCotado > 0 && p.status !== "Recusado";
}

/**
 * A linha de custo externo que uma cotação vira: "Orçado" enquanto o pedido
 * não é aprovado, "Aprovado" depois.
 *
 * Com `existente`, atualiza a linha já lançada em vez de criar outra: mudar o
 * valor ou aprovar não pode duplicar o custo no DRE. O que a equipe mudou à
 * mão na linha (categoria, função, NF, data de pagamento, obs) fica.
 */
export function externoDoPedido(
  p: PedidoFornecedor,
  friend: Friend | null,
  existente?: CustoExterno
): Omit<CustoExterno, "id"> {
  const primeiro = p.servicos.find((s) => s.texto.trim()) ?? p.servicos[0];
  const categoria = primeiro?.categoria ?? "Outros";
  const base: Omit<CustoExterno, "id"> = existente ?? {
    nome: "",
    funcao: "",
    categoria,
    valor: 0,
    status: "Orçado",
    nf: false,
    dataPagamento: "",
    obs: "",
    friendId: null,
  };
  return {
    ...base,
    nome: friend?.nome || p.empresa.trim() || base.nome,
    funcao: base.funcao || (categoria === "Outros" ? "" : categoria),
    categoria: existente ? base.categoria : categoria,
    valor: p.valorCotado,
    // Pago continua pago: mexer no pedido não desfaz um pagamento.
    status: base.status === "Pago" ? "Pago" : p.status === "Aprovado" ? "Aprovado" : "Orçado",
    friendId: p.friendId ?? base.friendId ?? null,
    pedidoId: p.id,
  };
}
