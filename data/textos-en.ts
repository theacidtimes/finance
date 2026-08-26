import { TEXTOS_MESTRE } from "@/data/catalogo";
import type { IdiomaProposta } from "@/types";

/**
 * Textos-mestre da proposta em inglês.
 *
 * São os quatro blocos FIXOS — não passam pelo estado editável, saem iguais em
 * toda proposta. Por isso vivem aqui e não no `BLOCOS_PADRAO`: mudar um deles é
 * mudar a política comercial da ACID, não o texto de um projeto.
 *
 * Tradução do português vigente em `data/catalogo.ts`. São cláusulas
 * contratuais: qualquer ajuste tem de ser feito nos dois idiomas ao mesmo
 * tempo, senão a versão em inglês vira uma política paralela que ninguém
 * revisou.
 */
/** Mesmas chaves do português — o `as const` de lá fixa literais, aqui não. */
export type TextosMestre = Record<keyof typeof TEXTOS_MESTRE, string>;

export const TEXTOS_MESTRE_EN: TextosMestre = {
  clausulaIA: `The delivered images are created on artificial intelligence platforms using generative models widely adopted across the creative industry. We follow processes and tools aligned with good security and ethical practice. Even so, given the nature of these models:
1. Absolute exclusivity cannot be guaranteed, nor can the complete absence of similarities to real individuals, whether known or unknown.
2. The pieces do not follow a traditional pre-production, production and post-production logic, and there may be limitations in carrying out specific adjustments.`,

  materiais: `Supporting materials and brand assets: the client shall provide all supporting materials essential to the production (music, fonts, end cards, logos, lockups, product images) immediately after approval of this proposal, so that work on concepts and stills can begin.`,

  /** Bloco "Revisions and rework" (rounds + escopo). {rounds} é substituído. */
  alteracoes: `- {rounds} round(s) of revisions per approved stage
- Changes to elements already approved are treated as rework and quoted separately
- Feedback must respect the schedule, as the team's hours were calculated within the project timeline
- Additional rounds are quoted separately
- Changes to scope or script after approval of this proposal incur extra costs, quoted case by case`,

  /** Política de cancelamento — bloco FIXO próprio na proposta. */
  cancelamento: `Should this proposal be approved and the project subsequently be suspended or cancelled by the Client or Agency for any reason during production, 50% or 100% of the value of the work will be charged — to be negotiated with the production company — depending on the stage the production has reached.`,
};

/** Textos-mestre no idioma da proposta. Fonte única para a tela e para o PDF. */
export function textosMestre(idioma: IdiomaProposta): TextosMestre {
  return idioma === "en" ? TEXTOS_MESTRE_EN : TEXTOS_MESTRE;
}
