import type { Projeto, DREResultado, CustoExterno, StaffInterno } from "@/types";

/** Dispara o download de um Blob no navegador. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Base de nome de arquivo: cliente_nº_projeto, sem espaços/acentos problemáticos. */
export function fileBase(proj: Projeto): string {
  return `${proj.cliente}_${proj.numeroServico}_${proj.projeto}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "acid-finance";
}

/** Carrega o logo do /public e devolve como data URL (react-pdf embute a imagem). */
export async function loadLogoDataUrl(src = "/logo_acid_tight.png"): Promise<string | undefined> {
  try {
    const res = await fetch(src);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

const num = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const cell = (v: string | number) => {
  const str = String(v ?? "");
  return /[";\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/** CSV completo do projeto (meta + DRE + custos externos + staff), pt-BR / Excel. */
export function projetoToCsv(
  proj: Projeto,
  dre: DREResultado,
  externos: CustoExterno[],
  internos: StaffInterno[]
): string {
  const rows: (string | number)[][] = [];
  const line = (...cells: (string | number)[]) => rows.push(cells);

  line("ACID Finance — Projeto");
  line("Cliente", proj.cliente);
  line("Projeto", proj.projeto);
  line("Nº serviço", proj.numeroServico);
  line("Tipo", proj.tipo);
  line("Responsável", proj.responsavel);
  line("Data", proj.data);
  line("Status", proj.status);
  line("");

  line("DRE", "Valor (R$)");
  line("Receita Bruta", num(dre.receitaBruta));
  line(`Impostos (${proj.impostosPct}%)`, num(-dre.impostos));
  line("Receita Líquida", num(dre.receitaLiquida));
  line(`Comissão (${proj.comissaoPct}% s/ líquida)`, num(-dre.comissao));
  line("Receita Operacional", num(dre.receitaOperacional));
  line("Custos Externos", num(-dre.custosExternos));
  line("Staff Interno", num(-dre.staffInterno));
  line(`Overhead (${proj.overheadPct}% s/ staff)`, num(-dre.overhead));
  line("Lucro Operacional", num(dre.lucroOperacional));
  line("Margem sobre Receita Bruta (%)", num(dre.margemBruta * 100));
  line("Margem Operacional (%)", num(dre.margemOperacional * 100));
  line("Retido na ACID", num(dre.retidoACID));
  line("");

  line("Custos externos", "Nome", "Função", "Categoria", "Valor (R$)", "Status", "NF", "Pagamento");
  externos.forEach((e) =>
    line("", e.nome, e.funcao, e.categoria, num(e.valor), e.status, e.nf ? "Sim" : "Não", e.dataPagamento)
  );
  line("Total externos", "", "", "", num(externos.reduce((a, e) => a + (e.valor || 0), 0)));
  line("");

  line("Staff interno", "Nome", "Função", "Salário (R$)", "Base horas", "Horas projeto", "Custo/hora", "Custo projeto");
  internos.forEach((i) => {
    const custoHora = i.baseHoras ? i.salario / i.baseHoras : 0;
    line("", i.nome, i.funcao, num(i.salario), i.baseHoras, i.horasProjeto, num(custoHora), num(custoHora * i.horasProjeto));
  });

  const body = rows.map((r) => r.map(cell).join(";")).join("\r\n");
  return "\uFEFF" + body; // BOM p/ Excel abrir UTF-8 correto
}
