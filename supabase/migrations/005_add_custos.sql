-- Migration 005: tabelas de categorias e custos operacionais

-- Tabela de categorias de custo (gerenciada em /configuracoes)
create table if not exists categorias_custo (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  created_at timestamp with time zone default now()
);

-- Seed com categorias padrão (só se a tabela estiver vazia)
insert into categorias_custo (nome)
select unnest(array['Ingredientes', 'Embalagens', 'Frete', 'Outros'])
where not exists (select 1 from categorias_custo);

-- Tabela de custos operacionais com FK para categoria
create table if not exists custos (
  id uuid primary key default uuid_generate_v4(),
  descricao text not null,
  valor numeric(10,2) not null default 0,
  data date not null default current_date,
  categoria_id uuid references categorias_custo(id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_custos_data on custos(data);
create index if not exists idx_custos_categoria_id on custos(categoria_id);

-- RLS
alter table categorias_custo enable row level security;
alter table custos enable row level security;

drop policy if exists "allow_all_categorias_custo" on categorias_custo;
drop policy if exists "allow_all_custos" on custos;

create policy "allow_all_categorias_custo" on categorias_custo for all using (true) with check (true);
create policy "allow_all_custos" on custos for all using (true) with check (true);

notify pgrst, 'reload schema';
