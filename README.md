# ACID Finance — Pack inicial

Pack de arquivos para construir o ACID Finance com o Claude Code, conectando
Supabase (dados + auth com login e senha) e Vercel (deploy online).

## Conteúdo

```
CLAUDE.md                  → instruções para o Claude Code (leia primeiro)
README.md                  → este arquivo
.env.example               → variáveis de ambiente
docs/
  PRD.md                   → DOCUMENTO MESTRE do produto (telas, auth, aceite)
  especificacao.md         → especificação funcional complementar
  proposta-template.md     → textos padrão da proposta comercial
reference/
  prototype.jsx            → protótipo funcional (referência de UI e comportamento)
src-seed/
  types.ts                 → tipos TypeScript do domínio
  finance.ts               → lógica financeira (fonte da verdade dos cálculos)
  seed-atto.json           → projeto exemplo ATTO
supabase/
  schema.sql               → schema do banco com RLS
assets/
  logo_acid.png            → logo original
  logo_acid_tight.png      → logo cortado rente (usar no header)
```

## Como usar com o Claude Code

1. Crie uma pasta para o projeto e descompacte este pack dentro dela
2. Abra o Claude Code na pasta:
   ```bash
   cd acid-finance
   claude
   ```
3. O Claude Code lê o `CLAUDE.md` automaticamente. Primeiro prompt sugerido:
   > Leia o CLAUDE.md e o docs/PRD.md integralmente e execute a Fase 1: scaffold do
   > Next.js com TypeScript, Tailwind e shadcn/ui, porte lib/finance.ts e types, e
   > crie os testes unitários com o caso ATTO descrito no finance.ts.
4. Siga as fases do CLAUDE.md (1 a 5), validando cada uma antes da próxima.
   Ao final, confira os critérios de aceite do PRD §11.

## Setup Supabase

1. Crie um projeto em supabase.com
2. SQL Editor → cole e execute `supabase/schema.sql`
3. Authentication → Providers → deixe só Email habilitado
4. Authentication → Settings → **desative "Allow new users to sign up"**
   (equipe entra por convite: Users → Invite user)
5. Copie de Settings → API:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Nunca use a `service_role` key no front

## Setup Vercel

1. Suba o repositório para o GitHub
2. Na Vercel: Add New Project → importe o repo
3. Em Environment Variables, adicione as duas variáveis do `.env.example`
4. Deploy — o domínio `.vercel.app` já sai funcionando
5. Em Supabase → Authentication → URL Configuration, adicione a URL da Vercel
   em "Site URL" e "Redirect URLs" (senão convite e recuperação de senha não redirecionam)
6. Convide a equipe pelo painel do Supabase

## Ordem de trabalho recomendada

| Fase | Entrega | Validação |
|---|---|---|
| 1 | Base + finance.ts + testes | `npm test` passa com o caso ATTO |
| 2 | 6 telas portadas do protótipo | UI igual ao prototype.jsx, seed local |
| 3 | Supabase: auth + CRUD + autosave | login funciona; criar/abrir/duplicar persiste |
| 4 | PDFs, CSV, import/export JSON | orçamento em PDF fiel ao preview |
| 5 | Deploy Vercel | app no ar com login; aceite do PRD §11 |

## Números de validação (projeto ATTO)

RB 235.000 · impostos 11% · comissão 3% · overhead 50% · externos 100.000 ·
staff 12.650 → **Lucro Operacional R$ 83.900,50 · Margem Op. 41,4% · Retido R$ 102.875,50**

Se o sistema mostrar esses números com o seed carregado, a lógica está correta.
