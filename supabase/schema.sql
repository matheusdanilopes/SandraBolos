-- App Confeitaria - Supabase schema
-- Requisitos: extensão pgcrypto para gen_random_uuid()

create extension if not exists pgcrypto;

-- CLIENTES
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  created_at timestamp not null default now()
);

-- PEDIDOS
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  data_entrega date not null,
  tipo text not null check (tipo in ('bolo', 'doce', 'kit')),
  descricao text,
  topper text not null default 'nao' check (topper in ('sim', 'nao', 'brinde')),
  peso numeric,
  quantidade integer,
  status text not null default 'novo' check (status in ('novo', 'produzindo', 'feito', 'entregue')),
  preco_por_kg numeric,
  valor_calculado numeric,
  preco_corrigido numeric,
  valor_cobrado numeric,
  created_at timestamp not null default now(),

  -- Regras condicionais por tipo
  constraint pedidos_tipo_campos_chk check (
    (tipo = 'bolo' and peso is not null and quantidade is null)
    or (tipo = 'doce' and quantidade is not null and peso is null)
    or (tipo = 'kit' and peso is not null and quantidade is not null)
  )
);

-- IMAGENS POR PEDIDO
create table if not exists public.imagens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  file_id text not null,
  url text not null,
  nome_arquivo text not null,
  created_at timestamp not null default now()
);

-- Índices úteis
create index if not exists idx_pedidos_data_entrega on public.pedidos (data_entrega);
create index if not exists idx_pedidos_status on public.pedidos (status);
create index if not exists idx_clientes_nome on public.clientes (nome);
create index if not exists idx_imagens_pedido_pedido_id on public.imagens_pedido (pedido_id);

-- Trigger: cálculo de valores para BOLO quando status = feito/entregue
create or replace function public.trg_pedidos_calcular_valor_bolo()
returns trigger
language plpgsql
as $$
declare
  v_valor_final numeric;
begin
  if new.tipo = 'bolo' then
    if new.preco_por_kg is not null and new.peso is not null then
      new.valor_calculado := new.peso * new.preco_por_kg;
    end if;

    if new.preco_corrigido is not null then
      v_valor_final := new.preco_corrigido;
    else
      v_valor_final := new.valor_calculado;
    end if;

    -- Na etapa entregue, inicializa valor_cobrado com valor final se vier nulo
    if new.status = 'entregue' and new.valor_cobrado is null then
      new.valor_cobrado := v_valor_final;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists pedidos_calcular_valor_bolo on public.pedidos;
create trigger pedidos_calcular_valor_bolo
before insert or update on public.pedidos
for each row
execute function public.trg_pedidos_calcular_valor_bolo();

-- Trigger: limitar máximo de 5 imagens por pedido
create or replace function public.trg_imagens_pedido_limite_5()
returns trigger
language plpgsql
as $$
declare
  v_total integer;
begin
  select count(*) into v_total
  from public.imagens_pedido
  where pedido_id = new.pedido_id;

  if v_total >= 5 then
    raise exception 'Limite de 5 imagens por pedido excedido.';
  end if;

  return new;
end;
$$;

drop trigger if exists imagens_pedido_limite_5 on public.imagens_pedido;
create trigger imagens_pedido_limite_5
before insert on public.imagens_pedido
for each row
execute function public.trg_imagens_pedido_limite_5();
