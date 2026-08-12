"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createFriend, deleteFriend } from "@/lib/supabase/queries";
import { novoFriendDefaults, alertasDoFriend } from "@/lib/friends";
import { formatBRL0, formatDate } from "@/utils/format";
import { AppShell } from "@/components/AppShell";
import { usePerfil } from "@/components/PerfilProvider";
import { CATEGORIAS_EXTERNAS, type CategoriaExterna, type FriendResumo } from "@/types";

const tipoTone: Record<string, string> = {
  Empresa: "bg-blue-50 text-blue-700 border-blue-200",
  MEI: "bg-amber-50 text-amber-700 border-amber-200",
  "Freelancer PJ": "bg-purple-50 text-purple-700 border-purple-200",
  Coletivo: "bg-acid/15 text-acid-dark border-acid/30",
  Outro: "bg-neutral-100 text-neutral-600 border-neutral-300",
};

export function FriendsBentos({
  friends,
  userEmail,
}: {
  friends: FriendResumo[];
  userEmail: string;
}) {
  const router = useRouter();
  const { isMaster } = usePerfil();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<CategoriaExterna | "">("");
  const [soAtivos, setSoAtivos] = useState(true);
  const [criando, setCriando] = useState(false);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return friends.filter((f) => {
      if (soAtivos && !f.ativo) return false;
      if (categoria && !f.categorias.includes(categoria)) return false;
      if (q && !`${f.nome} ${f.razaoSocial} ${f.cnpj} ${f.categorias.join(" ")}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [friends, busca, categoria, soAtivos]);

  const totalPago = useMemo(
    () => friends.reduce((s, f) => s + f.totalFaturado, 0),
    [friends]
  );

  // Só as categorias que alguém realmente entrega — filtro com 23 opções mortas
  // não ajuda ninguém a achar quem chamar.
  const categoriasEmUso = useMemo(() => {
    const usadas = new Set(friends.flatMap((f) => f.categorias));
    return CATEGORIAS_EXTERNAS.filter((c) => usadas.has(c));
  }, [friends]);

  const novoFriend = async () => {
    setCriando(true);
    try {
      const base = novoFriendDefaults();
      base.nome = "Novo friend";
      const id = await createFriend(createClient(), base);
      router.push(`/friends/${id}`);
    } catch {
      toast.error("Não foi possível criar o cadastro.");
      setCriando(false);
    }
  };

  const remover = async (e: React.MouseEvent, f: FriendResumo) => {
    e.stopPropagation();
    const aviso =
      f.nProjetos > 0
        ? `Apagar "${f.nome}"? Os lançamentos em ${f.nProjetos} projeto(s) ficam sem vínculo, mas os valores continuam lá.`
        : `Apagar "${f.nome}"? Esta ação não pode ser desfeita.`;
    if (!confirm(aviso)) return;
    try {
      await deleteFriend(createClient(), f.id);
      toast.success("Friend apagado.");
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
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Acid Friends</h1>
            <p className="text-sm text-muted-foreground mt-1 tabular-nums">
              {friends.length} parceiro(s) · já repassado{" "}
              <b className="text-foreground">{formatBRL0(totalPago)}</b>
            </p>
          </div>
          <button
            onClick={novoFriend}
            disabled={criando}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl font-semibold text-neutral-900 bg-acid hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Plus className="h-4 w-4" />
            {criando ? "Criando…" : "Novo friend"}
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nome, razão social, CNPJ ou entrega…"
            className="flex-1 min-w-48 rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaExterna | "")}
            className="rounded-xl border border-input bg-card px-3 py-2.5 text-sm"
          >
            <option value="">Todas as entregas</option>
            {categoriasEmUso.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground px-2">
            <input
              type="checkbox"
              checked={soAtivos}
              onChange={(e) => setSoAtivos(e.target.checked)}
              className="accent-acid w-4 h-4"
            />
            Só ativos
          </label>
        </div>

        {filtrados.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-dashed border-border rounded-3xl p-12 text-center">
            {friends.length === 0
              ? "Nenhum parceiro cadastrado ainda. Adicione o primeiro."
              : "Ninguém encontrado com esses filtros."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map((f) => {
              const alertas = alertasDoFriend(f);
              const graves = alertas.filter((a) => a.tom === "erro");
              return (
                <div
                  key={f.id}
                  onClick={() => router.push(`/friends/${f.id}`)}
                  className={`group relative rounded-3xl border bg-card p-6 cursor-pointer hover:shadow-md transition-all flex flex-col gap-4 min-h-[196px] ${
                    graves.length ? "border-danger/40 hover:border-danger" : "border-border hover:border-acid/50"
                  } ${f.ativo ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-heading font-semibold text-lg truncate tracking-tight">
                        {f.nome || "—"}
                      </h2>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {f.razaoSocial || f.contato || "sem razão social"}
                      </p>
                    </div>
                    {isMaster && (
                      <button
                        onClick={(e) => remover(e, f)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger transition-all shrink-0 p-1 -m-1"
                        title="Apagar friend"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        tipoTone[f.tipo] ?? tipoTone.Outro
                      }`}
                    >
                      {f.tipo}
                    </span>
                    {f.categorias.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/60 text-muted-foreground"
                      >
                        {c}
                      </span>
                    ))}
                    {f.categorias.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 text-muted-foreground">
                        +{f.categorias.length - 3}
                      </span>
                    )}
                  </div>

                  {graves.length > 0 && (
                    <div className="flex items-start gap-1.5 text-[11px] text-danger">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
                      <span className="leading-snug">{graves[0].texto}</span>
                    </div>
                  )}

                  <div className="flex items-end justify-between gap-2 mt-auto">
                    <div>
                      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                        Já repassado
                      </div>
                      <div className="font-heading text-xl font-semibold tabular-nums mt-0.5">
                        {formatBRL0(f.totalFaturado)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/60 tabular-nums font-medium">
                        {f.nProjetos} projeto{f.nProjetos === 1 ? "" : "s"}
                      </span>
                      {f.ultimoProjeto && (
                        <div className="text-[11px] text-muted-foreground mt-1.5 tabular-nums">
                          {formatDate(f.ultimoProjeto)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
