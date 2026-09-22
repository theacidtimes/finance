"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Copy, FileDown, Mail, Trash2 } from "lucide-react";
import { Section, Field, TextInput, NumInput, Select } from "@/components/ui/primitives";
import { FichaEditor } from "@/components/ui/FichaEditor";
import { useProjetoStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import {
  listFriends,
  listPedidosDoProjeto,
  createPedido,
  updatePedido,
  deletePedido,
} from "@/lib/supabase/queries";
import {
  documentoInicial,
  proximoNumero,
  codigoPedido,
  metaPedido,
  blocosPedido,
  linhaServico,
  textoPedido,
  divergencias,
  condicoesDaProposta,
  servicoNovo,
  CAMPOS_DE_DIREITO,
} from "@/lib/pedido-fornecedor";
import { parseFicha } from "@/lib/proposta";
import {
  SERVICO_PADRAO,
  MODELOS_CONTRATACAO,
  ROTULOS_ESPECIFICACAO,
} from "@/data/servicos-fornecedor";
import { formatBRL } from "@/utils/format";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_EXTERNAS,
  STATUS_PEDIDO,
  type CategoriaExterna,
  type Friend,
  type PedidoFornecedor,
  type ServicoPedido,
  type StatusPedido,
} from "@/types";

type SaveStatus = "saved" | "saving" | "error";

const statusTone: Record<StatusPedido, string> = {
  Rascunho: "bg-neutral-100 text-neutral-600 border-neutral-300",
  Enviado: "bg-blue-50 text-blue-700 border-blue-200",
  Recebido: "bg-amber-50 text-amber-700 border-amber-200",
  Aprovado: "bg-acid/15 text-acid-dark border-acid/30",
  Recusado: "bg-red-50 text-danger border-danger/30",
};

function StatusPill({ status }: { status: StatusPedido }) {
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap", statusTone[status])}>
      {status}
    </span>
  );
}

const campo =
  "border border-input rounded-md px-2 py-1 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring";

/**
 * Bloco do documento — mesmo desenho do bloco da proposta. Editando, todo
 * bloco aparece (é onde se preenche); na visualização, só os que saem no PDF.
 */
function Bloco({
  n,
  titulo,
  children,
}: {
  n?: number;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h4 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-muted-foreground mb-2">
        {n ? `${n}. ${titulo}` : titulo}
      </h4>
      <div className="text-sm leading-relaxed whitespace-pre-wrap">{children}</div>
    </div>
  );
}

