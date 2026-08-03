import type { Projeto } from "@/types";
import type { ItemProposta } from "./catalogo";

/**
 * Pedido de Orçamento (briefing do cliente).
 *
 * A proposta ACID é um espelho do pedido do cliente. Este schema é modelado a
 * partir de um pedido real bem detalhado (Droga5 / Ticket Cats): cada campo aqui
 * mapeia 1:1 para um campo da proposta. É compartilhado por:
 *  - o formulário público que o cliente preenche (/pedido/[token]);
 *  - o upload de PDF (quando o cliente não usa o form);
 *  - o importador que pré-preenche a proposta.
 *
 * Nada aqui toca lógica financeira.
 */
export interface BriefingDados {
  // Informações gerais
  marca: string; // → Projeto.marca (e Projeto.cliente, na falta de agência declarada)
  projeto: string; // → Projeto.projeto
  solicitante: string; // quem está pedindo → Projeto.contato (sai no cabeçalho da proposta)
  contatos: string; // time do cliente (account/produção/criação) — livre
  contexto: string; // contexto/racional do projeto

  // Creative
  roteiroUrl: string; // link do roteiro aprovado → Projeto.roteiroUrl
  referenciasUrl: string; // link de referências visuais

  // Produção / escopo
  escopo: ItemProposta[]; // produtos do catálogo + quantidade (o elo com o catálogo)
  escopoLivre: string; // descrição livre, caso o cliente peça algo fora do catálogo
  duracao: string; // secundagem (ex.: "60 segundos")
  formatos: string; // aspect ratios (ex.: "16:9, 9:16 e 1:1")
  periodoDireitos: string; // ex.: "12 meses / 3 meses"
  territorio: string; // ex.: "Nacional"
  midias: string; // canais/mídias
  acessibilidade: string; // legenda/SRT etc.
  locucao: string; // "" quando não há; senão descrição
  trilha: string; // ex.: "Trilha original composta" | "Stock / IA"
  deliveriesImagem: string; // ex.: bases limpas, collect de motion
  deliveriesAudio: string; // ex.: trilha 60s para desdobramentos

  // Normas
  prazoEntrega: string; // datas de crono/entrega
  formaPagamento: string; // → Projeto.condicaoPagamento
  observacoes: string; // condições/observações do cliente
}

export const BRIEFING_VAZIO: BriefingDados = {
  marca: "",
  projeto: "",
  solicitante: "",
  contatos: "",
  contexto: "",
  roteiroUrl: "",
  referenciasUrl: "",
  escopo: [],
  escopoLivre: "",
  duracao: "",
  formatos: "",
  periodoDireitos: "",
  territorio: "",
  midias: "",
  acessibilidade: "",
  locucao: "",
  trilha: "",
  deliveriesImagem: "",
  deliveriesAudio: "",
  prazoEntrega: "",
  formaPagamento: "",
  observacoes: "",
};

/* ============================================================
 * Metadados do formulário (form data-driven — render automático)
 * ========================================================== */
export type TipoCampo = "text" | "textarea" | "produtos";

export interface CampoBriefing {
  key: keyof BriefingDados;
  label: string;
  tipo: TipoCampo;
  hint?: string;
  grupo: "Informações gerais" | "Creative" | "Produção" | "Normas";
}

