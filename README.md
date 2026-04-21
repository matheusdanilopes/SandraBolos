# SandraBolos - Gestão de Pedidos

Sistema web interno para gestão de pedidos de bolos com:

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (banco + auth)

## Estrutura

- `app/` páginas e rotas API
- `components/` componentes de interface
- `lib/` integrações e tipos
- `services/` serviços de acesso a dados
- `supabase/schema.sql` schema inicial

## Configuração

1. Instale dependências:

```bash
npm install
```

2. Configure variáveis de ambiente:

```bash
cp .env.example .env.local
```

Preencha com as credenciais do seu projeto Supabase.

3. Execute o schema SQL no Supabase (`supabase/schema.sql`).

4. Rode localmente:

```bash
npm run dev
```

## Funcionalidades iniciais

- Criar cliente
- Criar pedido com item
- Listar pedidos
- Atualizar status do pedido
