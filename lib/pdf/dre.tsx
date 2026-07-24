import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { Projeto, DREResultado } from "@/types";
import { formatBRL, formatBRL0, formatPct } from "@/utils/format";

const INK = "#111111";
const MUTED = "#6B7280";
const LINE = "#E5E7EB";
const ACID = "#0FB86E";
const DANGER = "#E5484D";
const AMBER = "#B45309";

function margemTone(m: number): string {
  if (m >= 0.3) return ACID;
  if (m >= 0.2) return AMBER;
  return DANGER;
}

const s = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontSize: 10,
    color: INK,
    fontFamily: "Helvetica",
  },
  header: { borderBottomWidth: 2, borderBottomColor: INK, paddingBottom: 12, marginBottom: 18 },
  logo: { height: 24, width: 68, marginBottom: 8, objectFit: "contain" },
  h1: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 9, color: MUTED, marginTop: 3 },
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 4, marginTop: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  rowStrong: { backgroundColor: "#F3F4F6" },
  label: { fontSize: 10 },
  labelSub: { fontSize: 8, color: MUTED },
  labelNeg: { paddingLeft: 12 },
  value: { fontSize: 10, textAlign: "right" },
  valueSub: { fontSize: 8, color: MUTED, textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  cardsRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  card: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 12 },
  cardTitle: { fontSize: 8, letterSpacing: 1, color: MUTED, textTransform: "uppercase", marginBottom: 8, fontFamily: "Helvetica-Bold" },
  cardLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4, fontSize: 9 },
  cardMuted: { color: MUTED },
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

export type DrePdfData = { proj: Projeto; dre: DREResultado; logoDataUrl?: string };

function Line({
  label,
  value,
  neg,
  strong,
  sub,
  tone,
}: {
  label: string;
  value: string;
  neg?: boolean;
  strong?: boolean;
  sub?: boolean;
  tone?: string;
}) {
  return (
    <View style={[s.row, strong ? s.rowStrong : {}]}>
      <Text style={[sub ? s.labelSub : s.label, neg ? s.labelNeg : {}, strong ? s.bold : {}]}>
        {neg ? "(−) " : ""}
        {label}
      </Text>
      <Text
        style={[
          sub ? s.valueSub : s.value,
          strong ? s.bold : {},
          tone ? { color: tone, fontFamily: "Helvetica-Bold" } : {},
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function DreDoc({ proj, dre, logoDataUrl }: DrePdfData) {
  return (
    <Document title={`DRE ${proj.cliente} ${proj.projeto}`.trim()} author="THE ACID TIMES LTDA">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {logoDataUrl ? <Image style={s.logo} src={logoDataUrl} /> : null}
          <Text style={s.h1}>DRE do projeto</Text>
          <Text style={s.sub}>
            {proj.cliente} · {proj.projeto} · {proj.numeroServico} · {proj.data}
          </Text>
        </View>

        <View style={s.table}>
          <Line label="Receita Bruta" value={formatBRL(dre.receitaBruta)} strong />
          <Line label={`Impostos (${proj.impostosPct}%)`} value={formatBRL(dre.impostos)} neg />
          <Line label="Receita Líquida" value={formatBRL(dre.receitaLiquida)} strong />
          <Line
            label={`Comissão / 3rd Party Fee (${proj.comissaoPct}% s/ líquida)`}
            value={formatBRL(dre.comissao)}
            neg
          />
          <Line label="Receita Operacional" value={formatBRL(dre.receitaOperacional)} strong />
          <Line label="Custos Externos" value={formatBRL(dre.custosExternos)} neg />
          <Line label="Staff Interno ACID" value={formatBRL(dre.staffInterno)} neg />
          <Line label={`Overhead (${proj.overheadPct}% s/ staff)`} value={formatBRL(dre.overhead)} neg />
          <Line
            label="Lucro Operacional"
            value={formatBRL(dre.lucroOperacional)}
            strong
            tone={dre.lucroOperacional >= 0 ? ACID : DANGER}
          />
          <Line label="Margem sobre Receita Bruta" value={formatPct(dre.margemBruta)} sub />
          <Line label="Margem Operacional" value={formatPct(dre.margemOperacional)} sub tone={margemTone(dre.margemOperacional)} />
          <Line
            label="Retido na ACID (staff + overhead + lucro)"
            value={formatBRL(dre.retidoACID)}
            sub
          />
        </View>

        <View style={s.cardsRow}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Repasse × Retido</Text>
            <View style={s.cardLine}>
              <Text style={s.cardMuted}>Governo (impostos)</Text>
              <Text style={s.bold}>{formatBRL0(dre.impostos)}</Text>
            </View>
            <View style={s.cardLine}>
              <Text style={s.cardMuted}>Comissão</Text>
              <Text style={s.bold}>{formatBRL0(dre.comissao)}</Text>
            </View>
            <View style={s.cardLine}>
              <Text style={s.cardMuted}>Repasses externos</Text>
              <Text style={s.bold}>{formatBRL0(dre.custosExternos)}</Text>
            </View>
            <View style={[s.cardLine, { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 5, marginTop: 2 }]}>
              <Text style={s.bold}>Fica na ACID</Text>
              <Text style={[s.bold, { color: ACID }]}>{formatBRL0(dre.retidoACID)}</Text>
            </View>
          </View>
          <View style={s.card}>
            <Text style={s.cardTitle}>Saúde da margem</Text>
            <Text style={{ fontSize: 26, fontFamily: "Helvetica-Bold", color: margemTone(dre.margemOperacional) }}>
              {formatPct(dre.margemOperacional)}
            </Text>
            <Text style={{ fontSize: 8, color: MUTED, marginTop: 4 }}>
              Margem operacional. Verde ≥ 30% · amarelo 20–30% · vermelho &lt; 20%.
            </Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>THE ACID TIMES LTDA · CNPJ 36.458.402/0001-81</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generateDreBlob(data: DrePdfData): Promise<Blob> {
  return pdf(<DreDoc {...data} />).toBlob();
}
