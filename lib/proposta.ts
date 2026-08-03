import type { Projeto } from "@/types";

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

export function metaProposta(proj: Projeto): MetaProposta[] {
  const itens: MetaProposta[] = [
    { rotulo: "Data", valor: proj.data },
    { rotulo: "Cliente", valor: proj.cliente },
  ];

  const marca = proj.marca?.trim();
  if (marca && marca.toLowerCase() !== proj.cliente.trim().toLowerCase()) {
    itens.push({ rotulo: "Marca", valor: marca });
  }

  const contato = proj.contato?.trim();
  if (contato) itens.push({ rotulo: "Contato", valor: contato });

  itens.push(
    { rotulo: "Projeto", valor: `${proj.projeto} (${proj.numeroServico})` },
    { rotulo: "Validade", valor: proj.validadeProposta }
  );

  return itens;
}

/**
 * Para quem o trabalho é feito, na prática: a marca quando existe, senão o
 * cliente. Usado no corpo da proposta ("Projeto X — Filme para Y").
 */
export function destinatario(proj: Projeto): string {
  return proj.marca?.trim() || proj.cliente;
}
