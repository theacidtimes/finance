"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Section, Field, TextInput, NumInput, Select } from "@/components/ui/primitives";
import { useProjetoStore } from "@/lib/store";
import { AliquotaSimples } from "@/components/screens/AliquotaSimples";
import { STATUS_PROJETO } from "@/data/constants";
import {
  MOEDAS,
  SIMBOLO,
  cambioPendente,
  custoCambio,
  custoCambioPctDe,
  idiomaDe,
  liquidoNaConta,
  moedaDe,
  propostaInternacional,
  LINHA_CUSTO_CAMBIO,
} from "@/lib/moeda";
import { temOpcoes } from "@/lib/opcoes";
import { formatBRL } from "@/utils/format";
import type { TipoProjeto, IdiomaProposta, MoedaProposta } from "@/types";

const TIPOS: TipoProjeto[] = ["Filme", "KV", "Social", "Campanha", "Outro"];

/** Campo derivado: mesma caixa dos outros, sem edição. */
function Somente({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-input rounded-md px-2 py-1 text-sm tabular-nums w-full bg-muted/40 text-muted-foreground">
      {children}
    </div>
  );
}

const IDIOMAS = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
] as const;

export function Cadastro() {
  const proj = useProjetoStore((s) => s.proj);
  const setP = useProjetoStore((s) => s.setProjField);

  const externos = useProjetoStore((s) => s.externos);
  const opcoes = useProjetoStore((s) => s.opcoes);
  const lancarCustoCambio = useProjetoStore((s) => s.lancarCustoCambio);

  const moeda = moedaDe(proj);
  const idioma = idiomaDe(proj);
  const internacional = propostaInternacional(proj);
  const semCambio = cambioPendente(proj);
  // Com grade de condições, o preço é da grade — o campo aqui só mostra.
  const precoDaGrade = temOpcoes(opcoes);
  const pctCambio = custoCambioPctDe(proj);
  const custo = custoCambio(proj.valorBruto, pctCambio);
  const jaLancado = externos.some((e) => e.nome === LINHA_CUSTO_CAMBIO);

  const [buscando, setBuscando] = useState(false);

  /**
   * Preenche o câmbio com a PTAX do dia. Sugestão, não vínculo: depois de
   * preenchida a taxa fica gravada no projeto — proposta aprovada não pode
   * mudar de valor porque o dólar mexeu.
   */
  const buscarCotacao = async () => {
    setBuscando(true);
    try {
      const resp = await fetch(`/api/cotacao?moeda=${moeda}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error ?? "Falha na consulta.");
      setP("cambio", json.cotacao.taxa);
      setP("cambioData", json.cotacao.data);
      toast.success(
        `PTAX de ${json.cotacao.data.split("-").reverse().join("/")}: ${json.cotacao.taxa}` +
          (json.cotacao.fechamento ? "" : " (boletim do dia, ainda não fechou)")
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível buscar a cotação.");
    } finally {
      setBuscando(false);
    }
  };

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
        <Field label="Idioma da proposta" hint="só o documento do cliente; o sistema segue em português">
          <Select
            value={idioma}
            onChange={(v) => setP("idiomaProposta", v as IdiomaProposta)}
            options={IDIOMAS}
          />
        </Field>
        <Field label="Moeda da proposta" hint="o preço que o cliente lê; a apuração continua em real">
          <Select
            value={moeda}
            onChange={(v) => setP("moeda", v as MoedaProposta)}
            options={MOEDAS}
          />
        </Field>

        {internacional ? (
          <>
            <Field
              label={`Valor Bruto (${SIMBOLO[moeda]})`}
              hint={
                precoDaGrade
                  ? "vem das condições comerciais, em Orçamento"
                  : "é este o número que sai na proposta"
              }
            >
              {precoDaGrade ? (
                <Somente>{`${SIMBOLO[moeda]} ${(proj.valorMoeda ?? 0).toLocaleString("pt-BR")}`}</Somente>
              ) : (
                <NumInput value={proj.valorMoeda ?? 0} onChange={(v) => setP("valorMoeda", v)} />
              )}
            </Field>
            <Field
              label={`Câmbio (R$ por ${SIMBOLO[moeda]})`}
              hint={
                proj.cambioData
                  ? `PTAX de ${proj.cambioData.split("-").reverse().join("/")} — travada aqui`
                  : "taxa travada na data da proposta"
              }
            >
              <div className="flex gap-1.5">
                <NumInput
                  value={proj.cambio ?? 0}
                  step="0.0001"
                  onChange={(v) => setP("cambio", v)}
                  className={semCambio ? "border-amber-500" : undefined}
                />
                <button
                  onClick={buscarCotacao}
                  disabled={buscando}
                  className="text-xs px-2 py-1 rounded-md border border-input bg-card hover:bg-muted shrink-0 disabled:opacity-60"
                  title="Cotação de compra do Banco Central (PTAX) — preenche o campo e fica travada"
                >
                  {buscando ? "…" : "PTAX"}
                </button>
              </div>
            </Field>
            <Field
              label="Valor Bruto (R$)"
              hint="derivado de valor × câmbio — é o que o DRE, a carteira e o dashboard somam"
            >
              <Somente>{formatBRL(proj.valorBruto)}</Somente>
            </Field>
            <Field
              label="Custo de câmbio (%)"
              hint="spread do banco + IOF, sobre o câmbio comercial"
            >
              <NumInput
                value={proj.custoCambioPct ?? 1.88}
                step="0.01"
                onChange={(v) => setP("custoCambioPct", v)}
              />
            </Field>
          </>
        ) : (
          <Field
            label="Valor Bruto (R$)"
            hint={precoDaGrade ? "vem das condições comerciais, em Orçamento" : undefined}
          >
            {precoDaGrade ? (
              <Somente>{formatBRL(proj.valorBruto)}</Somente>
            ) : (
              <NumInput value={proj.valorBruto} onChange={(v) => setP("valorBruto", v)} />
            )}
          </Field>
        )}
        <Field label="Prazo"><TextInput value={proj.prazo} onChange={(v) => setP("prazo", v)} /></Field>
        <Field label="Impostos (%)" hint="padrão 11%; use a calculadora do Simples abaixo para a alíquota real">
          <NumInput value={proj.impostosPct} onChange={(v) => setP("impostosPct", v)} />
        </Field>
        <Field label="Comissão / 3rd Party Fee (%)"><NumInput value={proj.comissaoPct} onChange={(v) => setP("comissaoPct", v)} /></Field>
        <Field label="Overhead (%)"><NumInput value={proj.overheadPct} onChange={(v) => setP("overheadPct", v)} /></Field>
        <Field label="Condição de pagamento"><TextInput value={proj.condicaoPagamento} onChange={(v) => setP("condicaoPagamento", v)} /></Field>
        <Field label="Validade da proposta"><TextInput value={proj.validadeProposta} onChange={(v) => setP("validadeProposta", v)} /></Field>
        <Field label="Observações"><TextInput value={proj.observacoes} onChange={(v) => setP("observacoes", v)} /></Field>
      </div>
      {semCambio && (
        <p className="text-xs text-amber-600 mt-4">
          Câmbio não informado. Enquanto a taxa for zero o valor em real fica congelado no último
          valor gravado — e é ele que entra no DRE, na carteira e no dashboard.
        </p>
      )}

      {internacional && proj.valorBruto > 0 && (
        <div className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs space-y-1">
          <div className="flex justify-between tabular-nums">
            <span>Convertido ao câmbio comercial</span>
            <b>{formatBRL(proj.valorBruto)}</b>
          </div>
          <div className="flex justify-between tabular-nums text-muted-foreground">
            <span>Spread + IOF ({pctCambio}%)</span>
            <span>− {formatBRL(custo)}</span>
          </div>
          <div className="flex justify-between tabular-nums border-t border-border pt-1">
            <span>Entra na conta</span>
            <b>{formatBRL(liquidoNaConta(proj.valorBruto, pctCambio))}</b>
          </div>
          <div className="pt-1.5 flex items-center gap-2 flex-wrap">
            {jaLancado ? (
              <span className="text-muted-foreground">
                Lançado como custo <b>{LINHA_CUSTO_CAMBIO}</b> em Pessoas &amp; Custos — acompanha o
                valor do projeto sozinho.
              </span>
            ) : (
              <>
                <button
                  onClick={() => {
                    lancarCustoCambio();
                    toast.success("Custo de câmbio lançado em Pessoas & Custos.");
                  }}
                  className="text-xs px-2 py-1 rounded border border-input bg-card hover:bg-muted"
                >
                  Lançar no DRE
                </button>
                <span className="text-muted-foreground">
                  Sem isso, o DRE mostra a margem sem descontar o que o banco fica.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {internacional && (
        <p className="text-xs text-muted-foreground mt-2">
          Serviço prestado ao exterior não segue a alíquota padrão de 11% — o ISS é segregado na
          exportação. Confirme a alíquota com a contabilidade antes de fechar o preço.
        </p>
      )}

      <AliquotaSimples />
      <p className="text-xs text-muted-foreground mt-4">
        Chave do projeto: <b>{proj.cliente} + {proj.projeto} + {proj.numeroServico}</b> — precisa ser única.
      </p>
    </Section>
  );
}
