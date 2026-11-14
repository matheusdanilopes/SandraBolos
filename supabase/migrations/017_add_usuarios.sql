-- Migration 017: usuários do app (login e senha)
-- Execute no SQL Editor do Supabase (Painéis > SQL Editor > New Query)
--
-- A senha fica só como hash bcrypt (pgcrypto). O login é conferido pela função
-- verificar_login, que só o servidor (service role) pode chamar.

create extension if not exists pgcrypto with schema extensions;

create table if not exists usuarios (
  id bigint generated always as identity primary key,
  login text not null,
  senha_hash text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Login sem diferenciar maiúsculas e minúsculas
create unique index if not exists idx_usuarios_login on usuarios (lower(login));

-- Sem policies: a tabela não é lida nem escrita pelo navegador
alter table usuarios enable row level security;

-- Devolve o login (com a grafia cadastrada) se usuário e senha conferem; senão null
create or replace function verificar_login(p_login text, p_senha text)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select u.login
  from usuarios u
  where lower(u.login) = lower(trim(p_login))
    and u.ativo
    and u.senha_hash = crypt(p_senha, u.senha_hash)
  limit 1;
$$;

revoke all on function verificar_login(text, text) from public, anon, authenticated;
grant execute on function verificar_login(text, text) to service_role;

-- Usuários iniciais com uma senha aleatória que ninguém conhece: defina a senha
-- de cada um com o comando abaixo antes de usar (nunca grave senhas neste arquivo).
insert into usuarios (login, senha_hash) values
  ('Agnaldo', extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))),
  ('Sandra',  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))),
  ('Admin',   extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')))
on conflict do nothing;

-- Para definir ou trocar a senha de alguém:
--   update usuarios set senha_hash = extensions.crypt('NOVA_SENHA', extensions.gen_salt('bf'))
--   where lower(login) = 'sandra';

-- Recarrega o cache do schema do PostgREST (resolve o erro "relation not found")
notify pgrst, 'reload schema';
