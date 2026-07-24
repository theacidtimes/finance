"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  updateCliente,
  createProject,
  deleteProject,
  duplicateProject,
} from "@/lib/supabase/queries";
import { novoProjetoDefaults, BLOCOS_PADRAO } from "@/data/blocos";
import { formatBRL0, formatDate } from "@/utils/format";
import { AppShell } from "@/components/AppShell";
import type { Cliente, Projeto } from "@/types";
import type { ProjetoResumo } from "@/lib/supabase/queries";
import { cn } from "@/lib/utils";

const statusTone: Record<string, string> = {
  Aprovado: "bg-acid/15 text-acid-dark border-acid/30",
  "Em produção": "bg-blue-50 text-blue-700 border-blue-200",
  Entregue: "bg-neutral-100 text-neutral-600 border-neutral-300",
  Perdido: "bg-red-50 text-danger border-red-200",
  Orçamento: "bg-amber-50 text-amber-700 border-amber-200",
};

type SaveStatus = "saved" | "saving" | "error";

export function ClienteDetalhe({
  cliente: initial,
  projetos,
  userEmail,
}: {
  cliente: Cliente;
  projetos: ProjetoResumo[];
  userEmail: string;
}) {
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente>(initial);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [criando, setCriando] = useState(false);

  const readyRef = useRef(false);
  const lastSig = useRef(JSON.stringify(initial));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = <K extends keyof Cliente>(k: K, v: Cliente[K]) =>
    setCliente((c) => ({ ...c, [k]: v }));

  useEffect(() => {
    const sig = JSON.stringify(cliente);
    if (!readyRef.current) {
      readyRef.current = true;
      return;
    }
    if (sig === lastSig.current) return;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await updateCliente(createClient(), cliente);
        lastSig.current = sig;
        setStatus("saved");
        router.refresh();
      } catch {
        setStatus("error");
      }
    }, 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  const novoProjeto = async () => {
    setCriando(true);
    try {
      const supabase = createClient();
      const proj = novoProjetoDefaults() as unknown as Projeto;
      proj.cliente = cliente.nome;
      proj.clienteId = cliente.id;
      proj.projeto = "Novo projeto";
      proj.numeroServico = `S-${Date.now().toString().slice(-6)}`;
      const id = await createProject(supabase, proj, BLOCOS_PADRAO);
      router.push(`/projetos/${id}`);
    } catch {
      toast.error("Não foi possível criar o projeto.");
      setCriando(false);
    }
  };

  const duplicar = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const novoId = await duplicateProject(createClient(), id);
      toast.success("Projeto duplicado.");
      router.push(`/projetos/${novoId}`);
    } catch {
      toast.error("Falha ao duplicar.");
    }
  };

  const remover = async (e: React.MouseEvent, id: string, nome: string) => {
    e.stopPropagation();
    if (!confirm(`Apagar "${nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteProject(createClient(), id);
      toast.success("Projeto apagado.");
      router.refresh();
    } catch {
      toast.error("Falha ao apagar.");
    }
  };

  const total = projetos.reduce((s, p) => s + p.valorBruto, 0);
  const statusLabel =
    status === "saving" ? "Salvando…" : status === "error" ? "Erro ao salvar" : "Salvo";
  const statusColor =
    status === "saving" ? "text-amber-600" : status === "error" ? "text-danger" : "text-acid-dark";

  const fieldCls =
    "mt-1 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <AppShell userEmail={userEmail}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Clientes
          </Link>
          <span className={cn("text-xs tabular-nums", statusColor)}>{statusLabel}</span>
        </div>

        {/* Ficha do cliente */}
        <section className="border border-border rounded-3xl bg-card p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-heading text-xl font-semibold tracking-tight">
              {cliente.nome || "Cliente"}
            </h1>
            <span className="text-xs text-muted-foreground tabular-nums">
              {projetos.length} projeto(s) · {formatBRL0(total)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs text-muted-foreground">Nome</span>
              <input value={cliente.nome} onChange={(e) => set("nome", e.target.value)} className={fieldCls} />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Contato (pessoa)</span>
              <input value={cliente.contato} onChange={(e) => set("contato", e.target.value)} className={fieldCls} />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">E-mail</span>
              <input value={cliente.email} onChange={(e) => set("email", e.target.value)} className={fieldCls} />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">Telefone</span>
              <input value={cliente.telefone} onChange={(e) => set("telefone", e.target.value)} className={fieldCls} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs text-muted-foreground">Observações</span>
              <textarea
                value={cliente.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                rows={2}
                className={cn(fieldCls, "resize-y")}
              />
            </label>
          </div>
        </section>

        {/* Projetos do cliente */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              Projetos &amp; orçamentos
            </h2>
            <button
              onClick={novoProjeto}
              disabled={criando}
              className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold text-neutral-900 bg-acid hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              {criando ? "Criando…" : "Novo projeto"}
            </button>
          </div>

          {projetos.length === 0 ? (
            <div className="text-sm text-muted-foreground border border-dashed border-border rounded-3xl p-12 text-center">
              Nenhum projeto para este cliente ainda. Crie o primeiro.
            </div>
          ) : (
            <div className="border border-border rounded-3xl overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-[11px] uppercase tracking-widest text-muted-foreground">
                    <th className="text-left px-4 py-3">Projeto</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Nº serviço</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Data</th>
                    <th className="text-right px-4 py-3">Valor</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {projetos.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/projetos/${p.id}`)}
                      className="border-t border-border hover:bg-muted/40 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-medium">{p.projeto}</td>
                      <td className="px-4 py-3 hidden md:table-cell tabular-nums text-muted-foreground">
                        {p.numeroServico}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell tabular-nums text-muted-foreground">
                        {p.data ? formatDate(p.data) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatBRL0(p.valorBruto)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block text-[11px] px-2 py-0.5 rounded-full border ${
                            statusTone[p.status] ??
                            "bg-neutral-100 text-neutral-600 border-neutral-300"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => duplicar(e, p.id)}
                          className="text-xs text-muted-foreground hover:text-foreground px-1.5"
                          title="Duplicar"
                        >
                          Duplicar
                        </button>
                        <button
                          onClick={(e) => remover(e, p.id, `${p.projeto}`)}
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
        </section>
      </div>
    </AppShell>
  );
}
