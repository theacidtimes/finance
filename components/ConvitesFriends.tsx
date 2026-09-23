"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Copy, Link2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createConvite, descartarConvite, aprovarConvite } from "@/lib/supabase/queries";
import { alertasDoFriend, formatCNPJ } from "@/lib/friends";
import { formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import type { ConviteFriend, Friend } from "@/types";

const linkDe = (token: string) =>
  typeof window === "undefined" ? `/cadastro/${token}` : `${window.location.origin}/cadastro/${token}`;

/** Mensagem pronta para mandar junto do link. */
const mensagemDe = (c: ConviteFriend) =>
  `Oi${c.nome ? `, ${c.nome.split(/\s+/)[0]}` : ""}! Para te cadastrar como fornecedor da ACID, preenche por aqui (leva uns 3 minutos): ${linkDe(c.token)}`;

async function copiar(texto: string, ok: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(ok);
  } catch {
    toast.error("Não foi possível copiar.");
  }
}

/** O que o Friend enviou, lido como Friend — para as mesmas regras de alerta do cadastro. */
function comoFriend(c: ConviteFriend): Friend {
  return { id: c.id, ativo: true, receita: c.receita, ...(c.dados as NonNullable<ConviteFriend["dados"]>) };
}

function Recebido({ c, onFeito }: { c: ConviteFriend; onFeito: () => void }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const d = c.dados!;
  const alertas = alertasDoFriend(comoFriend(c));

  const aprovar = async () => {
    setOcupado(true);
    try {
      const { friendId, atualizado } = await aprovarConvite(createClient(), c);
      toast.success(
        atualizado
          ? "Já havia um Friend com este CNPJ — o cadastro foi atualizado."
          : "Friend cadastrado."
      );
      router.push(`/friends/${friendId}`);
    } catch {
      toast.error("Não foi possível aprovar.");
      setOcupado(false);
    }
  };

  const descartar = async () => {
    if (!confirm(`Descartar o cadastro enviado por "${d.nome}"?`)) return;
    try {
      await descartarConvite(createClient(), c.id);
      onFeito();
    } catch {
      toast.error("Não foi possível descartar.");
    }
  };

  const linhas: [string, string][] = [
    ["Razão social", d.razaoSocial],
    ["CNPJ", formatCNPJ(d.cnpj)],
    ["Situação na Receita", c.receita?.situacao ?? "não consultado"],
    ["Contato", d.contato],
    ["E-mail", d.email],
    ["Telefone", d.telefone],
    ["Portfólio", d.portfolio],
    ["Site", d.site],
    ["Banco", [d.conta.bancoCodigo, d.conta.bancoNome].filter(Boolean).join(" — ")],
    ["Agência / conta", `${d.conta.agencia} / ${d.conta.conta} (${d.conta.tipoConta})`],
    ["PIX", d.conta.pix],
    ["Observações", d.observacoes],
  ];

  return (
    <li className="border border-border rounded-2xl bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-heading font-semibold truncate">{d.nome}</div>
          <div className="text-xs text-muted-foreground truncate">
            {d.razaoSocial} · {formatCNPJ(d.cnpj)} · recebido {formatDate(c.recebidoEm)}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {d.categorias.map((cat) => (
              <span
                key={cat}
                className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/60 text-muted-foreground"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAberto((a) => !a)}
            className="text-xs px-3 py-1.5 rounded-md border border-input hover:bg-muted"
          >
            {aberto ? "Fechar" : "Revisar dados"}
          </button>
          <button
            onClick={descartar}
            className="text-xs px-3 py-1.5 rounded-md border border-input hover:bg-muted text-muted-foreground"
          >
            Descartar
          </button>
          <button
            onClick={aprovar}
            disabled={ocupado}
            className="text-xs px-3 py-1.5 rounded-md font-semibold text-neutral-900 bg-acid hover:opacity-90 disabled:opacity-50"
          >
            {ocupado ? "Aprovando…" : "Aprovar"}
          </button>
        </div>
      </div>

      {alertas.length > 0 && (
        <ul className="space-y-1">
          {alertas.map((a) => (
            <li
              key={a.texto}
              className={cn(
                "flex items-start gap-1.5 text-xs",
                a.tom === "erro" ? "text-danger" : "text-amber-700"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
              {a.texto}
            </li>
          ))}
        </ul>
      )}

      {aberto && (
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm border-t border-border pt-3">
          {linhas
            .filter(([, v]) => v && v.trim())
            .map(([k, v]) => (
              <div key={k} className="min-w-0">
                <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{k}</dt>
                <dd className="break-words">{v}</dd>
              </div>
            ))}
        </dl>
      )}
    </li>
  );
}

/**
 * Autocadastro de Friends, lado da equipe: gerar o link, acompanhar quem ainda
 * não respondeu, revisar e aprovar o que chegou.
 */
export function ConvitesFriends({ convites }: { convites: ConviteFriend[] }) {
  const router = useRouter();
  const [gerando, setGerando] = useState(false);
  const [nome, setNome] = useState("");
  const [novo, setNovo] = useState<ConviteFriend | null>(null);
  const [formAberto, setFormAberto] = useState(false);

  const recebidos = convites.filter((c) => c.status === "recebido" && c.dados);
  const pendentes = convites.filter((c) => c.status === "pendente");

  const gerar = async () => {
    setGerando(true);
    try {
      const c = await createConvite(createClient(), nome.trim());
      setNovo(c);
      setNome("");
      router.refresh();
    } catch {
      toast.error("Não foi possível gerar o link.");
    } finally {
      setGerando(false);
    }
  };

  const cancelar = async (c: ConviteFriend) => {
    if (!confirm("Cancelar este link? Quem tiver o link não vai mais conseguir enviar.")) return;
    try {
      await descartarConvite(createClient(), c.id);
      router.refresh();
    } catch {
      toast.error("Não foi possível cancelar.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!formAberto ? (
          <button
            onClick={() => setFormAberto(true)}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-input bg-card hover:bg-muted"
          >
            <Link2 className="h-4 w-4" />
            Convidar friend
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 w-full">
            <span className="text-sm text-muted-foreground">Link de autocadastro para</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && gerar()}
              placeholder="nome (só para referência interna)"
              className="flex-1 min-w-40 border border-input rounded-md px-2 py-1 text-sm bg-card"
              autoFocus
            />
            <button
              onClick={gerar}
              disabled={gerando}
              className="text-sm px-3 py-1.5 rounded-md font-semibold text-neutral-900 bg-acid hover:opacity-90 disabled:opacity-50"
            >
              {gerando ? "Gerando…" : "Gerar link"}
            </button>
            <button
              onClick={() => {
                setFormAberto(false);
                setNovo(null);
              }}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            {novo && (
              <div className="w-full flex flex-wrap items-center gap-2 pt-2 mt-1 border-t border-border">
                <code className="text-xs bg-muted rounded px-2 py-1 truncate max-w-full flex-1 min-w-0">
                  {linkDe(novo.token)}
                </code>
                <button
                  onClick={() => copiar(linkDe(novo.token), "Link copiado.")}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-input hover:bg-muted"
                >
                  <Copy className="h-3.5 w-3.5" /> Link
                </button>
                <button
                  onClick={() => copiar(mensagemDe(novo), "Mensagem copiada — cole no WhatsApp ou e-mail.")}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-input hover:bg-muted"
                >
                  <Copy className="h-3.5 w-3.5" /> Mensagem
                </button>
                <span className="text-[11px] text-muted-foreground w-full">
                  Vale 30 dias. O que a pessoa enviar aparece aqui para você revisar antes de entrar
                  no cadastro.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {recebidos.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Cadastros para revisar ({recebidos.length})
          </h2>
          <ul className="space-y-2">
            {recebidos.map((c) => (
              <Recebido key={c.id} c={c} onFeito={() => router.refresh()} />
            ))}
          </ul>
        </div>
      )}

      {pendentes.length > 0 && (
        <details className="rounded-xl border border-border bg-card">
          <summary className="cursor-pointer select-none px-4 py-2.5 text-sm">
            {pendentes.length} link(s) aguardando resposta
          </summary>
          <ul className="divide-y divide-border/60 border-t border-border">
            {pendentes.map((c) => {
              const expirado = new Date(c.expiraEm).getTime() < Date.now();
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                  <span className="flex-1 min-w-0 truncate">
                    {c.nome || "Sem nome"}
                    <span className="text-xs text-muted-foreground ml-2 tabular-nums">
                      criado {formatDate(c.criadoEm)} ·{" "}
                      {expirado ? (
                        <span className="text-danger">expirado</span>
                      ) : (
                        `vale até ${formatDate(c.expiraEm)}`
                      )}
                    </span>
                  </span>
                  {!expirado && (
                    <button
                      onClick={() => copiar(mensagemDe(c), "Mensagem copiada.")}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-input hover:bg-muted"
                    >
                      <Copy className="h-3 w-3" /> Copiar
                    </button>
                  )}
                  <button
                    onClick={() => cancelar(c)}
                    className="text-xs px-2 py-1 rounded border border-input hover:bg-muted text-muted-foreground"
                  >
                    {expirado ? "Remover" : "Cancelar"}
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
