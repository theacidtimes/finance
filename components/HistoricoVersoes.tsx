"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { History, X } from "lucide-react";
import { usePerfil } from "@/components/PerfilProvider";
import { createClient } from "@/lib/supabase/client";
import {
  listVersoes,
  criarVersao,
  getVersaoSnapshot,
  restaurarVersao,
  type ProjetoCompleto,
} from "@/lib/supabase/queries";
import { completoDoStore } from "@/lib/store";
import { formatBRL0, formatPct } from "@/utils/format";
import { saudeMargem } from "@/lib/finance";
import { cn } from "@/lib/utils";
import type { OrigemVersao, VersaoResumo } from "@/types";

const ORIGEM_LABEL: Record<OrigemVersao, string> = {
  pdf: "PDF enviado",
  status: "mudança de status",
  manual: "salva à mão",
  restauracao: "antes de restaurar",
};

const ORIGEM_CLASSE: Record<OrigemVersao, string> = {
  pdf: "bg-acid/15 text-acid-dark border-acid/30",
  status: "bg-muted text-muted-foreground border-border",
  manual: "bg-muted text-muted-foreground border-border",
  restauracao: "bg-amber-50 text-amber-700 border-amber-200",
};

function dataHora(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const COR_MARGEM = {
  verde: "text-acid-dark",
  amarelo: "text-amber-600",
  vermelho: "text-danger",
} as const;

function Linha({
  v,
  podeRestaurar,
  ocupado,
  onPDF,
  onRestaurar,
}: {
  v: VersaoResumo;
  podeRestaurar: boolean;
  ocupado: boolean;
  onPDF: () => void;
  onRestaurar: () => void;
}) {
  return (
    <li className="border border-border rounded-lg p-3 bg-card">
      <div className="flex items-baseline gap-2 flex-wrap">
        <b className="text-sm tabular-nums">V{v.versao}</b>
        <span
          className={cn(
            "text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap",
            ORIGEM_CLASSE[v.origem]
          )}
        >
          {ORIGEM_LABEL[v.origem]}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">{dataHora(v.criadoEm)}</span>
      </div>

      {v.label && <p className="text-sm mt-1">{v.label}</p>}

      <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 tabular-nums">
        <span>
          RB <b className="text-foreground">{formatBRL0(v.valorBruto)}</b>
        </span>
        <span>externos {formatBRL0(v.custosExternos)}</span>
        <span>
          margem{" "}
          <b className={COR_MARGEM[saudeMargem(v.margemOperacional)]}>
            {formatPct(v.margemOperacional)}
          </b>
        </span>
        {v.status && <span>· {v.status}</span>}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={onPDF}
          disabled={ocupado}
          className="text-xs px-2 py-1 rounded border border-input hover:bg-muted disabled:opacity-50"
        >
          Baixar PDF desta versão
        </button>
        {podeRestaurar && (
          <button
            onClick={onRestaurar}
            disabled={ocupado}
            className="text-xs px-2 py-1 rounded border border-input hover:bg-muted disabled:opacity-50"
          >
            Restaurar
          </button>
        )}
      </div>

      {v.autorEmail && (
        <p className="text-[11px] text-muted-foreground mt-1.5">{v.autorEmail}</p>
      )}
    </li>
  );
}

export function HistoricoVersoes({
  projectId,
  onRestaurado,
}: {
  projectId: string;
  /** Devolve o projeto restaurado para o workspace re-hidratar o store. */
  onRestaurado: (restaurado: ProjetoCompleto) => void;
}) {
  const { isMaster } = usePerfil();
  const [aberto, setAberto] = useState(false);
  const [versoes, setVersoes] = useState<VersaoResumo[] | null>(null);
  const [nome, setNome] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setVersoes(await listVersoes(createClient(), projectId));
    } catch {
      toast.error("Não foi possível carregar o histórico.");
      setVersoes([]);
    }
  }, [projectId]);

  useEffect(() => {
    if (aberto) carregar();
  }, [aberto, carregar]);

  useEffect(() => {
    if (!aberto) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [aberto]);

  const salvarVersao = async () => {
    setOcupado(true);
    try {
      await criarVersao(createClient(), completoDoStore(), {
        origem: "manual",
        label: nome.trim(),
      });
      setNome("");
      await carregar();
      toast.success("Versão salva.");
    } catch {
      toast.error("Não foi possível salvar a versão.");
    } finally {
      setOcupado(false);
    }
  };

  const baixarPDF = async (v: VersaoResumo) => {
    setOcupado(true);
    try {
      const [snapshot, { generatePropostaBlob }, { downloadBlob, fileBase, loadLogoDataUrl }] =
        await Promise.all([
          getVersaoSnapshot(createClient(), v.id),
          import("@/lib/pdf/proposta"),
          import("@/lib/export"),
        ]);
      const blob = await generatePropostaBlob({
        proj: snapshot.proj,
        blocos: snapshot.blocos,
        cronograma: snapshot.cronograma,
        receitaBruta: snapshot.proj.valorBruto,
        logoDataUrl: await loadLogoDataUrl(),
      });
      downloadBlob(blob, `Proposta_${fileBase(snapshot.proj)}_V${v.versao}.pdf`);
    } catch {
      toast.error("Não foi possível gerar o PDF desta versão.");
    } finally {
      setOcupado(false);
    }
  };

  const restaurar = async (v: VersaoResumo) => {
    const ok = window.confirm(
      `Restaurar a V${v.versao} (${formatBRL0(v.valorBruto)})?\n\n` +
        "O estado atual do projeto é gravado como uma nova versão antes — nada se perde."
    );
    if (!ok) return;
    setOcupado(true);
    try {
      const restaurado = await restaurarVersao(createClient(), projectId, v.id);
      onRestaurado(restaurado);
      await carregar();
      toast.success(`V${v.versao} restaurada.`);
    } catch {
      toast.error("Não foi possível restaurar a versão.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
        title="Histórico de versões do orçamento"
      >
        <History className="h-3.5 w-3.5" />
        Histórico
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setAberto(false)}
            aria-hidden
          />
          <aside className="relative w-full max-w-md h-full bg-background border-l border-border shadow-xl flex flex-col">
            <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-heading text-base">Histórico de versões</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Retrato do projeto a cada PDF gerado, mudança de status ou versão salva à mão.
                </p>
              </div>
              <button
                onClick={() => setAberto(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="px-5 py-3 border-b border-border flex gap-2">
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da versão (opcional)"
                className="flex-1 border border-input rounded-md px-2 py-1.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={salvarVersao}
                disabled={ocupado}
                className="text-sm px-3 py-1.5 rounded-md text-neutral-900 font-medium bg-acid hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
              >
                Salvar versão
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {versoes === null ? (
                <p className="text-sm text-muted-foreground">Carregando…</p>
              ) : versoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma versão ainda. A primeira será gravada no próximo PDF gerado — ou salve
                  uma agora.
                </p>
              ) : (
                <ul className="space-y-2">
                  {versoes.map((v) => (
                    <Linha
                      key={v.id}
                      v={v}
                      podeRestaurar={isMaster}
                      ocupado={ocupado}
                      onPDF={() => baixarPDF(v)}
                      onRestaurar={() => restaurar(v)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {!isMaster && versoes && versoes.length > 0 && (
              <p className="px-5 py-3 border-t border-border text-[11px] text-muted-foreground">
                Restaurar uma versão é ação do master.
              </p>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
