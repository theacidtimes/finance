"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createTeamMember, deleteTeamMember } from "@/lib/supabase/queries";
import { custoHoraCarregado, custoMensalCarregado, novoMembroDefaults } from "@/lib/team";
import { formatBRL, formatBRL0 } from "@/utils/format";
import { AppShell } from "@/components/AppShell";
import type { TeamMember } from "@/types";

const contratoTone: Record<string, string> = {
  CLT: "bg-blue-50 text-blue-700 border-blue-200",
  PJ: "bg-amber-50 text-amber-700 border-amber-200",
  Sócio: "bg-acid/15 text-acid-dark border-acid/30",
  Estágio: "bg-neutral-100 text-neutral-600 border-neutral-300",
  Freelancer: "bg-purple-50 text-purple-700 border-purple-200",
  Outro: "bg-neutral-100 text-neutral-600 border-neutral-300",
};

export function TimeLista({
  membros,
  userEmail,
}: {
  membros: TeamMember[];
  userEmail: string;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [soAtivos, setSoAtivos] = useState(false);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return membros.filter((m) => {
      if (soAtivos && !m.ativo) return false;
      if (q && !`${m.nome} ${m.funcao} ${m.tipoContrato}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [membros, busca, soAtivos]);

  const totalMensal = useMemo(
    () => membros.filter((m) => m.ativo).reduce((s, m) => s + custoMensalCarregado(m), 0),
    [membros]
  );

  const novoMembro = async () => {
    setCriando(true);
    try {
      const supabase = createClient();
      const base = novoMembroDefaults();
      base.nome = "Nova pessoa";
      const id = await createTeamMember(supabase, base);
      router.push(`/time/${id}`);
    } catch {
      toast.error("Não foi possível criar o cadastro.");
      setCriando(false);
    }
  };

  const remover = async (id: string, nome: string) => {
    if (!confirm(`Apagar "${nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteTeamMember(createClient(), id);
      toast.success("Cadastro apagado.");
      router.refresh();
    } catch {
      toast.error("Falha ao apagar.");
    }
  };

  return (
    <AppShell userEmail={userEmail}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Time ACID</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pessoas fixas e seus custos carregados — insumo para orçar por volume de horas.
            </p>
          </div>
          <button
            onClick={novoMembro}
            disabled={criando}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold text-neutral-900 bg-acid hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            {criando ? "Criando…" : "Nova pessoa"}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nome, função ou contrato…"
            className="flex-1 min-w-48 rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground px-2">
            <input
              type="checkbox"
              checked={soAtivos}
              onChange={(e) => setSoAtivos(e.target.checked)}
              className="accent-acid w-4 h-4"
            />
            Só ativos
          </label>
          <div className="text-sm text-muted-foreground tabular-nums">
            Folha carregada (ativos): <b className="text-foreground">{formatBRL0(totalMensal)}</b>/mês
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-3xl p-12 text-center">
            {membros.length === 0
              ? "Nenhuma pessoa cadastrada ainda. Adicione a primeira."
              : "Ninguém encontrado com esses filtros."}
          </div>
        ) : (
          <div className="border border-border rounded-3xl overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Função</th>
                  <th className="text-left px-4 py-3">Contrato</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">Custo/mês</th>
                  <th className="text-right px-4 py-3">Custo/hora</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => router.push(`/time/${m.id}`)}
                    className={`border-t border-border hover:bg-muted/40 cursor-pointer ${
                      m.ativo ? "" : "opacity-55"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">
                      {m.nome || "—"}
                      {!m.ativo && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                      {m.funcao || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[11px] px-2 py-0.5 rounded-full border ${
                          contratoTone[m.tipoContrato] ?? contratoTone.Outro
                        }`}
                      >
                        {m.tipoContrato}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell text-muted-foreground">
                      {formatBRL0(custoMensalCarregado(m))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {formatBRL(custoHoraCarregado(m))}
                    </td>
                    <td
                      className="px-4 py-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => remover(m.id, m.nome || "sem nome")}
                        className="text-xs text-muted-foreground hover:text-danger px-1.5"
                        title="Apagar"
                      >
                        Apagar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
