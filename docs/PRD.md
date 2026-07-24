# PRD — ACID Finance v1.0
**Documento de produto para implementação via Claude Code**
Complementa: `CLAUDE.md` (instruções de execução), `docs/especificacao.md` (referência funcional), `reference/prototype.jsx` (referência de UI), `src-seed/finance.ts` (cálculos), `supabase/schema.sql` (banco).
Em caso de conflito entre documentos, a ordem de autoridade é: **finance.ts > este PRD > especificacao.md > protótipo**.

---

## 1. Visão do produto

Sistema web interno da ACID (produtora criativa, The Acid Times Ltda) para **precificar projetos, acompanhar o DRE por projeto e gerar a proposta comercial em PDF**. Substitui planilhas soltas por uma fonte única, online, com login, acessível por toda a equipe.

**Problema que resolve:** hoje o cálculo de margem (impostos → comissão → custos externos → staff → overhead) vive em planilhas por projeto, sem padrão, sem histórico e sem visão de quanto "fica na ACID". A proposta comercial é montada à mão a cada projeto.

**Resultado esperado:** qualquer pessoa da equipe abre um projeto, vê a saúde da margem em segundos, simula cenários de preço e gera a proposta em PDF pronta para enviar ao cliente.

**Usuários:** 3–10 pessoas da equipe ACID (produção executiva, financeiro, atendimento). Todos veem e editam tudo — não há papéis diferenciados na v1.

---

## 2. Acesso e autenticação

- **Login por e-mail + senha** via Supabase Auth. Sem signup público: usuários entram **apenas por convite** enviado pelo painel do Supabase (Authentication → Users → Invite).
- Fluxo de convite: usuário recebe e-mail → define a senha na primeira entrada → cai na lista de projetos.
- **Recuperação de senha** ("Esqueci minha senha") por e-mail, usando o fluxo nativo do Supabase.
- Sessão persistente (cookie via `@supabase/ssr`); middleware do Next.js protege todas as rotas exceto `/login` e callbacks de auth. Usuário não autenticado é redirecionado para `/login`.
- Logout no menu do usuário (header), com e-mail da conta visível.
- Tela de login segue o design do sistema: fundo escuro, logo ACID, formulário mínimo (e-mail, senha, entrar, esqueci a senha). Mensagens de erro em pt-BR ("E-mail ou senha inválidos").

**Critérios de aceite**
1. Acessar qualquer rota sem sessão redireciona para `/login`.
2. Login válido leva à lista de projetos; inválido mostra erro sem recarregar a página.
3. Convite + definição de senha + recuperação de senha funcionam de ponta a ponta no domínio da Vercel.
4. `service_role` key não aparece em nenhum código do cliente nem em variável `NEXT_PUBLIC_*`.

---

## 3. Arquitetura

- **Next.js 14+ (App Router) + TypeScript**, deploy na **Vercel**.
- **Supabase**: Postgres (schema em `supabase/schema.sql`, já com RLS para `authenticated`) + Auth.
- **Zustand** para o estado do projeto aberto (uma store por projeto carregado); dados sempre hidratados do Supabase.
- **TailwindCSS + shadcn/ui**; **Recharts** para gráficos.
- **@react-pdf/renderer** para PDFs (client-side; proibido puppeteer).
- Toda a matemática financeira importada de `lib/finance.ts` (cópia fiel de `src-seed/finance.ts`). **Nenhum componente reimplementa cálculo.**

### Rotas
| Rota | Conteúdo |
|---|---|
| `/login` | autenticação |
| `/` | lista de projetos |
| `/projetos/novo` | criação (form de cadastro) |
| `/projetos/[id]` | dashboard do projeto |
| `/projetos/[id]/cadastro` | dados do projeto |
| `/projetos/[id]/pessoas` | pessoas & custos |
| `/projetos/[id]/dre` | DRE |
| `/projetos/[id]/simulador` | simulador |
| `/projetos/[id]/orcamento` | proposta comercial |

Navegação interna do projeto por abas (mesmo padrão do protótipo), com o nome `Cliente · Projeto · Nº` sempre visível no header.

---

