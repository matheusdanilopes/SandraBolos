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

-- Sem policies: leitura e escrita só pelo servidor, com a service role
alter table cardapio_acessos enable row level security;

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
