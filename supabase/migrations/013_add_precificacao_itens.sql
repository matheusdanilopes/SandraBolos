-- Migration 013: precificação por item do pedido
-- Execute no SQL Editor do Supabase (Painéis > SQL Editor > New Query)
--
-- A precificação era uma medida só por pedido (peso × preço/kg), então um
-- pedido com dois bolos só conseguia registrar o peso real de um deles. Cada
-- item passa a guardar a própria apuração do "Feito", sem apagar o que foi
-- combinado na venda (`quantidade`, `preco_unitario`, `valor_total`) — é essa
-- quantidade combinada que a regra dos 300g usa como referência.

alter table public.itens_pedido add column if not exists quantidade_real numeric;
alter table public.itens_pedido add column if not exists preco_real numeric;
alter table public.itens_pedido add column if not exists valor_real numeric;

-- Recarrega o cache do schema do PostgREST (resolve o erro "column not found")
notify pgrst, 'reload schema';
