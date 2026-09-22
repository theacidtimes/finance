"use client";

import { parseFicha, serializarFicha } from "@/lib/proposta";

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
export function FichaEditor({
  value,
  onChange,
  rotulos,
  listId = "rotulos-ficha",
  ajuda = "O rótulo sai em negrito na proposta. Deixe o rótulo em branco para uma linha livre.",
}: {
  value: string;
  onChange: (v: string) => void;
  /** Sugestões do datalist — os campos da ficha no idioma da proposta. */
  rotulos: string[];
  /** Id do datalist — único por tela, se houver mais de um editor. */
  listId?: string;
  ajuda?: string;
}) {
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
      <datalist id={listId}>
        {rotulos.map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>

      {linhas.map((l, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={l.rotulo}
            list={listId}
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
        <span className="text-[11px] text-muted-foreground">{ajuda}</span>
      </div>
    </div>
  );
}
