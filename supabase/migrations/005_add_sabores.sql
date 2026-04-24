create table if not exists sabores (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  tipo text not null default 'bolo' check (tipo in ('bolo', 'doce', 'ambos')),
  ativo boolean not null default true,
  created_at timestamp with time zone default now()
);

create index if not exists idx_sabores_tipo on sabores(tipo);
create index if not exists idx_sabores_ativo on sabores(ativo);

alter table sabores enable row level security;

drop policy if exists "allow_all_sabores" on sabores;
create policy "allow_all_sabores" on sabores for all using (true) with check (true);

notify pgrst, 'reload schema';