## 4. Modelo de dados

Fonte da verdade: `supabase/schema.sql`. Resumo:

- **projects** — dados do projeto + percentuais + `blocos` (jsonb com os textos da proposta). Unicidade: `(cliente, projeto, numero_servico)`.
- **external_costs** — repasses: nome, função, categoria, valor, status (Orçado/Aprovado/Pago), nf (bool), data_pagamento, obs, `valor_realizado` (reservado p/ v1.1).
- **internal_staff** — staff: nome, função, salário, base_horas, horas_projeto, `horas_realizadas` (reservado p/ v1.1).
- **milestones** — cronograma: data_label (texto livre, ex. "26–28/07"), marco, ordem.

Conversão camelCase (app) ↔ snake_case (banco) centralizada em `lib/supabase/mappers.ts`.

**Persistência da edição (autosave):** alterações nas telas salvam com debounce de 1,5s por entidade alterada. Indicador discreto no header: "Salvando…" → "Salvo". Em erro de rede, aviso não-bloqueante com botão "Tentar de novo". Sem botão "Salvar" manual obrigatório — o sistema nunca perde edição por navegação.

---

## 5. Regras financeiras (invioláveis)

Implementadas em `lib/finance.ts`. Defaults: impostos **11%**, comissão **3%**, overhead **50%** — todos editáveis por projeto.

```
Receita Bruta          = valor vendido
Impostos               = Bruta × %impostos
Receita Líquida        = Bruta − Impostos
Comissão (3rd Party)   = LÍQUIDA × %comissão        ← nunca sobre a bruta
Receita Operacional    = Líquida − Comissão
Custo/hora interno     = salário ÷ base de horas
Custo staff no projeto = custo/hora × horas previstas
Overhead               = Staff Interno × %overhead   ← externos NUNCA entram
Custo Total            = Externos + Staff + Overhead
Lucro Operacional      = Receita Operacional − Custo Total
Margem Bruta %         = Lucro ÷ Receita Bruta
Margem Operacional %   = Lucro ÷ Receita Operacional
Retido na ACID         = Staff + Overhead + Lucro
Repasses               = Custos Externos
```

Cálculo reverso do simulador: `RB = CustoTotal ÷ ((1−m)(1−i)(1−c))` — função `valorParaMargem`.

Semáforo de margem operacional: **verde ≥ 30% · amarelo 20–30% · vermelho < 20%** (função `saudeMargem`).

**Caso de validação obrigatório (testes unitários):** projeto ATTO — RB 235.000, 11/3/50, externos 100.000, staff 12.650 → Impostos 25.850,00 · Líquida 209.150,00 · Comissão 6.274,50 · Operacional 202.875,50 · Overhead 6.325,00 · Custo Total 118.975,00 · **Lucro 83.900,50 · Margem Op. 41,36% · Retido 102.875,50**.

---

## 6. Especificação por tela

### 6.1 Lista de projetos (`/`)
- Tabela: Cliente, Projeto, Nº de Serviço, Tipo, Status, Valor Bruto, Margem Op. (badge com semáforo), Atualizado em.
- Busca por texto (cliente/projeto/nº) e ordenação por atualização (default: mais recente).
- Ações por linha: **Abrir**, **Duplicar** (cria cópia com sufixo "(cópia)" no nome e novo nº de serviço vazio a preencher), **Excluir** (modal de confirmação com o nome do projeto digitado ou clique duplo confirmado).
- Botão primário **Novo Projeto** → `/projetos/novo`.
- Estado vazio amigável ("Nenhum projeto ainda — crie o primeiro") com botão de importar JSON.
- **Importar JSON** (formato `ProjetoArquivo` do protótipo) cria um projeto completo no banco.

**Aceite:** duplicar preserva custos, staff, cronograma e blocos; excluir remove em cascata; importar o `seed-atto.json` reproduz os números do caso de validação.

