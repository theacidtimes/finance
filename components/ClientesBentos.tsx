"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCliente, deleteCliente } from "@/lib/supabase/queries";
import { formatBRL0, formatDate } from "@/utils/format";
import { AppShell } from "@/components/AppShell";
import type { ClienteResumo } from "@/types";

export function ClientesBentos({
  clientes,
  userEmail,
}: {
  clientes: ClienteResumo[];
  userEmail: string;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) =>
      `${c.nome} ${c.contato} ${c.email}`.toLowerCase().includes(q)
    );
  }, [clientes, busca]);

  const totalGeral = useMemo(
    () => clientes.reduce((s, c) => s + c.totalBruto, 0),
    [clientes]
  );

  const novoCliente = async () => {
    setCriando(true);
    try {
      const supabase = createClient();
      const id = await createCliente(supabase, {
        nome: "Novo cliente",
        contato: "",
        email: "",
        telefone: "",
        observacoes: "",
      });
      router.push(`/clientes/${id}`);
    } catch {
      toast.error("Não foi possível criar o cliente.");
      setCriando(false);
    }
  };

  const remover = async (e: React.MouseEvent, id: string, nome: string, n: number) => {
    e.stopPropagation();
    const aviso =
      n > 0
        ? `Apagar "${nome}"? Os ${n} projeto(s) deste cliente ficarão sem cliente vinculado.`
        : `Apagar "${nome}"? Esta ação não pode ser desfeita.`;
    if (!confirm(aviso)) return;
    try {
      await deleteCliente(createClient(), id);
      toast.success("Cliente apagado.");
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
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Clientes</h1>
            <p className="text-sm text-muted-foreground mt-1 tabular-nums">
              {clientes.length} cliente(s) · carteira{" "}
              <b className="text-foreground">{formatBRL0(totalGeral)}</b>
            </p>
          </div>
          <button
            onClick={novoCliente}
            disabled={criando}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold text-neutral-900 bg-acid hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            {criando ? "Criando…" : "Novo cliente"}
          </button>
        </div>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente…"
          className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {filtrados.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-3xl p-12 text-center">
            {clientes.length === 0
              ? "Nenhum cliente ainda. Crie o primeiro."
              : "Nenhum cliente encontrado."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/clientes/${c.id}`)}
                className="group relative rounded-3xl border border-border bg-card p-6 cursor-pointer hover:border-acid/50 hover:shadow-md transition-all flex flex-col gap-5 min-h-[168px]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-heading font-semibold text-lg truncate tracking-tight">
                      {c.nome || "—"}
                    </h2>
                    {(c.contato || c.email) && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {c.contato || c.email}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => remover(e, c.id, c.nome, c.nProjetos)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger transition-all shrink-0 p-1 -m-1"
                    title="Apagar cliente"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-end justify-between gap-2 mt-auto">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Carteira
                    </div>
                    <div className="font-heading text-xl font-semibold tabular-nums mt-0.5">
                      {formatBRL0(c.totalBruto)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/60 tabular-nums font-medium">
                      {c.nProjetos} projeto{c.nProjetos === 1 ? "" : "s"}
                    </span>
                    {c.ultimaAtualizacao && (
                      <div className="text-[11px] text-muted-foreground mt-1.5 tabular-nums">
                        {formatDate(c.ultimaAtualizacao)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
