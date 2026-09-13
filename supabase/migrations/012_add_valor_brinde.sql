-- Migration 012: valor do topper dado de brinde
-- Execute no SQL Editor do Supabase (Painéis > SQL Editor > New Query)
--
-- Brinde não é compra de fornecedor (não entra na tela de Toppers): o valor
-- informado no registro do pedido entra como receita, somado ao valor do pedido.

alter table public.pedidos add column if not exists valor_brinde numeric;

-- Recarrega o cache do schema do PostgREST (resolve o erro "column not found")
notify pgrst, 'reload schema';
