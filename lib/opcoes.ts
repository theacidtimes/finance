import type { OpcaoComercial } from "@/types";

/**
 * Opções comerciais — a proposta com mais de um preço.
 *
 * Um sprint por diárias não tem "o valor": tem uma grade. O cliente fecha em
 * 2, 3 ou 5 dias, e até fechar ninguém sabe qual. Só que DRE, carteira,
 * dashboard e Performance leem um número só (`valorBruto`), e mudar isso
 * significaria reescrever a apuração inteira por causa de um formato de venda.
 *
 * A saída é este módulo: a grade vive numa tabela filha, e daqui sai o único
 * número que o resto do sistema enxerga.
 *
 * A regra é a mais conservadora possível:
 *  - fechou? vale a opção escolhida;
 *  - não fechou? vale a MENOR opção — o mínimo que a proposta compromete.
 *
 * O contrário (contar a maior, ou a soma) infla a carteira com um cenário que o
 * cliente nunca aceitou. Deixar zero até fechar seria a outra ponta, mas criaria
 * uma segunda regra: orçamento em aberto já conta na carteira hoje.
 */

export function temOpcoes(opcoes: OpcaoComercial[] | undefined): boolean {
  return Boolean(opcoes && opcoes.some((o) => linhaValida(o)));
}

/** Linha em branco (recém-adicionada e não preenchida) não é uma opção. */
export function linhaValida(o: OpcaoComercial): boolean {
  return Boolean(o.label.trim() || o.valorTotal > 0);
}

export function opcaoEscolhida(opcoes: OpcaoComercial[]): OpcaoComercial | undefined {
  return opcoes.filter(linhaValida).find((o) => o.escolhida);
}

/**
 * O valor da proposta, na moeda da proposta.
 *
 * `fallback` é o valor digitado direto no Cadastro — usado quando o projeto não
 * tem grade de opções, que é o caso de toda proposta de preço fechado.
 */
export function valorDaProposta(opcoes: OpcaoComercial[] | undefined, fallback: number): number {
  const validas = (opcoes ?? []).filter(linhaValida);
  if (!validas.length) return fallback;

  const escolhida = validas.find((o) => o.escolhida);
  if (escolhida) return escolhida.valorTotal;

  // Sem escolha, o piso: é o único valor que a proposta de fato compromete.
  return Math.min(...validas.map((o) => o.valorTotal));
}

/**
 * Marca uma opção como fechada e desmarca as outras.
 * Duas linhas marcadas fariam `valorDaProposta` depender da ordem do array —
 * o valor do projeto mudaria ao reordenar a tabela.
 */
export function escolherOpcao(
  opcoes: OpcaoComercial[],
  id: OpcaoComercial["id"]
): OpcaoComercial[] {
  return opcoes.map((o) => ({ ...o, escolhida: o.id === id ? !o.escolhida : false }));
}

/** Total sugerido a partir de quantidade × unitário, quando os dois existem. */
export function totalSugerido(quantidade: number, valorUnitario: number): number {
  const q = Number(quantidade) || 0;
  const v = Number(valorUnitario) || 0;
  return q > 0 && v > 0 ? Math.round(q * v * 100) / 100 : 0;
}
