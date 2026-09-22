"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Search } from "lucide-react";
import { Section, Field, TextInput, Select } from "@/components/ui/primitives";
import { BancoCombobox } from "@/components/ui/BancoCombobox";
import {
  formatCNPJ,
  soDigitos,
  cnpjValido,
  limparAutocadastro,
  novoFriendDefaults,
  TIPOS_FRIEND,
  TIPOS_CONTA,
} from "@/lib/friends";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_EXTERNAS,
  type CategoriaExterna,
  type DadosAutocadastro,
  type TipoConta,
  type TipoFriend,
} from "@/types";

/** "Reserva Técnica" é conta interna do orçamento, não algo que alguém entrega. */
const ENTREGAS = CATEGORIAS_EXTERNAS.filter((c) => c !== "Reserva Técnica");

function vazio(): DadosAutocadastro {
  const { ativo: _a, receita: _r, ...resto } = novoFriendDefaults();
  return resto;
}

/**
 * Formulário que o próprio Friend preenche, a partir do link que a equipe
 * mandou. Sem login e fora do AppShell: quem abre não é da ACID.
 *
 * A validação daqui é só conforto (mostrar o erro antes de enviar); a que vale
 * roda de novo no servidor, com a mesma função.
 */
export function FriendAutocadastro({
  token,
  jaEnviado,
  inicial,
}: {
  token: string;
  jaEnviado: boolean;
  inicial: DadosAutocadastro | null;
}) {
  const [d, setD] = useState<DadosAutocadastro>(() => ({ ...vazio(), ...(inicial ?? {}) }));
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const set = <K extends keyof DadosAutocadastro>(k: K, v: DadosAutocadastro[K]) =>
    setD((p) => ({ ...p, [k]: v }));
  const setConta = <K extends keyof DadosAutocadastro["conta"]>(
    k: K,
    v: DadosAutocadastro["conta"][K]
  ) => setD((p) => ({ ...p, conta: { ...p.conta, [k]: v } }));

  const toggle = (c: CategoriaExterna) =>
    set("categorias", d.categorias.includes(c) ? d.categorias.filter((x) => x !== c) : [...d.categorias, c]);

  const buscarCNPJ = async () => {
    if (!cnpjValido(d.cnpj)) {
      toast.error("Confira o CNPJ — os dígitos não batem.");
      return;
    }
    setBuscando(true);
    try {
      const resp = await fetch(`/api/convite-friend/${token}/cnpj/${soDigitos(d.cnpj)}`);
      const json = (await resp.json().catch(() => null)) as
        | { razaoSocial?: string; nomeFantasia?: string; error?: string }
        | null;
      if (!resp.ok || !json) {
        toast.error(json?.error ?? "Não foi possível consultar. Preencha à mão.");
        return;
      }
      setD((p) => ({
        ...p,
        razaoSocial: json.razaoSocial || p.razaoSocial,
        nome: p.nome || json.nomeFantasia || json.razaoSocial || "",
      }));
    } finally {
      setBuscando(false);
    }
  };

  const enviar = async () => {
    const { erros: e } = limparAutocadastro(d);
    setErros(e);
    if (e.length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setEnviando(true);
    try {
      const resp = await fetch(`/api/convite-friend/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(d),
      });
      const json = (await resp.json().catch(() => null)) as { error?: string } | null;
      if (!resp.ok) {
        setErros([json?.error ?? "Não foi possível enviar. Tente de novo."]);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setEnviado(true);
      window.scrollTo({ top: 0 });
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="max-w-md text-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_acid_tight.png" alt="ACID" className="h-8 w-auto mx-auto mb-6" />
          <CheckCircle2 className="h-10 w-10 text-acid-dark mx-auto" />
          <h1 className="font-heading text-xl font-semibold">Cadastro enviado. Obrigado!</h1>
          <p className="text-sm text-muted-foreground">
            A equipe da ACID vai revisar seus dados. Enquanto o cadastro não for aprovado, você
            pode abrir este mesmo link para corrigir alguma coisa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-neutral-950 text-white">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-baseline gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_acid_tight.png" alt="ACID" className="h-7 w-auto" />
          <span className="font-display text-base uppercase tracking-[0.18em] font-light">
            Friends
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-6 space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Cadastro de fornecedor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preencha os dados da sua empresa para trabalhar com a ACID. Leva uns 3 minutos. O
            pagamento é feito sempre em conta PJ, no CNPJ informado aqui.
          </p>
          {jaEnviado && (
            <p className="text-sm mt-3 rounded-lg border border-acid/30 bg-acid/10 px-3 py-2">
              Você já enviou este cadastro. Se precisar corrigir algo, edite e envie de novo.
            </p>
          )}
        </div>

        {erros.length > 0 && (
          <ul className="rounded-lg border border-danger/30 bg-red-50 text-danger text-sm px-4 py-3 space-y-1">
            {erros.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        <Section title="Sua empresa">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="CNPJ">
              <div className="flex gap-1.5">
                <TextInput
                  value={formatCNPJ(d.cnpj)}
                  onChange={(v) => set("cnpj", soDigitos(v))}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                />
                <button
                  onClick={buscarCNPJ}
                  disabled={buscando}
                  className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 rounded-md border border-input bg-card hover:bg-muted disabled:opacity-50"
                >
                  <Search className="h-3.5 w-3.5" />
                  {buscando ? "…" : "Buscar"}
                </button>
              </div>
            </Field>
            <Field label="Razão social">
              <TextInput value={d.razaoSocial} onChange={(v) => set("razaoSocial", v)} />
            </Field>
            <Field label="Nome" hint="como você prefere ser chamado no dia a dia">
              <TextInput value={d.nome} onChange={(v) => set("nome", v)} />
            </Field>
            <Field label="Tipo">
              <Select
                value={d.tipo}
                onChange={(v) => set("tipo", v as TipoFriend)}
                options={TIPOS_FRIEND}
              />
            </Field>
          </div>
        </Section>

        <Section title="Contato">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Pessoa de contato">
              <TextInput value={d.contato} onChange={(v) => set("contato", v)} />
            </Field>
            <Field label="E-mail">
              <TextInput value={d.email} onChange={(v) => set("email", v)} type="email" />
            </Field>
            <Field label="Telefone / WhatsApp">
              <TextInput value={d.telefone} onChange={(v) => set("telefone", v)} type="tel" />
            </Field>
            <Field label="Site">
              <TextInput value={d.site} onChange={(v) => set("site", v)} placeholder="https://" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Portfólio" hint="link do site, Behance, Vimeo, Instagram…">
                <TextInput
                  value={d.portfolio}
                  onChange={(v) => set("portfolio", v)}
                  placeholder="https://"
                />
              </Field>
            </div>
          </div>
        </Section>

        <Section
          title="O que você entrega"
          right={
            <span className="text-xs text-muted-foreground">
              {d.categorias.length} marcada(s)
            </span>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {ENTREGAS.map((c) => {
              const on = d.categorias.includes(c);
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
                    onChange={() => toggle(c)}
                    className="accent-acid w-4 h-4 shrink-0"
                  />
                  <span className="truncate">{c}</span>
                </label>
              );
            })}
          </div>
        </Section>

        <Section title="Conta para pagamento">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Banco" hint="busque por nome ou número">
                <BancoCombobox
                  codigo={d.conta.bancoCodigo}
                  nome={d.conta.bancoNome}
                  onChange={(b) =>
                    setD((p) => ({
                      ...p,
                      conta: { ...p.conta, bancoCodigo: b.codigo, bancoNome: b.nome },
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Agência" hint="com dígito, se houver">
              <TextInput value={d.conta.agencia} onChange={(v) => setConta("agencia", v)} />
            </Field>
            <Field label="Conta" hint="com dígito">
              <TextInput value={d.conta.conta} onChange={(v) => setConta("conta", v)} />
            </Field>
            <Field label="Tipo de conta">
              <Select
                value={d.conta.tipoConta}
                onChange={(v) => setConta("tipoConta", v as TipoConta)}
                options={TIPOS_CONTA}
              />
            </Field>
            <Field label="Chave PIX" hint="opcional">
              <TextInput value={d.conta.pix} onChange={(v) => setConta("pix", v)} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            A conta precisa estar no CNPJ informado acima — a ACID não paga em conta pessoa física.
          </p>
        </Section>

        <Section title="Observações">
          <textarea
            value={d.observacoes}
            onChange={(e) => set("observacoes", e.target.value)}
            rows={3}
            placeholder="Algo que a gente deva saber? Equipamento, cidade, disponibilidade…"
            className="w-full border border-input rounded-md p-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </Section>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between pb-10">
          <p className="text-xs text-muted-foreground max-w-md">
            Ao enviar, você autoriza a ACID (THE ACID TIMES LTDA) a guardar estes dados para
            cadastro de fornecedor, contato e pagamentos.
          </p>
          <button
            onClick={enviar}
            disabled={enviando}
            className="text-sm px-5 py-2.5 rounded-xl font-semibold text-neutral-900 bg-acid hover:opacity-90 disabled:opacity-50"
          >
            {enviando ? "Enviando…" : jaEnviado ? "Reenviar cadastro" : "Enviar cadastro"}
          </button>
        </div>
      </main>
    </div>
  );
}
