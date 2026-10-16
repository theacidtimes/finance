"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { STATUS_DECLINADO } from "@/data/constants";
import type { ProjetoCronoResumo } from "@/lib/supabase/queries";
import { formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";

/** Casa do GP: projetos para montar cronograma. Nenhum valor aparece aqui. */
export function ProducaoHome({
  projetos,
  userEmail,
}: {
  projetos: ProjetoCronoResumo[];
  userEmail: string;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [declinados, setDeclinados] = useState(false);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return projetos.filter((p) => {
      if (!declinados && p.status === STATUS_DECLINADO) return false;
      if (!q) return true;
      return [p.cliente, p.marca, p.projeto, p.numeroServico].some((x) => x.toLowerCase().includes(q));
    });
  }, [projetos, busca, declinados]);

  return (
    <AppShell userEmail={userEmail}>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Cronogramas</h1>
          <p className="text-sm text-muted-foreground mt-1 tabular-nums">
            {projetos.filter((p) => p.temCrono).length} de {projetos.length} projeto(s) com cronograma
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente, marca ou projeto…"
            className="flex-1 min-w-[220px] rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={declinados}
              onChange={(e) => setDeclinados(e.target.checked)}
              className="accent-acid w-3.5 h-3.5"
            />
            Mostrar declinados
          </label>
        </div>

        {filtrados.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-3xl p-12 text-center">
            Nenhum projeto encontrado.
          </div>
        ) : (
          <div className="border border-border rounded-3xl overflow-hidden bg-card">
            {filtrados.map((p, i) => (
              <button
                key={p.id}
                onClick={() => router.push(`/projetos/${p.id}`)}
                className={cn(
                  "w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors",
                  i > 0 && "border-t border-border"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{p.projeto || "—"}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {[p.cliente, p.marca && p.marca !== p.cliente ? p.marca : "", p.numeroServico && `Nº ${p.numeroServico}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
                <span className="hidden sm:inline text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/60">
                  {p.status || "—"}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border shrink-0",
                    p.temCrono
                      ? "bg-acid/15 text-acid-dark border-acid/30"
                      : "border-dashed border-border text-muted-foreground"
                  )}
                >
                  <CalendarRange className="h-3 w-3" />
                  {p.temCrono ? "Cronograma" : "Sem cronograma"}
                </span>
                <span className="hidden md:inline text-[11px] text-muted-foreground tabular-nums w-20 text-right">
                  {formatDate(p.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
