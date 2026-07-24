"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useProjetoStore } from "@/lib/store";
import type { ProjetoArquivo } from "@/types";
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

export function Workspace() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const proj = useProjetoStore((s) => s.proj);
  const toArquivo = useProjetoStore((s) => s.toArquivo);
  const hydrate = useProjetoStore((s) => s.hydrate);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJSON = () => {
    const payload = toArquivo();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${proj.cliente}_${proj.numeroServico}_${proj.projeto}`.replace(/\s+/g, "-") + ".json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Projeto salvo em JSON.");
  };

  const importJSON = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(String(reader.result)) as Partial<ProjetoArquivo>;
        if (!d.proj || !Array.isArray(d.externos) || !Array.isArray(d.internos)) {
          throw new Error("estrutura inválida");
        }
        hydrate(d);
        toast.success(`Carregado: ${file.name}`);
      } catch {
        toast.error("Arquivo inválido. Use um JSON exportado pelo ACID Finance.");
      }
    };
    reader.readAsText(file);
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-300 tabular-nums hidden md:inline">
              {proj.cliente} · {proj.projeto} · {proj.numeroServico}
            </span>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs px-3 py-1.5 rounded-md border border-neutral-600 text-neutral-200 hover:border-neutral-400 hover:text-white"
            >
              Carregar JSON
            </button>
            <button onClick={exportJSON} className="text-xs px-3 py-1.5 rounded-md font-semibold text-neutral-900 bg-acid">
              Salvar JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                importJSON(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-5 flex gap-1 overflow-x-auto">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors",
                tab === id ? "border-acid text-white font-medium" : "border-transparent text-neutral-400 hover:text-white"
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
