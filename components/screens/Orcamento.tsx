"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TextInput } from "@/components/ui/primitives";
import { usePerfil } from "@/components/PerfilProvider";
import { ImportarPedido } from "@/components/screens/ImportarPedido";
import { useProjetoStore } from "@/lib/store";
import { useDRE } from "@/lib/useDRE";
import { formatBRL0 } from "@/utils/format";
import { CATALOGO, TEXTOS_MESTRE, blocosParaProdutos, type ItemProposta } from "@/data/catalogo";
import type { BlocosProposta } from "@/types";

function Bloco({
  n,
  titulo,
  fixo,
  children,
}: {
  n: string;
  titulo: string;
  fixo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h4 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
        {n}. {titulo}
        {fixo && (
          <span
            className="text-[8px] tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border normal-case"
            title="Texto padrão da ACID — editável apenas no texto-mestre (mesmo para todos os projetos)"
          >
            fixo
          </span>
        )}
      </h4>
      <div className="text-sm leading-relaxed whitespace-pre-wrap">{children}</div>
    </div>
  );
}

/** Seletor de produtos do catálogo — regenera os blocos derivados da proposta. */
function SeletorProdutos({
  onAplicar,
}: {
  onAplicar: (itens: ItemProposta[]) => void;
}) {
  const [sel, setSel] = useState<Record<string, number>>({});

  const toggle = (id: string) =>
    setSel((s) => {
      const next = { ...s };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });

  const setQtd = (id: string, q: number) =>
    setSel((s) => ({ ...s, [id]: Math.max(1, q || 1) }));

  const itens: ItemProposta[] = Object.entries(sel).map(([produtoId, quantidade]) => ({
    produtoId,
    quantidade,
  }));

  return (
    <details className="mb-5 rounded-lg border border-border bg-muted/30">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium">
        Inserir produtos do catálogo
        <span className="text-xs text-muted-foreground ml-2">
          preenche serviço, entrega, não incluso e alterações
        </span>
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {CATALOGO.map((p) => {
            const on = Boolean(sel[p.id]);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${
                  on ? "border-acid bg-acid/5" : "border-border bg-card"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(p.id)}
                  className="accent-acid w-4 h-4 shrink-0"
                />
                <span className="flex-1 truncate" title={p.descricao}>
                  {p.label}
                </span>
                {on && (
                  <input
                    type="number"
                    min={1}
                    value={sel[p.id]}
                    onChange={(e) => setQtd(p.id, Number(e.target.value))}
                    className="w-14 border border-input rounded px-1.5 py-0.5 text-sm bg-card tabular-nums"
                    title="Quantidade"
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {itens.length ? `${itens.length} produto(s) selecionado(s)` : "Nenhum produto selecionado"}
          </span>
          <button
            onClick={() => onAplicar(itens)}
            disabled={!itens.length}
            className="text-sm px-3 py-1.5 rounded-md text-neutral-900 font-medium hover:opacity-90 bg-acid disabled:opacity-40"
          >
            Aplicar produtos
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Sobrescreve os blocos derivados. Os textos fixos (cláusula de IA, materiais, cancelamento) não são afetados.
        </p>
      </div>
    </details>
  );
}

/**
 * Separa "Rótulo: valor" para destacar o rótulo em negrito.
 * Devolve null quando a linha não é um campo de ficha (prosa, bullet, URL).
 */
function partesFicha(linha: string): { rotulo: string; valor: string } | null {
  const m = linha.match(/^\s*([^:]{2,32}):\s?(.*)$/);
  if (!m) return null;
  if (m[2].startsWith("//")) return null; // https://… não é rótulo
  return { rotulo: m[1].trim(), valor: m[2] };
}

/**
 * Bloco em formato de ficha (padrão dos PDFs da ACID): um campo por linha,
 * rótulo em negrito. Linhas que não seguem "Rótulo: valor" saem como texto.
 */
function Ficha({ texto }: { texto: string }) {
  if (!texto.trim()) return <span className="text-muted-foreground/40">—</span>;
  return (
    <div className="space-y-0.5">
      {texto.split("\n").map((linha, i) => {
        const p = partesFicha(linha);
        if (!p) return <div key={i}>{linha || "\u00A0"}</div>;
        return (
          <div key={i}>
            <span className="font-semibold">{p.rotulo}:</span>
            {p.valor ? ` ${p.valor}` : ""}
          </div>
        );
      })}
    </div>
  );
}

// Definido fora do componente de tela: se ficasse dentro do corpo de `Orcamento`,
// seria recriado a cada render, desmontando o <textarea> e fazendo perder foco/rolagem.
function Area({
  editando,
  value,
  onChange,
  rows = 4,
  ficha = false,
}: {
  editando: boolean;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  ficha?: boolean;
}) {
  if (!editando) {
    if (ficha) return <Ficha texto={value} />;
    return <>{value || <span className="text-muted-foreground/40">—</span>}</>;
  }
  return (
    <>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full border border-input rounded-md p-2 text-sm leading-relaxed bg-card focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {ficha && (
        <p className="text-[11px] text-muted-foreground mt-1">
          Um campo por linha, no formato <code>Rótulo: valor</code> (ex.:{" "}
          <code>Tempo de uso: 12 meses</code>). O rótulo sai em negrito na proposta.
        </p>
      )}
    </>
  );
}

export function Orcamento() {
  const proj = useProjetoStore((s) => s.proj);
  const blocos = useProjetoStore((s) => s.blocos);
  const cronograma = useProjetoStore((s) => s.cronograma);
  const setP = useProjetoStore((s) => s.setProjField);
  const setBloco = useProjetoStore((s) => s.setBloco);
  const addMarco = useProjetoStore((s) => s.addMarco);
  const updateMarco = useProjetoStore((s) => s.updateMarco);
  const removeMarco = useProjetoStore((s) => s.removeMarco);
  const dre = useDRE();
  const { can } = usePerfil();
  const podeGerar = can("gerar_orcamento");

  const [editando, setEditando] = useState(true);
  const [gerando, setGerando] = useState(false);

  const gerarPDF = async () => {
    setGerando(true);
    try {
      const [{ generatePropostaBlob }, { downloadBlob, fileBase, loadLogoDataUrl }] =
        await Promise.all([import("@/lib/pdf/proposta"), import("@/lib/export")]);
      const logoDataUrl = await loadLogoDataUrl();
      const blob = await generatePropostaBlob({
        proj,
        blocos,
        cronograma,
        receitaBruta: dre.receitaBruta,
        logoDataUrl,
      });
      downloadBlob(blob, `Proposta_${fileBase(proj)}.pdf`);
      toast.success("Proposta em PDF gerada.");
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerando(false);
    }
  };

  const area = (k: keyof BlocosProposta, rows = 4, ficha = false) => (
    <Area
      editando={editando}
      value={blocos[k]}
      onChange={(v) => setBloco(k, v)}
      rows={rows}
      ficha={ficha}
    />
  );

  // Regenera apenas os blocos derivados; os fixos (IA, materiais, cancelamento)
  // vêm do TEXTOS_MESTRE e não passam pelo estado.
  const aplicarProdutos = (itens: ItemProposta[]) => {
    const b = blocosParaProdutos(itens);
    (["servicoInclui", "entrega", "exclusoes", "alteracoes"] as const).forEach((k) => {
      if (b[k].trim()) setBloco(k, b[k]);
    });
    toast.success("Produtos aplicados à proposta.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pré-visualização da proposta comercial. &quot;Gerar PDF&quot; baixa o documento pronto para enviar.
        </p>
        <div className="flex gap-2">
          <ImportarPedido />
          <button
            onClick={() => setEditando((e) => !e)}
            className="text-sm px-3 py-1.5 rounded-md border border-input bg-card hover:bg-muted"
          >
            {editando ? "Modo visualização" : "Editar blocos"}
          </button>
          {podeGerar ? (
            <button
              onClick={gerarPDF}
              disabled={gerando}
              className="text-sm px-3 py-1.5 rounded-md text-neutral-900 font-medium hover:opacity-90 bg-acid disabled:opacity-60"
            >
              {gerando ? "Gerando…" : "Gerar PDF"}
            </button>
          ) : (
            <span
              className="text-xs text-muted-foreground px-3 py-1.5"
              title="Você não tem permissão para gerar orçamento"
            >
              Sem permissão para gerar PDF
            </span>
          )}
        </div>
      </div>

      {editando && <SeletorProdutos onAplicar={aplicarProdutos} />}

      <div className="bg-card border border-border rounded-xl p-8 md:p-12 max-w-3xl mx-auto">
        <div className="border-b-2 border-foreground pb-5 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_acid_tight.png" alt="ACID" className="h-12 w-auto mb-4" />
          <div className="text-sm font-semibold tracking-tight">THE ACID TIMES LTDA</div>
          <div className="text-xs text-muted-foreground mt-0.5">CNPJ: 36.458.402/0001-81</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground mt-4">
            <span><b>Data:</b> {proj.data}</span>
            <span><b>Cliente:</b> {proj.cliente}</span>
            <span><b>Projeto:</b> {proj.projeto} ({proj.numeroServico})</span>
            <span><b>Validade:</b> {proj.validadeProposta}</span>
          </div>

          {editando ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3">
              <label className="text-xs">
                <span className="text-muted-foreground">Roteiro aprovado — link</span>
                <TextInput
                  value={proj.roteiroUrl ?? ""}
                  onChange={(v) => setP("roteiroUrl", v)}
                  placeholder="https://docs.google.com/…"
                />
              </label>
              <label className="text-xs">
                <span className="text-muted-foreground">Rótulo do link (opcional)</span>
                <TextInput
                  value={proj.roteiroLabel ?? ""}
                  onChange={(v) => setP("roteiroLabel", v)}
                  placeholder="Roteiro v3 — aprovado 20/07"
                />
              </label>
            </div>
          ) : proj.roteiroUrl && proj.roteiroUrl.trim() ? (
            <div className="text-xs text-muted-foreground mt-3">
              <b>Roteiro de referência:</b>{" "}
              <a
                href={proj.roteiroUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0FB86E] underline hover:opacity-80"
              >
                {proj.roteiroLabel?.trim() ? proj.roteiroLabel : proj.roteiroUrl}
              </a>
            </div>
          ) : null}
        </div>

        <div className="mb-8">
          {editando ? (
            <textarea
              value={proj.titulo}
              onChange={(e) => setP("titulo", e.target.value)}
              rows={2}
              className="w-full border border-input rounded-md p-2 text-lg font-semibold leading-snug bg-card"
            />
          ) : (
            <h2 className="text-xl font-semibold leading-snug">{proj.titulo}</h2>
          )}
        </div>

        <Bloco n="1" titulo="Projeto">{proj.projeto} — {proj.tipo} para {proj.cliente}.</Bloco>
        <Bloco n="2" titulo="O serviço inclui">{area("servicoInclui", 16)}</Bloco>
        <Bloco n="3" titulo="Especificação da entrega">{area("entrega", 8, true)}</Bloco>

        <Bloco n="4" titulo="Investimento">
          <div className="border border-foreground rounded-lg px-5 py-4 flex items-baseline justify-between">
            <span className="text-sm">Investimento total do projeto</span>
            <span className="text-2xl font-bold tabular-nums">{formatBRL0(dre.receitaBruta)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Valor bruto, impostos inclusos.</p>
        </Bloco>

        <Bloco n="5" titulo="Condições de pagamento">
          {editando ? <TextInput value={proj.condicaoPagamento} onChange={(v) => setP("condicaoPagamento", v)} /> : proj.condicaoPagamento}
        </Bloco>

        <Bloco n="6" titulo="Cronograma">
          <div className="space-y-1.5">
            {cronograma.map((m, i) => (
              <div key={i} className="flex gap-2 items-center text-sm">
                {editando ? (
                  <>
                    <span className="w-24 shrink-0"><TextInput value={m.data} onChange={(v) => updateMarco(i, { data: v })} /></span>
                    <TextInput value={m.marco} onChange={(v) => updateMarco(i, { marco: v })} />
                    <button onClick={() => removeMarco(i)} className="text-muted-foreground hover:text-danger px-1" aria-label="Remover">×</button>
                  </>
                ) : (
                  <>
                    <b className="w-20 shrink-0 tabular-nums">{m.data}</b>
                    <span>{m.marco}</span>
                  </>
                )}
              </div>
            ))}
            {editando && (
              <button onClick={addMarco} className="text-xs mt-2 px-2 py-1 rounded border border-input hover:bg-muted">
                + marco
              </button>
            )}
          </div>
        </Bloco>

        <Bloco n="7" titulo="Não está incluso">{area("exclusoes", 4)}</Bloco>
        <Bloco n="8" titulo="Alterações e refações">{area("alteracoes", 5)}</Bloco>
        <Bloco n="9" titulo="Observações">{area("observacoes", 2)}</Bloco>
        <Bloco n="10" titulo="Cancelamento" fixo>{TEXTOS_MESTRE.cancelamento}</Bloco>
        <Bloco n="11" titulo="Imagens e limitações técnicas em IA" fixo>{TEXTOS_MESTRE.clausulaIA}</Bloco>
        <Bloco n="12" titulo="Materiais de apoio" fixo>{TEXTOS_MESTRE.materiais}</Bloco>
        <Bloco n="13" titulo="Validade">
          Esta proposta é válida por {proj.validadeProposta} a partir da data de emissão.
        </Bloco>
      </div>
    </div>
  );
}
