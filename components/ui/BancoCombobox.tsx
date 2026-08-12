"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BANCOS, type Banco } from "@/data/bancos";

const MAX = 8;

/** "Itaú" e "341" chegam no mesmo lugar — busca por nome ou por código COMPE. */
function buscar(q: string): Banco[] {
  const termo = q.trim().toLowerCase();
  if (!termo) return BANCOS.slice(0, MAX);

  const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const alvo = semAcento(termo);

  const pontos = (b: Banco) => {
    const nome = semAcento(b.nome.toLowerCase());
    if (b.codigo === alvo.padStart(3, "0")) return 0;
    if (b.codigo.startsWith(alvo)) return 1;
    if (nome.startsWith(alvo)) return 2;
    if (nome.includes(alvo)) return 3;
    return 99;
  };

  return BANCOS.map((b) => ({ b, p: pontos(b) }))
    .filter((x) => x.p < 99)
    .sort((a, z) => a.p - z.p || a.b.codigo.localeCompare(z.b.codigo))
    .slice(0, MAX)
    .map((x) => x.b);
}

export function BancoCombobox({
  codigo,
  nome,
  onChange,
}: {
  codigo: string;
  nome: string;
  onChange: (b: { codigo: string; nome: string }) => void;
}) {
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const resultados = useMemo(() => buscar(q), [q]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  const escolher = (b: Banco) => {
    onChange({ codigo: b.codigo, nome: b.nome });
    setQ("");
    setAberto(false);
  };

  const selecionado = codigo ? `${codigo} · ${nome}` : "";

  return (
    <div className="relative" ref={box}>
      <input
        value={aberto ? q : selecionado}
        onChange={(e) => {
          setQ(e.target.value);
          setAberto(true);
        }}
        onFocus={() => {
          setQ("");
          setAberto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && resultados.length) {
            e.preventDefault();
            escolher(resultados[0]);
          }
          if (e.key === "Escape") setAberto(false);
        }}
        placeholder="Nome ou número do banco…"
        className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring"
      />

      {aberto && (
        <ul className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
          {resultados.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Nenhum banco encontrado.</li>
          ) : (
            resultados.map((b) => (
              <li key={b.codigo}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(b)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex gap-2"
                >
                  <span className="tabular-nums text-muted-foreground w-8 shrink-0">
                    {b.codigo}
                  </span>
                  <span className="truncate">{b.nome}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
