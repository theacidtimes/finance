"use client";

import { useState } from "react";
import { toast } from "sonner";
import { TextInput } from "@/components/ui/primitives";
import { usePerfil } from "@/components/PerfilProvider";
import { ImportarPedido } from "@/components/screens/ImportarPedido";
import { useProjetoStore } from "@/lib/store";
import { useDRE } from "@/lib/useDRE";
import {
  metaProposta,
  linhaProjeto,
  blocosProposta,
  parseFicha,
  serializarFicha,
  ROTULOS_FICHA,
  type BlocoProposta,
} from "@/lib/proposta";
import { formatBRL0 } from "@/utils/format";
import { CATALOGO, TEXTOS_MESTRE, blocosParaProdutos, type ItemProposta } from "@/data/catalogo";
import type { BlocosProposta } from "@/types";

/**
 * Bloco da proposta.
 *
 * Vazio, ele não vai para o cliente (ver `blocosProposta`). Mas em modo de
 * edição continua na tela — some-lo aqui tiraria justamente o campo que a
 * pessoa precisa preencher. Fica com aviso, e a numeração exibida já é a
 * numeração final: o que se vê editando é o que sai no PDF.
 */
function Bloco({
  b,
  editando,
  fixo,
  children,
}: {
  b: BlocoProposta;
  editando: boolean;
  fixo?: boolean;
  children: React.ReactNode;
}) {
  if (!b.incluso && !editando) return null;
  return (
    <div className={`mb-6 ${b.incluso ? "" : "opacity-60"}`}>
      <h4 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
        {b.incluso ? `${b.n}. ${b.titulo}` : b.titulo}
        {fixo && (
          <span
            className="text-[8px] tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border normal-case"
            title="Texto padrão da ACID — editável apenas no texto-mestre (mesmo para todos os projetos)"
          >
            fixo
          </span>
        )}
        {!b.incluso && (
          <span
            className="text-[8px] tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border normal-case"
            title="Bloco vazio não entra na proposta — os demais são renumerados"
          >
            vazio · fora do PDF
          </span>
        )}
      </h4>
      <div
        className={`leading-relaxed whitespace-pre-wrap ${
          b.miudo ? "text-[12.5px] text-foreground/80" : "text-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/** Seletor de produtos do catálogo — regenera os blocos derivados da proposta. */
function SeletorProdutos({
  onAplicar,
}: {
  onAplicar: (itens: ItemProposta[]) => void;
}) {
  const [sel, setSel] = useState<Record<string, number>>({});

  const toggle = (id: string) =>
    setSel((s) => {
      const next = { ...s };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });

  const setQtd = (id: string, q: number) =>
    setSel((s) => ({ ...s, [id]: Math.max(1, q || 1) }));

  const itens: ItemProposta[] = Object.entries(sel).map(([produtoId, quantidade]) => ({
    produtoId,
    quantidade,
  }));

  return (
    <details className="mb-5 rounded-lg border border-border bg-muted/30">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium">
        Inserir produtos do catálogo
        <span className="text-xs text-muted-foreground ml-2">
          preenche serviço, entrega, não incluso e alterações
        </span>
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {CATALOGO.map((p) => {
            const on = Boolean(sel[p.id]);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm ${
                  on ? "border-acid bg-acid/5" : "border-border bg-card"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(p.id)}
                  className="accent-acid w-4 h-4 shrink-0"
                />
                <span className="flex-1 truncate" title={p.descricao}>
                  {p.label}
                </span>
                {on && (
                  <input
                    type="number"
                    min={1}
                    value={sel[p.id]}
                    onChange={(e) => setQtd(p.id, Number(e.target.value))}
                    className="w-14 border border-input rounded px-1.5 py-0.5 text-sm bg-card tabular-nums"
                    title="Quantidade"
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {itens.length ? `${itens.length} produto(s) selecionado(s)` : "Nenhum produto selecionado"}
          </span>
          <button
            onClick={() => onAplicar(itens)}
            disabled={!itens.length}
            className="text-sm px-3 py-1.5 rounded-md text-neutral-900 font-medium hover:opacity-90 bg-acid disabled:opacity-40"
          >
            Aplicar produtos
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Sobrescreve os blocos derivados. Os textos fixos (cláusula de IA, materiais, cancelamento) não são afetados.
        </p>
      </div>
    </details>
  );
}

/**
 * Bloco em formato de ficha (padrão dos PDFs da ACID): um campo por linha,
 * rótulo em negrito. Linhas que não seguem "Rótulo: valor" saem como texto.
 * Usa o mesmo parser do PDF — o que se lê aqui é o que é impresso.
 */
function Ficha({ texto }: { texto: string }) {
  return (
    <div className="space-y-0.5">
      {parseFicha(texto).map((l, i) =>
        l.rotulo ? (
          <div key={i}>
            <span className="font-semibold">{l.rotulo}:</span>
            {l.valor ? ` ${l.valor}` : ""}
          </div>
        ) : (
          <div key={i}>{l.valor || "\u00A0"}</div>
        )
      )}
    </div>
  );
}

/**
 * Editor da "Especificação da entrega": uma linha por campo, rótulo à esquerda
 * e valor à direita.
 *
 * A ficha sempre teve estrutura — os templates do catálogo já nascem em
 * "Rótulo: valor" e o PDF já imprime o rótulo em negrito. O que faltava era o
 * editor admitir isso: num textarea, um dois-pontos esquecido virava campo
 * perdido, sem aviso, e só aparecia no PDF.
 *
 * A gravação continua sendo o mesmo texto de sempre (`parseFicha`/
 * `serializarFicha` são inversos), então nada muda no banco, no importador de
 * pedido nem nos templates do catálogo — inclusive as linhas de cabeçalho
 * ("Filme IA (2x):") e as linhas em branco que separam produtos.
 */
function FichaEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const linhas = parseFicha(value);
  const commit = (next: typeof linhas) => onChange(serializarFicha(next));

  const setLinha = (i: number, patch: Partial<(typeof linhas)[number]>) =>
    commit(linhas.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const remover = (i: number) => commit(linhas.filter((_, j) => j !== i));
  const adicionar = () => commit([...linhas, { rotulo: "", valor: "" }]);

  const campo =
    "border border-input rounded-md px-2 py-1 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-1.5">
      <datalist id="rotulos-ficha">
        {ROTULOS_FICHA.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      {linhas.map((l, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={l.rotulo}
            list="rotulos-ficha"
            maxLength={32}
            // ":" separa rótulo de valor e rótulo longo deixa de ser rótulo —
            // barrar na digitação evita que o campo se desfaça ao salvar.
            onChange={(e) => setLinha(i, { rotulo: e.target.value.replace(/:/g, "") })}
            placeholder="Campo"
            className={`${campo} w-44 shrink-0 font-semibold`}
          />
          <input
            value={l.valor}
            onChange={(e) => setLinha(i, { valor: e.target.value })}
            placeholder={l.rotulo ? "Valor" : "Linha livre (sem rótulo)"}
            className={`${campo} flex-1`}
          />
          <button
            onClick={() => remover(i)}
            className="text-muted-foreground hover:text-danger px-1"
            aria-label="Remover campo"
            title="Remover campo"
          >
            ×
          </button>
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={adicionar}
          className="text-xs px-2 py-1 rounded border border-input hover:bg-muted"
        >
          + campo
        </button>
        <span className="text-[11px] text-muted-foreground">
          O rótulo sai em negrito na proposta. Deixe o rótulo em branco para uma linha
          livre.
        </span>
      </div>
    </div>
  );
}

// Definido fora do componente de tela: se ficasse dentro do corpo de `Orcamento`,
// seria recriado a cada render, desmontando o <textarea> e fazendo perder foco/rolagem.
function Area({
  editando,
  value,
  onChange,
  rows = 4,
}: {
  editando: boolean;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  // Em visualização, bloco vazio nem chega aqui: ele sai da proposta.
  if (!editando) return <>{value}</>;
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full border border-input rounded-md p-2 text-sm leading-relaxed bg-card focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

export function Orcamento() {
  const proj = useProjetoStore((s) => s.proj);
  const blocos = useProjetoStore((s) => s.blocos);
  const cronograma = useProjetoStore((s) => s.cronograma);
  const setP = useProjetoStore((s) => s.setProjField);
  const setBloco = useProjetoStore((s) => s.setBloco);
  const addMarco = useProjetoStore((s) => s.addMarco);
  const updateMarco = useProjetoStore((s) => s.updateMarco);
  const removeMarco = useProjetoStore((s) => s.removeMarco);
  const dre = useDRE();
  const { can } = usePerfil();
  const podeGerar = can("gerar_orcamento");

  const [editando, setEditando] = useState(true);
  const [gerando, setGerando] = useState(false);

  const gerarPDF = async () => {
    setGerando(true);
    try {
      const [{ generatePropostaBlob }, { downloadBlob, fileBase, loadLogoDataUrl }] =
        await Promise.all([import("@/lib/pdf/proposta"), import("@/lib/export")]);
      const logoDataUrl = await loadLogoDataUrl();
      const blob = await generatePropostaBlob({
        proj,
        blocos,
        cronograma,
        receitaBruta: dre.receitaBruta,
        logoDataUrl,
      });
      downloadBlob(blob, `Proposta_${fileBase(proj)}.pdf`);
      toast.success("Proposta em PDF gerada.");
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGerando(false);
    }
  };

  // Quais blocos entram na proposta e com que número — mesma fonte do PDF.
  const B = blocosProposta(proj, blocos, cronograma);
  const vazios = Object.values(B).filter((b) => !b.incluso).length;

  const area = (k: keyof BlocosProposta, rows = 4) => (
    <Area editando={editando} value={blocos[k]} onChange={(v) => setBloco(k, v)} rows={rows} />
  );

  // Regenera apenas os blocos derivados; os fixos (IA, materiais, cancelamento)
  // vêm do TEXTOS_MESTRE e não passam pelo estado.
  const aplicarProdutos = (itens: ItemProposta[]) => {
    const b = blocosParaProdutos(itens);
    (["servicoInclui", "entrega", "exclusoes", "alteracoes"] as const).forEach((k) => {
      if (b[k].trim()) setBloco(k, b[k]);
    });
    toast.success("Produtos aplicados à proposta.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Pré-visualização da proposta comercial. &quot;Gerar PDF&quot; baixa o documento pronto para enviar.
        </p>
        <div className="flex gap-2">
          <ImportarPedido />
          <button
            onClick={() => setEditando((e) => !e)}
            className="text-sm px-3 py-1.5 rounded-md border border-input bg-card hover:bg-muted"
          >
            {editando ? "Modo visualização" : "Editar blocos"}
          </button>
          {podeGerar ? (
            <button
              onClick={gerarPDF}
              disabled={gerando}
              className="text-sm px-3 py-1.5 rounded-md text-neutral-900 font-medium hover:opacity-90 bg-acid disabled:opacity-60"
            >
              {gerando ? "Gerando…" : "Gerar PDF"}
            </button>
          ) : (
            <span
              className="text-xs text-muted-foreground px-3 py-1.5"
              title="Você não tem permissão para gerar orçamento"
            >
              Sem permissão para gerar PDF
            </span>
          )}
        </div>
      </div>

      {editando && <SeletorProdutos onAplicar={aplicarProdutos} />}

      <div className="bg-card border border-border rounded-xl p-8 md:p-12 max-w-3xl mx-auto">
        <div className="border-b-2 border-foreground pb-5 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_acid_tight.png" alt="ACID" className="h-12 w-auto mb-4" />
          <div className="text-sm font-semibold tracking-tight">THE ACID TIMES LTDA</div>
          <div className="text-xs text-muted-foreground mt-0.5">CNPJ: 36.458.402/0001-81</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground mt-4">
            {metaProposta(proj).map((m) => (
              <span key={m.rotulo}>
                <b>{m.rotulo}:</b> {m.valor}
              </span>
            ))}
          </div>

          {!proj.contato?.trim() && (
            <p className="text-[11px] text-amber-600 mt-2">
              Sem contato definido. Preencha em Cadastro — o nome de quem pediu o orçamento sai no
              cabeçalho e é o que dá segurança a quem recebe.
            </p>
          )}

          {editando ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3">
              <label className="text-xs">
                <span className="text-muted-foreground">Roteiro aprovado — link</span>
                <TextInput
                  value={proj.roteiroUrl ?? ""}
                  onChange={(v) => setP("roteiroUrl", v)}
                  placeholder="https://docs.google.com/…"
                />
              </label>
              <label className="text-xs">
                <span className="text-muted-foreground">Rótulo do link (opcional)</span>
                <TextInput
                  value={proj.roteiroLabel ?? ""}
                  onChange={(v) => setP("roteiroLabel", v)}
                  placeholder="Roteiro v3 — aprovado 20/07"
                />
              </label>
            </div>
          ) : proj.roteiroUrl && proj.roteiroUrl.trim() ? (
            <div className="text-xs text-muted-foreground mt-3">
              <b>Roteiro de referência:</b>{" "}
              <a
                href={proj.roteiroUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0FB86E] underline hover:opacity-80"
              >
                {proj.roteiroLabel?.trim() ? proj.roteiroLabel : proj.roteiroUrl}
              </a>
            </div>
          ) : null}
        </div>

        <div className="mb-8">
          {editando ? (
            <textarea
              value={proj.titulo}
              onChange={(e) => setP("titulo", e.target.value)}
              rows={2}
              className="w-full border border-input rounded-md p-2 text-lg font-semibold leading-snug bg-card"
            />
          ) : (
            <h2 className="text-xl font-semibold leading-snug">{proj.titulo}</h2>
          )}
        </div>

        <Bloco b={B.projeto} editando={editando}>
          {linhaProjeto(proj)}
        </Bloco>
        <Bloco b={B.servicoInclui} editando={editando}>{area("servicoInclui", 16)}</Bloco>
        <Bloco b={B.entrega} editando={editando}>
          {editando ? (
            <FichaEditor value={blocos.entrega} onChange={(v) => setBloco("entrega", v)} />
          ) : (
            <Ficha texto={blocos.entrega} />
          )}
        </Bloco>

        <Bloco b={B.investimento} editando={editando}>
          <div className="border border-foreground rounded-lg px-5 py-4 flex items-baseline justify-between">
            <span className="text-sm">Investimento total do projeto</span>
            <span className="text-2xl font-bold tabular-nums">{formatBRL0(dre.receitaBruta)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Valor bruto, impostos inclusos.</p>
        </Bloco>

        <Bloco b={B.pagamento} editando={editando}>
          {editando ? <TextInput value={proj.condicaoPagamento} onChange={(v) => setP("condicaoPagamento", v)} /> : proj.condicaoPagamento}
        </Bloco>

        <Bloco b={B.cronograma} editando={editando}>
          <div className="space-y-1.5">
            {/* Editando, toda linha aparece (inclusive a recém-criada, vazia).
                Na visualização, marco em branco some — é o que o PDF faz. */}
            {cronograma.map((m, i) => {
              if (!editando && !m.data.trim() && !m.marco.trim()) return null;
              return (
              <div key={i} className="flex gap-2 items-center text-sm">
                {editando ? (
                  <>
                    <span className="w-24 shrink-0"><TextInput value={m.data} onChange={(v) => updateMarco(i, { data: v })} /></span>
                    <TextInput value={m.marco} onChange={(v) => updateMarco(i, { marco: v })} />
                    <button onClick={() => removeMarco(i)} className="text-muted-foreground hover:text-danger px-1" aria-label="Remover">×</button>
                  </>
                ) : (
                  <>
                    <b className="w-20 shrink-0 tabular-nums">{m.data}</b>
                    <span>{m.marco}</span>
                  </>
                )}
              </div>
              );
            })}
            {editando && (
              <button onClick={addMarco} className="text-xs mt-2 px-2 py-1 rounded border border-input hover:bg-muted">
                + marco
              </button>
            )}
          </div>
        </Bloco>

        <Bloco b={B.exclusoes} editando={editando}>{area("exclusoes", 4)}</Bloco>
        <Bloco b={B.alteracoes} editando={editando}>{area("alteracoes", 5)}</Bloco>
        <Bloco b={B.observacoes} editando={editando}>{area("observacoes", 2)}</Bloco>
        <Bloco b={B.cancelamento} editando={editando} fixo>{TEXTOS_MESTRE.cancelamento}</Bloco>
        <Bloco b={B.clausulaIA} editando={editando} fixo>{TEXTOS_MESTRE.clausulaIA}</Bloco>
        <Bloco b={B.materiais} editando={editando} fixo>{TEXTOS_MESTRE.materiais}</Bloco>
        <Bloco b={B.validade} editando={editando}>
          Esta proposta é válida por {proj.validadeProposta} a partir da data de emissão.
        </Bloco>

        {vazios > 0 && editando && (
          <p className="text-[11px] text-muted-foreground border-t border-border pt-3 mt-2">
            {vazios === 1 ? "1 bloco vazio não entra" : `${vazios} blocos vazios não entram`} na
            proposta enviada — os demais já aparecem aqui com a numeração final.
          </p>
        )}
      </div>
    </div>
  );
}
