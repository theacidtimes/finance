"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjetoStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { saveProject, type ProjetoCompleto } from "@/lib/supabase/queries";
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

function completoDoStore(): ProjetoCompleto {
  const s = useProjetoStore.getState();
  return {
    id: s.id!,
    proj: s.proj,
    externos: s.externos,
    internos: s.internos,
    cronograma: s.cronograma,
    blocos: s.blocos,
  };
}

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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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

  const statusLabel =
    status === "saving" ? "Salvando…" : status === "error" ? "Erro ao salvar" : "Salvo";
  const statusColor =
    status === "saving" ? "text-amber-300" : status === "error" ? "text-danger" : "text-acid";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-neutral-950 text-white">
        <div className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.push("/")}
              className="text-xs px-2.5 py-1.5 rounded-md border border-neutral-600 text-neutral-200 hover:border-neutral-400 hover:text-white shrink-0"
            >
              ← Projetos
            </button>
            <div className="flex items-baseline gap-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_acid_tight.png" alt="ACID" className="h-7 w-auto shrink-0" />
              <span className="text-xs text-neutral-300 tabular-nums truncate">
                {proj.cliente} · {proj.projeto} · {proj.numeroServico}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-xs tabular-nums", statusColor)}>{statusLabel}</span>
            <span className="text-xs text-neutral-500 hidden lg:inline">{userEmail}</span>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-5 flex gap-1 overflow-x-auto">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors",
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
