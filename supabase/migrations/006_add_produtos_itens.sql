-- Migration 006: Catálogo de produtos e itens do pedido
-- Execute este script no Supabase SQL Editor

-- Remove execuções parciais anteriores (tabelas novas, sem dados ainda)
drop table if exists itens_pedido;
drop table if exists produtos;

-- Tabela produtos: catálogo com unidade de medida
create table produtos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  unidade_medida text not null check (unidade_medida in ('peso_kg', 'cento', 'unidade')),
  preco_padrao numeric(10,4) not null default 0,
  ativo boolean not null default true,
  created_at timestamp with time zone default now()
);

create index idx_produtos_ativo on produtos(ativo);
create index idx_produtos_nome on produtos(nome);

alter table produtos enable row level security;
drop policy if exists "allow_all_produtos" on produtos;
create policy "allow_all_produtos" on produtos for all using (true) with check (true);

-- Tabela itens_pedido: itens com snapshot de preço no momento da venda
-- Alterações futuras no catálogo NÃO afetam pedidos já criados
create table itens_pedido (
  id uuid primary key default uuid_generate_v4(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto_id uuid references produtos(id) on delete set null,
  nome_produto text not null,
  unidade_medida text not null check (unidade_medida in ('peso_kg', 'cento', 'unidade')),
  preco_unitario numeric(10,4) not null,
  quantidade numeric(10,4) not null,
  valor_total numeric(10,2) not null,
  created_at timestamp with time zone default now()
);

create index idx_itens_pedido_id on itens_pedido(pedido_id);
create index idx_itens_produto_id on itens_pedido(produto_id);

alter table itens_pedido enable row level security;
drop policy if exists "allow_all_itens_pedido" on itens_pedido;
create policy "allow_all_itens_pedido" on itens_pedido for all using (true) with check (true);

notify pgrst, 'reload schema';
