-- Cardapio visual customization config (singleton row)
create table if not exists cardapio_config (
  id uuid primary key default gen_random_uuid(),
  background_url text,
  background_type text not null default 'rosa_pastel',
  opacity numeric(3,2) not null default 0.30,
  titulo text not null default 'Cardápio',
  subtitulo text,
  cor_texto text not null default '#1f2937',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table cardapio_config disable row level security;

-- Singleton row – always id = 00000000-0000-0000-0000-000000000001
insert into cardapio_config (id, background_type, opacity, titulo, cor_texto)
values ('00000000-0000-0000-0000-000000000001', 'rosa_pastel', 0.30, 'Cardápio', '#1f2937')
on conflict (id) do nothing;

-- Supabase Storage bucket for uploaded background images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cardapio-backgrounds',
  'cardapio-backgrounds',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png']
)
on conflict (id) do nothing;
