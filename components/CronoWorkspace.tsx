"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useProjetoStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { salvarCrono, type ProjetoCrono } from "@/lib/supabase/queries";
import { Cronograma } from "@/components/screens/Cronograma";
import { cn } from "@/lib/utils";
import type { TipoProjeto } from "@/types";

type SaveStatus = "saved" | "saving" | "error";

/**
 * Projeto aberto pelo GP: só o cronograma.
 *
 * Usa o mesmo store e a mesma tela da equipe, mas o store só é hidratado com a
 * identificação do projeto — os valores nunca chegam aqui — e o autosave grava
 * apenas o cronograma, pela função do banco que só sabe fazer isso.
 */
export function CronoWorkspace({ initial, userEmail }: { initial: ProjetoCrono; userEmail: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<SaveStatus>("saved");
  const proj = useProjetoStore((s) => s.proj);
  const crono = useProjetoStore((s) => s.crono);
  const hydrate = useProjetoStore((s) => s.hydrate);

  const pronto = useRef(false);
  const ultimo = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    hydrate({
      id: initial.id,
      proj: {
        cliente: initial.cliente,
        marca: initial.marca,
        contato: initial.contato,
        projeto: initial.projeto,
        numeroServico: initial.numeroServico,
        tipo: initial.tipo as TipoProjeto,
        responsavel: initial.responsavel,
        status: initial.status,
      } as Parameters<typeof hydrate>[0]["proj"],
      crono: initial.crono,
    });
    ultimo.current = JSON.stringify(initial.crono);
    pronto.current = true;
    setStatus("saved");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.id]);

  const sig = JSON.stringify(crono);

  useEffect(() => {
    if (!pronto.current || sig === ultimo.current) return;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const atual = useProjetoStore.getState().crono;
      const snapshot = JSON.stringify(atual);
      try {
        await salvarCrono(createClient(), initial.id, atual);
        ultimo.current = snapshot;
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

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
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:border-neutral-500 hover:text-white shrink-0 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Projetos
            </button>
            <div className="flex items-baseline gap-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_acid_tight.png" alt="ACID" className="h-6 w-auto shrink-0" />
              <span className="text-xs text-neutral-400 tabular-nums truncate">
                {[proj.cliente, proj.projeto, proj.numeroServico].filter(Boolean).join(" · ")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-xs tabular-nums", statusColor)}>{statusLabel}</span>
            <span className="text-xs text-neutral-400 hidden lg:inline">{userEmail}</span>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-5 flex gap-1">
          <span className="px-4 py-2.5 text-sm border-b-2 border-acid text-white font-medium font-heading">
            Cronograma
          </span>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-6">
        <Cronograma comProposta={false} />
      </main>
    </div>
  );
}
