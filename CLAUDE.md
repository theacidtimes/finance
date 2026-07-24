# ACID Finance — instruções para o Claude Code

Sistema web interno da ACID (produtora criativa) para precificação, DRE e geração de
orçamento comercial de projetos. Este repositório contém o pack inicial; sua tarefa é
construir a aplicação completa a partir dele. O documento mestre é `docs/PRD.md` —
leia-o integralmente antes de qualquer código.

## Stack obrigatória

- Next.js 14+ (App Router) + TypeScript
- TailwindCSS + shadcn/ui
- Recharts para gráficos
- Zustand para estado do projeto aberto
- Supabase (Postgres + Auth) — schema pronto em `supabase/schema.sql`
- Deploy na Vercel
- Exportação PDF: `@react-pdf/renderer` (client-side; não usar puppeteer, não roda bem na Vercel serverless)

## Arquivos deste pack — leia antes de começar

| Arquivo | O que é |
|---|---|
| `docs/PRD.md` | **Documento mestre do produto** — telas, auth, critérios de aceite. Em conflito, finance.ts > PRD > especificacao > protótipo |
| `docs/especificacao.md` | Especificação funcional complementar |
| `docs/proposta-template.md` | Textos padrão da proposta comercial |
| `reference/prototype.jsx` | Protótipo React funcional — é a referência de UI, layout e comportamento. Reproduza o visual e a organização das telas |
| `src-seed/finance.ts` | Lógica financeira pronta e testada — copie para `lib/finance.ts` SEM ALTERAR os cálculos |
| `src-seed/types.ts` | Tipos TypeScript do domínio — copie para `types/` |
| `src-seed/seed-atto.json` | Projeto exemplo ATTO para seed do banco |
| `supabase/schema.sql` | Schema do banco com RLS |
| `assets/` | Logos (usar `logo_acid_tight.png` no header; está cortado rente para alinhar por baseline) |

## Regras financeiras — INVIOLÁVEIS

Toda a matemática está em `src-seed/finance.ts`. Nunca reimplemente cálculo em componente.
Resumo (a fonte da verdade é o arquivo):

1. Impostos = Receita Bruta × %impostos (padrão 11%)
2. Receita Líquida = Bruta − Impostos
3. **Comissão = Receita LÍQUIDA × %comissão** (padrão 3%) — sobre a líquida, nunca sobre a bruta
4. Receita Operacional = Líquida − Comissão
5. **Overhead = Staff Interno × %overhead** (padrão 50%) — só sobre staff interno; custos externos NUNCA entram no overhead
6. Custo/hora interno = salário mensal ÷ base mensal de horas; custo no projeto = custo/hora × horas previstas
7. Lucro Operacional = Receita Operacional − (Externos + Staff + Overhead)
8. Retido na ACID = Staff Interno + Overhead + Lucro Operacional
9. Todos os percentuais são editáveis por projeto

Semáforo de margem operacional: verde ≥ 30%, amarelo 20–30%, vermelho < 20%.

## Estrutura de pastas alvo

```
/app            rotas (login, lista, projetos/[id]/{dashboard,cadastro,pessoas,dre,simulador,orcamento})
/components     ui/ (shadcn), dashboard/, tabelas/, dre/, orcamento/
/lib            finance.ts, supabase/ (client, queries, mappers), pdf/
/types          domínio
/data           seeds e templates de texto
/utils          formatação (BRL, %, datas pt-BR)
```

## Fases de implementação (nesta ordem, commits separados)

1. **Fase 1 — Base**: scaffold Next.js, Tailwind, shadcn/ui, tipos, `lib/finance.ts`
   com testes unitários (vitest) validando o caso ATTO: RB 235.000 / 11% / 3% / 50%,
   externos 100.000, staff 12.650 → Lucro Operacional 83.900,50 e Margem Op. ≈ 41,4%.
2. **Fase 2 — UI**: portar as 6 telas do protótipo (Dashboard, Projeto, Pessoas & Custos,
   DRE, Simulador, Orçamento) usando shadcn/ui, ainda com estado local + seed ATTO.
3. **Fase 3 — Supabase**: aplicar `supabase/schema.sql`, auth por e-mail com convite
   (PRD §2), middleware de proteção de rotas, CRUD de projetos (lista, criar, abrir,
   duplicar, excluir), autosave com debounce (PRD §4).
4. **Fase 4 — Exportações**: PDF do orçamento comercial (seguir layout de
   `docs/proposta-template.md` + cabeçalho com logo), PDF do DRE, export CSV,
   import/export JSON (manter compatibilidade com o formato do protótipo:
   `{ app: "acid-finance", versao: 1, proj, externos, internos, cronograma, blocos }`).
5. **Fase 5 — Deploy**: Vercel + variáveis de ambiente (ver `.env.example`),
   validar critérios de aceite do PRD §11.

## Design

Minimalista executivo: fundo neutro claro, preto/branco/cinza, verde ACID `#19E28A`
(destaques positivos) e `#0FB86E` (texto sobre claro), vermelho `#E5484D` para alertas.
Wordmark do header: logo + "FINANCE" em caixa alta, Libre Caslon Display light,
alinhados por baseline (ver protótipo). Números sempre `tabular-nums`, moeda em pt-BR.
Desktop-first, responsivo até mobile.

## O que NÃO fazer

- Não usar localStorage como persistência principal (Supabase é a fonte da verdade)
- Não usar puppeteer/chromium para PDF
- Não alterar fórmulas financeiras nem valores padrão (11/3/50)
- Não criar backend próprio além das rotas do Next — Supabase resolve dados e auth
- Não expor `service_role` key no client; usar apenas `anon` key + RLS
