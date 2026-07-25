"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TextInput } from "@/components/ui/primitives";
import { usePerfil } from "@/components/PerfilProvider";
import { useProjetoStore } from "@/lib/store";
import { useDRE } from "@/lib/useDRE";
import { formatBRL0 } from "@/utils/format";
import type { BlocosProposta } from "@/types";

function Bloco({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-muted-foreground mb-2">
        {n}. {titulo}
      </h4>
      <div className="text-sm leading-relaxed whitespace-pre-wrap">{children}</div>
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
}: {
  editando: boolean;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  if (!editando) {
    return <>{value || <span className="text-muted-foreground/40">—</span>}</>;
  }
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full border border-input rounded-md p-2 text-sm leading-relaxed bg-card focus:outline-none focus:ring-2 focus:ring-ring"
    />
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

  const area = (k: keyof BlocosProposta, rows = 4) => (
    <Area editando={editando} value={blocos[k]} onChange={(v) => setBloco(k, v)} rows={rows} />
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pré-visualização da proposta comercial. &quot;Gerar PDF&quot; baixa o documento pronto para enviar.
        </p>
        <div className="flex gap-2">
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
        <Bloco n="3" titulo="Especificação da entrega">{area("entrega", 2)}</Bloco>

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
        <Bloco n="10" titulo="Imagens e limitações técnicas em IA">{area("clausulaIA", 6)}</Bloco>
        <Bloco n="11" titulo="Materiais de apoio">{area("materiais", 2)}</Bloco>
        <Bloco n="12" titulo="Validade">
          Esta proposta é válida por {proj.validadeProposta} a partir da data de emissão.
        </Bloco>
      </div>
    </div>
  );
}
