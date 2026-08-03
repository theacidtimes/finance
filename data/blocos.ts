import type { BlocosProposta } from "@/types";

export const BLOCOS_PADRAO: BlocosProposta = {
  servicoInclui: `1. A.I Concepting e direção
- Direção criativa e desenvolvimento visual
- Desenho de cenas, cenários e frames com uso de IA
- Modelagem 3D
- Renderização
- Retoque e refinamento visual

2. Animação IA
- Refinamento visual, texturização e upscaling de stills
- Geração e animação de cenas com IA
- Refinamento de movimento e consistência visual

3. Pós-produção e finalização
- Edição
- Motion graphics, compositing e cartelas
- Correção de cor
- Masterização e entregas finais`,
  entrega: `1 filme hero 30" — entrega online 16:9 + demais formatos conforme cronograma.`,
  exclusoes: `- Arquivo aberto para edição
- Gravação e captação Live Action
- Trilhas compostas e sound effects
- Registro ANCINE`,
  alteracoes: `- 1 rodada de ajustes na fase de modelagem
- 1 rodada de ajustes na fase de desenho de cenas
- Alterações em elementos já aprovados serão consideradas retrabalho com orçamento à parte
- Feedbacks devem respeitar o cronograma, pois as horas dos profissionais foram calculadas dentro da timeline do projeto
- Alterações de escopo ou roteiro poderão gerar custos extras`,
  observacoes: ``,
  clausulaIA: `As imagens entregues são criadas por plataformas de inteligência artificial que utilizam modelos generativos amplamente empregados na indústria criativa. Adotamos processos e ferramentas que seguem boas práticas de segurança e ética. Ainda assim, pela natureza desses modelos:
1. Não é possível garantir exclusividade absoluta ou ausência total de similaridades com indivíduos reais, conhecidos ou desconhecidos.
2. As peças não seguem lógica de pré-produção, produção e pós-produção tradicional, podendo haver limitações na execução de ajustes específicos.`,
  materiais: `Referências visuais, logotipos e manual de marca a serem fornecidos pelo cliente.`,
};

export function novoProjetoDefaults() {
  return {
    cliente: "",
    marca: "",
    contato: "",
    projeto: "",
    numeroServico: "",
    tipo: "Filme" as const,
    responsavel: "",
    data: new Date().toISOString().slice(0, 10),
    status: "Orçamento",
    valorBruto: 0,
    impostosPct: 11,
    comissaoPct: 3,
    overheadPct: 50,
    prazo: "",
    condicaoPagamento: "",
    validadeProposta: "15 dias",
    observacoes: "",
    titulo: "",
    roteiroUrl: "",
    roteiroLabel: "",
  };
}
