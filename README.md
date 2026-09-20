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

## Escolher cliente e produto no lançamento

Os dois campos do formulário de pedido eram `<select>` nativos: no celular
viravam uma roda com dezenas de nomes em ordem alfabética, sem busca e sem o
telefone à vista para distinguir dois clientes de mesmo nome. Agora os dois são
seletores com busca, e o que foi escolhido fica resumido em um cartão com botão
de "Trocar" — o resto da lista sai da frente da quantidade e do preço.

| Arquivo | Papel |
| --- | --- |
| `src/app/pedidos/SeletorCliente.tsx` | busca por nome **ou** telefone no mesmo campo (acentos ignorados); lista sem busca mostra os 30 primeiros; sem resultado leva ao cadastro já com o que foi digitado |
| `src/app/pedidos/SeletorProduto.tsx` | busca por nome e descrição (é na descrição que fica o sabor) mais chips de categoria; cada linha mostra unidade e preço padrão |
| `src/app/pedidos/novo/page.tsx` | passa produtos com a categoria (`categorias_produto(nome, ordem)`) e a lista de categorias para os chips |
| `src/app/produtos/ProdutosClient.tsx` | mesma busca e chips no catálogo, que não tinha filtro nenhum |

## Excluir pedido e cliente

Antes só o rascunho podia ser apagado; o pedido lançado por engano ficava para
sempre, e o cadastro de cliente não tinha como sair da lista.

| Regra | Onde |
| --- | --- |
| Pedido em **rascunho** ou **novo** pode ser excluído de vez (itens, imagens e ficha de topper vão junto). De "produzindo" em diante o caminho é cancelar, que preserva o histórico | `excluirPedidoAction()` em `src/app/pedidos/actions.ts`, botão em `src/app/pedidos/[id]/StatusActions.tsx` |
| Cliente só pode ser excluído **sem nenhum pedido vinculado** — `pedidos.cliente_id` é `on delete set null`, então apagar um cliente com pedidos não daria erro: deixaria pedidos órfãos, sem histórico e sem telefone. Com pedidos, a ficha mostra o motivo no lugar do botão | `excluirClienteAction()` em `src/app/clientes/actions.ts`, botão em `src/app/clientes/[id]/ExcluirCliente.tsx` |

## Calendário do dashboard

O dashboard mostrava a agenda só como lista de dias com pedido — para saber
quanto trabalho cai numa semana era preciso rolar a tela e contar. A "Agenda de
Entregas" põe mês e semana em grade, com a quantidade de pedidos em cada dia;
tocar num dia abre quem é e em que etapa está.

| Decisão | Por quê |
| --- | --- |
| Busca própria no `page.tsx`, com `.neq("status", "cancelado")` | a lista do dashboard traz só pedidos ativos (sem entregue nem cancelado). Reaproveitá-la deixaria os dias já entregues com contagem zero, que parece dia livre. Só cancelado fica de fora — não é trabalho a fazer nem histórico de entrega |
| Recorte `PedidoCalendario` em vez de `select("*")` | a grade precisa de data, etapa, tipo, hora e nome; a busca não tem recorte de data (a pessoa navega para qualquer mês), então vale trazer poucas colunas de todos os pedidos |
| Tom do número cresce com o volume (1–2, 3–4, 5+) e a semana ganha barra proporcional | a carga do período aparece antes de ler número por número |
| Contagem do rodapé ignora as sobras das semanas vizinhas | "53 pedidos no mês" conta o mês, não os dias de outro mês que completam a primeira e a última linha da grade |

| Arquivo | Papel |
| --- | --- |
| `src/lib/calendario.ts` | dias do mês/semana, navegação, rótulo do período e agrupamento por `data_entrega` — dividido com o calendário da tela de Pedidos, que fazia as mesmas contas inline |
| `src/app/DashboardCalendario.tsx` | a grade em si: alternância mês/semana, atalho "Hoje" quando o período não contém o dia atual e o painel do dia escolhido |
| `src/app/page.tsx` | busca do calendário junto das outras (mesmo `Promise.all`, mesmo aviso de falha de conexão) |

## Precificação por item

