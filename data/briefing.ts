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
  marca: string; // → Projeto.cliente
  projeto: string; // → Projeto.projeto
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

/** Monta uma "Especificação da entrega" a partir dos campos do pedido. */
export function entregaDoBriefing(d: BriefingDados): string {
  const linhas: string[] = [];
  if (d.escopoLivre.trim()) linhas.push(d.escopoLivre.trim());
  if (d.duracao.trim()) linhas.push(`Duração: ${d.duracao.trim()}`);
  if (d.formatos.trim()) linhas.push(`Formatos: ${d.formatos.trim()}`);
  if (d.territorio.trim()) linhas.push(`Território: ${d.territorio.trim()}`);
  if (d.periodoDireitos.trim()) linhas.push(`Direitos de uso: ${d.periodoDireitos.trim()}`);
  if (d.midias.trim()) linhas.push(`Mídias: ${d.midias.trim()}`);
  if (d.acessibilidade.trim()) linhas.push(`Acessibilidade: ${d.acessibilidade.trim()}`);
  if (d.deliveriesImagem.trim()) linhas.push(`Deliveries de imagem: ${d.deliveriesImagem.trim()}`);
  if (d.deliveriesAudio.trim()) linhas.push(`Deliveries de áudio: ${d.deliveriesAudio.trim()}`);
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
  if (d.marca.trim()) projPatch.cliente = d.marca.trim();
  if (d.projeto.trim()) projPatch.projeto = d.projeto.trim();
  if (d.roteiroUrl.trim()) projPatch.roteiroUrl = d.roteiroUrl.trim();
  if (d.formaPagamento.trim()) projPatch.condicaoPagamento = d.formaPagamento.trim();

  return {
    projPatch,
    itens: d.escopo ?? [],
    entrega: entregaDoBriefing(d),
  };
}