### 6.2 Dashboard do projeto
- Cards KPI: Receita Bruta, Receita Líquida, Comissão, Custos Externos, Staff Interno, Overhead, Lucro Operacional (verde/vermelho conforme sinal), Margem Operacional (cor do semáforo), Retido na ACID, % produção externa.
- **Barra "Para onde vai cada real da receita"** (assinatura do produto): barra horizontal empilhada com impostos / comissão / externos / staff / overhead / lucro, com legenda e % — tooltip com valores.
- Pizza de distribuição (mesmas fatias), barras Receita × Custos × Lucro, gauge de margem com faixas coloridas.
- Tudo recalcula em tempo real ao editar qualquer dado em outras abas (estado compartilhado da store).

### 6.3 Cadastro (`/projetos/[id]/cadastro` e `/projetos/novo`)
- Campos: cliente*, projeto*, nº de serviço*, tipo (Filme/KV/Social/Campanha/Outro), responsável, data, status, valor bruto, prazo, condição de pagamento, validade da proposta, observações, %impostos, %comissão, %overhead.
- Novo projeto nasce com defaults 11/3/50, blocos padrão da proposta (`docs/proposta-template.md`) e cronograma vazio.
- Violação de unicidade (cliente+projeto+nº) mostra erro claro inline.

### 6.4 Pessoas & Custos
**Staff interno** (tabela editável inline): nome, função, salário mensal, base h/mês (default 160), horas no projeto → colunas calculadas custo/hora e total (somente leitura, atualizam ao digitar). Rodapé com total do staff e total + overhead.

**Custos externos** (tabela editável inline): nome/fornecedor, função, categoria (select com a lista de `types.ts`), valor, status (select Orçado/Aprovado/Pago — "Pago" com destaque verde), NF (checkbox), data de pagamento, obs. Rodapé com total.
Linha fixa automática no topo: **"Luciano — 3rd Party Finance Fee"** exibindo a comissão calculada, marcada como `auto · X% s/ líquida`, não editável e fora da soma de externos.

Adicionar/remover linhas em ambas; remoção com undo rápido (toast "Desfazer") ou confirmação.

### 6.5 DRE
- Demonstração na ordem exata (ver §5), valores com centavos, linhas de subtotal destacadas, lucro com cor do sinal.
- Painel lateral "Repasse × Retido": Governo / Comissão / Repasses externos / **Fica na ACID** (verde) + % da receita.
- Gauge de margem.
- Botão **Exportar DRE em PDF** (ver §7).

### 6.6 Simulador
- Inputs: valor de venda, %impostos, %comissão, %overhead, custos externos (valor único), horas internas (% do plano atual), margem desejada.
- Outputs: lucro resultante, margem operacional (semáforo), custo total, **valor mínimo recomendado** para a margem desejada.
- Tabela de metas: valor de venda e lucro para **20 / 25 / 30 / 35 / 40%** de margem operacional, com indicador de quais metas o valor atual já atinge.
- A simulação parte do projeto aberto mas **nunca grava** — banner discreto "Simulação — não altera o projeto". Botão "Restaurar valores do projeto".

### 6.7 Orçamento comercial
- Preview do documento (layout do protótipo) + modo edição por blocos.
- Cabeçalho fixo: logo ACID, THE ACID TIMES LTDA, CNPJ 36.458.402/0001-81, data, cliente, projeto (nº), validade. Título comercial editável.
- 12 blocos (defaults em `docs/proposta-template.md`, salvos por projeto no jsonb `blocos`):
  1. Projeto · 2. O serviço inclui · 3. Especificação da entrega · 4. **Investimento** (valor bruto do DRE, não editável aqui) · 5. Condições de pagamento · 6. **Cronograma** (marcos editáveis: data livre + descrição, reordenáveis) · 7. Não está incluso · 8. Alterações e refações · 9. Observações · 10. Imagens e limitações técnicas em IA · 11. Materiais de apoio · 12. Validade.
- Botão **Gerar Orçamento (PDF)**.

---

## 7. Exportações

