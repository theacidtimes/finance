import type {
  Projeto,
  CustoExterno,
  StaffInterno,
  MarcoCronograma,
} from "@/types";
import { BLOCOS_PADRAO } from "./blocos";
import type { ProjetoArquivo } from "@/types";

export const PROJETO_ATTO: Projeto = {
  cliente: "ATTO",
  projeto: "Atto Sementes",
  numeroServico: "ATTO-001",
  tipo: "Filme",
  responsavel: "Bruno",
  data: "2026-07-02",
  status: "Em produção",
  valorBruto: 235000,
  impostosPct: 11,
  comissaoPct: 3,
  overheadPct: 50,
  prazo: "07/08/2026",
  condicaoPagamento: "50% na aprovação, 50% na entrega",
  validadeProposta: "15 dias",
  observacoes: "",
  titulo:
    'Desenvolvimento criativo, produção e finalização de filme hero 30" com recursos de IA e 3D.',
};

export const EXTERNOS_ATTO: CustoExterno[] = [
  { id: 1, nome: "Leo de Brito", funcao: "3D Designer", categoria: "3D", valor: 15000, status: "Aprovado", nf: false, dataPagamento: "", obs: "" },
  { id: 2, nome: "Caio Bananeira", funcao: "AI Senior Designer / Motion", categoria: "Motion AI", valor: 15000, status: "Aprovado", nf: false, dataPagamento: "", obs: "" },
  { id: 3, nome: "Caio", funcao: "GP", categoria: "GP", valor: 5000, status: "Orçado", nf: false, dataPagamento: "", obs: "" },
  { id: 4, nome: "Estúdio Great", funcao: "Pós-produção e Finalização", categoria: "Pós-produção", valor: 65000, status: "Orçado", nf: false, dataPagamento: "", obs: "" },
];

export const INTERNOS_ATTO: StaffInterno[] = [
  { id: 1, nome: "Isa", funcao: "AI Designer", salario: 12600, baseHoras: 160, horasProjeto: 80 },
  { id: 2, nome: "Bruno", funcao: "Diretor / Produtor Executivo", salario: 25400, baseHoras: 160, horasProjeto: 40 },
];

export const CRONOGRAMA_ATTO: MarcoCronograma[] = [
  { data: "03/07", marco: "Storyboard atualizado" },
  { data: "13/07", marco: "Aprovação dos key frames refinados + prévias de animação" },
  { data: "21/07", marco: "WIP com animação da semente abrindo/expandindo + edit raw" },
  { data: "26/07", marco: "Primeira versão editada do filme / Offline" },
  { data: "26–28/07", marco: "Ajustes" },
  { data: "29/07", marco: "Aprovação final cliente" },
  { data: "30/07", marco: "Entrega Online 16:9" },
  { data: "07/08", marco: "Demais formatos" },
];

export const SEED_ATTO: ProjetoArquivo = {
  app: "acid-finance",
  versao: 1,
  salvoEm: "2026-07-02T12:00:00.000Z",
  proj: PROJETO_ATTO,
  externos: EXTERNOS_ATTO,
  internos: INTERNOS_ATTO,
  cronograma: CRONOGRAMA_ATTO,
  blocos: BLOCOS_PADRAO,
};
