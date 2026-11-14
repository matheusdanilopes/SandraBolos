-- Migration 018: correções de segurança
-- Execute no SQL Editor do Supabase (Painéis > SQL Editor > New Query)
-- DEPOIS de publicar a versão do app que acompanha esta migration (ela passa a
-- ler tudo com a chave de serviço; a versão anterior usava a chave anon e pararia).
--
-- 1. Fecha as tabelas para a chave anon/pública: liga o RLS em todas as tabelas
--    do schema public e remove todas as policies. O app acessa o banco só pelo
--    servidor, com a service role (que ignora o RLS), depois de conferir o login.
-- 2. Limita tentativas de login: 10 erros por usuário ou 30 por IP em 15 minutos.
-- 3. Versão da sessão: trocar a senha, o login ou desativar alguém derruba as
--    sessões abertas dessa pessoa (em até 1 hora).
-- 4. Limite de acessos do link /c por IP, para ninguém inflar o contador.

-- 1. RLS em todas as tabelas, sem policies -------------------------------------

do $$
declare
  r record;
begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- 2 e 3. Usuários: versão da sessão e limite de tentativas ------------------------

alter table usuarios add column if not exists versao integer not null default 0;

create or replace function usuarios_nova_versao()
returns trigger
language plpgsql
as $$
begin
  if new.senha_hash is distinct from old.senha_hash
     or new.ativo is distinct from old.ativo
     or new.login is distinct from old.login then
    new.versao := old.versao + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_usuarios_nova_versao on usuarios;
create trigger trg_usuarios_nova_versao
  before update on usuarios
  for each row execute function usuarios_nova_versao();

-- Tentativas erradas recentes (apagadas depois de um dia)
create table if not exists login_falhas (
  id bigint generated always as identity primary key,
  login text not null,
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists idx_login_falhas_login on login_falhas (login, created_at);
create index if not exists idx_login_falhas_ip on login_falhas (ip, created_at);
alter table login_falhas enable row level security;

-- Confere o login e registra o erro. Devolve {bloqueado, login, versao}:
-- login só vem preenchido se usuário e senha conferem.
create or replace function entrar_login(p_login text, p_senha text, p_ip text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_login text := lower(trim(p_login));
  v_usuario usuarios%rowtype;
begin
  delete from login_falhas where created_at < now() - interval '1 day';

  if (select count(*) from login_falhas
      where login = v_login and created_at > now() - interval '15 minutes') >= 10
     or (p_ip is not null and (select count(*) from login_falhas
      where ip = p_ip and created_at > now() - interval '15 minutes') >= 30) then
    return jsonb_build_object('bloqueado', true);
  end if;

  select * into v_usuario
  from usuarios u
  where lower(u.login) = v_login
    and u.ativo
    and u.senha_hash = crypt(p_senha, u.senha_hash)
  limit 1;

  if v_usuario.id is null then
    insert into login_falhas (login, ip) values (v_login, p_ip);
    return jsonb_build_object('bloqueado', false);
  end if;

  delete from login_falhas where login = v_login;
  return jsonb_build_object('bloqueado', false, 'login', v_usuario.login, 'versao', v_usuario.versao);
end;
$$;

-- A sessão continua valendo? (usuário ativo e com a mesma versão)
create or replace function sessao_valida(p_login text, p_versao integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from usuarios u
    where lower(u.login) = lower(p_login) and u.ativo and u.versao = p_versao
  );
$$;

-- 4. Acessos do cardápio: no máximo 30 por IP por hora ---------------------------

-- Só o hash do IP, e só da última hora: serve para o limite, não para rastrear ninguém
create table if not exists cardapio_acessos_ip (
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_cardapio_acessos_ip on cardapio_acessos_ip (ip_hash, created_at);
alter table cardapio_acessos_ip enable row level security;

create or replace function registrar_acesso_cardapio(p_ip text)
returns void
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  delete from cardapio_acessos_ip where created_at < now() - interval '1 hour';
  if p_ip is not null then
    v_hash := encode(digest(p_ip, 'sha256'), 'hex');
    if (select count(*) from cardapio_acessos_ip where ip_hash = v_hash) >= 30 then
      return;
    end if;
    insert into cardapio_acessos_ip (ip_hash) values (v_hash);
  end if;
  insert into cardapio_acessos default values;
end;
$$;

-- Funções só para o servidor (service role) --------------------------------------

revoke all on function entrar_login(text, text, text) from public, anon, authenticated;
revoke all on function sessao_valida(text, integer) from public, anon, authenticated;
revoke all on function registrar_acesso_cardapio(text) from public, anon, authenticated;
revoke all on function usuarios_nova_versao() from public, anon, authenticated;
grant execute on function entrar_login(text, text, text) to service_role;
grant execute on function sessao_valida(text, integer) to service_role;
grant execute on function registrar_acesso_cardapio(text) to service_role;

-- Para derrubar na hora todas as sessões de alguém (ex.: celular perdido):
--   update usuarios set versao = versao + 1 where lower(login) = 'sandra';
-- Para derrubar as sessões de todo mundo: troque o AUTH_SECRET na Vercel.

-- Recarrega o cache do schema do PostgREST (resolve o erro "relation not found")
notify pgrst, 'reload schema';
