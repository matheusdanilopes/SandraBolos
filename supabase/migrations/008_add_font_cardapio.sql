-- Add font_family column to cardapio_config
alter table cardapio_config
  add column if not exists font_family text not null default 'georgia';

-- Update the singleton row default
update cardapio_config
set font_family = 'georgia'
where id = '00000000-0000-0000-0000-000000000001'
  and font_family is null;
