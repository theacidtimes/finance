# ACID Finance — especificação funcional

Sistema interno de precificação, DRE e orçamento comercial da ACID.
Documento complementar ao `docs/PRD.md` (mestre). O protótipo em
`reference/prototype.jsx` implementa as telas com estado em memória —
usar como referência visual e de comportamento.

## Módulos

### 1. Lista de projetos (novo em relação ao protótipo)
- Grid/tabela com: cliente, projeto, nº de serviço, tipo, status, valor bruto, margem op. (badge com semáforo), atualizado em
- Ações: abrir, duplicar, excluir (com confirmação)
- Botão "Novo Projeto" (cria com defaults 11/3/50 e blocos padrão)
- Identidade do projeto: Cliente + Projeto + Número de Serviço (unique no banco)

### 2. Dashboard do projeto
Cards KPI: Receita Bruta, Receita Líquida, Comissão, Custos Externos, Staff Interno,
Overhead, Lucro Operacional, Margem Operacional, Retido na ACID, % produção externa.

Gráficos:
- Barra empilhada horizontal "Para onde vai cada real da receita" (assinatura visual do produto):
  impostos / comissão / externos / staff / overhead / lucro ACID
- Pizza de distribuição da receita (mesmas fatias)
- Barras: Receita × Custos × Lucro
- Gauge de margem operacional (verde ≥30%, amarelo 20–30%, vermelho <20%)

### 3. Cadastro de projeto
Campos: cliente, projeto, nº de serviço, tipo (Filme/KV/Social/Campanha/Outro),
responsável, data, status, valor bruto, prazo, observações, condição de pagamento,
validade da proposta, %impostos, %comissão, %overhead. Tudo editável.

### 4. Pessoas e custos
**Internos** (tabela editável): nome, função, salário mensal, base h/mês, horas no projeto
→ custo/hora e total calculados ao vivo. Overhead incide só aqui.

**Externos** (tabela editável): nome/fornecedor, função, categoria (lista em types.ts),
valor fechado, status (Orçado/Aprovado/Pago), NF (bool), data pagamento, obs.
Linha automática fixa no topo: "Luciano — 3rd Party Finance Fee" com o valor da comissão
calculado (readonly, marcado como automático), fora da soma de externos.

### 5. DRE
Página com a demonstração nesta ordem exata:

```
Receita Bruta
(−) Impostos
Receita Líquida
(−) Comissão / 3rd Party Fee
Receita Operacional
(−) Custos Externos
(−) Staff Interno
(−) Overhead
Lucro Operacional
Margem sobre Receita Bruta
Margem Operacional
Retido na ACID
```

Painel lateral "Repasse × Retido": governo / comissão / repasses externos / fica na ACID.

### 6. Simulador
Inputs rápidos: valor de venda, %impostos, %comissão, %overhead, custos externos (lump),
horas internas (% do plano), margem desejada.
Outputs: lucro resultante, margem, custo total, valor mínimo recomendado para a margem
desejada, e tabela com valor de venda para 20/25/30/35/40% de margem operacional
(usar `valorParaMargem` de finance.ts). A simulação NÃO altera o projeto salvo.

### 7. Orçamento comercial
Preview do documento + modo edição. Estrutura (12 blocos, textos padrão em
`docs/proposta-template.md`):

1. Projeto · 2. O serviço inclui · 3. Especificação da entrega · 4. Investimento
(valor bruto do projeto) · 5. Condições de pagamento · 6. Cronograma (marcos editáveis)
· 7. Não está incluso · 8. Alterações e refações · 9. Observações ·
10. Imagens e limitações técnicas em IA · 11. Materiais de apoio · 12. Validade

Cabeçalho: logo ACID + THE ACID TIMES LTDA / CNPJ 36.458.402/0001-81 / data / cliente /
projeto / validade. Título comercial editável.

Botão **Gerar Orçamento** → PDF fiel ao preview (@react-pdf/renderer).

### 8. Exportações
- PDF do orçamento comercial
- PDF do DRE
- CSV (custos externos + staff com totais)
- Exportar/importar JSON de projeto (formato `ProjetoArquivo` em types.ts — compatível
  com arquivos gerados pelo protótipo)
- Duplicar projeto · Salvar como template (template = projeto com status "Template")

## Regras de negócio (resumo — fonte: finance.ts)
- Percentuais editáveis por projeto; defaults 11 / 3 / 50
- Comissão sobre receita líquida
- Overhead só sobre staff interno
- Retido na ACID = staff + overhead + lucro
- Repasses = custos externos
- Preparar campos para orçado × realizado (colunas `valor_realizado` e
  `horas_realizadas` já existem no schema; UI pode vir depois)

## Design
- Minimalista executivo: neutro claro, preto/branco/cinza
- Verde ACID #19E28A (positivo) / vermelho #E5484D (alerta)
- Header escuro com logo + FINANCE (Libre Caslon Display, caps, light, baseline alinhada)
- Números com tabular-nums; moeda e datas em pt-BR
- Desktop-first, responsivo
