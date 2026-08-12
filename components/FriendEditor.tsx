"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Search } from "lucide-react";
import { Section, Field, TextInput, Select } from "@/components/ui/primitives";
import { BancoCombobox } from "@/components/ui/BancoCombobox";
import { createClient } from "@/lib/supabase/client";
import { updateFriend } from "@/lib/supabase/queries";
import { alertasDoFriend, consultaEnvelhecida, formatCNPJ, soDigitos } from "@/lib/friends";
import { formatBRL0, formatDate } from "@/utils/format";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_EXTERNAS,
  type CategoriaExterna,
  type DadosReceita,
  type Friend,
  type TipoConta,
  type TipoFriend,
} from "@/types";

type SaveStatus = "saved" | "saving" | "error";

const TIPOS: TipoFriend[] = ["Empresa", "MEI", "Freelancer PJ", "Coletivo", "Outro"];
const TIPOS_CONTA: TipoConta[] = ["Corrente", "Poupança", "Pagamento"];

export type ProjetoDoFriend = {
  id: string;
  cliente: string;
  projeto: string;
  data: string;
  status: string;
  valor: number;
};

export function FriendEditor({
  initial,
  projetos,
  userEmail,
}: {
  initial: Friend;
  projetos: ProjetoDoFriend[];
  userEmail: string;
}) {
  const router = useRouter();
  const [f, setF] = useState<Friend>(initial);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [consultando, setConsultando] = useState(false);

  const readyRef = useRef(false);
  const lastSig = useRef(JSON.stringify(initial));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = <K extends keyof Friend>(k: K, v: Friend[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const setConta = <K extends keyof Friend["conta"]>(k: K, v: Friend["conta"][K]) =>
    setF((prev) => ({ ...prev, conta: { ...prev.conta, [k]: v } }));

  // autosave com debounce — mesmo comportamento do cadastro de time
  const sig = JSON.stringify(f);
  useEffect(() => {
    if (!readyRef.current) {
      readyRef.current = true;
      return;
    }
    if (sig === lastSig.current) return;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await updateFriend(createClient(), f);
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
  }, [sig]);

  const consultarCNPJ = async () => {
    const d = soDigitos(f.cnpj);
    if (d.length !== 14) {
      toast.error("Digite os 14 dígitos do CNPJ.");
      return;
    }
    setConsultando(true);
    try {
      const resp = await fetch(`/api/cnpj/${d}`);
      // Lê como texto primeiro: se a resposta não for JSON (sessão expirada,
      // proxy no caminho), o parse estouraria e o motivo real sumiria.
      const bruto = await resp.text();
      let json: { receita?: DadosReceita; error?: string } | null = null;
      try {
        json = JSON.parse(bruto) as { receita?: DadosReceita; error?: string };
      } catch {
        json = null;
      }
      if (!resp.ok || !json?.receita) {
        console.error("[cnpj] resposta inesperada", resp.status, bruto.slice(0, 300));
        toast.error(json?.error ?? `Não foi possível consultar (HTTP ${resp.status}).`);
        return;
      }
      const r = json.receita;
      setF((prev) => ({
        ...prev,
        receita: r,
        razaoSocial: r.razaoSocial || prev.razaoSocial,
        // O nome do dia a dia só é preenchido se ainda estiver no padrão —
        // o apelido que a equipe usa vale mais que o nome fantasia da Receita.
        nome:
          !prev.nome || prev.nome === "Novo friend"
            ? r.nomeFantasia || r.razaoSocial || prev.nome
            : prev.nome,
      }));
      toast.success(`Receita: ${r.razaoSocial || "dados carregados"} · ${r.situacao}`);
    } catch {
      toast.error("Falha na consulta.");
    } finally {
      setConsultando(false);
    }
  };

  const toggleCategoria = (c: CategoriaExterna) =>
    set(
      "categorias",
      f.categorias.includes(c) ? f.categorias.filter((x) => x !== c) : [...f.categorias, c]
    );

  const alertas = alertasDoFriend(f);
  const totalProjetos = projetos.reduce((s, p) => s + p.valor, 0);

  const statusLabel =
    status === "saving" ? "Salvando…" : status === "error" ? "Erro ao salvar" : "Salvo";
  const statusColor =
    status === "saving" ? "text-amber-300" : status === "error" ? "text-danger" : "text-acid";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-neutral-950 text-white">
        <div className="max-w-4xl mx-auto px-5 py-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.push("/friends")}
              className="text-xs px-2.5 py-1.5 rounded-md border border-neutral-600 text-neutral-200 hover:border-neutral-400 hover:text-white shrink-0"
            >
              ← Friends
            </button>
            <div className="flex items-baseline gap-3 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_acid_tight.png" alt="ACID" className="h-7 w-auto shrink-0" />
              <span className="text-xs text-neutral-300 truncate">
                {f.nome || "Novo friend"} · {f.tipo}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-xs tabular-nums", statusColor)}>{statusLabel}</span>
            <span className="text-xs text-neutral-500 hidden lg:inline">{userEmail}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-6 space-y-5">
        {alertas.length > 0 && (
          <ul className="space-y-1.5">
            {alertas.map((a, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-2 text-sm rounded-lg border px-3 py-2",
                  a.tom === "erro"
                    ? "border-danger/30 bg-red-50 text-danger"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{a.texto}</span>
              </li>
            ))}
          </ul>
        )}

        <Section title="Identificação">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Nome" hint="como a ACID chama no dia a dia">
              <TextInput value={f.nome} onChange={(v) => set("nome", v)} />
            </Field>

            <Field label="CNPJ" hint="obrigatório — pagamento só em conta PJ">
              <div className="flex gap-1.5">
                <TextInput
                  value={formatCNPJ(f.cnpj)}
                  onChange={(v) => set("cnpj", soDigitos(v))}
                  placeholder="00.000.000/0000-00"
                />
                <button
                  onClick={consultarCNPJ}
                  disabled={consultando}
                  title="Puxar dados da Receita"
                  className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 rounded-md border border-input bg-card hover:bg-muted disabled:opacity-50"
                >
                  <Search className="h-3.5 w-3.5" />
                  {consultando ? "…" : "Buscar"}
                </button>
              </div>
            </Field>

            <Field label="Razão social">
              <TextInput value={f.razaoSocial} onChange={(v) => set("razaoSocial", v)} />
            </Field>

            <Field label="Tipo">
              <Select
                value={f.tipo}
                onChange={(v) => set("tipo", v as TipoFriend)}
                options={TIPOS}
              />
            </Field>

            <Field label="Contato" hint="pessoa com quem se fala">
              <TextInput value={f.contato} onChange={(v) => set("contato", v)} />
            </Field>

            <Field label="Ativo">
              <label className="flex items-center gap-2 text-sm h-9">
                <input
                  type="checkbox"
                  checked={f.ativo}
                  onChange={(e) => set("ativo", e.target.checked)}
                  className="accent-acid w-4 h-4"
                />
                {f.ativo ? "Disponível para novos jobs" : "Fora da lista"}
              </label>
            </Field>
          </div>
        </Section>

        <Section
          title="Entregas"
          right={
            <span className="text-xs text-muted-foreground">
              {f.categorias.length} selecionada(s)
            </span>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {CATEGORIAS_EXTERNAS.map((c) => {
              const on = f.categorias.includes(c);
              return (
                <label
                  key={c}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm cursor-pointer",
                    on ? "border-acid bg-acid/5" : "border-border bg-card"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleCategoria(c)}
                    className="accent-acid w-4 h-4 shrink-0"
                  />
                  <span className="truncate">{c}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            É a mesma lista das categorias de custo externo do projeto — o que você marca aqui é o
            que faz este friend aparecer quando alguém procura quem entrega isso.
          </p>
        </Section>

        <Section title="Contato e portfólio">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="E-mail">
              <TextInput value={f.email} onChange={(v) => set("email", v)} />
            </Field>
            <Field label="Telefone">
              <TextInput value={f.telefone} onChange={(v) => set("telefone", v)} />
            </Field>
            <Field label="Site">
              <TextInput value={f.site} onChange={(v) => set("site", v)} placeholder="https://" />
            </Field>
            <Field label="Portfólio">
              <TextInput
                value={f.portfolio}
                onChange={(v) => set("portfolio", v)}
                placeholder="https://"
              />
            </Field>
          </div>
        </Section>

        <Section title="Conta para pagamento">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Field label="Banco" hint="busque por nome ou número">
                <BancoCombobox
                  codigo={f.conta.bancoCodigo}
                  nome={f.conta.bancoNome}
                  onChange={(b) =>
                    setF((prev) => ({
                      ...prev,
                      conta: { ...prev.conta, bancoCodigo: b.codigo, bancoNome: b.nome },
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Tipo de conta">
              <Select
                value={f.conta.tipoConta}
                onChange={(v) => setConta("tipoConta", v as TipoConta)}
                options={TIPOS_CONTA}
              />
            </Field>
            <Field label="Agência" hint="com dígito, se houver">
              <TextInput value={f.conta.agencia} onChange={(v) => setConta("agencia", v)} />
            </Field>
            <Field label="Conta" hint="com dígito">
              <TextInput value={f.conta.conta} onChange={(v) => setConta("conta", v)} />
            </Field>
            <Field label="Chave PIX">
              <TextInput value={f.conta.pix} onChange={(v) => setConta("pix", v)} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            A conta é sempre do CNPJ acima. A ACID não paga em CPF — se o parceiro só tem conta
            pessoa física, ele não entra no cadastro.
          </p>
        </Section>

        <Section
          title="Receita Federal"
          right={
            f.receita?.consultadoEm ? (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  consultaEnvelhecida(f) ? "text-amber-600" : "text-muted-foreground"
                )}
              >
                consultado em {formatDate(f.receita.consultadoEm)}
                {consultaEnvelhecida(f) && " · vale reconsultar"}
              </span>
            ) : null
          }
        >
          {f.receita ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              {[
                ["Razão social", f.receita.razaoSocial],
                ["Nome fantasia", f.receita.nomeFantasia],
                ["Situação", f.receita.situacao],
                ["Abertura", f.receita.dataAbertura ? formatDate(f.receita.dataAbertura) : ""],
                ["Porte", f.receita.porte],
                ["Município", [f.receita.municipio, f.receita.uf].filter(Boolean).join(" / ")],
                ["CNAE principal", f.receita.cnaePrincipal],
              ].map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    {rotulo}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5",
                      rotulo === "Situação" && valor && valor !== "ATIVA"
                        ? "text-danger font-semibold"
                        : ""
                    )}
                  >
                    {valor || "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Preencha o CNPJ e clique em <b>Buscar</b> para trazer razão social, situação
              cadastral, data de abertura e CNAE.
            </p>
          )}
        </Section>

        <Section
          title={`Projetos — ${formatBRL0(totalProjetos)}`}
          right={
            <span className="text-xs text-muted-foreground tabular-nums">
              {projetos.length} projeto(s)
            </span>
          }
        >
          {projetos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este friend ainda não foi vinculado a nenhuma linha de custo externo. Em Pessoas &
              Custos do projeto, use <b>+ Do Friends</b>.
            </p>
          ) : (
            <ul className="divide-y divide-border/60 border border-border rounded-lg overflow-hidden">
              {projetos.map((p) => (
                <li
                  key={p.id}
                  onClick={() => router.push(`/projetos/${p.id}`)}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {p.cliente} · {p.projeto}
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {p.data ? formatDate(p.data) : "sem data"} · {p.status}
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{formatBRL0(p.valor)}</div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Observações">
          <TextInput value={f.observacoes} onChange={(v) => set("observacoes", v)} />
        </Section>
      </main>
    </div>
  );
}
