-- Tabela de configurações do sistema (linha única, id = 1)
create table if not exists configuracoes (
  id integer primary key default 1,
  limite_peso_extra_kg numeric not null default 0.300,
  updated_at timestamp with time zone default now()
);

-- Garante que exista a linha padrão
insert into configuracoes (id, limite_peso_extra_kg)
values (1, 0.300)
on conflict (id) do nothing;

-- RLS
alter table configuracoes enable row level security;

drop policy if exists "allow_all_configuracoes" on configuracoes;
create policy "allow_all_configuracoes" on configuracoes for all using (true) with check (true);

notify pgrst, 'reload schema';
