"use client";

import { Section, Field, TextInput, NumInput, Select } from "@/components/ui/primitives";
import { useProjetoStore } from "@/lib/store";
import { STATUS_PROJETO } from "@/data/constants";
import type { TipoProjeto } from "@/types";

const TIPOS: TipoProjeto[] = ["Filme", "KV", "Social", "Campanha", "Outro"];

export function Cadastro() {
  const proj = useProjetoStore((s) => s.proj);
  const setP = useProjetoStore((s) => s.setProjField);

  return (
    <Section title="Cadastro do projeto">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Cliente" hint="quem contrata e paga — a agência, se houver">
          <TextInput value={proj.cliente} onChange={(v) => setP("cliente", v)} />
        </Field>
        <Field label="Marca" hint="cliente final; deixe vazio se for o próprio cliente">
          <TextInput
            value={proj.marca ?? ""}
            onChange={(v) => setP("marca", v)}
            placeholder={proj.cliente || "Vivo, Santander…"}
          />
        </Field>
        <Field label="Contato" hint="quem pediu o orçamento; sai no cabeçalho da proposta">
          <TextInput
            value={proj.contato ?? ""}
            onChange={(v) => setP("contato", v)}
            placeholder="Nome da pessoa"
          />
        </Field>
        <Field label="Projeto"><TextInput value={proj.projeto} onChange={(v) => setP("projeto", v)} /></Field>
        <Field label="Nº de Serviço"><TextInput value={proj.numeroServico} onChange={(v) => setP("numeroServico", v)} /></Field>
        <Field label="Tipo">
          <Select value={proj.tipo} onChange={(v) => setP("tipo", v as TipoProjeto)} options={TIPOS} />
        </Field>
        <Field label="Responsável"><TextInput value={proj.responsavel} onChange={(v) => setP("responsavel", v)} /></Field>
        <Field label="Data"><TextInput value={proj.data} onChange={(v) => setP("data", v)} /></Field>
        <Field label="Status"><Select value={proj.status} onChange={(v) => setP("status", v)} options={[...STATUS_PROJETO]} /></Field>
        <Field label="Valor Bruto (R$)"><NumInput value={proj.valorBruto} onChange={(v) => setP("valorBruto", v)} /></Field>
        <Field label="Prazo"><TextInput value={proj.prazo} onChange={(v) => setP("prazo", v)} /></Field>
        <Field label="Impostos (%)"><NumInput value={proj.impostosPct} onChange={(v) => setP("impostosPct", v)} /></Field>
        <Field label="Comissão / 3rd Party Fee (%)"><NumInput value={proj.comissaoPct} onChange={(v) => setP("comissaoPct", v)} /></Field>
        <Field label="Overhead (%)"><NumInput value={proj.overheadPct} onChange={(v) => setP("overheadPct", v)} /></Field>
        <Field label="Condição de pagamento"><TextInput value={proj.condicaoPagamento} onChange={(v) => setP("condicaoPagamento", v)} /></Field>
        <Field label="Validade da proposta"><TextInput value={proj.validadeProposta} onChange={(v) => setP("validadeProposta", v)} /></Field>
        <Field label="Observações"><TextInput value={proj.observacoes} onChange={(v) => setP("observacoes", v)} /></Field>
      </div>
      <p className="text-xs text-muted-foreground mt-4">
        Chave do projeto: <b>{proj.cliente} + {proj.projeto} + {proj.numeroServico}</b> — precisa ser única.
      </p>
    </Section>
  );
}
