export const STATUS_PROJETO = [
  "Orçamento",
  "Aprovado",
  "Em produção",
  "Entregue",
  "Declinado",
] as const;

export const STATUS_APROVADO = "Aprovado";

/** Orçamento que o cliente não fechou. Não entra em nenhuma soma de carteira. */
export const STATUS_DECLINADO = "Declinado";

/**
 * "Perdido" era o nome antigo de "Declinado". Linhas gravadas antes da troca
 * ainda vêm do banco com o rótulo velho — normaliza na leitura para que a tela
 * mostre um nome só e as somas excluam os dois.
 */
export function normalizaStatusProjeto(status: string | null | undefined): string {
  if (!status) return "Orçamento";
  return status === "Perdido" ? STATUS_DECLINADO : status;
}

/** Projeto declinado não soma no valor da carteira (do cliente ou geral). */
export function contaNaCarteira(status: string | null | undefined): boolean {
  return normalizaStatusProjeto(status) !== STATUS_DECLINADO;
}
