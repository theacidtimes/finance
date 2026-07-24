"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createProject, deleteProject, duplicateProject } from "@/lib/supabase/queries";
import { novoProjetoDefaults, BLOCOS_PADRAO } from "@/data/blocos";
import { STATUS_PROJETO } from "@/data/constants";
import { formatBRL0, formatDate } from "@/utils/format";
import type { ProjetoResumo } from "@/lib/supabase/queries";
import type { Projeto } from "@/types";

const statusTone: Record<string, string> = {
  Aprovado: "bg-acid/15 text-acid-dark border-acid/30",
  "Em produção": "bg-blue-50 text-blue-700 border-blue-200",
  Entregue: "bg-neutral-100 text-neutral-600 border-neutral-300",
  Perdido: "bg-red-50 text-danger border-red-200",
  Orçamento: "bg-amber-50 text-amber-700 border-amber-200",
};

export function ProjetosLista({
  projetos,
  userEmail,
}: {
  projetos: ProjetoResumo[];
  userEmail: string;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [cliente, setCliente] = useState("");
  const [status, setStatus] = useState("");
  const [criando, setCriando] = useState(false);

  const clientes = useMemo(
    () => Array.from(new Set(projetos.map((p) => p.cliente))).sort(),
    [projetos]
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return projetos.filter((p) => {
      if (cliente && p.cliente !== cliente) return false;
      if (status && p.status !== status) return false;
      if (q && !`${p.cliente} ${p.projeto} ${p.numeroServico}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [projetos, busca, cliente, status]);

  const novoProjeto = async () => {
    setCriando(true);
    try {
      const supabase = createClient();
      const proj = novoProjetoDefaults() as unknown as Projeto;
      proj.cliente = "Novo cliente";
      proj.projeto = "Novo projeto";
      proj.numeroServico = `S-${Date.now().toString().slice(-6)}`;
      const id = await createProject(supabase, proj, BLOCOS_PADRAO);
      router.push(`/projetos/${id}`);
    } catch {
      toast.error("Não foi possível criar o projeto.");
      setCriando(false);
    }
  };

  const duplicar = async (id: string) => {
    try {
      const supabase = createClient();
      const novoId = await duplicateProject(supabase, id);
      toast.success("Projeto duplicado.");
      router.push(`/projetos/${novoId}`);
    } catch {
      toast.error("Falha ao duplicar.");
    }
  };

  const remover = async (id: string, nome: string) => {
    if (!confirm(`Apagar "${nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const supabase = createClient();
      await deleteProject(supabase, id);
      toast.success("Projeto apagado.");
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
              Projetos
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
          <h1 className="text-lg font-semibold">Projetos</h1>
          <button
            onClick={novoProjeto}
            disabled={criando}
            className="text-sm px-3 py-1.5 rounded-md font-semibold text-neutral-900 bg-acid hover:opacity-90 disabled:opacity-50"
          >
            {criando ? "Criando…" : "+ Novo projeto"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, projeto ou nº de serviço…"
            className="flex-1 min-w-48 rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos os clientes</option>
            {clientes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos os status</option>
            {STATUS_PROJETO.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {filtrados.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-xl p-10 text-center">
            {projetos.length === 0
              ? "Nenhum projeto ainda. Crie o primeiro."
              : "Nenhum projeto encontrado com esses filtros."}
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="text-left px-4 py-2.5">Cliente</th>
                  <th className="text-left px-4 py-2.5">Projeto</th>
                  <th className="text-left px-4 py-2.5 hidden md:table-cell">Nº serviço</th>
                  <th className="text-left px-4 py-2.5 hidden sm:table-cell">Data</th>
                  <th className="text-right px-4 py-2.5">Valor</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/projetos/${p.id}`)}
                    className="border-t border-border hover:bg-muted/40 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium">{p.cliente}</td>
                    <td className="px-4 py-3">{p.projeto}</td>
                    <td className="px-4 py-3 hidden md:table-cell tabular-nums text-muted-foreground">
                      {p.numeroServico}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell tabular-nums text-muted-foreground">
                      {p.data ? formatDate(p.data) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatBRL0(p.valorBruto)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block text-[11px] px-2 py-0.5 rounded-full border ${
                          statusTone[p.status] ?? "bg-neutral-100 text-neutral-600 border-neutral-300"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => duplicar(p.id)}
                        className="text-xs text-muted-foreground hover:text-foreground px-1.5"
                        title="Duplicar"
                      >
                        Duplicar
                      </button>
                      <button
                        onClick={() => remover(p.id, `${p.cliente} — ${p.projeto}`)}
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
      </main>
    </div>
  );
}
