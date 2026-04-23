# App Confeitaria — Especificação Final

Aplicativo **mobile-first** para gestão individual de pedidos de confeitaria, com foco em simplicidade, fluxo por etapas e cálculo de valor para produção.

## Objetivo

Gerenciar pedidos de forma prática com:
- controle por etapas (`novo → produzindo → feito → entregue`)
- registro de até 5 imagens de referência por pedido (Google Drive)
- cálculo de valor baseado na produção
- filtros e alertas para rotina diária

## Funcionalidades

### 1) Clientes

- Cadastro de cliente é opcional na navegação, mas **criado automaticamente** ao abrir um pedido novo.
- Campos obrigatórios:
  - `nome`
  - `telefone`

### 2) Pedidos

Campos gerais:
- `cliente_id`
- `data_entrega` (**obrigatório**)
- `tipo`: `bolo | doce | kit`
- `descricao` (livre)
- `topper`: `sim | nao | brinde`
- `status`

Campos condicionais por tipo:
- **BOLO**
  - `peso` (kg) obrigatório
- **DOCE**
  - `quantidade` obrigatória
- **KIT**
  - `peso` (kg) obrigatório
  - `quantidade` obrigatória

### 3) Imagens

Regras:
- até **5 imagens por pedido**
- armazenamento no **Google Drive**
- pasta criada automaticamente por pedido com estrutura:

```text
/Pedidos/{ano}/{mes}/PED-XXXX - Nome Cliente
```

Campos persistidos:
- `pedido_id`
- `file_id`
- `url`
- `nome_arquivo`

### 4) Etapas do Pedido (Status)

- `novo`
- `produzindo`
- `feito`
- `entregue`

Fluxo permitido:

```text
novo → produzindo → feito → entregue
```

### 5) Regra de valor na etapa **feito**

Aplicável para `tipo = bolo`.

Campos:
- `preco_por_kg`
- `valor_calculado`
- `preco_corrigido` (opcional)

Fórmula:

```text
valor_calculado = peso * preco_por_kg
```

Regra de valor final:
- se `preco_corrigido` estiver preenchido, `valor_final = preco_corrigido`
- senão, `valor_final = valor_calculado`

### 6) Etapa **entregue**

Campos:
- `valor_final` (derivado das regras da etapa feito)
- `valor_cobrado` (editável)

Regra inicial:

```text
valor_cobrado = valor_final
```

### 7) Controles

- Alertas:
  - vence amanhã
  - atrasado
- Filtros:
  - hoje
  - semana
  - atrasados
  - status
- Busca:
  - nome do cliente

### 8) Dashboard

Cards principais:
- pedidos de hoje
- em produção
- atrasados

### 9) UX

- Mobile-first
- Interface simples
- Campos dinâmicos por tipo de pedido
- Visualização em Kanban por status
- Operação intuitiva para uso individual

## Modelo de dados (Supabase)

O SQL base está em [`supabase/schema.sql`](supabase/schema.sql).

Resumo das tabelas:

- `clientes`
  - `id UUID PRIMARY KEY`
  - `nome TEXT`
  - `telefone TEXT`
  - `created_at TIMESTAMP`
- `pedidos`
  - `id UUID PRIMARY KEY`
  - `cliente_id UUID`
  - `data_entrega DATE`
  - `tipo TEXT`
  - `descricao TEXT`
  - `topper TEXT`
  - `peso NUMERIC`
  - `quantidade INTEGER`
  - `status TEXT`
  - `preco_por_kg NUMERIC`
  - `valor_calculado NUMERIC`
  - `preco_corrigido NUMERIC`
  - `valor_cobrado NUMERIC`
  - `created_at TIMESTAMP`
- `imagens_pedido`
  - `id UUID PRIMARY KEY`
  - `pedido_id UUID`
  - `file_id TEXT`
  - `url TEXT`
  - `nome_arquivo TEXT`
  - `created_at TIMESTAMP`

## Regras de negócio consolidadas

- `bolo` exige `peso`
- `doce` exige `quantidade`
- `kit` exige `peso` e `quantidade`
- fluxo obrigatório: `novo → produzindo → feito → entregue`
- máximo de 5 imagens por pedido

## Observação de implementação

Para garantir consistência, recomenda-se aplicar validações em dois níveis:
1. **Aplicação (UI/API):** bloqueio imediato de dados inválidos.
2. **Banco (constraints/triggers):** proteção contra inconsistências mesmo fora da interface.
