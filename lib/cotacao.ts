import type { MoedaProposta } from "@/types";

/**
 * Cotação PTAX do Banco Central.
 *
 * A PTAX é a taxa oficial — é a que a contabilidade usa para converter receita
 * em moeda estrangeira. Uma cotação de site de câmbio turismo não serve: dá
 * outro número, e o número que vale na apuração é este.
 *
 * A taxa é **sugerida**, nunca viva. Depois de preenchida ela fica gravada no
 * projeto junto com a data (`cambioData`). Se fosse recalculada a cada abertura,
 * uma proposta aprovada mudaria de valor sozinha — e com ela o DRE, a margem, a
 * carteira e o histórico de versões, que passaria a comparar números que
 * ninguém digitou.
 */

/** Boletim de fechamento: o número oficial do dia. */
const FECHAMENTO = "Fechamento";

export interface Cotacao {
  /** Reais por 1 unidade da moeda. */
  taxa: number;
  /** Data do boletim, ISO (yyyy-mm-dd). */
  data: string;
  /** Fechamento do dia ou boletim intermediário (mercado ainda aberto). */
  fechamento: boolean;
}

/** BRL não se cota contra si mesmo; as demais o BCB publica. */
export function cotavel(moeda: MoedaProposta): boolean {
  return moeda !== "BRL";
}

/** MM-DD-AAAA — a API do BCB usa data no formato americano, entre aspas. */
export function dataBCB(d: Date): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}-${d.getUTCFullYear()}`;
}

/**
 * URL do período. Consulta uma janela para trás em vez de só hoje: fim de
 * semana, feriado e o intervalo antes do primeiro boletim do dia não têm
 * cotação, e pedir só a data de hoje devolveria lista vazia em boa parte das
 * vezes que alguém abre o sistema.
 */
export function urlPTAX(moeda: MoedaProposta, hoje: Date, diasAtras = 10): string {
  const inicio = new Date(hoje.getTime() - diasAtras * 24 * 60 * 60 * 1000);
  const base =
    "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)";
  const q = new URLSearchParams({
    "@moeda": `'${moeda}'`,
    "@dataInicial": `'${dataBCB(inicio)}'`,
    "@dataFinalCotacao": `'${dataBCB(hoje)}'`,
    $format: "json",
    $orderby: "dataHoraCotacao desc",
    $top: "20",
  });
  return `${base}?${q.toString()}`;
}

export interface BoletimPTAX {
  cotacaoCompra?: number;
  cotacaoVenda?: number;
  dataHoraCotacao?: string;
  tipoBoletim?: string;
}

/**
 * O boletim mais recente da resposta.
 *
 * Usa a cotação de **compra**: exportando serviço, quem recebe moeda de fora é
 * a ACID, e o banco COMPRA esses euros. A taxa de venda é a do caminho
 * contrário e sairia alguns centavos acima — no valor de um projeto isso vira
 * uma diferença que ninguém consegue explicar depois.
 *
 * Prefere o boletim de fechamento; com o mercado aberto, aceita o intermediário
 * e marca `fechamento: false` para a tela poder dizer que ainda vai mudar.
 */
export function melhorCotacao(boletins: BoletimPTAX[]): Cotacao | null {
  const validos = (boletins ?? []).filter(
    (b) => Number(b.cotacaoCompra) > 0 && typeof b.dataHoraCotacao === "string"
  );
  if (!validos.length) return null;

  const ordenado = [...validos].sort((a, b) =>
    String(b.dataHoraCotacao).localeCompare(String(a.dataHoraCotacao))
  );
  const escolhido = ordenado.find((b) => b.tipoBoletim === FECHAMENTO) ?? ordenado[0];

  return {
    taxa: Number(escolhido.cotacaoCompra),
    data: String(escolhido.dataHoraCotacao).slice(0, 10),
    fechamento: escolhido.tipoBoletim === FECHAMENTO,
  };
}
