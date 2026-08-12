"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useProjetoStore, completoDoStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { saveProject, criarVersao, type ProjetoCompleto } from "@/lib/supabase/queries";
import { HistoricoVersoes } from "@/components/HistoricoVersoes";
import { Dashboard } from "@/components/screens/Dashboard";
import { Cadastro } from "@/components/screens/Cadastro";
import { Pessoas } from "@/components/screens/Pessoas";
import { DRE } from "@/components/screens/DRE";
import { Simulador } from "@/components/screens/Simulador";
import { Orcamento } from "@/components/screens/Orcamento";
import { cn } from "@/lib/utils";

type TabId = "dashboard" | "projeto" | "pessoas" | "dre" | "simulador" | "orcamento";

const TABS: [TabId, string][] = [
  ["dashboard", "Dashboard"],
  ["projeto", "Projeto"],
  ["pessoas", "Pessoas & Custos"],
  ["dre", "DRE"],
  ["simulador", "Simulador"],
  ["orcamento", "Orçamento"],
];

type SaveStatus = "saved" | "saving" | "error";

const sigOf = (c: Omit<ProjetoCompleto, "id">) =>
  JSON.stringify([c.proj, c.externos, c.internos, c.cronograma, c.blocos]);

export function ProjetoWorkspace({
  initial,
  userEmail,
}: {
  initial: ProjetoCompleto;
  userEmail: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [status, setStatus] = useState<SaveStatus>("saved");

  const proj = useProjetoStore((s) => s.proj);
  const externos = useProjetoStore((s) => s.externos);
  const internos = useProjetoStore((s) => s.internos);
  const cronograma = useProjetoStore((s) => s.cronograma);
  const blocos = useProjetoStore((s) => s.blocos);
  const hydrate = useProjetoStore((s) => s.hydrate);

  const readyRef = useRef(false);
  const lastSig = useRef("");
  const lastStatus = useRef(initial.proj.status);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    lastStatus.current = initial.proj.status;
    hydrate({
      id: initial.id,
      proj: initial.proj,
      externos: initial.externos,
      internos: initial.internos,
      cronograma: initial.cronograma,
      blocos: initial.blocos,
    });
    lastSig.current = sigOf(initial);
    readyRef.current = true;
    setStatus("saved");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  const sig = sigOf({ proj, externos, internos, cronograma, blocos });

  useEffect(() => {
    if (!readyRef.current) return;
    if (sig === lastSig.current) return;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const completo = completoDoStore();
      const snapshot = sigOf(completo);
      try {
        await saveProject(createClient(), completo);
        lastSig.current = snapshot;
        setStatus("saved");
        // Mudar de status é um marco do orçamento (Aprovado, Declinado…) —
        // vale um retrato. O resto do autosave não versiona.
        if (completo.proj.status !== lastStatus.current) {
          lastStatus.current = completo.proj.status;
          criarVersao(createClient(), completo, {
            origem: "status",
            label: `Status: ${completo.proj.status}`,
          }).catch(() => {});
        }
        router.refresh();
      } catch {
        setStatus("error");
      }
    }, 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Restaurar troca o projeto inteiro: re-hidrata o store e realinha a
  // assinatura, senão o autosave dispararia de volta o que acabou de ser gravado.
  const aoRestaurar = (restaurado: ProjetoCompleto) => {
    hydrate(restaurado);
    lastSig.current = sigOf(restaurado);
    lastStatus.current = restaurado.proj.status;
    setStatus("saved");
    router.refresh();
  };

  const statusLabel =
    status === "saving" ? "Salvando…" : status === "error" ? "Erro ao salvar" : "Salvo";
  const statusColor =
    status === "saving" ? "text-amber-400" : status === "error" ? "text-danger" : "text-acid";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-neutral-950 border-b border-neutral-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-5 py-3 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.push(proj.clienteId ? `/clientes/${proj.clienteId}` : "/")}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white shrink-0 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Cliente
            </button>
            <div className="flex items-baseline gap-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_acid_tight.png" alt="ACID" className="h-6 w-auto shrink-0" />
              <span className="text-xs text-neutral-400 tabular-nums truncate">
                {proj.cliente} · {proj.projeto} · {proj.numeroServico}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HistoricoVersoes projectId={initial.id} onRestaurado={aoRestaurar} />
            <span className={cn("text-xs tabular-nums", statusColor)}>{statusLabel}</span>
            <span className="text-xs text-neutral-400 hidden lg:inline">{userEmail}</span>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-5 flex gap-1 overflow-x-auto">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors font-heading",
                tab === id
                  ? "border-acid text-white font-medium"
                  : "border-transparent text-neutral-400 hover:text-white"
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {tab === "dashboard" && <Dashboard />}
        {tab === "projeto" && <Cadastro />}
        {tab === "pessoas" && <Pessoas />}
        {tab === "dre" && <DRE />}
        {tab === "simulador" && <Simulador />}
        {tab === "orcamento" && <Orcamento />}
      </main>
    </div>
  );
}