Sintoma relatado: **"quando há mais de um bolo não permite alterar os dois,
apenas um"**. A precificação do "Feito" era um par único no pedido — `peso` ×
`preco_por_kg` —, então um pedido com dois bolos só tinha onde registrar o peso
real de um. O peso do outro continuava sendo o combinado na venda, e o valor
saía errado sem nada na tela indicando isso.

Agora, quando o pedido tem itens lançados, a precificação é item a item: cada
linha tem o seu peso (ou quantidade) real e o seu preço, e o pedido recebe a
soma — que é de onde o financeiro lê.

Os três campos de cada linha — quantidade, preço unitário e valor — são a mesma
conta vista de ângulos diferentes, e qual deles se sabe primeiro muda com o
pedido: às vezes o bolo é pesado e o preço do kg é o de tabela (sai o valor),
às vezes o valor já foi combinado com a cliente e o que falta é saber em quanto
ficou o kg. Preencher dois preenche o terceiro, nas duas direções.

| Decisão | Por quê |
| --- | --- |
| Colunas novas (`quantidade_real`, `preco_real`, `valor_real`) em vez de sobrescrever `quantidade`/`preco_unitario`/`valor_total` | o que foi combinado na venda continua sendo a referência da regra dos 300g — sem ele não há como saber se o bolo passou do pedido |
| Regra dos 300g aplicada **por item** | o teto é o peso daquele bolo; somar os pesos do pedido deixaria um bolo muito acima compensar outro abaixo |
| Só itens por peso entram na regra | doce vendido por cento ou unidade não tem folga de peso: o que foi apurado é o que se cobra |
| Soma gravada em `valor_calculado` (sem corte) e `preco_corrigido` (com corte) | são as mesmas colunas da precificação antiga, então financeiro, dashboard e valor estimado seguem lendo o mesmo lugar |
| `preco_por_kg` do pedido fica nulo com mais de um item | não existe "o preço por kg" de um pedido com dois bolos de preços diferentes; o preço de cada um está na linha dele |
| Pedido sem item mantém a tela antiga | pedido lançado antes do catálogo (ou rascunho) não tem item para precificar |
| Lista de itens mostra o real quando existe | depois de registrar 1,650 kg, a lista continuar mostrando 1,500 kg faria a tela contradizer o que acabou de ser gravado |
| Preço e valor se recalculam nas duas direções, com o peso como base | era só peso × preço = valor: quem fechava o preço pela cliente ("esse sai por R$ 150") tinha que dividir de cabeça para achar o preço do kg |
| `ancora` guarda o último dos dois que foi digitado | corrigir o peso depois precisa recalcular o **outro** campo; sem isso, ajustar o peso sobrescreveria o valor que a pessoa acabou de combinar |
| Preço unitário derivado com 4 casas (`numeric(10,4)`) | R$ 150 em 1,8 kg dá R$ 83,3333/kg — arredondar para centavos faria o valor de volta sair R$ 150,01 |
| Campo apagado não apaga o outro | quem limpa o valor para redigitar ainda tem o preço na tela, e o item segue valendo o que valia até o número novo chegar |

| Arquivo | Papel |
| --- | --- |
| `supabase/migrations/013_add_precificacao_itens.sql` | as três colunas novas em `itens_pedido` — **precisa ser executada no SQL Editor do Supabase** |
| `src/lib/precificacao.ts` | a conta por unidade de medida, a volta dela (`precoUnitarioDoValor`) e a regra dos 300g, agora num lugar só (`PedidoForm` e `ItensForm` tinham cópias da mesma conta) |
| `src/app/pedidos/[id]/PrecificacaoForm.tsx` | formulário por item com os três campos ligados, aviso de corte em cada linha e a soma no rodapé; os formulários de pedido sem item (bolo e doce) usam os mesmos campos ligados |
| `src/app/pedidos/[id]/actions.ts` | `salvarPrecificacaoItensAction` grava os itens primeiro e só então o total do pedido |

## Tela de Financeiro

Revisão da tela inteira. O ponto de partida era a pergunta "pedido cancelado
entra nas contas?" — entrava em um lugar, e a conferência puxou o resto.

