-- ACID Finance — schema Supabase
-- Aplicar via SQL Editor do Supabase ou: supabase db push

create extension if not exists "pgcrypto";

-- ========== PROJETOS ==========
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),

  cliente text not null,
  projeto text not null,
  numero_servico text not null,
  tipo text not null default 'Filme',
  responsavel text default '',
  data date default current_date,
  status text default 'Orçamento',
  valor_bruto numeric(14,2) not null default 0,
  impostos_pct numeric(6,3) not null default 11,
  comissao_pct numeric(6,3) not null default 3,
  overhead_pct numeric(6,3) not null default 50,
  prazo text default '',
  condicao_pagamento text default '',
  validade_proposta text default '15 dias',
  observacoes text default '',
  titulo text default '',

  -- blocos de texto da proposta comercial (JSON: BlocosProposta)
  blocos jsonb not null default '{}'::jsonb,

  unique (cliente, projeto, numero_servico)
);

-- ========== CUSTOS EXTERNOS / REPASSES ==========
create table if not exists external_costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  ordem int not null default 0,
  nome text not null default '',
  funcao text default '',
  categoria text default 'Outros',
  valor numeric(14,2) not null default 0,
  status text not null default 'Orçado' check (status in ('Orçado','Aprovado','Pago')),
  nf boolean not null default false,
  data_pagamento date,
  obs text default '',
  -- para orçado x realizado no futuro:
  valor_realizado numeric(14,2)
);

-- ========== STAFF INTERNO ==========
create table if not exists internal_staff (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  ordem int not null default 0,
  nome text not null default '',
  funcao text default '',
  salario numeric(14,2) not null default 0,
  base_horas numeric(8,2) not null default 160,
  horas_projeto numeric(8,2) not null default 0,
  -- para orçado x realizado no futuro:
  horas_realizadas numeric(8,2)
);

-- ========== CRONOGRAMA ==========
create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  ordem int not null default 0,
  data_label text not null default '',
  marco text not null default ''
);

-- updated_at automático
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

-- ========== RLS ==========
-- Ferramenta interna: qualquer usuário autenticado da equipe vê e edita tudo.
-- (Convites controlados pelo Auth do Supabase — desative signup público no painel.)
alter table projects enable row level security;
alter table external_costs enable row level security;
alter table internal_staff enable row level security;
alter table milestones enable row level security;

create policy "equipe le projetos"    on projects for select to authenticated using (true);
create policy "equipe cria projetos"  on projects for insert to authenticated with check (true);
create policy "equipe edita projetos" on projects for update to authenticated using (true);
create policy "equipe apaga projetos" on projects for delete to authenticated using (true);

create policy "equipe le custos"    on external_costs for select to authenticated using (true);
create policy "equipe cria custos"  on external_costs for insert to authenticated with check (true);
create policy "equipe edita custos" on external_costs for update to authenticated using (true);
create policy "equipe apaga custos" on external_costs for delete to authenticated using (true);

create policy "equipe le staff"    on internal_staff for select to authenticated using (true);
create policy "equipe cria staff"  on internal_staff for insert to authenticated with check (true);
create policy "equipe edita staff" on internal_staff for update to authenticated using (true);
create policy "equipe apaga staff" on internal_staff for delete to authenticated using (true);

create policy "equipe le marcos"    on milestones for select to authenticated using (true);
create policy "equipe cria marcos"  on milestones for insert to authenticated with check (true);
create policy "equipe edita marcos" on milestones for update to authenticated using (true);
create policy "equipe apaga marcos" on milestones for delete to authenticated using (true);

-- índices úteis
create index if not exists idx_external_costs_project on external_costs(project_id);
create index if not exists idx_internal_staff_project on internal_staff(project_id);
create index if not exists idx_milestones_project on milestones(project_id);
