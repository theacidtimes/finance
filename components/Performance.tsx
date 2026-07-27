"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Section, KPI } from "@/components/ui/primitives";
import { formatBRL0, formatPct } from "@/utils/format";
import { cn } from "@/lib/utils";
import {
  BETA_BONUS,
  STATUS_REALIZADO,
  anoDoProjeto,
  computePerformance,
  type PessoaPerf,
  type ProjetoBruto,
} from "@/lib/performance";
import type { TeamMember } from "@/types";

const FILTROS = {
  ganhos: { label: "Trabalho ganho", status: [...STATUS_REALIZADO] },
  entregues: { label: "Só entregues", status: ["Entregue"] },
} as const;

type FiltroKey = keyof typeof FILTROS;

const horas = (h: number) => `${h.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} h`;

export function Performance({
  projetos,
  time,
  userEmail,
}: {
  projetos: ProjetoBruto[];
  time: TeamMember[];
  userEmail: string;
}) {
  const router = useRouter();

  const anos = useMemo(() => {
    const s = new Set<number>();
    for (const p of projetos) {
      const a = anoDoProjeto(p.proj.data);
      if (a) s.add(a);
    }
    s.add(new Date().getFullYear());
    return [...s].sort((a, b) => b - a);
  }, [projetos]);

  const [ano, setAno] = useState(() => {
    const atual = new Date().getFullYear();
    const comData = projetos.map((p) => anoDoProjeto(p.proj.data)).filter(Boolean) as number[];
    return comData.includes(atual) ? atual : Math.max(atual, ...comData);
  });
  const [filtro, setFiltro] = useState<FiltroKey>("ganhos");

  const semData = useMemo(
    () => projetos.filter((p) => !anoDoProjeto(p.proj.data)).length,
    [projetos]
  );

  const perf = useMemo(() => {
    const status = FILTROS[filtro].status as readonly string[];
    const doAno = projetos.filter(
      (p) => anoDoProjeto(p.proj.data) === ano && status.includes(p.proj.status)
    );
    return computePerformance(doAno, time, ano);
  }, [projetos, time, ano, filtro]);

  const diferenca = perf.lucroCaixa - perf.lucroDRE;
  const comFundo = perf.pessoas.filter((p) => p.temContratoFixo);
  const avulsos = perf.pessoas.filter((p) => !p.temContratoFixo);

  // Horas lançadas sem vínculo com o cadastro de time não têm como virar fundo:
  // não dá para saber quanto a pessoa custa em caixa. Se houver muitas, o fundo
  // inteiro lê zero e a tela parece quebrada — então avisamos em vez de calar.
  const soltas = avulsos.filter((p) => !p.teamMemberId && p.horas > 0);
  const horasSoltas = soltas.reduce((s, p) => s + p.horas, 0);

  return (
    <AppShell userEmail={userEmail}>
      <div className="space-y-6">
        {/* ---------- cabeçalho ---------- */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Performance</h1>
            <p className="text-sm text-muted-foreground mt-1 tabular-nums">
              {perf.projetos.length} projeto(s) em {ano}
              {semData > 0 && ` · ${semData} sem data (fora da conta)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-border overflow-hidden">
              {(Object.keys(FILTROS) as FiltroKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setFiltro(k)}
                  className={cn(
                    "text-xs px-3 py-2 transition-colors",
                    filtro === k
                      ? "bg-foreground text-background font-semibold"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {FILTROS[k].label}
                </button>
              ))}
            </div>
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="border border-input rounded-xl px-3 py-2 text-sm bg-card tabular-nums"
            >
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ---------- bentos ---------- */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KPI label="Receita bruta" value={formatBRL0(perf.receitaBruta)} />
          <KPI
            label="Receita operacional"
            value={formatBRL0(perf.receitaOperacional)}
            sub="após impostos e comissão"
          />
          <KPI
            label="Custos externos"
            value={formatBRL0(perf.custosExternos)}
            sub={
              perf.receitaBruta > 0
                ? `${formatPct(perf.custosExternos / perf.receitaBruta)} da bruta`
                : undefined
            }
          />
          <KPI
            label="Lucro DRE"
            value={formatBRL0(perf.lucroDRE)}
            sub="depois de staff e overhead"
            tone={perf.lucroDRE >= 0 ? "pos" : "neg"}
          />
          <KPI
            label="Resultado de caixa"
            value={formatBRL0(perf.lucroCaixa)}
            sub="antes da casa e da sua retirada"
            tone={perf.lucroCaixa >= 0 ? "pos" : "neg"}
          />
          <KPI
            label="Margem operacional"
            value={formatPct(perf.margemMedia)}
            sub="ponderada pelo porte"
            tone={perf.margemMedia >= 0.3 ? "pos" : perf.margemMedia < 0.2 ? "neg" : undefined}
          />
        </div>

        {/* ---------- fundo de bônus ---------- */}
        <Section
          title="Fundo de bônus"
          right={
            <span className="text-[11px] text-muted-foreground">β = {formatPct(BETA_BONUS, 0)}</span>
          }
        >
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Os projetos são cobrados pelo custo/hora <b className="text-foreground">carregado</b>,
            acima do que sai do caixa. Esse spread é o fundo. O bônus é{" "}
            {formatPct(BETA_BONUS, 0)} do fundo, liberado só com resultado de caixa positivo.
          </p>

          {horasSoltas > 0 && (
            <div className="rounded-xl border border-danger/40 bg-danger/5 p-3 mb-4">
              <p className="text-xs leading-relaxed">
                <b>{horas(horasSoltas)}</b> em {soltas.length} lançamento(s) sem vínculo com o
                cadastro de time ({soltas.map((p) => p.nome).join(", ")}). Sem saber a quem essas
                horas pertencem não dá para saber o custo em caixa — elas{" "}
                <b>não entram no fundo</b>. Vincule a pessoa em Pessoas &amp; Custos de cada
                projeto para o fundo refletir a realidade.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            <KPI
              label="Fundo do ano"
              value={formatBRL0(perf.fundoTotal)}
              tone={perf.fundoTotal >= 0 ? "pos" : "neg"}
            />
            <KPI
              label="Bônus a distribuir"
              value={formatBRL0(perf.bonusLiberado ? perf.bonusTotal : 0)}
              sub={
                perf.bonusLiberado
                  ? undefined
                  : `${formatBRL0(perf.bonusTotal)} bloqueado — caixa negativo`
              }
              tone={perf.bonusLiberado && perf.bonusTotal > 0 ? "pos" : undefined}
            />
            <KPI
              label="Fica de colchão"
              value={formatBRL0(Math.max(0, perf.fundoTotal) - perf.bonusTotal)}
            />
          </div>

          {comFundo.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma pessoa com contrato fixo ativa em {ano}.
            </p>
          ) : (
            <div className="space-y-3">
              {comFundo.map((p) => (
                <PessoaCard key={p.teamMemberId ?? p.nome} p={p} liberado={perf.bonusLiberado} />
              ))}
            </div>
          )}

          {avulsos.length > 0 && (
            <div className="mt-5 pt-4 border-t border-border">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                Fora do fundo
              </div>
              <div className="space-y-1.5">
                {avulsos.map((p) => (
                  <div
                    key={p.teamMemberId ?? p.nome}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm tabular-nums"
                  >
                    <span>
                      {p.nome}
                      <span className="text-xs text-muted-foreground ml-2">
                        {p.motivoSemFundo}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {horas(p.horas)} · {formatBRL0(p.provisao)} cobrado
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ---------- reconciliação DRE x caixa ---------- */}
        <Section title="Por que o DRE e o caixa divergem">
          <div className="space-y-1.5 text-sm tabular-nums">
            <Linha label="Lucro somado dos DREs" valor={perf.lucroDRE} />
            <Linha
              label="+ Staff provisionado (carregado, não é caixa)"
              valor={perf.staffInterno}
            />
            <Linha label="+ Overhead provisionado" valor={perf.overhead} />
            <Linha label="− Custo real do time em caixa" valor={-perf.custoCaixaTime} />
            <div className="flex justify-between border-t border-border pt-2 mt-2 font-semibold">
              <span>Resultado de caixa</span>
              <span className={perf.lucroCaixa >= 0 ? "text-acid-dark" : "text-danger"}>
                {formatBRL0(perf.lucroCaixa)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Diferença de <b className="text-foreground">{formatBRL0(diferenca)}</b> — provisões que
            nunca saíram do caixa. Este resultado ainda{" "}
            <b className="text-foreground">não desconta</b> as despesas fixas da casa (aluguel,
            ferramentas, contabilidade), que o sistema não registra, nem a retirada de sócio — é
            justamente dele que a retirada sai.
          </p>
        </Section>

        {/* ---------- projetos ---------- */}
        <Section title={`Projetos de ${ano}`}>
          {perf.projetos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum projeto neste recorte.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-[11px] uppercase tracking-widest text-muted-foreground text-right">
                    <th className="text-left font-medium pb-2 px-1">Projeto</th>
                    <th className="font-medium pb-2 px-1">Bruto</th>
                    <th className="font-medium pb-2 px-1">Externos</th>
                    <th className="font-medium pb-2 px-1">Staff</th>
                    <th className="font-medium pb-2 px-1">Lucro</th>
                    <th className="font-medium pb-2 px-1">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.projetos.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/projetos/${p.id}`)}
                      className="border-t border-border cursor-pointer hover:bg-muted/50 transition-colors text-right"
                    >
                      <td className="text-left py-2 px-1">
                        <div className="font-medium truncate max-w-[220px]">{p.projeto}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                          {p.cliente} · {p.status}
                        </div>
                      </td>
                      <td className="px-1">{formatBRL0(p.dre.receitaBruta)}</td>
                      <td className="px-1 text-muted-foreground">
                        {formatBRL0(p.dre.custosExternos)}
                      </td>
                      <td className="px-1 text-muted-foreground">
                        {formatBRL0(p.dre.staffInterno)}
                      </td>
                      <td
                        className={cn(
                          "px-1 font-medium",
                          p.dre.lucroOperacional >= 0 ? "text-acid-dark" : "text-danger"
                        )}
                      >
                        {formatBRL0(p.dre.lucroOperacional)}
                      </td>
                      <td className="px-1">{formatPct(p.dre.margemOperacional)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </AppShell>
  );
}

function Linha({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{formatBRL0(valor)}</span>
    </div>
  );
}

/** Cartão por pessoa: horas contra o break-even do próprio custo. */
function PessoaCard({ p, liberado }: { p: PessoaPerf; liberado: boolean }) {
  const be = p.breakEvenHoras ?? 0;
  const fundo = p.fundo ?? 0;
  // Barra: horas trabalhadas contra o break-even. Passou do break-even, sobra fundo.
  const escala = Math.max(be, p.horas, 1);
  const pctHoras = (p.horas / escala) * 100;
  const pctBe = (be / escala) * 100;

  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-medium">{p.nome}</span>
          {p.funcao && <span className="text-xs text-muted-foreground ml-2">{p.funcao}</span>}
        </div>
        <div className="text-sm tabular-nums">
          <span className={fundo >= 0 ? "text-acid-dark font-semibold" : "text-danger font-semibold"}>
            {formatBRL0(fundo)}
          </span>
          <span className="text-muted-foreground text-xs"> de fundo</span>
        </div>
      </div>

      <div className="relative h-2 rounded-full bg-muted mt-3 overflow-hidden">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", fundo >= 0 ? "bg-acid" : "bg-danger")}
          style={{ width: `${pctHoras}%` }}
        />
        {be > 0 && (
          <div
            className="absolute inset-y-0 w-px bg-foreground"
            style={{ left: `${pctBe}%` }}
            title={`Break-even: ${horas(be)}`}
          />
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-3 text-xs tabular-nums">
        <Dado label="Horas no ano" valor={horas(p.horas)} />
        <Dado
          label="Break-even"
          valor={be > 0 ? horas(be) : "—"}
          hint={p.custoHora > 0 ? `${formatBRL0(p.custoHora)}/h` : undefined}
        />
        <Dado label="Ocupação" valor={p.ocupacao !== null ? formatPct(p.ocupacao) : "—"} />
        <Dado
          label="Bônus"
          valor={formatBRL0(liberado ? p.bonus : 0)}
          hint={liberado ? undefined : "bloqueado"}
        />
      </div>

      <div className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border">
        Cobrado nos projetos {formatBRL0(p.provisao)} · custo em caixa{" "}
        {formatBRL0(p.custoCaixaAno)}
      </div>
    </div>
  );
}

function Dado({ label, valor, hint }: { label: string; valor: string; hint?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">
        {valor}
        {hint && <span className="text-muted-foreground font-normal ml-1">{hint}</span>}
      </div>
    </div>
  );
}
