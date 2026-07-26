import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { Projeto, BlocosProposta, MarcoCronograma } from "@/types";
import { formatBRL0 } from "@/utils/format";
import { TEXTOS_MESTRE } from "@/data/catalogo";

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
  roteiroRow: { width: "100%", fontSize: 8, color: MUTED, marginTop: 3 },
  roteiroLink: { color: "#0FB86E", textDecoration: "underline" },
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
  investBox: {
    borderWidth: 1,
    borderColor: INK,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  investLabel: { fontSize: 10 },
  investValue: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  investNote: { fontSize: 8, color: MUTED, marginTop: 5 },
  cronoRow: { flexDirection: "row", marginBottom: 3 },
  cronoData: { width: 60, fontFamily: "Helvetica-Bold", fontSize: 9 },
  cronoMarco: { flex: 1, fontSize: 9 },
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

function Block({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <View style={s.block} wrap={false}>
      <Text style={s.blockHead}>
        {n}. {titulo}
      </Text>
      {children}
    </View>
  );
}

/**
 * Bloco em formato de ficha: um campo por linha, rótulo em negrito.
 * Espelha o `Ficha` da tela (components/screens/Orcamento.tsx).
 */
function Ficha({ texto }: { texto: string }) {
  if (!texto.trim()) return <Text style={s.body}>—</Text>;
  return (
    <>
      {texto.split("\n").map((linha, i) => {
        const m = linha.match(/^\s*([^:]{2,32}):\s?(.*)$/);
        if (!m || m[2].startsWith("//")) {
          return (
            <Text key={i} style={s.fichaRow}>
              {linha}
            </Text>
          );
        }
        return (
          <Text key={i} style={s.fichaRow}>
            <Text style={s.fichaLabel}>{m[1].trim()}:</Text>
            {m[2] ? ` ${m[2]}` : ""}
          </Text>
        );
      })}
    </>
  );
}

export type PropostaData = {
  proj: Projeto;
  blocos: BlocosProposta;
  cronograma: MarcoCronograma[];
  receitaBruta: number;
  logoDataUrl?: string;
};

function PropostaDoc({ proj, blocos, cronograma, receitaBruta, logoDataUrl }: PropostaData) {
  const dash = (v: string) => (v && v.trim() ? v : "—");
  return (
    <Document
      title={`Proposta ${proj.cliente} ${proj.projeto}`.trim()}
      author="THE ACID TIMES LTDA"
      subject={proj.titulo}
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {logoDataUrl ? <Image style={s.logo} src={logoDataUrl} /> : null}
          <Text style={s.company}>THE ACID TIMES LTDA</Text>
          <Text style={s.cnpj}>CNPJ: 36.458.402/0001-81</Text>
          <View style={s.metaGrid}>
            <Text style={s.metaItem}>
              <Text style={s.metaLabel}>Data: </Text>
              {proj.data}
            </Text>
            <Text style={s.metaItem}>
              <Text style={s.metaLabel}>Cliente: </Text>
              {proj.cliente}
            </Text>
            <Text style={s.metaItem}>
              <Text style={s.metaLabel}>Projeto: </Text>
              {proj.projeto} ({proj.numeroServico})
            </Text>
            <Text style={s.metaItem}>
              <Text style={s.metaLabel}>Validade: </Text>
              {proj.validadeProposta}
            </Text>
          </View>
          {proj.roteiroUrl && proj.roteiroUrl.trim() ? (
            <Text style={s.roteiroRow}>
              <Text style={s.metaLabel}>Roteiro de referência: </Text>
              <Link src={proj.roteiroUrl} style={s.roteiroLink}>
                {proj.roteiroLabel && proj.roteiroLabel.trim() ? proj.roteiroLabel : proj.roteiroUrl}
              </Link>
            </Text>
          ) : null}
        </View>

        <Text style={s.titulo}>{proj.titulo}</Text>

        <Block n="1" titulo="Projeto">
          <Text style={s.body}>
            {proj.projeto} — {proj.tipo} para {proj.cliente}.
          </Text>
        </Block>
        <Block n="2" titulo="O serviço inclui">
          <Text style={s.body}>{dash(blocos.servicoInclui)}</Text>
        </Block>
        <Block n="3" titulo="Especificação da entrega">
          <Ficha texto={blocos.entrega} />
        </Block>

        <Block n="4" titulo="Investimento">
          <View style={s.investBox}>
            <Text style={s.investLabel}>Investimento total do projeto</Text>
            <Text style={s.investValue}>{formatBRL0(receitaBruta)}</Text>
          </View>
          <Text style={s.investNote}>Valor bruto, impostos inclusos.</Text>
        </Block>

        <Block n="5" titulo="Condições de pagamento">
          <Text style={s.body}>{dash(proj.condicaoPagamento)}</Text>
        </Block>

        <Block n="6" titulo="Cronograma">
          {cronograma.length ? (
            cronograma.map((m, i) => (
              <View key={i} style={s.cronoRow}>
                <Text style={s.cronoData}>{m.data}</Text>
                <Text style={s.cronoMarco}>{m.marco}</Text>
              </View>
            ))
          ) : (
            <Text style={s.body}>—</Text>
          )}
        </Block>

        <Block n="7" titulo="Não está incluso">
          <Text style={s.body}>{dash(blocos.exclusoes)}</Text>
        </Block>
        <Block n="8" titulo="Alterações e refações">
          <Text style={s.body}>{dash(blocos.alteracoes)}</Text>
        </Block>
        <Block n="9" titulo="Observações">
          <Text style={s.body}>{dash(blocos.observacoes)}</Text>
        </Block>
        <Block n="10" titulo="Cancelamento">
          <Text style={s.body}>{TEXTOS_MESTRE.cancelamento}</Text>
        </Block>
        <Block n="11" titulo="Imagens e limitações técnicas em IA">
          <Text style={s.body}>{TEXTOS_MESTRE.clausulaIA}</Text>
        </Block>
        <Block n="12" titulo="Materiais de apoio">
          <Text style={s.body}>{TEXTOS_MESTRE.materiais}</Text>
        </Block>
        <Block n="13" titulo="Validade">
          <Text style={s.body}>
            Esta proposta é válida por {proj.validadeProposta} a partir da data de emissão.
          </Text>
        </Block>

        <View style={s.footer} fixed>
          <Text>THE ACID TIMES LTDA · CNPJ 36.458.402/0001-81</Text>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function generatePropostaBlob(data: PropostaData): Promise<Blob> {
  return pdf(<PropostaDoc {...data} />).toBlob();
}