export const CAMPOS_BRIEFING: CampoBriefing[] = [
  { key: "marca", label: "Marca", tipo: "text", grupo: "Informações gerais" },
  { key: "projeto", label: "Projeto", tipo: "text", grupo: "Informações gerais" },
  { key: "solicitante", label: "Quem está pedindo", tipo: "text", hint: "Nome de quem solicita o orçamento", grupo: "Informações gerais" },
  { key: "contatos", label: "Time (account / produção / criação)", tipo: "textarea", grupo: "Informações gerais" },
  { key: "contexto", label: "Contexto do projeto", tipo: "textarea", grupo: "Informações gerais" },

  { key: "roteiroUrl", label: "Roteiro (link)", tipo: "text", hint: "Google Docs/Slides/Drive", grupo: "Creative" },
  { key: "referenciasUrl", label: "Referências visuais (link)", tipo: "text", grupo: "Creative" },

  { key: "escopo", label: "Escopo (o que precisa)", tipo: "produtos", hint: "Selecione os produtos e quantidades", grupo: "Produção" },
  { key: "escopoLivre", label: "Descrição livre do escopo", tipo: "textarea", hint: "Caso não encontre na lista, descreva aqui", grupo: "Produção" },
  { key: "duracao", label: "Duração / secundagem", tipo: "text", hint: "ex.: 60 segundos", grupo: "Produção" },
  { key: "formatos", label: "Formatos", tipo: "text", hint: "ex.: 16:9, 9:16 e 1:1", grupo: "Produção" },
  { key: "periodoDireitos", label: "Período de direitos", tipo: "text", hint: "ex.: 12 meses / 3 meses", grupo: "Produção" },
  { key: "territorio", label: "Território", tipo: "text", hint: "ex.: Nacional", grupo: "Produção" },
  { key: "midias", label: "Mídias / canais", tipo: "textarea", grupo: "Produção" },
  { key: "acessibilidade", label: "Acessibilidade", tipo: "text", hint: "legenda PT, SRT…", grupo: "Produção" },
  { key: "locucao", label: "Locução", tipo: "text", hint: "sim/não + detalhe", grupo: "Produção" },
  { key: "trilha", label: "Trilha", tipo: "text", hint: "stock/IA ou original composta", grupo: "Produção" },
  { key: "deliveriesImagem", label: "Deliveries de imagem", tipo: "textarea", hint: "bases limpas, collect…", grupo: "Produção" },
  { key: "deliveriesAudio", label: "Deliveries de áudio", tipo: "textarea", grupo: "Produção" },

  { key: "prazoEntrega", label: "Prazos de entrega", tipo: "textarea", grupo: "Normas" },
  { key: "formaPagamento", label: "Forma de pagamento", tipo: "textarea", grupo: "Normas" },
  { key: "observacoes", label: "Observações", tipo: "textarea", grupo: "Normas" },
];

/* ============================================================
 * Importador: pedido → proposta
 * ========================================================== */

/**
 * Monta uma "Especificação da entrega" a partir dos campos do pedido.
 *
 * Formato de ficha (padrão dos PDFs da ACID): um campo por linha, no formato
 * `Rótulo: valor`. A proposta renderiza o rótulo em negrito — por isso nunca
 * empacote vários campos na mesma linha.
 */
export function entregaDoBriefing(d: BriefingDados): string {
  const linhas: string[] = [];
  const campo = (rotulo: string, valor: string) => {
    const v = valor.trim();
    if (v) linhas.push(`${rotulo}: ${v}`);
  };

  campo("Entregável", d.escopoLivre);
  campo("Duração", d.duracao);
  campo("Formato", d.formatos);
  campo("Território", d.territorio);
  campo("Tempo de uso", d.periodoDireitos);
  campo("Mídia", d.midias);
  campo("Trilha", d.trilha);
  campo("Locução", d.locucao);
  campo("Acessibilidade", d.acessibilidade);
  campo("Deliveries de imagem", d.deliveriesImagem);
  campo("Deliveries de áudio", d.deliveriesAudio);

  return linhas.join("\n");
}

/**
 * Converte um pedido nos patches que a proposta recebe.
 * Devolve o patch de projeto, os itens do catálogo e uma entrega detalhada.
 * A geração dos blocos (via blocosParaProdutos) fica a cargo do chamador, que
 * então sobrescreve a "entrega" com `entregaDoBriefing` para espelhar o pedido.
 */
export function briefingParaProposta(d: BriefingDados): {
  projPatch: Partial<Projeto>;
  itens: ItemProposta[];
  entrega: string;
} {
  const projPatch: Partial<Projeto> = {};
  // O pedido só conhece a marca — quem preenche não declara se há uma agência
  // no meio. Então pré-preenchemos os dois campos com o mesmo valor: para
  // cliente direto já está certo, e quando houver agência basta corrigir
  // `cliente` no cadastro. `metaProposta` omite a marca enquanto forem iguais.
  if (d.marca.trim()) {
    projPatch.cliente = d.marca.trim();
    projPatch.marca = d.marca.trim();
  }
  if (d.solicitante.trim()) projPatch.contato = d.solicitante.trim();
  if (d.projeto.trim()) projPatch.projeto = d.projeto.trim();
  if (d.roteiroUrl.trim()) projPatch.roteiroUrl = d.roteiroUrl.trim();
  if (d.formaPagamento.trim()) projPatch.condicaoPagamento = d.formaPagamento.trim();

  return {
    projPatch,
    itens: d.escopo ?? [],
    entrega: entregaDoBriefing(d),
  };
}
