"use client";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Section, KPI } from "@/components/ui/primitives";
import { Gauge } from "@/components/Gauge";
import { useProjetoStore } from "@/lib/store";
import { useDRE } from "@/lib/useDRE";
import { formatBRL0, formatPct } from "@/utils/format";

const ACID_GREEN_DARK = "#0FB86E";
const RED = "#E5484D";
const GRAYS = ["#111111", "#3D3D3D", "#6B6B6B", "#9C9C9C", "#C9C9C9", "#E8E8E8"];

export function Dashboard() {
  const proj = useProjetoStore((s) => s.proj);
  const dre = useDRE();

  const pieData = [
    { name: "Impostos", value: dre.impostos, color: GRAYS[3] },
    { name: "Comissão", value: dre.comissao, color: GRAYS[2] },
    { name: "Fornecedores externos", value: dre.custosExternos, color: GRAYS[1] },
    { name: "Staff interno", value: dre.staffInterno, color: "#6FD9AE" },
    { name: "Overhead", value: dre.overhead, color: "#3ECf8E" },
    { name: "Lucro ACID", value: Math.max(dre.lucroOperacional, 0), color: ACID_GREEN_DARK },
  ];
  const barData = [
    { name: "Receita", valor: dre.receitaBruta },
    { name: "Custos", valor: dre.custoTotal },
    { name: "Lucro", valor: dre.lucroOperacional },
  ];
  const share = (v: number) => (dre.receitaBruta > 0 ? v / dre.receitaBruta : 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPI label="Receita Bruta" value={formatBRL0(dre.receitaBruta)} />
        <KPI label="Receita Líquida" value={formatBRL0(dre.receitaLiquida)} sub={`impostos ${proj.impostosPct}%`} />
        <KPI label="Comissão" value={formatBRL0(dre.comissao)} sub={`${proj.comissaoPct}% s/ líquida`} />
        <KPI label="Custos Externos" value={formatBRL0(dre.custosExternos)} />
        <KPI label="Staff Interno" value={formatBRL0(dre.staffInterno)} />
        <KPI label="Overhead" value={formatBRL0(dre.overhead)} sub={`${proj.overheadPct}% s/ staff`} />
        <KPI label="Lucro Operacional" value={formatBRL0(dre.lucroOperacional)} tone={dre.lucroOperacional >= 0 ? "pos" : "neg"} />
        <KPI
          label="Margem Operacional"
          value={formatPct(dre.margemOperacional)}
          tone={dre.margemOperacional >= 0.3 ? "pos" : dre.margemOperacional >= 0.2 ? undefined : "neg"}
        />
        <KPI label="Retido na ACID" value={formatBRL0(dre.retidoACID)} sub={`${formatPct(dre.pctRetido)} da receita`} tone="pos" />
        <KPI label="Produção externa" value={formatPct(dre.pctProducaoExterna)} sub="sobre receita bruta" />
      </div>

      <Section title="Para onde vai cada real da receita">
        <div className="flex h-9 rounded-lg overflow-hidden border border-border">
          {pieData.map((d) => (
            <div
              key={d.name}
              title={`${d.name}: ${formatBRL0(d.value)} (${formatPct(share(d.value))})`}
              style={{ width: `${share(d.value) * 100}%`, background: d.color }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs">
          {pieData.map((d) => (
            <span key={d.name} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: d.color }} />
              {d.name} <b className="tabular-nums">{formatPct(share(d.value))}</b>
            </span>
          ))}
        </div>
      </Section>

      <div className="grid md:grid-cols-3 gap-5">
        <Section title="Distribuição da receita">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={1}>
                {pieData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatBRL0(v)} />
            </PieChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Receita × Custos × Lucro">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v / 1000}k`} />
              <Tooltip formatter={(v: number) => formatBRL0(v)} />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                {barData.map((d, i) => (
                  <Cell key={i} fill={d.name === "Lucro" ? (d.valor >= 0 ? ACID_GREEN_DARK : RED) : GRAYS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>

        <Section title="Margem operacional">
          <Gauge value={dre.margemOperacional} />
          <div className="flex justify-between text-[11px] text-muted-foreground mt-2 px-4">
            <span>&lt;20% crítico</span>
            <span>20–30% atenção</span>
            <span>&gt;30% saudável</span>
          </div>
        </Section>
      </div>
    </div>
  );
}
