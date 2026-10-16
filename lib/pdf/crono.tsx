import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import type { CronogramaProducao, Projeto } from "@/types";
import {
  calcularCrono,
  coresPorResponsavel,
  COR_SEM_RESPONSAVEL,
  dataCurta,
  diaMes,
  diasEntre,
  ehDiaUtil,
  formatDuracao,
  somaDias,
  type LinhaCrono,
} from "@/lib/crono";

const INK = "#111111";
const MUTED = "#6B7280";
const LINE = "#D1D5DB";
const FASE = "#2B2B2B";

/* Larguras das colunas da tabela (pt). O que sobra da página vira linha do tempo. */
const COL = { n: 18, nome: 166, dur: 34, ini: 44, fim: 44, pred: 30, resp: 92, status: 58, pct: 28 };
const LARGURA_PAGINA = 842 - 2 * 32;
const LARGURA_TABELA = Object.values(COL).reduce((a, b) => a + b, 0);
const LARGURA_GANTT = LARGURA_PAGINA - LARGURA_TABELA;

const s = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 40,
    paddingHorizontal: 32,
    fontSize: 7.5,
    color: INK,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: INK,
    paddingBottom: 10,
    marginBottom: 12,
  },
  logo: { height: 24, width: 70, objectFit: "contain", objectPosition: "left" },
  titulo: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 8 },
  sub: { fontSize: 8, color: MUTED, marginTop: 2 },
  headRight: { alignItems: "flex-end" },
  kicker: { fontSize: 7, letterSpacing: 1.5, color: MUTED, fontFamily: "Helvetica-Bold" },
  periodo: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 3 },
  thead: { flexDirection: "row", backgroundColor: "#E5E7EB", borderBottomWidth: 1, borderBottomColor: INK },
  th: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#FFFFFF" },
  td: { paddingVertical: 3.5, paddingHorizontal: 3 },
  bold: { fontFamily: "Helvetica-Bold" },
  right: { textAlign: "right" },
  center: { textAlign: "center" },
  gantt: { width: LARGURA_GANTT, position: "relative", backgroundColor: "#FFFFFF" },
  legenda: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  legItem: { flexDirection: "row", alignItems: "center", marginRight: 14, marginBottom: 3 },
  legCor: { width: 9, height: 9, marginRight: 4, borderRadius: 2 },
  legTxt: { fontSize: 7, color: "#333333" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: MUTED,
  },
});

export type CronoPdfData = {
  proj: Projeto;
  crono: CronogramaProducao;
  logoDataUrl?: string;
};

/** Título do documento: "Droga5 + Santander — AI Video TAG". */
export function tituloCrono(proj: Projeto): string {
  const quem = [proj.cliente, proj.marca].map((x) => x?.trim()).filter(Boolean);
  const unicos = quem.filter((x, i) => quem.indexOf(x) === i).join(" + ");
  return [unicos, proj.projeto?.trim()].filter(Boolean).join(" — ");
}

