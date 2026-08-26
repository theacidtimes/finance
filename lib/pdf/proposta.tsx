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
import type { Projeto, BlocosProposta, MarcoCronograma, OpcaoComercial } from "@/types";
import { formatMoeda, idiomaDe, moedaDe, valorProposta } from "@/lib/moeda";
import { textosMestre } from "@/data/textos-en";
import {
  metaProposta,
  blocosProposta,
  parseFicha,
  textosProposta,
  textoProjeto,
  type BlocoProposta,
} from "@/lib/proposta";
import { temOpcoes, linhaValida } from "@/lib/opcoes";

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
  // Termos e condições: menor que o corpo, mas ainda legível em papel.
  bodyMiudo: { fontSize: 8.5, lineHeight: 1.5, color: "#333333" },
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
  // Tabela de opções comerciais — mesma moldura da caixa de investimento,
  // porque é o mesmo bloco da proposta, só que com mais de um preço.
  tabela: { borderWidth: 1, borderColor: INK, borderRadius: 6 },
  thead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  tr: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 14 },
  trSep: { borderBottomWidth: 1, borderBottomColor: LINE },
  th: { fontSize: 8, letterSpacing: 1, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  td: { fontSize: 10 },
  tdForte: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  col1: { width: "34%" },
  col2: { width: "33%" },
  col3: { width: "33%", textAlign: "right" },
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

/**
 * Bloco da proposta. Some do documento quando não tem conteúdo (ver lib/proposta.ts).
 *
 * O bloco quebra entre páginas de propósito. Com `wrap={false}` ele pulava
 * inteiro para a página seguinte quando não coubesse no que restava — e o que
 * restava virava um buraco branco no pé da página. `minPresenceAhead` resolve o
 * lado feio da quebra: se sobrar menos que isso, o bloco começa na próxima
 * página em vez de deixar o título sozinho no rodapé.
 *
 * `unido` é para o que não pode ser partido — a caixa do investimento, que tem
 * moldura e ficaria cortada ao meio.
 */
function Block({
  b,
  unido,
  children,
}: {
  b: BlocoProposta;
  unido?: boolean;
  children: React.ReactNode;
}) {
  if (!b.incluso) return null;
  return (
    <View style={s.block} wrap={!unido} minPresenceAhead={unido ? 0 : 56}>
      <Text style={s.blockHead}>
        {b.n}. {b.titulo}
      </Text>
      {children}
    </View>
  );
}

/**
 * Bloco em formato de ficha: um campo por linha, rótulo em negrito.
 * Usa o mesmo parser da tela (`parseFicha`), então imprime o que foi revisado.
 */
function Ficha({ texto }: { texto: string }) {
  return (
    <>
      {parseFicha(texto).map((l, i) => (
        <Text key={i} style={s.fichaRow}>
          {l.rotulo ? <Text style={s.fichaLabel}>{l.rotulo}:</Text> : null}
          {l.rotulo ? (l.valor ? ` ${l.valor}` : "") : l.valor}
        </Text>
      ))}
    </>
  );
}

/** Bloco de investimento quando a proposta tem mais de um preço. */
function Opcoes({
  opcoes,
  moeda,
  idioma,
}: {
  opcoes: OpcaoComercial[];
  moeda: ReturnType<typeof moedaDe>;
  idioma: ReturnType<typeof idiomaDe>;
}) {
  const en = idioma === "en";
  const linhas = opcoes.filter(linhaValida);
  return (
    <View style={s.tabela}>
      <View style={s.thead}>
        <Text style={[s.th, s.col1]}>{en ? "Booking" : "Condição"}</Text>
        <Text style={[s.th, s.col2]}>{en ? "Day rate" : "Valor unitário"}</Text>
        <Text style={[s.th, s.col3]}>{en ? "Total fee" : "Total"}</Text>
      </View>
      {linhas.map((o, i) => (
        <View key={String(o.id)} style={i < linhas.length - 1 ? [s.tr, s.trSep] : s.tr}>
          <Text style={[s.td, s.col1]}>{o.label}</Text>
          <Text style={[s.td, s.col2]}>
            {o.valorUnitario > 0
              ? `${formatMoeda(o.valorUnitario, moeda, { idioma })}${en ? "/day" : "/un"}`
              : ""}
          </Text>
          <Text style={[s.tdForte, s.col3]}>{formatMoeda(o.valorTotal, moeda, { idioma })}</Text>
        </View>
      ))}
    </View>
  );
}

export type PropostaData = {
  proj: Projeto;
  blocos: BlocosProposta;
  cronograma: MarcoCronograma[];
  opcoes?: OpcaoComercial[];
  logoDataUrl?: string;
};

export function PropostaDoc({ proj, blocos, cronograma, opcoes, logoDataUrl }: PropostaData) {
  // Quais blocos entram e com que número — mesma fonte que a tela usa.
  const B = blocosProposta(proj, blocos, cronograma);
  // Idioma, moeda e frases fixas: as mesmas funções que a tela chama, para que
  // o PDF não possa dizer nada diferente do que foi revisado antes de enviar.
  const idioma = idiomaDe(proj);
  const T = textosProposta(proj);
  const M = textosMestre(idioma);
  // O flag `miudo` decide o corpo: termos em fonte menor que o resto.
  const corpo = (b: BlocoProposta) => (b.miudo ? s.bodyMiudo : s.body);
  return (
    <Document
      title={`${idioma === "en" ? "Proposal" : "Proposta"} ${proj.cliente} ${proj.projeto}`.trim()}
      author="THE ACID TIMES LTDA"
      subject={proj.titulo}
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {logoDataUrl ? <Image style={s.logo} src={logoDataUrl} /> : null}
          <Text style={s.company}>THE ACID TIMES LTDA</Text>
          <Text style={s.cnpj}>CNPJ: 36.458.402/0001-81</Text>
          <View style={s.metaGrid}>
            {metaProposta(proj).map((m) => (
              <Text key={m.rotulo} style={s.metaItem}>
                <Text style={s.metaLabel}>{m.rotulo}: </Text>
                {m.valor}
              </Text>
            ))}
          </View>
          {proj.roteiroUrl && proj.roteiroUrl.trim() ? (
            <Text style={s.roteiroRow}>
              <Text style={s.metaLabel}>{T.roteiroLabel}: </Text>
              <Link src={proj.roteiroUrl} style={s.roteiroLink}>
                {proj.roteiroLabel && proj.roteiroLabel.trim() ? proj.roteiroLabel : proj.roteiroUrl}
              </Link>
            </Text>
          ) : null}
        </View>

        <Text style={s.titulo}>{proj.titulo}</Text>

        <Block b={B.projeto}>
          <Text style={s.body}>{textoProjeto(proj, blocos)}</Text>
        </Block>
        <Block b={B.servicoInclui}>
          <Text style={s.body}>{blocos.servicoInclui}</Text>
        </Block>
        <Block b={B.entrega}>
          <Ficha texto={blocos.entrega} />
        </Block>

        <Block b={B.investimento} unido>
          {temOpcoes(opcoes) ? (
            <Opcoes opcoes={opcoes!} moeda={moedaDe(proj)} idioma={idioma} />
          ) : (
            <View style={s.investBox}>
              <Text style={s.investLabel}>{T.investimentoLabel}</Text>
              <Text style={s.investValue}>
                {formatMoeda(valorProposta(proj), moedaDe(proj), { idioma })}
              </Text>
            </View>
          )}
          <Text style={s.investNote}>{T.investimentoNota}</Text>
        </Block>

        <Block b={B.pagamento}>
          <Text style={s.body}>{proj.condicaoPagamento}</Text>
        </Block>

        <Block b={B.cronograma}>
          {/* Marco em branco é linha que o usuário abriu e não preencheu — não vai para o cliente. */}
          {cronograma
            .filter((m) => m.data.trim() || m.marco.trim())
            .map((m, i) => (
              <View key={i} style={s.cronoRow}>
                <Text style={s.cronoData}>{m.data}</Text>
                <Text style={s.cronoMarco}>{m.marco}</Text>
              </View>
            ))}
        </Block>

        <Block b={B.exclusoes}>
          <Text style={s.body}>{blocos.exclusoes}</Text>
        </Block>
        <Block b={B.alteracoes}>
          <Text style={s.body}>{blocos.alteracoes}</Text>
        </Block>
        <Block b={B.observacoes}>
          <Text style={s.body}>{blocos.observacoes}</Text>
        </Block>
        <Block b={B.cancelamento}>
          <Text style={corpo(B.cancelamento)}>{M.cancelamento}</Text>
        </Block>
        <Block b={B.clausulaIA}>
          <Text style={corpo(B.clausulaIA)}>{M.clausulaIA}</Text>
        </Block>
        <Block b={B.materiais}>
          <Text style={corpo(B.materiais)}>{M.materiais}</Text>
        </Block>
        <Block b={B.validade}>
          <Text style={corpo(B.validade)}>{T.validade}</Text>
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
