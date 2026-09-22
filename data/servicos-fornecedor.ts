import type { CategoriaExterna } from "@/types";

/**
 * Texto padrão de "Serviços necessários" no pedido de orçamento ao fornecedor.
 *
 * É ponto de partida, não contrato: a linha nasce com este texto e é editada
 * no pedido. O que importa estar aqui é o que o fornecedor costuma deixar de
 * fora da cotação e depois cobra à parte — nota fiscal, equipamento, rodadas
 * de ajuste, cessão de direitos. Pedir já incluso é o que torna as cotações
 * comparáveis entre si.
 */
export const SERVICO_PADRAO: Record<CategoriaExterna, string> = {
  Fotografia:
    "01 diária de shooting (até 10h), já incluindo valor de nota fiscal, equipamento, seguros, produção de objetos, tratamento e entrega do material.",
  "3D":
    "Modelagem, texturização, iluminação e render das peças descritas na especificação, incluindo até 2 rodadas de ajustes e entrega dos arquivos finais e abertos.",
  "AI Designer":
    "Geração e refinamento de imagens com IA para as peças descritas na especificação, incluindo até 2 rodadas de ajustes e entrega dos arquivos finais em alta resolução.",
  ComfyUI:
    "Desenvolvimento e operação de workflows em ComfyUI para as peças descritas na especificação, incluindo entrega dos workflows e dos arquivos finais.",
  Motion:
    "Animação das peças descritas na especificação, incluindo até 2 rodadas de ajustes e entrega dos arquivos finais e dos projetos abertos.",
  "Motion AI":
    "Geração de vídeo com IA e finalização em motion das peças descritas na especificação, incluindo até 2 rodadas de ajustes e entrega dos arquivos finais.",
  GP: "Geração de imagens para as peças descritas na especificação, incluindo até 2 rodadas de ajustes e entrega dos arquivos finais.",
  "Pós-produção":
    "Pós-produção das peças descritas na especificação, incluindo até 2 rodadas de ajustes e entrega dos masters finais.",
  Finalização:
    "Finalização das peças descritas na especificação, incluindo adaptação de formatos e entrega dos arquivos finais.",
  Cor: "Color grading das peças descritas na especificação, incluindo sessão de acompanhamento e entrega dos masters finais.",
  Trilha:
    "Composição de trilha original, incluindo produção, mixagem, masterização e cessão de direitos conforme a especificação.",
  Locução:
    "Locução conforme roteiro, incluindo gravação em estúdio, edição e cessão de direitos de voz conforme a especificação.",
  Áudio:
    "Desenho de som, mixagem e masterização das peças descritas na especificação, incluindo entrega das versões finais.",
  Retoque:
    "Tratamento e retoque das imagens descritas na especificação, incluindo até 2 rodadas de ajustes e entrega dos arquivos finais em alta resolução.",
  Ilustração:
    "Criação das ilustrações descritas na especificação, incluindo até 2 rodadas de ajustes e entrega dos arquivos finais e abertos.",
  "Direção de Arte":
    "Direção de arte do projeto, incluindo pesquisa, referências, acompanhamento de produção e aprovação das peças finais.",
  Edição:
    "Edição/montagem das peças descritas na especificação, incluindo até 2 rodadas de ajustes e entrega dos arquivos finais.",
  Produção:
    "Produção executiva do projeto, incluindo orçamento de fornecedores, logística, acompanhamento e prestação de contas.",
  Coordenação:
    "Coordenação do projeto, incluindo cronograma, comunicação com fornecedores e acompanhamento das entregas.",
  Atendimento: "Atendimento do projeto durante o período descrito na especificação.",
  Programação:
    "Desenvolvimento conforme a especificação, incluindo testes, publicação e entrega do código-fonte.",
  "UX Design":
    "Pesquisa, arquitetura de informação e protótipo navegável, incluindo até 2 rodadas de ajustes e entrega dos arquivos abertos.",
  "Reserva Técnica": "",
  Outros: "",
};

/** Sugestões do campo "Modelo" — o texto continua livre. */
export const MODELOS_CONTRATACAO = [
  "Contratação via THE ACID TIMES Ltda",
  "Contratação direta pelo cliente, com coordenação da ACID",
  "Parceria / coprodução",
];

export const PAGAMENTO_PADRAO = "45 dias após a emissão da nota fiscal.";

export const ORCAMENTO_DEVE_PADRAO =
  "Valor total já com impostos (nota fiscal inclusa), discriminado por item, com validade do orçamento e prazo de execução.";

/**
 * Campos da especificação ao fornecedor. "Quantidade" e "Suporte" não têm par
 * na proposta ao cliente — são perguntas que só o fornecedor precisa responder.
 */
export const ROTULOS_ESPECIFICACAO = [
  "Quantidade",
  "Tempo de uso",
  "Mídias",
  "Território",
  "Suporte",
  "Formatos",
  "Duração",
];