export function CronoDoc({ proj, crono, logoDataUrl }: CronoPdfData) {
  const { linhas, projeto } = calcularCrono(crono);
  const cores = coresPorResponsavel(crono.tarefas);
  const totalDias = Math.max(1, diasEntre(projeto.inicio, projeto.fim) + 1);
  const px = LARGURA_GANTT / totalDias;
  const dias = Array.from({ length: totalDias }, (_, i) => somaDias(projeto.inicio, i));
  // Até um mês cabe o número do dia; acima disso, só a segunda-feira com dd/mm.
  const porDia = totalDias <= 31;

  const barra = (l: LinhaCrono) => ({
    left: diasEntre(projeto.inicio, l.inicio) * px,
    width: Math.max(px * 0.6, (diasEntre(l.inicio, l.fim) + 1) * px),
  });

  /** Fundo cinza nos dias que não contam — o vão do fim de semana fica visível. */
  const Folgas = () => (
    <>
      {dias.map((d, i) =>
        ehDiaUtil(d, crono.pularFeriados) ? null : (
          <View
            key={d}
            style={{ position: "absolute", top: 0, bottom: 0, left: i * px, width: px, backgroundColor: "#F1F1F1" }}
          />
        )
      )}
    </>
  );

  const titulo = tituloCrono(proj);
  const hoje = new Date().toLocaleDateString("pt-BR");

  return (
    <Document title={`Cronograma ${titulo}`} author="THE ACID TIMES LTDA">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <View>
            {logoDataUrl ? <Image style={s.logo} src={logoDataUrl} /> : null}
            <Text style={s.titulo}>{titulo || "Cronograma"}</Text>
            <Text style={s.sub}>
              {[proj.numeroServico && `Nº ${proj.numeroServico}`, proj.contato && `Contato: ${proj.contato}`]
                .filter(Boolean)
                .join("  ·  ")}
            </Text>
          </View>
          <View style={s.headRight}>
            <Text style={s.kicker}>CRONOGRAMA DE PRODUÇÃO</Text>
            <Text style={s.periodo}>
              {dataCurta(projeto.inicio)} a {dataCurta(projeto.fim)}
            </Text>
            <Text style={s.sub}>
              {formatDuracao(projeto.duracao)} úteis · {Math.round(projeto.pct)}% concluído
            </Text>
          </View>
        </View>

        {/* Cabeçalho */}
        <View style={s.thead} fixed>
          <Text style={[s.th, { width: COL.n }]}>#</Text>
          <Text style={[s.th, { width: COL.nome }]}>Tarefa</Text>
          <Text style={[s.th, s.right, { width: COL.dur }]}>Dur.</Text>
          <Text style={[s.th, { width: COL.ini }]}>Início</Text>
          <Text style={[s.th, { width: COL.fim }]}>Fim</Text>
          <Text style={[s.th, s.center, { width: COL.pred }]}>Pred.</Text>
          <Text style={[s.th, { width: COL.resp }]}>Responsável</Text>
          <Text style={[s.th, { width: COL.status }]}>Status</Text>
          <Text style={[s.th, s.right, { width: COL.pct }]}>%</Text>
          <View style={[s.gantt, { backgroundColor: "transparent", height: 15 }]}>
            {dias.map((d, i) => {
              const segunda = new Date(`${d}T12:00:00Z`).getUTCDay() === 1;
              if (!porDia && !(segunda || i === 0)) return null;
              return (
                <Text
                  key={d}
                  style={{
                    position: "absolute",
                    top: 4.5,
                    left: i * px,
                    width: porDia ? px : 30,
                    fontSize: 5.5,
                    textAlign: porDia ? "center" : "left",
                    color: ehDiaUtil(d, crono.pularFeriados) ? INK : "#9CA3AF",
                  }}
                >
                  {porDia ? d.slice(8) : diaMes(d)}
                </Text>
              );
            })}
          </View>
        </View>

        {/* Linha do projeto */}
        <View style={[s.tr, { backgroundColor: INK }]} wrap={false}>
          <Text style={[s.td, s.bold, { width: COL.n, color: "#FFFFFF" }]}>1</Text>
          <Text style={[s.td, s.bold, { width: COL.nome, color: "#FFFFFF" }]}>{titulo || "Projeto"}</Text>
          <Text style={[s.td, s.bold, s.right, { width: COL.dur, color: "#FFFFFF" }]}>
            {formatDuracao(projeto.duracao)}
          </Text>
          <Text style={[s.td, s.bold, { width: COL.ini, color: "#FFFFFF" }]}>{dataCurta(projeto.inicio)}</Text>
          <Text style={[s.td, s.bold, { width: COL.fim, color: "#FFFFFF" }]}>{dataCurta(projeto.fim)}</Text>
          <Text style={[s.td, { width: COL.pred }]} />
          <Text style={[s.td, { width: COL.resp }]} />
          <Text style={[s.td, { width: COL.status }]} />
          <Text style={[s.td, s.bold, s.right, { width: COL.pct, color: "#FFFFFF" }]}>
            {Math.round(projeto.pct)}%
          </Text>
          <View style={s.gantt}>
            <Folgas />
            <View
              style={{ position: "absolute", top: 5, height: 4, left: 0, width: LARGURA_GANTT, backgroundColor: INK }}
            />
          </View>
        </View>

        {linhas.map((l) => {
          const t = l.tarefa;
          const fase = t.tipo === "fase";
          const cor = cores.get(t.responsavel.trim());
          const c = cor ?? COR_SEM_RESPONSAVEL;
          const fundo = fase ? FASE : t.entrega ? c.forte : c.fundo;
          const texto = fase ? "#FFFFFF" : INK;
          const forte = fase || t.entrega;
          const cell = [s.td, forte ? s.bold : {}, { color: texto }];
          const b = barra(l);
          return (
            <View key={t.id} style={[s.tr, { backgroundColor: fundo }]} wrap={false}>
              <Text style={[...cell, { width: COL.n }]}>{l.numero}</Text>
              <Text style={[...cell, { width: COL.nome, paddingLeft: l.nivel === 2 ? 12 : 3 }]}>
                {t.nome}
              </Text>
              <Text style={[...cell, s.right, { width: COL.dur }]}>{formatDuracao(l.duracao)}</Text>
              <Text style={[...cell, { width: COL.ini }]}>{dataCurta(l.inicio)}</Text>
              <Text style={[...cell, { width: COL.fim }]}>{dataCurta(l.fim)}</Text>
              <Text style={[...cell, s.center, { width: COL.pred }]}>{l.predecessoraNumero ?? ""}</Text>
              <Text style={[...cell, { width: COL.resp }]}>{fase ? "" : t.responsavel}</Text>
              <Text style={[...cell, { width: COL.status }]}>{fase ? "" : t.status}</Text>
              <Text style={[...cell, s.right, { width: COL.pct }]}>{Math.round(l.pct)}%</Text>
              <View style={s.gantt}>
                <Folgas />
                {fase && l.duracao === 0 ? null : fase ? (
                    <View
                      style={{ position: "absolute", top: 5, height: 3, left: b.left, width: b.width, backgroundColor: FASE }}
                    />
                  ) : (
                    <View
                      style={{
                        position: "absolute",
                        top: 3,
                        bottom: 3,
                        left: b.left,
                        width: b.width,
                        borderRadius: 1.5,
                        backgroundColor: c.barra,
                        opacity: t.status === "Concluído" ? 0.45 : 1,
                      }}
                    />
                )}
              </View>
            </View>
          );
        })}

        <View style={s.legenda} wrap={false}>
          {[...cores.entries()].map(([nome, c]) => (
            <View key={nome} style={s.legItem}>
              <View style={[s.legCor, { backgroundColor: c.fundo, borderWidth: 1.5, borderColor: c.barra }]} />
              <Text style={s.legTxt}>{nome}</Text>
            </View>
          ))}
          <View style={s.legItem}>
            <View style={[s.legCor, { backgroundColor: "#F1F1F1" }]} />
            <Text style={s.legTxt}>Fim de semana / feriado</Text>
          </View>
          <View style={s.legItem}>
            <Text style={[s.legTxt, s.bold]}>Negrito</Text>
            <Text style={s.legTxt}> = entrega</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>THE ACID TIMES LTDA · CNPJ 36.458.402/0001-81 · Gerado em {hoje}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generateCronoBlob(data: CronoPdfData): Promise<Blob> {
  return pdf(<CronoDoc {...data} />).toBlob();
}
