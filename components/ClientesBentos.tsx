"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createCliente, deleteCliente } from "@/lib/supabase/queries";
import { formatBRL0, formatDate } from "@/utils/format";
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-neutral-950 text-white">
        <div className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-baseline gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_acid_tight.png" alt="ACID" className="h-7 w-auto" />
            <span className="font-display text-xl leading-none uppercase tracking-[0.18em] font-light">
              Finance
            </span>
          </div>
          <nav className="flex items-center gap-1">
            <span className="text-sm px-3 py-1.5 rounded-md bg-neutral-800 text-white font-medium">
              Clientes
            </span>
            <Link
              href="/time"
              className="text-sm px-3 py-1.5 rounded-md text-neutral-300 hover:text-white hover:bg-neutral-800"
            >
              Time
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400 hidden md:inline">{userEmail}</span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-md border border-neutral-600 text-neutral-200 hover:border-neutral-400 hover:text-white"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Clientes</h1>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              {clientes.length} cliente(s) · carteira{" "}
              <b className="text-foreground">{formatBRL0(totalGeral)}</b>
            </p>
          </div>
          <button
            onClick={novoCliente}
            disabled={criando}
            className="text-sm px-3 py-1.5 rounded-md font-semibold text-neutral-900 bg-acid hover:opacity-90 disabled:opacity-50"
          >
            {criando ? "Criando…" : "+ Novo cliente"}
          </button>
        </div>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente…"
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />

        {filtrados.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-10 text-center">
            {clientes.length === 0
              ? "Nenhum cliente ainda. Crie o primeiro."
              : "Nenhum cliente encontrado."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtrados.map((c) => (
              <div
                key={c.id}
                onClick={() => router.push(`/clientes/${c.id}`)}
                className="group relative rounded-2xl border border-border bg-card p-5 cursor-pointer hover:border-acid/50 hover:shadow-sm transition-colors flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-base truncate">{c.nome || "—"}</h2>
                    {(c.contato || c.email) && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {c.contato || c.email}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => remover(e, c.id, c.nome, c.nProjetos)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-danger transition-opacity shrink-0"
                    title="Apagar cliente"
                  >
                    Apagar
                  </button>
                </div>

                <div className="flex items-end justify-between gap-2 mt-auto">
                  <div>
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Carteira
                    </div>
                    <div className="text-lg font-semibold tabular-nums">
                      {formatBRL0(c.totalBruto)}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/50 tabular-nums">
                      {c.nProjetos} projeto{c.nProjetos === 1 ? "" : "s"}
                    </span>
                    {c.ultimaAtualizacao && (
                      <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                        {formatDate(c.ultimaAtualizacao)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
