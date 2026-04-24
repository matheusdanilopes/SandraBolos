-- Adiciona campos de preço
alter table sabores add column if not exists preco_por_kg numeric;
alter table sabores add column if not exists preco_por_cento numeric;

-- Converte registros 'ambos' para 'bolo' antes de atualizar a constraint
update sabores set tipo = 'bolo' where tipo = 'ambos';

-- Atualiza a check constraint removendo 'ambos'
alter table sabores drop constraint if exists sabores_tipo_check;
alter table sabores add constraint sabores_tipo_check
  check (tipo in ('bolo', 'doce'));

notify pgrst, 'reload schema';
