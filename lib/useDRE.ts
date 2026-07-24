"use client";

import { useMemo } from "react";
import { computeDRE } from "@/lib/finance";
import { useProjetoStore } from "@/lib/store";
import type { DREResultado } from "@/types";

/** DRE derivado do projeto aberto na store — recalcula ao vivo. */
export function useDRE(): DREResultado {
  const proj = useProjetoStore((s) => s.proj);
  const externos = useProjetoStore((s) => s.externos);
  const internos = useProjetoStore((s) => s.internos);

  return useMemo(
    () =>
      computeDRE({
        valorBruto: proj.valorBruto,
        impostosPct: proj.impostosPct,
        comissaoPct: proj.comissaoPct,
        overheadPct: proj.overheadPct,
        externos,
        internos,
      }),
    [proj.valorBruto, proj.impostosPct, proj.comissaoPct, proj.overheadPct, externos, internos]
  );
}
