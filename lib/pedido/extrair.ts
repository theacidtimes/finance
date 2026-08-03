import type Anthropic from "@anthropic-ai/sdk";
import { CATALOGO } from "@/data/catalogo";
import { BRIEFING_VAZIO, type BriefingDados } from "@/data/briefing";
import type { ItemProposta } from "@/data/catalogo";

/**
 * Extração do pedido de orçamento (RFQ) do cliente via Claude.
 *
 * Recebe o texto do e-mail ou o PDF do pedido e devolve os campos do
 * BriefingDados. Nada aqui aplica nada à proposta — apenas estrutura o pedido
 * para revisão humana. Zero lógica financeira.
 */

const IDS_VALIDOS = CATALOGO.map((p) => p.id);

/** Descrição dos produtos para o modelo mapear o escopo. */
const LISTA_PRODUTOS = CATALOGO.map((p) => `- ${p.id}: ${p.label} — ${p.descricao}`).join("\n");

export const MODELO = "claude-sonnet-4-5";

export const SYSTEM_PROMPT = `Você extrai pedidos de orçamento (RFQ) de clientes de uma produtora criativa (ACID) para preencher uma proposta comercial. A proposta é um espelho do pedido: capture SOMENTE o que o cliente pediu, sem inventar escopo, valores ou prazos.

Regras:
- Preencha apenas campos com informação presente no pedido. Deixe "" quando não houver.
- NUNCA invente valores, datas ou serviços não mencionados.
- Transcreva fielmente; pode resumir textos longos, mas sem alterar o sentido.
- "escopo" mapeia o que o cliente pediu para os produtos do catálogo abaixo (por id). Só inclua um produto se o pedido claramente corresponder a ele. Se o cliente pediu algo fora do catálogo, deixe "escopo" vazio e descreva em "escopoLivre".
- SEMPRE decomponha a especificação técnica nos campos próprios: duracao, formatos, territorio, periodoDireitos, midias, trilha, locucao, acessibilidade, deliveriesImagem, deliveriesAudio. Nunca despeje a especificação inteira em um campo só.
- "escopoLivre" é apenas a descrição curta do entregável (ex.: "Peça 3D para fachada — 01 vídeo"). Não repita nele o que já foi para os campos técnicos.
- Ressalvas e condições do cliente que não sejam especificação técnica vão em "observacoes".
- Os campos são em português.

Catálogo de produtos (use o id em "escopo.produtoId"):
${LISTA_PRODUTOS}`;

/** Ferramenta forçada — garante saída JSON estruturada. */
export const FERRAMENTA: Anthropic.Tool = {
  name: "registrar_pedido",
  description:
    "Registra os campos do pedido de orçamento do cliente extraídos do texto/PDF. Preencha apenas o que estiver presente no pedido.",
  input_schema: {
    type: "object",
    properties: {
      marca: { type: "string", description: "Marca/cliente final do pedido" },
      projeto: { type: "string", description: "Nome do projeto/campanha" },
      solicitante: {
        type: "string",
        description:
          "Nome da pessoa que está pedindo o orçamento — quem assina o e-mail ou consta como remetente/requisitante. Apenas o nome, sem cargo.",
      },
      contatos: { type: "string", description: "Time do cliente (account/produção/criação)" },
      contexto: { type: "string", description: "Contexto/racional do projeto" },
      roteiroUrl: { type: "string", description: "Link do roteiro aprovado, se houver" },
      referenciasUrl: { type: "string", description: "Link de referências visuais, se houver" },
      escopo: {
        type: "array",
        description: "Produtos do catálogo que o cliente pediu",
        items: {
          type: "object",
          properties: {
            produtoId: { type: "string", enum: IDS_VALIDOS },
            quantidade: { type: "number", description: "Quantidade pedida (default 1)" },
          },
          required: ["produtoId"],
        },
      },
      escopoLivre: { type: "string", description: "Descrição livre do escopo fora do catálogo" },
      duracao: { type: "string", description: "Secundagem (ex.: 60 segundos)" },
      formatos: { type: "string", description: "Aspect ratios (ex.: 16:9, 9:16 e 1:1)" },
      periodoDireitos: { type: "string", description: "Período de direitos (ex.: 12 meses)" },
      territorio: { type: "string", description: "Território (ex.: Nacional)" },
      midias: { type: "string", description: "Canais/mídias" },
      acessibilidade: { type: "string", description: "Legenda/SRT etc." },
      locucao: { type: "string", description: "Locução (sim/não + detalhe)" },
      trilha: { type: "string", description: "Trilha (stock/IA ou original composta)" },
      deliveriesImagem: { type: "string", description: "Deliveries de imagem (bases limpas, collect…)" },
      deliveriesAudio: { type: "string", description: "Deliveries de áudio" },
      prazoEntrega: { type: "string", description: "Datas de crono/entrega" },
      formaPagamento: { type: "string", description: "Forma/condição de pagamento" },
      observacoes: { type: "string", description: "Condições/observações do cliente" },
    },
    required: [],
  },
};

/** Normaliza a saída da ferramenta para um BriefingDados válido e seguro. */
export function normalizarBriefing(raw: unknown): BriefingDados {
  const o = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  const escopo: ItemProposta[] = Array.isArray(o.escopo)
    ? (o.escopo as unknown[]).flatMap((it) => {
        const x = (it ?? {}) as Record<string, unknown>;
        const produtoId = str(x.produtoId);
        if (!IDS_VALIDOS.includes(produtoId)) return [];
        const q = Number(x.quantidade);
        return [{ produtoId, quantidade: Number.isFinite(q) && q > 0 ? q : 1 }];
      })
    : [];

  return {
    ...BRIEFING_VAZIO,
    marca: str(o.marca),
    projeto: str(o.projeto),
    solicitante: str(o.solicitante),
    contatos: str(o.contatos),
    contexto: str(o.contexto),
    roteiroUrl: str(o.roteiroUrl),
    referenciasUrl: str(o.referenciasUrl),
    escopo,
    escopoLivre: str(o.escopoLivre),
    duracao: str(o.duracao),
    formatos: str(o.formatos),
    periodoDireitos: str(o.periodoDireitos),
    territorio: str(o.territorio),
    midias: str(o.midias),
    acessibilidade: str(o.acessibilidade),
    locucao: str(o.locucao),
    trilha: str(o.trilha),
    deliveriesImagem: str(o.deliveriesImagem),
    deliveriesAudio: str(o.deliveriesAudio),
    prazoEntrega: str(o.prazoEntrega),
    formaPagamento: str(o.formaPagamento),
    observacoes: str(o.observacoes),
  };
}
