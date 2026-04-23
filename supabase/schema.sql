-- Confeitaria Sandra Bolos - Database Schema

create extension if not exists "uuid-ossp";

create table clientes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  telefone text not null,
  created_at timestamp with time zone default now()
);

create table pedidos (
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

create table imagens_pedido (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  file_id text not null,
  url text not null,
  nome_arquivo text not null,
  created_at timestamp with time zone default now()
);

-- Indexes
create index idx_pedidos_status on pedidos(status);
create index idx_pedidos_data_entrega on pedidos(data_entrega);
create index idx_pedidos_cliente_id on pedidos(cliente_id);
create index idx_imagens_pedido_id on imagens_pedido(pedido_id);

-- Row Level Security (enable for production)
alter table clientes enable row level security;
alter table pedidos enable row level security;
alter table imagens_pedido enable row level security;

-- Permissive policies for single-user app (no auth required)
create policy "allow_all_clientes" on clientes for all using (true) with check (true);
create policy "allow_all_pedidos" on pedidos for all using (true) with check (true);
create policy "allow_all_imagens" on imagens_pedido for all using (true) with check (true);
