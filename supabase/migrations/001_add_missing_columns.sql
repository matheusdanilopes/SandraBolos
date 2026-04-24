-- Migration: adiciona colunas que podem estar faltando na tabela pedidos
-- Execute este script no SQL Editor do Supabase se a tabela já existir

alter table pedidos add column if not exists descricao text;
alter table pedidos add column if not exists peso numeric;
alter table pedidos add column if not exists quantidade integer;
alter table pedidos add column if not exists preco_por_kg numeric;
alter table pedidos add column if not exists valor_calculado numeric;
alter table pedidos add column if not exists preco_corrigido numeric;
alter table pedidos add column if not exists valor_cobrado numeric;

-- Garante que colunas obrigatórias têm defaults corretos
alter table pedidos alter column topper set default 'nao';
alter table pedidos alter column status set default 'novo';

-- Recarrega o schema cache do PostgREST
notify pgrst, 'reload schema';
