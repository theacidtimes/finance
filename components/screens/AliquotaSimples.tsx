"use client";

import * as React from "react";
import { Field, NumInput } from "@/components/ui/primitives";
import { useProjetoStore } from "@/lib/store";
import { aliquotaEfetiva, faixaDe, ANEXO_III, LIMITE_SIMPLES } from "@/lib/impostos";
import { formatBRL0 } from "@/utils/format";

/**
 * Calculadora de alíquota do Simples (Anexo III) para preencher o campo
 * "Impostos (%)" do projeto.
 *
 * Nada aqui é persistido nem integrado a faturamento: o RBT12 é digitado à mão,
 * sai do extrato do DAS ou da contabilidade. A alíquota só entra no projeto
 * quando você clica em "usar".
 */
export function AliquotaSimples() {
  const impostosPct = useProjetoStore((s) => s.proj.impostosPct);
  const setP = useProjetoStore((s) => s.setProjField);
  const [rbt12, setRbt12] = React.useState(0);

  const temValor = rbt12 > 0;
  const faixa = faixaDe(rbt12);
  const ordem = ANEXO_III.indexOf(faixa) + 1;
  const aliquota = aliquotaEfetiva(rbt12);
  const arredondada = Math.round(aliquota * 100) / 100;
  const jaAplicada = Math.abs(impostosPct - arredondada) < 0.005;
  const acimaDoLimite = rbt12 > LIMITE_SIMPLES;

  // Extremos da faixa: mostra o quanto a alíquota ainda pode variar sem trocar
  // de faixa — é o que impede a faixa sozinha de servir como resposta.
  const piso = ANEXO_III[ordem - 2]?.ate ?? 0;
  const range =
    ordem === 1
      ? "6,00% fixo"
      : `${fmtPct(aliquotaEfetiva(piso + 0.01))} a ${fmtPct(aliquotaEfetiva(faixa.ate))}`;

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        <Field
          label="RBT12 (R$)"
          hint="receita bruta dos 12 meses anteriores — está no extrato do DAS"
        >
          <NumInput value={rbt12} onChange={setRbt12} />
        </Field>

        <div className="sm:col-span-1 lg:col-span-2 text-sm">
          {!temValor ? (
            <p className="text-muted-foreground">
              Digite o RBT12 para calcular a alíquota efetiva do Simples Nacional (Anexo III)
              e preencher o campo <b>Impostos (%)</b>. O padrão de 11% continua valendo se
              você não usar.
            </p>
          ) : (
            <div className="space-y-1">
              <p className="tabular-nums">
                <b>{ordem}ª faixa</b> — {formatBRL0(piso)} a {formatBRL0(faixa.ate)} · nominal{" "}
                {fmtPct(faixa.nominal)} · deduz {formatBRL0(faixa.deduzir)}
              </p>
              <p className="tabular-nums text-lg">
                Alíquota efetiva: <b>{fmtPct(aliquota, 4)}</b>{" "}
                <button
                  type="button"
                  onClick={() => setP("impostosPct", arredondada)}
                  disabled={jaAplicada || acimaDoLimite}
                  className="ml-2 align-middle text-xs uppercase tracking-widest border border-input rounded-md px-2 py-1 hover:bg-muted disabled:opacity-40"
                >
                  {jaAplicada ? "aplicada" : `usar ${fmtPct(arredondada)}`}
                </button>
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                Dentro desta faixa a alíquota vai de {range} — por isso a faixa sozinha não
                define o percentual; o RBT12 define.
              </p>
              {acimaDoLimite && (
                <p className="text-xs text-[#E5484D]">
                  RBT12 acima do teto do Simples ({formatBRL0(LIMITE_SIMPLES)}) — a empresa sai
                  do regime. Confirme a alíquota com a contabilidade.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtPct(v: number, casas = 2) {
  return `${v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}
