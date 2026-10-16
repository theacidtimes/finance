"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, FileDown, Plus, Star, X } from "lucide-react";
import { Section, KPI, NumInput, TextInput, Select } from "@/components/ui/primitives";
import { useProjetoStore } from "@/lib/store";
import {
  calcularCrono,
  coresPorResponsavel,
  cronoVazio,
  dataCurta,
  diasEntre,
  ehDiaUtil,
  formatDuracao,
  marcosParaProposta,
  modeloProducaoIA,
  novaTarefa,
  proximoDiaUtil,
  somaDias,
  COR_SEM_RESPONSAVEL,
  RESPONSAVEL_ACID,
  STATUS_TAREFA,
  type CronoCalculado,
  type CorResponsavel,
} from "@/lib/crono";
import type { CronogramaProducao, StatusTarefa } from "@/types";
import { cn } from "@/lib/utils";

const th = "text-left text-[11px] uppercase tracking-widest text-muted-foreground font-medium px-2 py-2";
const td = "px-1.5 py-1 align-middle";

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Primeiro uso: modelo pronto ou tabela em branco. */
function Vazio() {
  const proj = useProjetoStore((s) => s.proj);
  const setCrono = useProjetoStore((s) => s.setCrono);
  const inicio = proximoDiaUtil(hojeISO(), true);
  return (
    <Section title="Cronograma de produção">
      <div className="py-8 text-center max-w-xl mx-auto">
        <p className="text-sm text-muted-foreground">
          Monte o cronograma por tarefas com duração em dias úteis. Cada tarefa começa quando a
          predecessora termina — mudou uma duração, o resto se ajusta sozinho.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          <button
            onClick={() =>
              setCrono(modeloProducaoIA({ cliente: proj.cliente, marca: proj.marca, inicio }))
            }
            className="text-sm px-4 py-2 rounded-md bg-foreground text-background hover:opacity-80"
          >
            Usar modelo de produção com IA
          </button>
          <button
            onClick={() => setCrono(cronoVazio(inicio))}
            className="text-sm px-4 py-2 rounded-md border border-input hover:bg-muted"
          >
            Começar em branco
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground/70 mt-3">
          O modelo traz setup, stills, motion e finalização com duas rodadas de validação, já com{" "}
          {proj.cliente || "o cliente"}
          {proj.marca ? ` e ${proj.marca}` : ""} nas aprovações.
        </p>
      </div>
    </Section>
  );
}

