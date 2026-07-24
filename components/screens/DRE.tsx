"use client";

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
  const dre = useDRE();

  return (
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
  );
}
