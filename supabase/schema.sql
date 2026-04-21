-- Extensão para UUID
create extension if not exists "pgcrypto";

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  data_entrega date not null,
  valor numeric(10,2) not null,
  status text not null check (status in ('pendente', 'em_producao', 'entregue')),
  observacoes text,
  created_at timestamptz not null default now()
);

create table if not exists public.itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  descricao text not null,
  quantidade integer not null check (quantidade > 0),
  preco numeric(10,2) not null check (preco >= 0),
  created_at timestamptz not null default now()
);

-- Exemplo de policy básica para usuários autenticados
alter table public.clientes enable row level security;
alter table public.pedidos enable row level security;
alter table public.itens_pedido enable row level security;

create policy "authenticated can read all" on public.clientes
for select to authenticated using (true);
create policy "authenticated can insert" on public.clientes
for insert to authenticated with check (true);

create policy "authenticated can read pedidos" on public.pedidos
for select to authenticated using (true);
create policy "authenticated can write pedidos" on public.pedidos
for all to authenticated using (true) with check (true);

create policy "authenticated can read itens" on public.itens_pedido
for select to authenticated using (true);
create policy "authenticated can write itens" on public.itens_pedido
for all to authenticated using (true) with check (true);