function Area({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full border border-input rounded-md p-2 text-sm leading-relaxed bg-card focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

/**
 * Linhas de "Serviços necessários". Trocar a categoria troca o texto só se ele
 * ainda for o padrão da categoria anterior (ou estiver vazio) — texto que
 * alguém já escreveu não se perde por um clique no select.
 */
function ServicosEditor({
  servicos,
  onChange,
}: {
  servicos: ServicoPedido[];
  onChange: (s: ServicoPedido[]) => void;
}) {
  const set = (id: string, patch: Partial<ServicoPedido>) =>
    onChange(servicos.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const trocarCategoria = (s: ServicoPedido, categoria: CategoriaExterna) => {
    const intocado = !s.texto.trim() || s.texto === SERVICO_PADRAO[s.categoria];
    set(s.id, { categoria, texto: intocado ? SERVICO_PADRAO[categoria] : s.texto });
  };

  return (
    <div className="space-y-2">
      {servicos.map((s) => (
        <div key={s.id} className="flex gap-2 items-start">
          <select
            value={s.categoria}
            onChange={(e) => trocarCategoria(s, e.target.value as CategoriaExterna)}
            className={cn(campo, "w-40 shrink-0 py-1.5")}
          >
            {CATEGORIAS_EXTERNAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <textarea
            value={s.texto}
            onChange={(e) => set(s.id, { texto: e.target.value })}
            rows={2}
            placeholder="Descreva o serviço"
            className={cn(campo, "flex-1 leading-relaxed")}
          />
          <button
            onClick={() => onChange(servicos.filter((x) => x.id !== s.id))}
            className="text-muted-foreground hover:text-danger px-1 pt-1"
            aria-label="Remover serviço"
            title="Remover serviço"
          >
            ×
          </button>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => onChange([...servicos, servicoNovo()])}
          className="text-xs px-2 py-1 rounded border border-input hover:bg-muted"
        >
          + serviço
        </button>
        <span className="text-[11px] text-muted-foreground">
          A categoria traz um texto padrão — edite à vontade para este pedido.
        </span>
      </div>
    </div>
  );
}

/** O documento em modo leitura — exatamente o que o PDF imprime. */
function Visualizacao({ p }: { p: PedidoFornecedor }) {
  return (
    <>
      {blocosPedido(p).map((b) => (
        <Bloco key={b.titulo} n={b.n} titulo={b.titulo}>
          {b.tipo === "servicos" ? (
            <ul className="space-y-1">
              {b.servicos.map((s) => (
                <li key={s.id} className="flex gap-2">
                  <span>•</span>
                  <span>{linhaServico(s)}</span>
                </li>
              ))}
            </ul>
          ) : b.tipo === "ficha" ? (
            <div className="space-y-0.5">
              {parseFicha(b.texto).map((l, i) =>
                l.rotulo ? (
                  <div key={i}>
                    <span className="font-semibold">{l.rotulo}:</span> {l.valor}
                  </div>
                ) : (
                  <div key={i}>{l.valor}</div>
                )
              )}
            </div>
          ) : (
            b.texto
          )}
        </Bloco>
      ))}
    </>
  );
}

export function PedidosFornecedor() {
  const projectId = useProjetoStore((s) => s.id);
  const proj = useProjetoStore((s) => s.proj);
  const blocos = useProjetoStore((s) => s.blocos);
  const externos = useProjetoStore((s) => s.externos);
  const lancarPedidoAprovado = useProjetoStore((s) => s.lancarPedidoAprovado);

  const [pedidos, setPedidos] = useState<PedidoFornecedor[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selId, setSelId] = useState<string | null>(null);
  const [editando, setEditando] = useState(true);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [gerando, setGerando] = useState(false);

  // Assinatura do que está gravado, por pedido — o autosave só regrava o que mudou.
  const gravado = useRef(new Map<string, string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let vivo = true;
    const db = createClient();
    Promise.all([listPedidosDoProjeto(db, projectId), listFriends(db)])
      .then(([ps, fs]) => {
        if (!vivo) return;
        gravado.current = new Map(ps.map((p) => [p.id, JSON.stringify(p)]));
        setPedidos(ps);
        setFriends(fs);
        setSelId(ps.at(-1)?.id ?? null);
      })
      .catch(() => toast.error("Não foi possível carregar os pedidos."))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [projectId]);

  // Autosave com debounce — mesmo ritmo do resto do projeto.
  const sig = JSON.stringify(pedidos);
  useEffect(() => {
    const sujos = pedidos.filter((p) => gravado.current.get(p.id) !== JSON.stringify(p));
    if (!sujos.length) return;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const db = createClient();
        await Promise.all(sujos.map((p) => updatePedido(db, p)));
        sujos.forEach((p) => gravado.current.set(p.id, JSON.stringify(p)));
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Trocar de aba desmonta a tela e cancelaria o timer acima: o que estiver
  // pendente é gravado na saída, senão a última edição se perde em silêncio.
  const ultimo = useRef(pedidos);
  ultimo.current = pedidos;
  useEffect(
    () => () => {
      const sujos = ultimo.current.filter((p) => gravado.current.get(p.id) !== JSON.stringify(p));
      if (!sujos.length) return;
      const db = createClient();
      sujos.forEach((p) => updatePedido(db, p).catch(() => {}));
    },
    []
  );

  const ativos = useMemo(() => friends.filter((f) => f.ativo), [friends]);
  const friendDe = (id: string | null) => (id ? friends.find((f) => f.id === id) ?? null : null);

  const sel = pedidos.find((p) => p.id === selId) ?? null;
  const setSel = (patch: Partial<PedidoFornecedor>) =>
    setPedidos((ps) => ps.map((p) => (p.id === selId ? { ...p, ...patch } : p)));

  const criar = async (friend: Friend | null, base?: PedidoFornecedor) => {
    if (!projectId) return;
    try {
      const doc = base
        ? {
            ...base,
            empresa: friend ? friend.razaoSocial || friend.nome : "",
            aosCuidados: friend?.contato ?? "",
            email: friend?.email ?? "",
          }
        : documentoInicial(proj, blocos, friend);
      const novo = await createPedido(createClient(), {
        ...doc,
        projectId,
        friendId: friend?.id ?? null,
        numero: proximoNumero(pedidos),
        status: "Rascunho",
        valorCotado: 0,
        enviadoEm: "",
        respondidoEm: "",
      });
      gravado.current.set(novo.id, JSON.stringify(novo));
      setPedidos((ps) => [...ps, novo]);
      setSelId(novo.id);
      setEditando(true);
      toast.success(base ? "Pedido duplicado." : "Pedido criado.");
    } catch {
      toast.error("Não foi possível criar o pedido.");
    }
  };

  const escolherNovo = (valor: string) => {
    if (!valor) return;
    if (valor === "__avulso") criar(null);
    else criar(friends.find((f) => f.id === valor) ?? null);
  };

  const duplicarPara = (valor: string) => {
    if (!sel || !valor) return;
    const f = valor === "__avulso" ? null : friends.find((x) => x.id === valor) ?? null;
    criar(f, sel);
  };

  const apagar = async () => {
    if (!sel) return;
    const lancado = externos.some((e) => e.pedidoId === sel.id);
    const aviso = lancado
      ? `Apagar o pedido ${codigoPedido(proj, sel.numero)}? A linha de custo externo que ele gerou continua em Pessoas & Custos.`
      : `Apagar o pedido ${codigoPedido(proj, sel.numero)}?`;
    if (!confirm(aviso)) return;
    try {
      await deletePedido(createClient(), sel.id);
      gravado.current.delete(sel.id);
      const resto = pedidos.filter((p) => p.id !== sel.id);
      setPedidos(resto);
      setSelId(resto.at(-1)?.id ?? null);
    } catch {
      toast.error("Não foi possível apagar.");
    }
  };

  /** Sair do rascunho é o que marca o pedido como enviado — PDF ou texto. */
  const marcarEnviado = () => {
    if (sel && sel.status === "Rascunho") {
      setSel({ status: "Enviado", enviadoEm: new Date().toISOString() });
    }
  };

  const gerarPDF = async () => {
    if (!sel) return;
    setGerando(true);
    try {
      const [{ generatePedidoBlob }, { downloadBlob, loadLogoDataUrl }] = await Promise.all([
        import("@/lib/pdf/pedido-fornecedor"),
        import("@/lib/export"),
      ]);
      const logoDataUrl = await loadLogoDataUrl();
      const blob = await generatePedidoBlob({ pedido: sel, proj, logoDataUrl });
      const nome = `Pedido_${codigoPedido(proj, sel.numero)}_${sel.empresa || "fornecedor"}`
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\w-]+/g, "-")
        .replace(/-+/g, "-");
      downloadBlob(blob, `${nome}.pdf`);
      marcarEnviado();
      toast.success("PDF do pedido gerado.");
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerando(false);
    }
  };

  const copiarTexto = async () => {
    if (!sel) return;
    try {
      await navigator.clipboard.writeText(textoPedido(sel, proj));
      marcarEnviado();
      toast.success("Texto copiado — cole no e-mail ou no WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const mailto = sel
    ? `mailto:${encodeURIComponent(sel.email)}?subject=${encodeURIComponent(
        `Pedido de orçamento ${codigoPedido(proj, sel.numero)} — ACID`
      )}&body=${encodeURIComponent(textoPedido(sel, proj))}`
    : "";

  /** Valor digitado num pedido ainda em aberto = a resposta chegou. */
  const setValor = (v: number) => {
    if (!sel) return;
    const patch: Partial<PedidoFornecedor> = { valorCotado: v };
    if (v > 0 && (sel.status === "Rascunho" || sel.status === "Enviado")) {
      patch.status = "Recebido";
      patch.respondidoEm = sel.respondidoEm || new Date().toISOString();
    }
    setSel(patch);
  };

  const aprovar = () => {
    if (!sel) return;
    if (!(sel.valorCotado > 0)) {
      toast.error("Preencha o valor cotado antes de aprovar.");
      return;
    }
    const aprovado: PedidoFornecedor = {
      ...sel,
      status: "Aprovado",
      respondidoEm: sel.respondidoEm || new Date().toISOString(),
    };
    setSel(aprovado);
    lancarPedidoAprovado(aprovado, friendDe(sel.friendId));
    toast.success("Aprovado — o valor entrou em Pessoas & Custos.");
  };

  if (!projectId) return null;
  if (carregando) return <p className="text-sm text-muted-foreground">Carregando pedidos…</p>;

  const linhaLancada = sel ? externos.find((e) => e.pedidoId === sel.id) : undefined;
  const alertas = sel ? divergencias(sel.especificacao, blocos.entrega) : [];
  const condCliente = condicoesDaProposta(blocos.entrega);
  const statusLabel =
    status === "saving" ? "Salvando…" : status === "error" ? "Erro ao salvar" : "Salvo";

  const opcoesFriends = (
    <>
      <option value="__avulso">Fornecedor avulso (fora do cadastro)</option>
      {ativos.length > 0 && (
        <optgroup label="Acid Friends">
          {ativos.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
              {f.categorias.length ? ` — ${f.categorias.slice(0, 2).join(", ")}` : ""}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pedidos de orçamento a fornecedores deste projeto. O valor aprovado vira custo externo.
        </p>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-xs tabular-nums",
              status === "saving" ? "text-amber-600" : status === "error" ? "text-danger" : "text-acid-dark"
            )}
          >
            {pedidos.length ? statusLabel : ""}
          </span>
          <select
            value=""
            onChange={(e) => escolherNovo(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-md text-neutral-900 font-medium bg-acid hover:opacity-90 cursor-pointer"
          >
            <option value="" disabled>
              + Novo pedido para…
            </option>
            {opcoesFriends}
          </select>
        </div>
      </div>

      {pedidos.length === 0 ? (
        <div className="text-sm text-muted-foreground border border-dashed border-border rounded-2xl p-10 text-center">
          Nenhum pedido ainda. Escolha um Friend em <b>+ Novo pedido para…</b> — empresa, A/C e o
          texto do serviço já vêm preenchidos, e a especificação herda as condições de uso da
          proposta ao cliente.
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          {pedidos.map((p) => {
            const lancado = externos.some((e) => e.pedidoId === p.id);
            return (
              <button
                key={p.id}
                onClick={() => setSelId(p.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-border/60 last:border-b-0 hover:bg-muted/40",
                  p.id === selId && "bg-acid/5"
                )}
              >
                <span className="text-xs font-semibold tabular-nums w-10 shrink-0">
                  F{String(p.numero).padStart(2, "0")}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">
                    {p.empresa || "Sem fornecedor"}
                  </span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {p.servicos.map((s) => (s.categoria === "Outros" ? "" : s.categoria)).filter(Boolean).join(", ") ||
                      p.servicos[0]?.texto ||
                      "—"}
                  </span>
                </span>
                {lancado && (
                  <span className="text-[10px] text-acid-dark hidden sm:inline" title="Já lançado em Pessoas & Custos">
                    no DRE
                  </span>
                )}
                <span className="text-sm tabular-nums w-28 text-right shrink-0">
                  {p.valorCotado > 0 ? formatBRL(p.valorCotado) : "—"}
                </span>
                <StatusPill status={p.status} />
              </button>
            );
          })}
        </div>
      )}

      {sel && (
        <>
          <Section
            title={`Acompanhamento · ${codigoPedido(proj, sel.numero)}`}
            right={
              <div className="flex items-center gap-2">
                <select
                  value=""
                  onChange={(e) => duplicarPara(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-input bg-card hover:bg-muted max-w-44"
                  title="Mesmo pedido para outro fornecedor — para comparar cotações"
                >
                  <option value="" disabled>
                    Duplicar para…
                  </option>
                  {opcoesFriends}
                </select>
                <button
                  onClick={apagar}
                  className="text-muted-foreground hover:text-danger p-1"
                  title="Apagar pedido"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            }
          >
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <Field label="Status">
                <Select
                  value={sel.status}
                  onChange={(v) => setSel({ status: v as StatusPedido })}
                  options={STATUS_PEDIDO}
                />
              </Field>
              <Field label="Valor cotado (R$)" hint="o que o fornecedor respondeu">
                <NumInput value={sel.valorCotado} onChange={setValor} />
              </Field>
              <div className="lg:col-span-2">
                {linhaLancada ? (
                  <div className="text-sm">
                    <div className="text-acid-dark font-medium">
                      Em Pessoas & Custos: {linhaLancada.nome} · {formatBRL(linhaLancada.valor)}
                    </div>
                    {linhaLancada.valor !== sel.valorCotado && sel.valorCotado > 0 && (
                      <button
                        onClick={aprovar}
                        className="text-xs mt-1 px-2 py-1 rounded border border-input hover:bg-muted"
                      >
                        Atualizar custo para {formatBRL(sel.valorCotado)}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={aprovar}
                    disabled={!(sel.valorCotado > 0)}
                    className="text-sm px-3 py-2 rounded-md text-neutral-900 font-medium bg-acid hover:opacity-90 disabled:opacity-40"
                    title="Marca o pedido como aprovado e lança o valor como custo externo do projeto"
                  >
                    Aprovar e lançar custo
                  </button>
                )}
              </div>
            </div>
          </Section>

          <div className="flex flex-wrap gap-2 items-center justify-end">
            <button
              onClick={() => setEditando((e) => !e)}
              className="text-sm px-3 py-1.5 rounded-md border border-input bg-card hover:bg-muted"
            >
              {editando ? "Modo visualização" : "Editar pedido"}
            </button>
            <button
              onClick={copiarTexto}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-input bg-card hover:bg-muted"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar texto
            </button>
            {sel.email.trim() && (
              <a
                href={mailto}
                onClick={marcarEnviado}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-input bg-card hover:bg-muted"
              >
                <Mail className="h-3.5 w-3.5" />
                E-mail
              </a>
            )}
            <button
              onClick={gerarPDF}
              disabled={gerando}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md text-neutral-900 font-medium hover:opacity-90 bg-acid disabled:opacity-60"
            >
              <FileDown className="h-3.5 w-3.5" />
              {gerando ? "Gerando…" : "Gerar PDF"}
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 md:p-12 max-w-3xl mx-auto">
            <div className="border-b-2 border-foreground pb-5 mb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_acid_tight.png" alt="ACID" className="h-12 w-auto mb-4" />
              <div className="text-sm font-semibold tracking-tight">THE ACID TIMES LTDA</div>
              <div className="text-xs text-muted-foreground mt-0.5">CNPJ: 36.458.402/0001-81</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground mt-4">
                {metaPedido(sel, proj).map((m) => (
                  <span key={m.rotulo}>
                    <b>{m.rotulo}:</b> {m.valor}
                  </span>
                ))}
              </div>

              {editando && (
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-4">
                  <label className="text-xs">
                    <span className="text-muted-foreground">Empresa (razão social ou nome)</span>
                    <TextInput value={sel.empresa} onChange={(v) => setSel({ empresa: v })} />
                  </label>
                  <label className="text-xs">
                    <span className="text-muted-foreground">A/C</span>
                    <TextInput value={sel.aosCuidados} onChange={(v) => setSel({ aosCuidados: v })} />
                  </label>
                  <label className="text-xs">
                    <span className="text-muted-foreground">E-mail (não sai no PDF)</span>
                    <TextInput value={sel.email} onChange={(v) => setSel({ email: v })} />
                  </label>
                  <label className="text-xs">
                    <span className="text-muted-foreground">Responder até</span>
                    <TextInput
                      value={sel.prazoResposta}
                      onChange={(v) => setSel({ prazoResposta: v })}
                      placeholder="25/09"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={sel.mostrarCliente}
                      onChange={(e) => setSel({ mostrarCliente: e.target.checked })}
                      className="accent-acid w-3.5 h-3.5"
                    />
                    Mostrar cliente e marca no cabeçalho
                    <span className="text-muted-foreground/70">
                      — desligado, o fornecedor vê só o nome do projeto
                    </span>
                  </label>
                </div>
              )}
            </div>

            <h2 className="text-xl font-semibold leading-snug mb-8">Pedido de orçamento</h2>

            {editando ? (
              <>
                <Bloco titulo="Projeto / parceria">
                  <Area value={sel.descricao} onChange={(v) => setSel({ descricao: v })} rows={4} />
                  {blocos.projeto.trim() && blocos.projeto.trim() !== sel.descricao.trim() && (
                    <button
                      onClick={() => setSel({ descricao: blocos.projeto.trim() })}
                      className="text-xs mt-1 px-2 py-1 rounded border border-input hover:bg-muted"
                      title="Pode citar o cliente — confira antes de enviar"
                    >
                      Usar o texto da proposta ao cliente
                    </button>
                  )}
                </Bloco>

                <Bloco titulo="Modelo">
                  <datalist id="modelos-contratacao">
                    {MODELOS_CONTRATACAO.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  <input
                    value={sel.modelo}
                    onChange={(e) => setSel({ modelo: e.target.value })}
                    list="modelos-contratacao"
                    className={cn(campo, "w-full")}
                  />
                </Bloco>

                <Bloco titulo="Serviços necessários">
                  <ServicosEditor servicos={sel.servicos} onChange={(s) => setSel({ servicos: s })} />
                </Bloco>

                <Bloco titulo="Especificação">
                  <FichaEditor
                    value={sel.especificacao}
                    onChange={(v) => setSel({ especificacao: v })}
                    rotulos={ROTULOS_ESPECIFICACAO}
                    listId="rotulos-especificacao"
                    ajuda="Quantidade de peças, tempo de uso, mídias, digital ou impressão. Campo vazio não sai no PDF."
                  />
                  {alertas.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Diferente do que foi vendido ao cliente
                      </div>
                      {alertas.map((a) => (
                        <div key={a.campo}>
                          <b>{a.campo}:</b> proposta diz “{a.cliente}”
                          {a.fornecedor ? `, pedido diz “${a.fornecedor}”` : ", pedido não diz nada"}.
                        </div>
                      ))}
                      <div className="text-amber-700/80">
                        Se o fornecedor ceder menos direito do que o cliente comprou, a diferença é da ACID.
                      </div>
                    </div>
                  ) : CAMPOS_DE_DIREITO.some((c) => condCliente[c]) ? (
                    <p className="text-[11px] text-acid-dark mt-2">
                      Tempo de uso, mídias e território batem com a proposta ao cliente.
                    </p>
                  ) : null}
                </Bloco>

                <Bloco titulo="Execução e entrega">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="text-xs">
                      <span className="text-muted-foreground">Data e local</span>
                      <TextInput
                        value={sel.execucao}
                        onChange={(v) => setSel({ execucao: v })}
                        placeholder="30/09, estúdio em SP"
                      />
                    </label>
                    <label className="text-xs">
                      <span className="text-muted-foreground">Entrega</span>
                      <TextInput
                        value={sel.prazoEntrega}
                        onChange={(v) => setSel({ prazoEntrega: v })}
                        placeholder="até 07/10"
                      />
                    </label>
                  </div>
                </Bloco>

                <Bloco titulo="Pagamento">
                  <TextInput value={sel.pagamento} onChange={(v) => setSel({ pagamento: v })} />
                </Bloco>

                <Bloco titulo="O orçamento deve conter">
                  <Area value={sel.orcamentoDeve} onChange={(v) => setSel({ orcamentoDeve: v })} rows={2} />
                </Bloco>

                <Bloco titulo="Observações">
                  <Area value={sel.observacoes} onChange={(v) => setSel({ observacoes: v })} rows={2} />
                </Bloco>

                <p className="text-[11px] text-muted-foreground border-t border-border pt-3 mt-2">
                  Blocos vazios não entram no PDF — os demais são renumerados.
                </p>
              </>
            ) : (
              <Visualizacao p={sel} />
            )}
          </div>

        </>
      )}

      {pedidos.length === 0 && ativos.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Nenhum Friend ativo no cadastro — dá para pedir a um fornecedor avulso, ou convidar o
          Friend a se cadastrar em Friends.
        </p>
      )}
    </div>
  );
}
