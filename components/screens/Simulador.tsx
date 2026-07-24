"use client";

import { useMemo, useState } from "react";
import { Section, Field, NumInput, KPI } from "@/components/ui/primitives";
import { useProjetoStore } from "@/lib/store";
import { computeDRE, valorParaMargem } from "@/lib/finance";
import { formatBRL0, formatPct } from "@/utils/format";

interface SimState {
  valorBruto: number;
  impostosPct: number;
  comissaoPct: number;
  overheadPct: number;
  custosExternos: number;
  horasFator: number;
  margemDesejada: number;
}

export function Simulador() {
  const proj = useProjetoStore((s) => s.proj);
  const externos = useProjetoStore((s) => s.externos);
  const internos = useProjetoStore((s) => s.internos);

  const baseSim = (): SimState => ({
    valorBruto: proj.valorBruto,
    impostosPct: proj.impostosPct,
    comissaoPct: proj.comissaoPct,
    overheadPct: proj.overheadPct,
    custosExternos: externos.reduce((s, e) => s + (Number(e.valor) || 0), 0),
    horasFator: 100,
    margemDesejada: 30,
  });

  const [sim, setSim] = useState<SimState>(baseSim);
  const set = <K extends keyof SimState>(k: K, v: number) => setSim((s) => ({ ...s, [k]: v }));

  const dre = useMemo(() => {
    const internosSim = internos.map((p) => ({ ...p, horasProjeto: p.horasProjeto * (sim.horasFator / 100) }));
    return computeDRE({
      valorBruto: sim.valorBruto,
      impostosPct: sim.impostosPct,
      comissaoPct: sim.comissaoPct,
      overheadPct: sim.overheadPct,
      externos: [{ valor: sim.custosExternos }],
      internos: internosSim,
    });
  }, [sim, internos]);

  const alvos = [20, 25, 30, 35, 40];
  const minRecomendado = valorParaMargem(sim.margemDesejada / 100, dre.custoTotal, sim.impostosPct, sim.comissaoPct);

  return (
    <div className="space-y-4">
      <div className="text-xs px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between gap-3">
        <span>Simulação — não altera o projeto.</span>
        <button onClick={() => setSim(baseSim())} className="underline hover:no-underline whitespace-nowrap">
          Restaurar valores do projeto
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title="Variáveis da simulação">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Valor de venda (R$)"><NumInput value={sim.valorBruto} onChange={(v) => set("valorBruto", v)} /></Field>
            <Field label="Custos externos (R$)"><NumInput value={sim.custosExternos} onChange={(v) => set("custosExternos", v)} /></Field>
            <Field label="Impostos (%)"><NumInput value={sim.impostosPct} onChange={(v) => set("impostosPct", v)} /></Field>
            <Field label="Comissão (%)"><NumInput value={sim.comissaoPct} onChange={(v) => set("comissaoPct", v)} /></Field>
            <Field label="Overhead (%)"><NumInput value={sim.overheadPct} onChange={(v) => set("overheadPct", v)} /></Field>
            <Field label="Horas internas (% do plano)"><NumInput value={sim.horasFator} onChange={(v) => set("horasFator", v)} /></Field>
            <Field label="Margem desejada (%)"><NumInput value={sim.margemDesejada} onChange={(v) => set("margemDesejada", v)} /></Field>
          </div>
        </Section>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <KPI label="Lucro resultante" value={formatBRL0(dre.lucroOperacional)} tone={dre.lucroOperacional >= 0 ? "pos" : "neg"} />
            <KPI label="Margem operacional" value={formatPct(dre.margemOperacional)} tone={dre.margemOperacional >= 0.3 ? "pos" : dre.margemOperacional >= 0.2 ? undefined : "neg"} />
            <KPI label="Custo total" value={formatBRL0(dre.custoTotal)} />
            <KPI label={`Mínimo p/ ${sim.margemDesejada}% de margem`} value={formatBRL0(minRecomendado)} tone="pos" />
          </div>

          <Section title="Valor de venda por margem-alvo">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="text-left py-2">Margem operacional</th>
                  <th className="text-right py-2">Valor de venda</th>
                  <th className="text-right py-2">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {alvos.map((m) => {
                  const v = valorParaMargem(m / 100, dre.custoTotal, sim.impostosPct, sim.comissaoPct);
                  const ro = v * (1 - sim.impostosPct / 100) * (1 - sim.comissaoPct / 100);
                  const atingido = sim.valorBruto >= v;
                  return (
                    <tr key={m} className="border-b border-border/50">
                      <td className="py-2">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${atingido ? "bg-acid" : "bg-border"}`} />
                        {m}%
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium">{formatBRL0(v)}</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">{formatBRL0(ro - dre.custoTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>
        </div>
      </div>
    </div>
  );
}
