"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Section } from "@/components/ui/primitives";
import { Gauge } from "@/components/Gauge";
import { useProjetoStore } from "@/lib/store";
import { useDRE } from "@/lib/useDRE";
import { formatBRL, formatBRL0, formatPct } from "@/utils/format";
import { cn } from "@/lib/utils";

function Row({
  label,
  value,
  neg,
  strong,
  sub,
  tone,
}: {
  label: string;
  value: string;
  neg?: boolean;
  strong?: boolean;
  sub?: boolean;
  tone?: "pos" | "neg";
}) {
  return (
    <div className={cn("flex justify-between items-baseline px-4 py-2.5 border-b border-border/60", strong && "bg-muted font-semibold")}>
      <span className={cn(sub ? "text-muted-foreground text-xs" : "text-sm", neg && "pl-4")}>
        {neg ? "(−) " : ""}
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          sub ? "text-xs" : "text-sm",
          tone === "pos" && "text-acid-dark font-semibold",
          tone === "neg" && "text-danger font-semibold"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function DRE() {
  const proj = useProjetoStore((s) => s.proj);
  const externos = useProjetoStore((s) => s.externos);
  const internos = useProjetoStore((s) => s.internos);
  const dre = useDRE();
  const [gerando, setGerando] = useState(false);

  const exportarPDF = async () => {
    setGerando(true);
    try {
      const [{ generateDreBlob }, { downloadBlob, fileBase, loadLogoDataUrl }] =
        await Promise.all([import("@/lib/pdf/dre"), import("@/lib/export")]);
      const logoDataUrl = await loadLogoDataUrl();
      const blob = await generateDreBlob({ proj, dre, logoDataUrl });
      downloadBlob(blob, `DRE_${fileBase(proj)}.pdf`);
      toast.success("DRE em PDF gerado.");
    } catch {
      toast.error("Não foi possível gerar o PDF do DRE.");
    } finally {
      setGerando(false);
    }
  };

  const exportarCSV = async () => {
    try {
      const { downloadBlob, fileBase, projetoToCsv } = await import("@/lib/export");
      const csv = projetoToCsv(proj, dre, externos, internos);
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${fileBase(proj)}.csv`);
      toast.success("CSV exportado.");
    } catch {
      toast.error("Não foi possível exportar o CSV.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Demonstrativo de resultado do projeto. Exporte em PDF ou CSV.
        </p>
        <div className="flex gap-2">
          <button
            onClick={exportarCSV}
            className="text-sm px-3 py-1.5 rounded-md border border-input bg-card hover:bg-muted"
          >
            Exportar CSV
          </button>
          <button
            onClick={exportarPDF}
            disabled={gerando}
            className="text-sm px-3 py-1.5 rounded-md text-neutral-900 font-medium hover:opacity-90 bg-acid disabled:opacity-60"
          >
            {gerando ? "Gerando…" : "PDF do DRE"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2">
        <Section title={`DRE — ${proj.cliente} · ${proj.projeto} · ${proj.numeroServico}`}>
          <div className="border border-border rounded-lg overflow-hidden">
            <Row label="Receita Bruta" value={formatBRL(dre.receitaBruta)} strong />
            <Row label={`Impostos (${proj.impostosPct}%)`} value={formatBRL(dre.impostos)} neg />
            <Row label="Receita Líquida" value={formatBRL(dre.receitaLiquida)} strong />
            <Row label={`Comissão / 3rd Party Fee (${proj.comissaoPct}% s/ líquida)`} value={formatBRL(dre.comissao)} neg />
            <Row label="Receita Operacional" value={formatBRL(dre.receitaOperacional)} strong />
            <Row label="Custos Externos" value={formatBRL(dre.custosExternos)} neg />
            <Row label="Staff Interno ACID" value={formatBRL(dre.staffInterno)} neg />
            <Row label={`Overhead (${proj.overheadPct}% s/ staff)`} value={formatBRL(dre.overhead)} neg />
            <Row label="Lucro Operacional" value={formatBRL(dre.lucroOperacional)} strong tone={dre.lucroOperacional >= 0 ? "pos" : "neg"} />
            <Row label="Margem sobre Receita Bruta" value={formatPct(dre.margemBruta)} sub />
            <Row label="Margem Operacional" value={formatPct(dre.margemOperacional)} sub />
            <Row label="Retido na ACID (staff + overhead + lucro)" value={formatBRL(dre.retidoACID)} sub />
          </div>
        </Section>
      </div>
      <div className="space-y-5">
        <Section title="Repasse × Retido">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Governo (impostos)</span><b className="tabular-nums">{formatBRL0(dre.impostos)}</b></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Comissão</span><b className="tabular-nums">{formatBRL0(dre.comissao)}</b></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Repasses externos</span><b className="tabular-nums">{formatBRL0(dre.custosExternos)}</b></div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="font-semibold">Fica na ACID</span>
              <b className="tabular-nums text-acid-dark">{formatBRL0(dre.retidoACID)}</b>
            </div>
            <div className="text-xs text-muted-foreground">
              = staff interno + overhead + lucro operacional ({formatPct(dre.pctRetido)} da receita bruta)
            </div>
          </div>
        </Section>
        <Section title="Saúde da margem">
          <Gauge value={dre.margemOperacional} />
        </Section>
      </div>
      </div>
    </div>
  );
}
