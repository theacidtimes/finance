"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useProjetoStore } from "@/lib/store";
import {
  BRIEFING_VAZIO,
  CAMPOS_BRIEFING,
  briefingParaProposta,
  entregaDoBriefing,
  type BriefingDados,
  type CampoBriefing,
} from "@/data/briefing";
import {
  CATALOGO_POR_ID,
  blocosParaProdutos,
  type ItemProposta,
} from "@/data/catalogo";
import type { BlocosProposta } from "@/types";

type Etapa = "entrada" | "revisao";

/** Lê um File como base64 puro (sem o prefixo data:...;base64,). */
function fileParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result);
      const comma = res.indexOf(",");
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function escopoResumo(itens: ItemProposta[]): string {
  if (!itens.length) return "—";
  return itens
    .map((it) => {
      const p = CATALOGO_POR_ID[it.produtoId];
      const label = p ? p.label : it.produtoId;
      const q = it.quantidade ?? 1;
      return q > 1 ? `${label} (${q}x)` : label;
    })
    .join(", ");
}

export function ImportarPedido() {
  const setProjField = useProjetoStore((s) => s.setProjField);
  const setBloco = useProjetoStore((s) => s.setBloco);

  const [aberto, setAberto] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("entrada");
  const [texto, setTexto] = useState("");
  const [pdfNome, setPdfNome] = useState("");
  const [pdfBase64, setPdfBase64] = useState("");
  const [extraindo, setExtraindo] = useState(false);
  const [dados, setDados] = useState<BriefingDados>(BRIEFING_VAZIO);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setEtapa("entrada");
    setTexto("");
    setPdfNome("");
    setPdfBase64("");
    setDados(BRIEFING_VAZIO);
    setExtraindo(false);
  };

  const fechar = () => {
    setAberto(false);
    reset();
  };

  const onPickPdf = async (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Selecione um arquivo PDF.");
      return;
    }
    try {
      const b64 = await fileParaBase64(file);
      setPdfBase64(b64);
      setPdfNome(file.name);
    } catch {
      toast.error("Não foi possível ler o PDF.");
    }
  };

  const extrair = async () => {
    if (!texto.trim() && !pdfBase64) {
      toast.error("Cole o e-mail do cliente ou anexe o PDF do pedido.");
      return;
    }
    setExtraindo(true);
    try {
      const res = await fetch("/api/pedido/extrair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto.trim(), pdfBase64 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao extrair o pedido.");
      setDados({ ...BRIEFING_VAZIO, ...json.dados });
      setEtapa("revisao");
      toast.success("Pedido extraído. Revise antes de aplicar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao extrair o pedido.");
    } finally {
      setExtraindo(false);
    }
  };

  const setCampo = (k: keyof BriefingDados, v: string) =>
    setDados((d) => ({ ...d, [k]: v }));

  const aplicar = () => {
    const { projPatch, itens, entrega } = briefingParaProposta(dados);

    // 1) Patch do projeto (cliente, projeto, roteiro, condição de pagamento).
    (Object.keys(projPatch) as (keyof typeof projPatch)[]).forEach((k) => {
      const v = projPatch[k];
      if (v !== undefined) setProjField(k, v as never);
    });

    // 2) Blocos a partir dos produtos do escopo; entrega espelha o pedido.
    const blocos = blocosParaProdutos(itens);
    const entregaFinal = entrega.trim() || blocos.entrega;
    const merged: BlocosProposta = { ...blocos, entrega: entregaFinal };

    // Só sobrescreve blocos com conteúdo — nunca apaga o que já existe.
    (Object.keys(merged) as (keyof BlocosProposta)[]).forEach((k) => {
      if (merged[k].trim()) setBloco(k, merged[k]);
    });

    toast.success("Pedido aplicado à proposta.");
    fechar();
  };

  const camposComValor = CAMPOS_BRIEFING.filter((c) => {
    if (c.tipo === "produtos") return dados.escopo.length > 0;
    const v = dados[c.key];
    return typeof v === "string" && v.trim() !== "";
  });

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="text-sm px-3 py-1.5 rounded-md border border-input bg-card hover:bg-muted"
      >
        Importar pedido
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
          onClick={fechar}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-semibold">Importar pedido de orçamento</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cole o e-mail do cliente ou anexe o PDF. A IA extrai os campos — você revisa antes de aplicar.
                </p>
              </div>
              <button
                onClick={fechar}
                className="text-muted-foreground hover:text-foreground px-2"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {etapa === "entrada" ? (
              <div className="p-5 space-y-4">
                <label className="block">
                  <span className="text-[11px] tracking-widest uppercase text-muted-foreground">
                    E-mail / texto do pedido
                  </span>
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={10}
                    placeholder="Cole aqui o e-mail do cliente com o pedido de orçamento…"
                    className="mt-1 w-full border border-input rounded-md p-2 text-sm leading-relaxed bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>

                <div className="flex items-center gap-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => onPickPdf(e.target.files?.[0] ?? null)}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-sm px-3 py-1.5 rounded-md border border-input bg-card hover:bg-muted"
                  >
                    {pdfNome ? "Trocar PDF" : "Anexar PDF"}
                  </button>
                  {pdfNome && (
                    <span className="text-xs text-muted-foreground truncate">
                      {pdfNome}
                      <button
                        onClick={() => {
                          setPdfNome("");
                          setPdfBase64("");
                          if (fileRef.current) fileRef.current.value = "";
                        }}
                        className="ml-2 text-muted-foreground hover:text-danger"
                        aria-label="Remover PDF"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={fechar}
                    className="text-sm px-3 py-1.5 rounded-md border border-input bg-card hover:bg-muted"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={extrair}
                    disabled={extraindo || (!texto.trim() && !pdfBase64)}
                    className="text-sm px-3 py-1.5 rounded-md text-neutral-900 font-medium hover:opacity-90 bg-acid disabled:opacity-60"
                  >
                    {extraindo ? "Extraindo…" : "Extrair pedido"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Revise e ajuste os campos. Ao aplicar, apenas os campos preenchidos
                  sobrescrevem a proposta — nada é apagado.
                </p>

                {camposComValor.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    A IA não encontrou campos preenchíveis neste pedido.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {dados.escopo.length > 0 && (
                      <div>
                        <span className="text-[11px] tracking-widest uppercase text-muted-foreground">
                          Escopo (produtos)
                        </span>
                        <div className="mt-1 text-sm bg-muted/40 border border-border rounded-md px-2 py-1.5">
                          {escopoResumo(dados.escopo)}
                        </div>
                      </div>
                    )}
                    {camposComValor
                      .filter((c: CampoBriefing) => c.tipo !== "produtos")
                      .map((c) => (
                        <label key={c.key} className="block">
                          <span className="text-[11px] tracking-widest uppercase text-muted-foreground">
                            {c.label}
                          </span>
                          <textarea
                            value={String(dados[c.key] ?? "")}
                            onChange={(e) => setCampo(c.key, e.target.value)}
                            rows={c.tipo === "textarea" ? 3 : 1}
                            className="mt-1 w-full border border-input rounded-md p-2 text-sm leading-relaxed bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        </label>
                      ))}

                    {(() => {
                      const previa = entregaDoBriefing(dados).trim();
                      return previa ? (
                        <div>
                          <span className="text-[11px] tracking-widest uppercase text-muted-foreground">
                            Prévia — Especificação da entrega
                          </span>
                          <div className="mt-1 text-xs whitespace-pre-wrap bg-muted/40 border border-border rounded-md px-2 py-1.5 text-muted-foreground">
                            {previa}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div className="flex justify-between gap-2 pt-2">
                  <button
                    onClick={() => setEtapa("entrada")}
                    className="text-sm px-3 py-1.5 rounded-md border border-input bg-card hover:bg-muted"
                  >
                    ← Voltar
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={fechar}
                      className="text-sm px-3 py-1.5 rounded-md border border-input bg-card hover:bg-muted"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={aplicar}
                      className="text-sm px-3 py-1.5 rounded-md text-neutral-900 font-medium hover:opacity-90 bg-acid"
                    >
                      Aplicar à proposta
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
