# SandraBolos

App de gestão de pedidos da Torteria Sandra Zampoli (Next.js + Supabase).

## PWA (instalar na tela inicial)

O app é instalável de verdade — no Android o Chrome oferece "Instalar app"
(WebAPK, abre em tela cheia), e não apenas um atalho do navegador. As peças:

| Arquivo | Papel |
| --- | --- |
| `public/manifest.webmanifest` | nome, `display: standalone`, `start_url`, cores e ícones |
| `public/sw.js` | service worker — requisito do Chrome para o WebAPK e casca offline; **não** guarda página de dados em cache (ver "Salvar pedido") |
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

## Lista de clientes no pedido

O seletor "Cliente → Existente" do formulário de pedido lê a mesma tabela da
tela de Clientes, mas por outra rota. Um cliente cadastrado em `/clientes` não
aparecia no seletor: `revalidatePath("/clientes")` não alcança `/pedidos/novo`,
e o navegador continuava servindo o payload que o roteador do Next guardou na
primeira visita àquela rota.

| Arquivo | Papel |
| --- | --- |
| `src/app/clientes/actions.ts` | `revalidarTelasComClientes()` revalida `/clientes` **e** `/pedidos/novo` ao criar/editar; `listarClientesAction()` devolve a lista para o formulário |
| `src/app/pedidos/PedidoForm.tsx` | relê a lista ao abrir o formulário e oferece "Recarregar" — cobre também o cadastro feito em outra aba ou outro celular |

## Salvar pedido

Sintoma relatado: em alguns aparelhos a pessoa salvava o pedido e ele sumia.
Eram três causas somadas, todas invisíveis para quem usa:

1. **Service worker devolvendo página velha.** As navegações eram gravadas no
   cache e servidas de lá sempre que a rede passava de 8s. Num celular lento a
   lista de pedidos vinha de horas atrás, com cara de lista atual — o pedido
   estava gravado no banco, mas fora da tela. Hoje navegação vem sempre da
   rede; sem rede aparece a casca offline, que não finge ter dado.
2. **Falha de gravação sem aviso.** A action era chamada dentro de
   `startTransition(async …)` sem `try/catch`: quando a requisição nem
   completava (sinal caindo, função derrubada por tempo), a rejeição não era
   tratada, o botão voltava ao normal e nada aparecia na tela.
3. **Itens perdidos em silêncio.** O `insert` em `itens_pedido` não tinha o
   erro conferido: o pedido nascia sem item nenhum e com valor zerado.

| Arquivo | Papel |
| --- | --- |
| `public/sw.js` | navegação só da rede; cache apenas para estáticos com hash na URL |
| `src/app/pedidos/PedidoForm.tsx` | `try/catch` com mensagem na tela, estado próprio de salvamento (o `isPending` da transição não cobre o `await`, então o botão não travava o segundo toque) e "Abrir pedido" quando o pedido existe mas terminou com aviso — tentar de novo criaria um segundo |
| `src/components/FabPedido.tsx` | mesmo tratamento no "Pedido Rápido" |
| `src/app/pedidos/actions.ts` | erro do `insert` dos itens devolvido junto com o id do pedido criado |

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

## Tempo até o dado aparecer

Três mecanismos trabalham juntos para a tela não ficar esperando. Medido contra
um Supabase falso com 120 ms de latência por consulta.

### Uma única rodada de consultas por tela

Nenhuma página espera uma consulta para disparar a próxima. O caso que mais
doía era a tela de detalhe do pedido, que buscava o pedido e só então imagens,
itens e catálogo — mas nenhuma dessas três depende da linha do pedido (duas
filtram por `params.id`, a outra por `ativo = true`).

| | consultas | rodadas | tempo |
| --- | --- | --- | --- |
| antes | 4 | 2 | 264 ms |
| depois | 3 | 1 | 141 ms |

Ao mexer aqui, a pergunta é sempre: esta consulta **precisa** do resultado da
anterior? Se não, ela entra no mesmo `Promise.all`.

### Cache dos dados de apoio (`src/lib/dadosDeApoio.ts`)

Catálogo, clientes, categorias e configuração do cardápio aparecem em quase toda
tela e mudam de longe em longe. Passam pelo Data Cache do Next, com `revalidateTag`
nas actions que gravam.

| Tela | 1ª visita | Revisita |
| --- | --- | --- |
| `/produtos` | 3 consultas · 149 ms | **0 consultas · 16 ms** |
| `/configuracoes` | 145 ms | **0 consultas · 18 ms** |
| `/pedidos/novo` | 140 ms | **0 consultas · 14 ms** |
| `/financeiro` | 5 consultas | 4 consultas |

Duas regras ao mexer:

- **toda escrita numa tabela cacheada precisa chamar `invalidarDadosDeApoio`**
  com a tag correspondente, senão a tela abre com dado velho. As tags derrubam
  só o que devem — invalidar `produtos` não rebusca categorias nem o cardápio;
- a leitura cacheada **lança** em caso de erro em vez de devolver `{ error }`.
  É de propósito: `unstable_cache` não guarda o que lançou, e uma falha de rede
  cacheada deixaria o aviso de "sem conexão" preso na tela por cinco minutos
  depois de a internet voltar. O `revalidate` de 5 min é só rede de segurança
  para alteração feita fora do app (no painel do Supabase, por exemplo).

### Cache de navegação (`staleTimes` em `next.config.mjs`)

O padrão do App Router para rota dinâmica é 0: voltar para a tela anterior, ou
alternar entre as abas de Comercial, refazia a requisição inteira. Com 30 s a
volta é instantânea. As actions chamam `revalidatePath`, que limpa esse cache,
então gravação feita no app derruba a entrada na hora — o prazo só cobre ir e
voltar em poucos segundos.

Este é o mesmo cache citado em **Lista de clientes no pedido**, então vale ser
explícito sobre o limite: os 30 s valem para navegação sem gravação. Alteração
feita fora deste app — outra aba, outro aparelho — não é alcançada por
`revalidatePath`, e é por isso que o formulário de pedido relê a lista de
clientes ao abrir em vez de confiar no payload da rota. Para desligar o prazo,
basta `dynamic: 0`.

### Esqueletos por tela

Cada rota tem o `loading.tsx` com a forma do que vai chegar. Sem ele a tela
herda o esqueleto do segmento pai — detalhe de pedido piscava a lista, Toppers
piscava a grade do dashboard — e a troca de forma faz parecer mais lento do que é.
