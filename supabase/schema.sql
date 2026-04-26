-- Confeitaria Sandra Bolos - Database Schema
-- Script idempotente: pode ser executado múltiplas vezes com segurança

create extension if not exists "uuid-ossp";

-- Tabela clientes
create table if not exists clientes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  telefone text not null,
  created_at timestamp with time zone default now()
);

-- Tabela pedidos
create table if not exists pedidos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references clientes(id) on delete set null,
  data_entrega date not null,
  tipo text not null check (tipo in ('bolo', 'doce', 'kit')),
  descricao text,
  topper text not null default 'nao' check (topper in ('sim', 'nao', 'brinde')),
  status text not null default 'novo' check (status in ('novo', 'produzindo', 'feito', 'entregue')),
  peso numeric,
  quantidade integer,
  preco_por_kg numeric,
  valor_calculado numeric,
  preco_corrigido numeric,
  valor_cobrado numeric,
  created_at timestamp with time zone default now()
);

-- Garante colunas que podem estar faltando em tabelas existentes
alter table pedidos add column if not exists descricao text;
alter table pedidos add column if not exists peso numeric;
alter table pedidos add column if not exists quantidade integer;
alter table pedidos add column if not exists preco_por_kg numeric;
alter table pedidos add column if not exists valor_calculado numeric;
alter table pedidos add column if not exists preco_corrigido numeric;
alter table pedidos add column if not exists valor_cobrado numeric;
alter table pedidos add column if not exists drive_folder_id text;
alter table pedidos add column if not exists nome_cliente text;
alter table pedidos add column if not exists hora_entrega time;
alter table pedidos add column if not exists hora_retirada time;

-- Tabela imagens_pedido
create table if not exists imagens_pedido (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  file_id text not null,
  url text not null,
  nome_arquivo text not null,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists idx_pedidos_status on pedidos(status);
create index if not exists idx_pedidos_data_entrega on pedidos(data_entrega);
create index if not exists idx_pedidos_cliente_id on pedidos(cliente_id);
create index if not exists idx_imagens_pedido_id on imagens_pedido(pedido_id);

-- Row Level Security
alter table clientes enable row level security;
alter table pedidos enable row level security;
alter table imagens_pedido enable row level security;

-- Policies (drop and recreate para evitar duplicatas)
drop policy if exists "allow_all_clientes" on clientes;
drop policy if exists "allow_all_pedidos" on pedidos;
drop policy if exists "allow_all_imagens" on imagens_pedido;

create policy "allow_all_clientes" on clientes for all using (true) with check (true);
create policy "allow_all_pedidos" on pedidos for all using (true) with check (true);
create policy "allow_all_imagens" on imagens_pedido for all using (true) with check (true);

-- Tabela toppers_pedido
create table if not exists toppers_pedido (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  fornecedor text,
  valor numeric(10,2) not null default 0,
  frete numeric(10,2) not null default 0,
  solicitado boolean not null default false,
  recebido boolean not null default false,
  pago_fornecedor boolean not null default false,
  observacoes text,
  created_at timestamp with time zone default now(),
  unique(pedido_id)
);

create index if not exists idx_toppers_pedido_id on toppers_pedido(pedido_id);

alter table toppers_pedido enable row level security;
drop policy if exists "allow_all_toppers_pedido" on toppers_pedido;
create policy "allow_all_toppers_pedido" on toppers_pedido for all using (true) with check (true);

-- Recarrega o schema cache do PostgREST
notify pgrst, 'reload schema';
