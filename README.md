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

## Peso das telas

O app é usado no celular, muitas vezes no 4G da loja. Duas decisões de
performance mudam o que chega ao aparelho e valem ser lembradas antes de mexer
nas consultas.

### Colunas explícitas nas listas

`src/lib/consultas.ts` guarda as colunas que cada tela realmente desenha. As
listas usam essas constantes em vez de `select("*")`, que trazia preço por kg,
valor cobrado, id da pasta do Drive e o telefone do cliente — nada disso é
mostrado ali.

| Tela | Por linha | Redução |
| --- | --- | --- |
| `/pedidos` | 622 → 396 bytes | −36% |
| `/` (dashboard) | 622 → 358 bytes | −42% |
| `/toppers` | 622 → 217 bytes | −65% |

Duas armadilhas ao editar:

- as constantes são **literais de string** de propósito. O `select()` do
  supabase-js é tipado em cima do texto da consulta; montar a lista em tempo de
  execução faz o tipo do resultado virar erro de parser;
- coluna que não está na lista **não chega** ao componente. O tipo reclama
  (`PedidoComCliente.clientes` tem só `nome`; o telefone vive em
  `PedidoComClienteContato`, usado na tela de detalhe), mas é preciso lembrar de
  adicionar a coluna ao usar um campo novo.

Um efeito colateral: a consulta passa a depender de a migration estar aplicada.
Com `select("*")`, uma coluna faltando virava `undefined`; com lista explícita,
o PostgREST recusa a consulta inteira. Rode as migrations antes de subir.

### Recorte de histórico em `/pedidos`

A lista carregava **todos** os pedidos de toda a história a cada abertura, sem
limite. Agora o padrão é: tudo que está em aberto (qualquer data) mais o que já
foi entregue ou cancelado nos últimos `MESES_DE_HISTORICO` meses.

O corte é por idade do que já acabou, nunca por quantidade — um pedido atrasado
de um ano continua aparecendo, senão sumiria justamente do filtro "Atrasados".
A contagem abaixo dos filtros diz qual recorte está valendo e o link
`?historico=tudo` carrega a história completa.

A tela de Toppers ficou **sem** recorte de propósito: o total "a pagar
fornecedores" é operacional e vale para sempre, então esconder toppers antigos
não pagos apagaria dívida da tela.
