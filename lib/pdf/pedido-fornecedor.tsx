import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import type { PedidoFornecedor, Projeto } from "@/types";
import { parseFicha } from "@/lib/proposta";
import {
  metaPedido,
  blocosPedido,
  codigoPedido,
  linhaServico,
  type BlocoPedido,
} from "@/lib/pedido-fornecedor";

/**
 * PDF do pedido de orçamento ao fornecedor.
 *
 * Mesmo papel timbrado da proposta (logo, razão social, régua preta, rodapé),
 * porque é a mesma empresa escrevendo — só que pedindo. O conteúdo vem de
 * `blocosPedido`, o mesmo que a tela usa.
 */

const INK = "#111111";
const MUTED = "#6B7280";
const LINE = "#D1D5DB";

const s = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  header: { borderBottomWidth: 2, borderBottomColor: INK, paddingBottom: 14, marginBottom: 22 },
  logo: { height: 26, width: 74, marginBottom: 10, objectFit: "contain" },
  company: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  cnpj: { fontSize: 8, color: MUTED, marginTop: 2 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  metaItem: { width: "50%", fontSize: 8, color: MUTED, marginBottom: 3 },
  metaLabel: { fontFamily: "Helvetica-Bold", color: INK },
  titulo: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 20, lineHeight: 1.3 },
  block: { marginBottom: 14 },
  blockHead: {
    fontSize: 8,
    letterSpacing: 1.5,
    fontFamily: "Helvetica-Bold",
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  body: { fontSize: 10, lineHeight: 1.55 },
  fichaRow: { fontSize: 10, lineHeight: 1.55, marginBottom: 1 },
  fichaLabel: { fontFamily: "Helvetica-Bold" },
  servico: { flexDirection: "row", marginBottom: 4 },
  bullet: { width: 12, fontSize: 10 },
  servicoTexto: { flex: 1, fontSize: 10, lineHeight: 1.55 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: MUTED,
  },
});

function Conteudo({ b }: { b: BlocoPedido }) {
  if (b.tipo === "servicos") {
    return (
      <>
        {b.servicos.map((sv) => (
          <View key={sv.id} style={s.servico}>
            <Text style={s.bullet}>•</Text>
            <Text style={s.servicoTexto}>{linhaServico(sv)}</Text>
          </View>
        ))}
      </>
    );
  }
  if (b.tipo === "ficha") {
    return (
      <>
        {parseFicha(b.texto).map((l, i) => (
          <Text key={i} style={s.fichaRow}>
            {l.rotulo ? <Text style={s.fichaLabel}>{l.rotulo}:</Text> : null}
            {l.rotulo ? (l.valor ? ` ${l.valor}` : "") : l.valor}
          </Text>
        ))}
      </>
    );
  }
  return <Text style={s.body}>{b.texto}</Text>;
}

export type PedidoPdfData = {
  pedido: PedidoFornecedor;
  proj: Projeto;
  logoDataUrl?: string;
};

export function PedidoDoc({ pedido, proj, logoDataUrl }: PedidoPdfData) {
  const codigo = codigoPedido(proj, pedido.numero);
  return (
    <Document
      title={`Pedido de orçamento ${codigo} ${pedido.empresa}`.trim()}
      author="THE ACID TIMES LTDA"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {logoDataUrl ? <Image style={s.logo} src={logoDataUrl} /> : null}
          <Text style={s.company}>THE ACID TIMES LTDA</Text>
          <Text style={s.cnpj}>CNPJ: 36.458.402/0001-81</Text>
          <View style={s.metaGrid}>
            {metaPedido(pedido, proj).map((m) => (
              <Text key={m.rotulo} style={s.metaItem}>
                <Text style={s.metaLabel}>{m.rotulo}: </Text>
                {m.valor}
              </Text>
            ))}
          </View>
        </View>

        <Text style={s.titulo}>Pedido de orçamento</Text>

        {blocosPedido(pedido).map((b) => (
          <View key={b.titulo} style={s.block} minPresenceAhead={56}>
            <Text style={s.blockHead}>
              {b.n}. {b.titulo}
            </Text>
            <Conteudo b={b} />
          </View>
        ))}

        <View style={s.footer} fixed>
          <Text>THE ACID TIMES LTDA · CNPJ 36.458.402/0001-81 · Pedido {codigo}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generatePedidoBlob(data: PedidoPdfData): Promise<Blob> {
  return pdf(<PedidoDoc {...data} />).toBlob();
}