| Export | Conteúdo | Nome do arquivo |
|---|---|---|
| **PDF Orçamento** | proposta completa fiel ao preview: logo, cabeçalho, título, 12 blocos, caixa de investimento, cronograma, paginação "Página X de Y", sem títulos órfãos no fim de página | `Orcamento_{Cliente}_{Nº}.pdf` |
| **PDF DRE** | cabeçalho do projeto + DRE completo + painel repasse×retido + margens | `DRE_{Cliente}_{Nº}.pdf` |
| **CSV** | duas seções (externos e staff) com colunas das tabelas + totais; separador `;`, UTF-8 com BOM (compatível com Excel pt-BR) | `Custos_{Cliente}_{Nº}.csv` |
| **JSON** | formato `ProjetoArquivo` (`{ app:"acid-finance", versao:1, salvoEm, proj, externos, internos, cronograma, blocos }`) — **compatível nos dois sentidos** com arquivos do protótipo | `{Cliente}_{Nº}_{Projeto}.json` |

Tipografia dos PDFs: registrar fontes no @react-pdf/renderer — Libre Caslon (títulos) + Inter ou Helvetica (corpo). Valores em pt-BR.

---

## 8. Design

- Referência visual: `reference/prototype.jsx`. Minimalista executivo, fundo neutro claro, preto/branco/cinza.
- Verde ACID `#19E28A` (ações primárias e positivos; texto verde sobre claro usa `#0FB86E`), vermelho `#E5484D` (negativos).
- Header escuro: logo (`assets/logo_acid_tight.png`) + "FINANCE" em Libre Caslon Display, caixa alta, light, tracking aberto, **alinhados por baseline**.
- Números sempre `tabular-nums`; moeda `R$ 1.234,56`; datas dd/mm/aaaa.
- Desktop-first; utilizável em mobile (tabelas com scroll horizontal).
- Componentes shadcn/ui; toasts para feedback (salvo, erro, desfazer).

---

## 9. Requisitos não-funcionais

- **Segurança:** RLS ativo em todas as tabelas; apenas `anon key` no cliente; signup público desativado; rotas protegidas por middleware.
- **Performance:** lista de projetos e abertura de projeto < 1s em conexão normal; recálculo do DRE é síncrono/instantâneo (client-side).
- **Confiabilidade:** autosave com debounce + retry; nenhuma edição perdida ao navegar entre abas.
- **i18n:** toda a UI em pt-BR. Sem textos em inglês visíveis.
- **Qualidade:** vitest cobrindo `finance.ts` (caso ATTO + comissão sobre líquida + overhead só sobre staff + valorParaMargem + saudeMargem); lint/typecheck sem erros no build da Vercel.

---

## 10. Fora de escopo da v1 (não implementar agora)

- Papéis/permissões diferenciadas, aprovações, trilha de auditoria
- Orçado × realizado (colunas já existem no schema; UI fica para v1.1)
- Templates de projeto como entidade própria (na v1, "salvar como template" = duplicar com status "Template")
- Integrações (NF-e, bancos, ERP), multi-empresa, relatórios consolidados entre projetos
- App mobile nativo

---

## 11. Critérios de aceite do release

1. Login/logout/convite/recuperação funcionando no domínio Vercel de produção.
2. `npm test` verde com o caso ATTO; build da Vercel sem erros.
3. Importar `src-seed/seed-atto.json` → dashboard mostra Lucro R$ 83.900,50 e Margem Op. 41,4% (gauge verde).
4. Editar salário, horas, um custo externo e um percentual → DRE e dashboard atualizam ao vivo e persistem após refresh.
5. Duplicar e excluir projeto funcionando com confirmação.
6. Os 4 exports baixam arquivos válidos; o JSON exportado reimporta sem perdas; o CSV abre certo no Excel pt-BR.
7. PDF do orçamento fiel ao preview, com logo, acentuação correta e paginação.
8. Simulador bate com `valorParaMargem` (conferir 30%: RB necessário = 118.975 ÷ (0,70 × 0,89 × 0,97) ≈ **R$ 196.877**).
9. Nenhuma tela acessível sem login; nenhum segredo exposto no bundle.

---

## 12. Deploy e configuração

Passo a passo completo no `README.md` do pack. Resumo: aplicar `schema.sql` no Supabase → desativar signup público → configurar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` na Vercel → deploy → registrar a URL da Vercel em Site URL / Redirect URLs do Supabase Auth → convidar a equipe.
