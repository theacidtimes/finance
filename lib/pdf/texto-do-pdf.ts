import zlib from "node:zlib";

/**
 * Texto de um PDF do react-pdf.
 *
 * O conteúdo sai glifo a glifo, em hexa, dentro de arrays `TJ`
 * (`[<4e> -187.5 <c3> ...] TJ`) — a Helvetica embutida usa códigos WinAnsi, que
 * batem com latin1 no que interessa aqui. Cada `TJ` é uma palavra ou pedaço de
 * linha; juntar com espaço é suficiente para procurar frases dentro do
 * documento.
 */
export function textoDoPdf(buf: Buffer): string {
  const raw = buf.toString("latin1");
  const partes: string[] = [];
  for (const st of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let conteudo: string;
    try {
      conteudo = zlib.inflateSync(Buffer.from(st[1], "latin1")).toString("latin1");
    } catch {
      continue; // fontes, imagens
    }
    if (!conteudo.includes("BT")) continue;
    for (const tj of conteudo.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
      const bytes = [...tj[1].matchAll(/<([0-9a-fA-F]+)>/g)].flatMap((h) =>
        (h[1].match(/../g) ?? []).map((par) => parseInt(par, 16))
      );
      if (bytes.length) partes.push(Buffer.from(bytes).toString("latin1"));
    }
  }
  return partes.join(" ");
}
