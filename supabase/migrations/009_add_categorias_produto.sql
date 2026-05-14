-- Product categories (separate from categorias_custo used in financial module)
create table if not exists categorias_produto (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table categorias_produto disable row level security;

-- FK on produtos table
alter table produtos add column if not exists categoria_id uuid references categorias_produto(id) on delete set null;

-- Seed common bakery categories
insert into categorias_produto (nome, ordem) values
  ('Bolos', 1),
  ('Doces', 2),
  ('Salgados', 3),
  ('Bebidas', 4);
