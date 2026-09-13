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