### Pedido cancelado

Receita, ticket médio, a receber e a evolução mensal já saíam limpos: as buscas
filtram `status = 'entregue'` e `status = 'feito'`, e cancelado não é nenhum dos
dois. O furo estava no topper.

| Onde | O que acontecia | O que passa a valer |
| --- | --- | --- |
| "A pagar fornecedores" | a busca de `toppers_pedido` não olhava o pedido: o topper de um pedido cancelado continuava cobrado como dívida em aberto — e a tela de Toppers já não mostra esse pedido desde `143c4c5`, então não havia nem como quitá-la | `pedidos(status)` vem junto e o cancelado sai da conta; o que saiu aparece em uma linha de nota, para o total não mudar sem explicação |
| "Pago no período" | idem | continua contando: o dinheiro saiu antes do cancelamento. Quando há valor assim, a nota diz quanto e por quê |
| Toda a tela | o cancelado sumia sem deixar rastro — mês com dois cancelamentos parecia só um mês fraco | bloco "N pedidos cancelados" (fechado por padrão) com o que deixou de entrar, listando os pedidos |

### Números que não fechavam

| Correção | Por quê |
| --- | --- |
| Ticket médio divide pelas entregas **com valor** | dividir por todas as entregas jogava a média para baixo a cada pedido sem valor registrado, como se o preço de venda tivesse caído |
| Margem aparece com receita > 0 | exigia custo lançado: o período sem gasto nenhum — quando a margem é a melhor possível — ficava sem margem na tela |
| Entrega com valor `0` conta como "sem valor" | é o que o campo vale quando ninguém preencheu; mostrar "R$ 0,00" com o ✓ de conferido escondia justamente a entrega a acertar |
| Aviso de entregas sem valor diz o efeito e o caminho | antes só contava os pedidos; agora diz que receita e ticket estão menores que o real e onde corrigir |
| "A Receber" avisa que não depende do período | somar "a receber" à receita do período não bate com nada — são recortes diferentes, e nada na tela dizia isso |

### Custos

| Correção | Por quê |
| --- | --- |
| Título e vazio seguem o período (`periodo.label`) | eram fixos em "Custos do Mês" / "este mês", mas a lista obedece ao seletor lá de cima — em um recorte de 6 meses o rótulo mentia |
| Data do formulário nasce dentro do período | com período passado na tela, o custo lançado "hoje" era gravado e sumia no mesmo instante, com cara de gravação falhada |
| Aviso quando a data escolhida cai fora do período | lançar gasto de outro mês é legítimo; sumir sem explicação não |
| Exclusão pede confirmação e mostra erro | um toque no × ao lado do valor apagava o lançamento sem volta, e a falha de rede era descartada em silêncio |
| Card de custos mostra a composição | o KPI soma lançamentos + toppers pagos, e o bloco de baixo só os lançamentos: dois totais diferentes com nomes parecidos |

### Telas longas e dados velhos

| Arquivo | Papel |
| --- | --- |
| `src/app/financeiro/ListaFinanceira.tsx` | listas de pedidos com corte em 8 linhas e "ver os N restantes" — em 6 meses passavam de cem linhas e empurravam toppers e evolução para fora do alcance |
| `src/app/financeiro/CanceladosSection.tsx` | bloco recolhível dos cancelados do período |
| `src/app/pedidos/[id]/actions.ts` | `revalidatePath("/financeiro")` ao cancelar, andar/voltar status e gravar preço ou valor de entrega — são exatamente as ações que mudam receita e a receber, e sem elas o financeiro ficava mostrando o total anterior |
| `src/app/toppers/actions.ts` | idem para salvar ficha, marcar etapa e registrar/desfazer pagamento do topper |

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

Duas outras consultas também ficam sem recorte, e pelo mesmo tipo de razão — o
recurso precisa do conjunto inteiro: o calendário do dashboard (a pessoa navega
para qualquer mês; ver **Calendário do dashboard**) e o total de toppers acima.
Nos dois casos a contrapartida é trazer poucas colunas de todos os pedidos, não
todas as colunas de poucos.

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
