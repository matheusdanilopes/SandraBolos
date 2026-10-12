-- Migration 014: fotos do carrossel do cardápio público (/cardapio)
-- Execute no SQL Editor do Supabase (Painéis > SQL Editor > New Query)
--
-- As fotos são cadastradas em Configurações > Fotos do cardápio e aparecem,
-- na ordem definida, no carrossel da página pública do cardápio.

create table if not exists cardapio_fotos (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  storage_path text not null,
  legenda text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_cardapio_fotos_ordem on cardapio_fotos(ordem);

alter table cardapio_fotos disable row level security;

-- Bucket público para as fotos (o upload passa pelo servidor, que já
-- redimensiona e converte para WebP, que mantém o fundo transparente dos recortes)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cardapio-fotos',
  'cardapio-fotos',
  true,
  5242880,
  ARRAY['image/webp']
)
on conflict (id) do nothing;

-- Recarrega o cache do schema do PostgREST (resolve o erro "relation not found")
notify pgrst, 'reload schema';
