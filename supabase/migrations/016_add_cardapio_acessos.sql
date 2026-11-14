-- Migration 016: registro dos acessos ao link curto do cardápio (/c)
-- Execute no SQL Editor do Supabase (Painéis > SQL Editor > New Query)
--
-- Cada abertura do link /c grava uma linha (pelo servidor, com a service role).
-- Configurações > Cardápio Online mostra o total e o gráfico por dia.

create table if not exists cardapio_acessos (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);

create index if not exists idx_cardapio_acessos_created_at on cardapio_acessos(created_at);

-- O app na Vercel usa a chave pública (sem SUPABASE_SERVICE_ROLE_KEY), então a
-- chave pública precisa gravar e ler os acessos, como nas outras tabelas do app
alter table cardapio_acessos enable row level security;
drop policy if exists "public_insert_cardapio_acessos" on cardapio_acessos;
create policy "public_insert_cardapio_acessos" on cardapio_acessos for insert with check (true);
drop policy if exists "public_read_cardapio_acessos" on cardapio_acessos;
create policy "public_read_cardapio_acessos" on cardapio_acessos for select using (true);

-- Acessos por dia no horário de Brasília. security_invoker: a view respeita o
-- RLS da tabela (só o servidor lê), em vez de expor os dados com a permissão do dono
create or replace view cardapio_acessos_por_dia
with (security_invoker = true) as
select
  (created_at at time zone 'America/Sao_Paulo')::date as dia,
  count(*)::int as total
from cardapio_acessos
group by 1;

-- Recarrega o cache do schema do PostgREST (resolve o erro "relation not found")
notify pgrst, 'reload schema';
