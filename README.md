# SandraBolos - Gestão de Pedidos

Sistema web interno para gestão de pedidos de bolos com:

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (banco + auth)

## Estrutura

- `app/` páginas e rotas API
- `components/` componentes de interface
- `lib/` integrações, auth e tipos
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

3. Preencha `.env.local` com URL e `anon key` do Supabase (opcionalmente `SUPABASE_SERVICE_ROLE_KEY` para APIs server-side com privilégios de escrita).

4. Execute o SQL de `supabase/schema.sql` no Supabase SQL Editor.

5. No Supabase Auth, crie um usuário (email/senha) para login interno.

6. Rode localmente:

```bash
npm run dev
```

## Fluxo inicial

1. Login com email/senha (Supabase Auth)
2. Criar cliente
3. Criar pedido com item
4. Listar pedidos
5. Atualizar status do pedido

## Deploy (Vercel)

- Use o preset padrão **Next.js**.
- Este repositório inclui `vercel.json` com `outputDirectory: .next` para evitar fallback incorreto em `public`.
- Se o projeto no dashboard estiver com `Output Directory = public`, limpe esse valor ou mantenha `.next`.

## Troubleshooting

- Se aparecer erro no browser sobre `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, configure essas variáveis no ambiente de deploy e faça redeploy.
- Um `404` em `/favicon.ico` é resolvido mantendo `public/favicon.ico` no projeto.

## Branding

- Logo principal em `public/logo.svg`.
- Ícones para web/app (`Android/iOS`) configurados via `app/icon.svg`, `app/apple-icon.svg` e `public/site.webmanifest`.