/** Linha do tempo: barras em dias corridos, com fim de semana e feriado sombreados. */
function LinhaDoTempo({
  crono,
  calc,
  cores,
}: {
  crono: CronogramaProducao;
  calc: CronoCalculado;
  cores: Map<string, CorResponsavel>;
}) {
  const { projeto, linhas } = calc;
  const total = Math.max(1, diasEntre(projeto.inicio, projeto.fim) + 1);
  const dias = Array.from({ length: total }, (_, i) => somaDias(projeto.inicio, i));
  const pct = (n: number) => `${(n / total) * 100}%`;
  const hoje = hojeISO();
  const iHoje = diasEntre(projeto.inicio, hoje);
  const porDia = total <= 45;

  const Fundo = () => (
    <>
      {dias.map((d, i) =>
        ehDiaUtil(d, crono.pularFeriados) ? null : (
          <div key={d} className="absolute inset-y-0 bg-muted" style={{ left: pct(i), width: pct(1) }} />
        )
      )}
      {iHoje >= 0 && iHoje < total && (
        <div className="absolute inset-y-0 w-px bg-danger/70" style={{ left: pct(iHoje + 0.5) }} />
      )}
    </>
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="flex text-[10px] text-muted-foreground">
          <div className="w-56 shrink-0" />
          <div className="relative flex-1 h-5">
            {dias.map((d, i) => {
              const seg = new Date(`${d}T12:00:00Z`).getUTCDay() === 1;
              if (!porDia && !(seg || i === 0)) return null;
              return (
                <span
                  key={d}
                  className={cn(
                    "absolute top-0 tabular-nums",
                    porDia && "text-center",
                    !ehDiaUtil(d, crono.pularFeriados) && "opacity-40"
                  )}
                  style={{ left: pct(i), width: porDia ? pct(1) : undefined }}
                >
                  {porDia ? d.slice(8) : `${d.slice(8)}/${d.slice(5, 7)}`}
                </span>
              );
            })}
          </div>
        </div>
        {linhas.map((l) => {
          const t = l.tarefa;
          const fase = t.tipo === "fase";
          if (fase && l.duracao === 0) return null;
          const cor = cores.get(t.responsavel.trim()) ?? COR_SEM_RESPONSAVEL;
          const left = diasEntre(projeto.inicio, l.inicio);
          const width = diasEntre(l.inicio, l.fim) + 1;
          return (
            <div key={t.id} className="flex items-center border-t border-border/40">
              <div
                className={cn(
                  "w-56 shrink-0 truncate text-xs py-1 pr-2",
                  fase ? "font-semibold" : "pl-3",
                  t.entrega && "font-semibold"
                )}
                title={t.nome}
              >
                {t.nome || "—"}
              </div>
              <div className="relative flex-1 h-6">
                <Fundo />
                <div
                  className={cn(
                    "absolute rounded-sm",
                    fase ? "top-2.5 h-1 bg-foreground" : "top-1 bottom-1",
                    t.status === "Concluído" && "opacity-40"
                  )}
                  style={{
                    left: pct(left),
                    width: pct(width),
                    background: fase ? undefined : cor.barra,
                  }}
                  title={`${dataCurta(l.inicio)} – ${dataCurta(l.fim)} · ${t.responsavel}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * `comProposta` = false no acesso do GP: ele não enxerga nem grava a proposta,
 * então o botão que preenche os marcos dela não aparece.
 */
export function Cronograma({ comProposta = true }: { comProposta?: boolean } = {}) {
  const proj = useProjetoStore((s) => s.proj);
  const crono = useProjetoStore((s) => s.crono);
  const cronogramaProposta = useProjetoStore((s) => s.cronograma);
  const setCrono = useProjetoStore((s) => s.setCrono);
  const setCronoField = useProjetoStore((s) => s.setCronoField);
  const addTarefa = useProjetoStore((s) => s.addTarefa);
  const updateTarefa = useProjetoStore((s) => s.updateTarefa);
  const removeTarefa = useProjetoStore((s) => s.removeTarefa);
  const moveTarefa = useProjetoStore((s) => s.moveTarefa);
  const setMarcos = useProjetoStore((s) => s.setMarcos);
  const [gerando, setGerando] = useState(false);

  const calc = useMemo(() => (crono ? calcularCrono(crono) : null), [crono]);
  const cores = useMemo(() => coresPorResponsavel(crono?.tarefas ?? []), [crono]);

  if (!crono || !calc) return <Vazio />;

  const tarefas = crono.tarefas;
  const ultimaTarefa = [...tarefas].reverse().find((t) => t.tipo === "tarefa");

  // Sugestões do campo responsável: quem já está no crono + as partes do projeto.
  const sugestoes = [
    RESPONSAVEL_ACID,
    proj.cliente,
    proj.marca,
    proj.marca && proj.cliente && proj.marca !== proj.cliente ? `${proj.marca} + ${proj.cliente}` : "",
    ...tarefas.map((t) => t.responsavel),
  ]
    .map((x) => (x ?? "").trim())
    .filter((x, i, a) => x && a.indexOf(x) === i);

  const gerarPDF = async () => {
    setGerando(true);
    try {
      const [{ generateCronoBlob }, { downloadBlob, fileBase, loadLogoDataUrl }] = await Promise.all([
        import("@/lib/pdf/crono"),
        import("@/lib/export"),
      ]);
      const blob = await generateCronoBlob({ proj, crono, logoDataUrl: await loadLogoDataUrl() });
      downloadBlob(blob, `Cronograma_${fileBase(proj)}.pdf`);
      toast.success("Cronograma em PDF gerado.");
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerando(false);
    }
  };

  const levarParaProposta = () => {
    const marcos = marcosParaProposta(crono);
    if (!marcos.length) {
      toast.error("Marque ao menos uma entrega (★) ou crie fases com tarefas.");
      return;
    }
    const temMarcos = cronogramaProposta.some((m) => m.data.trim() || m.marco.trim());
    if (temMarcos && !window.confirm("Substituir os marcos do bloco Cronograma da proposta?")) return;
    setMarcos(marcos);
    toast.success(`${marcos.length} marcos enviados para a proposta.`);
  };

  const recomecar = () => {
    if (!window.confirm("Apagar o cronograma inteiro deste projeto?")) return;
    setCrono(null);
  };

  const comCiclo = calc.linhas.some((l) => l.ciclo);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Início" value={dataCurta(calc.projeto.inicio)} />
        <KPI label="Fim" value={dataCurta(calc.projeto.fim)} />
        <KPI label="Duração" value={`${formatDuracao(calc.projeto.duracao)} úteis`} />
        <KPI
          label="Concluído"
          value={`${Math.round(calc.projeto.pct)}%`}
          tone={calc.projeto.pct >= 100 ? "pos" : undefined}
        />
      </div>

      <Section
        title="Cronograma de produção"
        right={
          <div className="flex flex-wrap items-center gap-2">
            {comProposta && (
              <button
                onClick={levarParaProposta}
                className="text-xs px-3 py-1.5 rounded-md border border-input hover:bg-muted"
                title="Preenche o bloco Cronograma da proposta com as entregas (★)"
              >
                Levar entregas para a proposta
              </button>
            )}
            <button
              onClick={gerarPDF}
              disabled={gerando || !tarefas.length}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-80 disabled:opacity-40"
            >
              <FileDown className="h-3.5 w-3.5" />
              {gerando ? "Gerando…" : "Exportar PDF"}
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-end gap-4 mb-4">
          <label className="block">
            <span className="text-[11px] tracking-widest uppercase text-muted-foreground">Início do projeto</span>
            <input
              type="date"
              value={crono.inicio}
              onChange={(e) => e.target.value && setCronoField("inicio", e.target.value)}
              className="mt-1 block border border-input rounded-md px-2 py-1 text-sm bg-card tabular-nums"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground pb-1.5">
            <input
              type="checkbox"
              checked={crono.pularFeriados}
              onChange={(e) => setCronoField("pularFeriados", e.target.checked)}
              className="accent-acid w-3.5 h-3.5"
            />
            Pular feriados nacionais (e Carnaval / Corpus Christi)
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={cn(th, "w-8")}>#</th>
                <th className={th}>Tarefa</th>
                <th className={cn(th, "w-20")}>Duração</th>
                <th className={cn(th, "w-36")}>Início</th>
                <th className={cn(th, "w-24")}>Fim</th>
                <th className={cn(th, "w-36")}>Predecessora</th>
                <th className={cn(th, "w-44")}>Responsável</th>
                <th className={cn(th, "w-32")}>Status</th>
                <th className={cn(th, "w-16")}>%</th>
                <th className={cn(th, "w-28")}></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border bg-foreground text-background font-semibold">
                <td className={cn(td, "px-2 text-xs tabular-nums")}>1</td>
                <td className={cn(td, "px-2")}>{[proj.cliente, proj.projeto].filter(Boolean).join(" — ") || "Projeto"}</td>
                <td className={cn(td, "px-2 tabular-nums")}>{formatDuracao(calc.projeto.duracao)}</td>
                <td className={cn(td, "px-2 tabular-nums")}>{dataCurta(calc.projeto.inicio)}</td>
                <td className={cn(td, "px-2 tabular-nums")}>{dataCurta(calc.projeto.fim)}</td>
                <td className={td} colSpan={3}></td>
                <td className={cn(td, "px-2 tabular-nums")}>{Math.round(calc.projeto.pct)}%</td>
                <td className={td}></td>
              </tr>
              {calc.linhas.map((l, idx) => {
                const t = l.tarefa;
                const fase = t.tipo === "fase";
                const cor = cores.get(t.responsavel.trim()) ?? COR_SEM_RESPONSAVEL;
                const fundo = fase ? undefined : t.entrega ? cor.forte : cor.fundo;
                return (
                  <tr
                    key={t.id}
                    className={cn(
                      "border-b border-background",
                      fase && "bg-neutral-800 text-white font-semibold"
                    )}
                    style={fundo ? { background: fundo } : undefined}
                  >
                    <td className={cn(td, "px-2 text-xs tabular-nums", fase ? "text-white/70" : "text-muted-foreground")}>
                      {l.numero}
                    </td>
                    <td className={cn(td, l.nivel === 2 && "pl-6")}>
                      <TextInput
                        value={t.nome}
                        onChange={(v) => updateTarefa(t.id, { nome: v })}
                        placeholder={fase ? "Nome da fase" : "Tarefa"}
                        className={cn(
                          "bg-transparent border-transparent hover:border-input focus:bg-card",
                          (fase || t.entrega) && "font-semibold",
                          fase && "text-white focus:text-foreground"
                        )}
                      />
                    </td>
                    <td className={td}>
                      {fase ? (
                        <span className="px-2 tabular-nums">{formatDuracao(l.duracao)}</span>
                      ) : (
                        <NumInput
                          value={t.duracao}
                          onChange={(v) => updateTarefa(t.id, { duracao: Math.max(0, v) })}
                          step={0.25}
                          min={0}
                          className="bg-card/70"
                        />
                      )}
                    </td>
                    <td className={td}>
                      {fase ? (
                        <span className="px-2 tabular-nums">{dataCurta(l.inicio)}</span>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <input
                            type="date"
                            value={l.inicio}
                            onChange={(e) =>
                              updateTarefa(t.id, { inicioFixo: e.target.value || undefined })
                            }
                            title={
                              t.inicioFixo
                                ? `Não começa antes de ${dataCurta(t.inicioFixo)}`
                                : "Calculada pela predecessora — escolher uma data fixa o início"
                            }
                            className={cn(
                              "border rounded-md px-1 py-1 text-xs tabular-nums w-full",
                              t.inicioFixo ? "border-amber-400 bg-amber-50" : "border-input bg-card/70"
                            )}
                          />
                          {t.inicioFixo && (
                            <button
                              onClick={() => updateTarefa(t.id, { inicioFixo: undefined })}
                              className="text-muted-foreground hover:text-danger"
                              title="Voltar a calcular pela predecessora"
                              aria-label="Soltar data fixa"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={cn(td, "px-2 tabular-nums")}>{dataCurta(l.fim)}</td>
                    <td className={td}>
                      {fase ? null : (
                        <select
                          value={t.predecessora ?? ""}
                          onChange={(e) => updateTarefa(t.id, { predecessora: e.target.value || null })}
                          className={cn(
                            "border rounded-md px-1 py-1 text-xs w-full bg-card/70",
                            l.ciclo ? "border-danger text-danger" : "border-input"
                          )}
                          title={l.ciclo ? "Essa predecessora forma um ciclo e foi ignorada" : undefined}
                        >
                          <option value="">—</option>
                          {calc.linhas
                            .filter((o) => o.tarefa.id !== t.id)
                            .map((o) => (
                              <option key={o.tarefa.id} value={o.tarefa.id}>
                                {o.numero} · {o.tarefa.nome || (o.tarefa.tipo === "fase" ? "fase" : "tarefa")}
                              </option>
                            ))}
                        </select>
                      )}
                    </td>
                    <td className={td}>
                      {fase ? null : (
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: cor.barra }} />
                          <TextInput
                            value={t.responsavel}
                            onChange={(v) => updateTarefa(t.id, { responsavel: v })}
                            list="crono-responsaveis"
                            className="bg-card/70 text-xs"
                          />
                        </div>
                      )}
                    </td>
                    <td className={td}>
                      {fase ? null : (
                        <Select
                          value={t.status}
                          onChange={(v) => updateTarefa(t.id, { status: v as StatusTarefa })}
                          options={STATUS_TAREFA}
                          className="bg-card/70 text-xs py-1"
                        />
                      )}
                    </td>
                    <td className={td}>
                      {fase ? (
                        <span className="px-2 tabular-nums">{Math.round(l.pct)}%</span>
                      ) : (
                        <NumInput
                          value={t.pct}
                          onChange={(v) => updateTarefa(t.id, { pct: v })}
                          min={0}
                          max={100}
                          step={10}
                          className="bg-card/70"
                        />
                      )}
                    </td>
                    <td className={td}>
                      <div className={cn("flex items-center justify-end gap-0.5", fase ? "text-white/70" : "text-muted-foreground")}>
                        {!fase && (
                          <button
                            onClick={() => updateTarefa(t.id, { entrega: !t.entrega })}
                            className={cn("p-1 rounded hover:bg-black/5", t.entrega && "text-amber-500")}
                            title={t.entrega ? "Entrega (sai em destaque e vai para a proposta)" : "Marcar como entrega"}
                            aria-label="Entrega"
                          >
                            <Star className="h-3.5 w-3.5" fill={t.entrega ? "currentColor" : "none"} />
                          </button>
                        )}
                        <button
                          onClick={() => addTarefa(novaTarefa(fase ? undefined : t, "tarefa"), t.id)}
                          className="p-1 rounded hover:bg-black/5"
                          title="Inserir tarefa abaixo"
                          aria-label="Inserir tarefa abaixo"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveTarefa(t.id, -1)}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-black/5 disabled:opacity-30"
                          aria-label="Subir"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveTarefa(t.id, 1)}
                          disabled={idx === tarefas.length - 1}
                          className="p-1 rounded hover:bg-black/5 disabled:opacity-30"
                          aria-label="Descer"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeTarefa(t.id)}
                          className="p-1 rounded hover:bg-black/5 hover:text-danger"
                          aria-label="Remover"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <datalist id="crono-responsaveis">
            {sugestoes.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            onClick={() => addTarefa(novaTarefa(undefined, "fase"))}
            className="text-xs px-3 py-1.5 rounded-md border border-input hover:bg-muted"
          >
            + Fase
          </button>
          <button
            onClick={() => addTarefa(novaTarefa(ultimaTarefa, "tarefa"))}
            className="text-xs px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-80"
          >
            + Tarefa
          </button>
          <button
            onClick={recomecar}
            className="text-xs px-3 py-1.5 rounded-md text-muted-foreground hover:text-danger ml-auto"
          >
            Apagar cronograma
          </button>
        </div>

        {comCiclo && (
          <p className="text-xs text-danger mt-3">
            Há predecessora em ciclo (uma tarefa depende de outra que depende dela). Ela foi ignorada no cálculo.
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Duração em dias úteis — 0,5 é meio período. Início e fim são calculados: a tarefa começa quando a
          predecessora termina. Escolher uma data no início fixa um “não antes de” (fica em amarelo). ★ marca as
          entregas: saem em destaque no PDF{comProposta ? " e vão para a proposta" : ""}.
        </p>
      </Section>

      {tarefas.length > 0 && (
        <Section title="Linha do tempo">
          <LinhaDoTempo crono={crono} calc={calc} cores={cores} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-muted-foreground">
            {[...cores.entries()].map(([nome, c]) => (
              <span key={nome} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.barra }} />
                {nome}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-muted border border-border" />
              Fim de semana / feriado
            </span>
          </div>
        </Section>
      )}
    </div>
  );
}
