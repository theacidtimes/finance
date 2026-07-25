-- ACID Finance — schema Supabase
-- Aplicar via SQL Editor do Supabase ou: supabase db push

create extension if not exists "pgcrypto";

-- ========== CLIENTES (agrupamento de projetos/orçamentos) ==========
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,

  nome text not null,
  contato text not null default '',
  email text not null default '',
  telefone text not null default '',
  observacoes text not null default ''
);
create unique index if not exists clients_nome_unique on clients (lower(nome));

-- ========== PROJETOS ==========
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),

  cliente text not null,
  client_id uuid references clients(id) on delete set null,
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

-- ========== TIME / FUNCIONÁRIOS ACID (global, fora de projetos) ==========
-- Cadastro de pessoas fixas: custo mensal carregado (salário + encargos + benefícios),
-- ficha cadastral e anexos (contratos/PJ). Vira insumo p/ orçar por volume de horas.
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),

  nome text not null default '',
  funcao text default '',
  tipo_contrato text not null default 'CLT', -- CLT | PJ | Estágio | Sócio | Freelancer | Outro
  ativo boolean not null default true,

  -- custo carregado
  salario_mensal numeric(14,2) not null default 0,     -- base CLT / pró-labore / valor PJ
  base_horas_mes numeric(8,2) not null default 160,
  encargos jsonb not null default '[]'::jsonb,          -- [{label, pct}]
  beneficios_mensais numeric(14,2) not null default 0,  -- VR/VT/saúde fixos R$/mês

  -- ficha cadastral
  cpf_cnpj text default '',
  razao_social text default '',
  email text default '',
  telefone text default '',
  pix text default '',
  endereco text default '',
  data_admissao date,
  observacoes text default '',

  -- anexos (metadados; arquivos no Storage bucket team-files)
  anexos jsonb not null default '[]'::jsonb -- [{nome, path, size, tipo, criadoEm}]
);

-- updated_at automático
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ========== PERFIS, PAPÉIS E PERMISSÕES ==========
-- Cada auth.user tem um profile 1:1. role master|gestor; permissions jsonb por perfil.
-- Definido cedo pois as policies de clientes usam has_perm()/is_master().
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null default '',
  nome text not null default '',
  role text not null default 'gestor' check (role in ('master','gestor')),
  permissions jsonb not null default '{}'::jsonb
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function set_updated_at();

-- Helpers de papel/permissão (security definer: ignoram RLS, sem recursão)
create or replace function public.is_master()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'master');
$$;

create or replace function public.has_perm(perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'master' or coalesce((permissions->>perm)::boolean, false))
  );
$$;

-- Cria o profile automaticamente ao criar um auth.user (lê metadados do admin.createUser)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nome, role, permissions)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'nome', ''),
    coalesce(new.raw_user_meta_data->>'role', 'gestor'),
    coalesce(new.raw_user_meta_data->'permissions', '{}'::jsonb)
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
create policy "perfis leitura"      on public.profiles for select to authenticated using (true);
create policy "master cria perfis"  on public.profiles for insert to authenticated with check (public.is_master());
create policy "master edita perfis" on public.profiles for update to authenticated using (public.is_master()) with check (public.is_master());
create policy "master apaga perfis" on public.profiles for delete to authenticated using (public.is_master());

-- Promova manualmente o primeiro master (ajuste o e-mail):
-- update public.profiles set role='master', permissions='{"criar_clientes":true,"gerar_orcamento":true}'::jsonb
-- where email = 'bruno.zampoli@theacidtimes.com';

drop trigger if exists clients_updated_at on clients;
create trigger clients_updated_at before update on clients
  for each row execute function set_updated_at();

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

create index if not exists idx_projects_client_id on projects (client_id);

drop trigger if exists team_members_updated_at on team_members;
create trigger team_members_updated_at before update on team_members
  for each row execute function set_updated_at();

-- ========== RLS ==========
-- Ferramenta interna: qualquer usuário autenticado da equipe vê e edita tudo.
-- (Convites controlados pelo Auth do Supabase — desative signup público no painel.)
alter table clients enable row level security;
create policy "equipe le clientes"    on clients for select to authenticated using (true);
-- criar clientes exige a permissão criar_clientes (master sempre pode); apagar é só do master
create policy "equipe cria clientes"  on clients for insert to authenticated with check (public.has_perm('criar_clientes'));
create policy "equipe edita clientes" on clients for update to authenticated using (true);
create policy "master apaga clientes" on clients for delete to authenticated using (public.is_master());

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

alter table team_members enable row level security;
create policy "equipe le time"    on team_members for select to authenticated using (true);
create policy "equipe cria time"  on team_members for insert to authenticated with check (true);
create policy "equipe edita time" on team_members for update to authenticated using (true);
create policy "equipe apaga time" on team_members for delete to authenticated using (true);

-- índices úteis
create index if not exists idx_external_costs_project on external_costs(project_id);
create index if not exists idx_internal_staff_project on internal_staff(project_id);
create index if not exists idx_milestones_project on milestones(project_id);
create index if not exists idx_team_members_ativo on team_members(ativo);

-- ========== STORAGE: contratos/anexos do time ==========
insert into storage.buckets (id, name, public)
values ('team-files', 'team-files', false)
on conflict (id) do nothing;

create policy "team-files le"    on storage.objects for select to authenticated using (bucket_id = 'team-files');
create policy "team-files cria"  on storage.objects for insert to authenticated with check (bucket_id = 'team-files');
create policy "team-files edita" on storage.objects for update to authenticated using (bucket_id = 'team-files');
create policy "team-files apaga" on storage.objects for delete to authenticated using (bucket_id = 'team-files');
