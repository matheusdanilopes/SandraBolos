-- Migration 002: alinha a tabela pedidos existente ao schema do app
-- Execute no SQL Editor do Supabase (Painéis > SQL Editor > New Query)

-- Adiciona colunas que estão faltando
alter table public.pedidos add column if not exists tipo text;
alter table public.pedidos add column if not exists topper text;
alter table public.pedidos add column if not exists quantidade integer;
alter table public.pedidos add column if not exists preco_por_kg numeric;
alter table public.pedidos add column if not exists valor_calculado numeric;
alter table public.pedidos add column if not exists preco_corrigido numeric;
alter table public.pedidos add column if not exists valor_cobrado numeric;

-- Migra status antigo 'pendente' para 'novo' (fluxo do app)
update public.pedidos set status = 'novo' where status = 'pendente' or status is null;

-- Preenche tipo para pedidos existentes sem tipo
update public.pedidos set tipo = 'bolo' where tipo is null;

-- Preenche topper para pedidos existentes
update public.pedidos set topper = 'nao' where topper is null;

-- Ajusta defaults
alter table public.pedidos alter column status set default 'novo';
alter table public.pedidos alter column topper set default 'nao';

-- Garante RLS ativo (necessário para acesso via anon key)
alter table public.pedidos enable row level security;
alter table public.clientes enable row level security;

drop policy if exists "allow_all_pedidos" on public.pedidos;
drop policy if exists "allow_all_clientes" on public.clientes;
create policy "allow_all_pedidos" on public.pedidos for all using (true) with check (true);
create policy "allow_all_clientes" on public.clientes for all using (true) with check (true);

-- Recarrega o cache do schema do PostgREST (resolve o erro "column not found")
notify pgrst, 'reload schema';
