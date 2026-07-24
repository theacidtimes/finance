"use client";

import { Section, TextInput, NumInput, Select } from "@/components/ui/primitives";
import { useProjetoStore } from "@/lib/store";
import { useDRE } from "@/lib/useDRE";
import { formatBRL0, formatBRL } from "@/utils/format";
import type { CategoriaExterna, StatusCustoExterno } from "@/types";

const CATEGORIAS: CategoriaExterna[] = [
  "3D", "AI Designer", "Motion", "Motion AI", "GP", "Pós-produção", "Finalização",
  "Cor", "Trilha", "Locução", "Retoque", "Produção", "Coordenação", "Reserva Técnica", "Outros",
];
const STATUS_EXT: StatusCustoExterno[] = ["Orçado", "Aprovado", "Pago"];

const th = "text-left text-[11px] uppercase tracking-widest text-muted-foreground font-medium px-2 py-2";
const td = "px-2 py-1.5 align-middle";

export function Pessoas() {
  const proj = useProjetoStore((s) => s.proj);
  const externos = useProjetoStore((s) => s.externos);
  const dre = useDRE();

  const addInterno = useProjetoStore((s) => s.addInterno);
  const updateInterno = useProjetoStore((s) => s.updateInterno);
  const removeInterno = useProjetoStore((s) => s.removeInterno);
  const addExterno = useProjetoStore((s) => s.addExterno);
  const updateExterno = useProjetoStore((s) => s.updateExterno);
  const removeExterno = useProjetoStore((s) => s.removeExterno);

  return (
    <div className="space-y-5">
      <Section
        title={`Staff interno ACID — ${formatBRL0(dre.staffInterno)} + overhead ${proj.overheadPct}% = ${formatBRL0(dre.staffInterno + dre.overhead)}`}
        right={
          <button onClick={addInterno} className="text-sm px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-80">
            + Interno
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Nome</th><th className={th}>Função</th><th className={th}>Salário mensal</th>
                <th className={th}>Base h/mês</th><th className={th}>Horas projeto</th>
                <th className={th}>Custo/hora</th><th className={th}>Total projeto</th><th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {dre.internosCalc.map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className={td}><TextInput value={p.nome} onChange={(v) => updateInterno(p.id, { nome: v })} /></td>
                  <td className={td}><TextInput value={p.funcao} onChange={(v) => updateInterno(p.id, { funcao: v })} /></td>
                  <td className={td}><NumInput value={p.salario} onChange={(v) => updateInterno(p.id, { salario: v })} /></td>
                  <td className={`${td} w-24`}><NumInput value={p.baseHoras} onChange={(v) => updateInterno(p.id, { baseHoras: v })} /></td>
                  <td className={`${td} w-24`}><NumInput value={p.horasProjeto} onChange={(v) => updateInterno(p.id, { horasProjeto: v })} /></td>
                  <td className={`${td} tabular-nums text-muted-foreground`}>{formatBRL(p.custoHora)}</td>
                  <td className={`${td} tabular-nums font-semibold`}>{formatBRL0(p.custoProjeto)}</td>
                  <td className={td}>
                    <button onClick={() => removeInterno(p.id)} className="text-muted-foreground hover:text-danger" aria-label="Remover">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Custo/hora = salário ÷ base mensal · Total = custo/hora × horas previstas. Overhead incide apenas sobre este bloco.
        </p>
      </Section>

      <Section
        title={`Custos externos / repasses — ${formatBRL0(dre.custosExternos)}`}
        right={
          <button onClick={addExterno} className="text-sm px-3 py-1.5 rounded-md bg-foreground text-background hover:opacity-80">
            + Externo
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className={th}>Nome / Fornecedor</th><th className={th}>Função</th><th className={th}>Categoria</th>
                <th className={th}>Valor</th><th className={th}>Status</th><th className={th}>NF</th>
                <th className={th}>Pagamento</th><th className={th}></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50 bg-muted text-muted-foreground">
                <td className={td}>Luciano</td>
                <td className={td}>3rd Party Finance Fee</td>
                <td className={td}>Comissão</td>
                <td className={`${td} tabular-nums`}>
                  {formatBRL0(dre.comissao)}
                  <span className="text-[10px] uppercase tracking-wide text-acid-dark ml-1">auto · {proj.comissaoPct}% s/ líquida</span>
                </td>
                <td className={td}>—</td><td className={td}>—</td><td className={td}>—</td><td className={td}></td>
              </tr>
              {externos.map((e) => (
                <tr key={e.id} className="border-b border-border/50">
                  <td className={td}><TextInput value={e.nome} onChange={(v) => updateExterno(e.id, { nome: v })} /></td>
                  <td className={td}><TextInput value={e.funcao} onChange={(v) => updateExterno(e.id, { funcao: v })} /></td>
                  <td className={td}>
                    <Select value={e.categoria} onChange={(v) => updateExterno(e.id, { categoria: v as CategoriaExterna })} options={CATEGORIAS} className="py-1" />
                  </td>
                  <td className={`${td} w-32`}><NumInput value={e.valor} onChange={(v) => updateExterno(e.id, { valor: v })} /></td>
                  <td className={td}>
                    <Select
                      value={e.status}
                      onChange={(v) => updateExterno(e.id, { status: v as StatusCustoExterno })}
                      options={STATUS_EXT}
                      className={`py-1 ${e.status === "Pago" ? "border-acid text-acid-dark" : ""}`}
                    />
                  </td>
                  <td className={`${td} text-center`}>
                    <input type="checkbox" checked={e.nf} onChange={(ev) => updateExterno(e.id, { nf: ev.target.checked })} className="accent-acid w-4 h-4" />
                  </td>
                  <td className={`${td} w-32`}><TextInput value={e.dataPagamento} onChange={(v) => updateExterno(e.id, { dataPagamento: v })} placeholder="dd/mm" /></td>
                  <td className={td}>
                    <button onClick={() => removeExterno(e.id)} className="text-muted-foreground hover:text-danger" aria-label="Remover">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
