# SandraBolos

App de gestão de pedidos da Torteria Sandra Zampoli (Next.js + Supabase).

## PWA (instalar na tela inicial)

O app é instalável de verdade — no Android o Chrome oferece "Instalar app"
(WebAPK, abre em tela cheia), e não apenas um atalho do navegador. As peças:

| Arquivo | Papel |
| --- | --- |
| `public/manifest.webmanifest` | nome, `display: standalone`, `start_url`, cores e ícones |
| `public/sw.js` | service worker — requisito do Chrome para o WebAPK e casca offline |
| `src/components/InstalarApp.tsx` | registra o SW e mostra o convite de instalação |
| `public/icon-*.png`, `public/apple-touch-icon.png` | ícones gerados a partir de `public/logo.jpg` |

Para trocar o logo: substitua `public/logo.jpg` e rode

```bash
node scripts/gerar-icones-pwa.mjs
```

Os PNGs precisam ser opacos (sem transparência) — o iOS descarta um
`apple-touch-icon` com canal alfa e mostra um monograma no lugar do ícone.

## Falhas de conexão

Quando a requisição ao Supabase não chega a ser respondida (celular sem sinal,
DNS, projeto fora do ar), o supabase-js **não lança exceção**: devolve um erro
cujo `message` é o texto cru do fetch — `TypeError: fetch failed` no servidor,
`TypeError: Failed to fetch` no navegador. Esse texto aparecia direto na tela.

| Arquivo | Papel |
| --- | --- |
| `src/lib/erros.ts` | `mensagemErro()` traduz falhas de rede/timeout para português; erros do banco continuam com o texto original |
| `src/lib/supabaseFetch.ts` | prazo de 15s nas requisições dos clientes Supabase, para a tela não ficar pendurada |
| `src/components/AvisoConexao.tsx` | faixa de aviso nas telas de lista — sem ela um erro de rede vira lista vazia e R$ 0,00, que parece dado real |
| `src/components/PainelSemConexao.tsx` | telas de detalhe: em falha de rede mostra "tentar de novo" em vez de 404 ("pedido não encontrado") |
| `src/app/error.tsx` | rede de segurança para o que escapar, com botão de tentar de novo |
