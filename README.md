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

## Importar imagens do pedido (Google Drive)

Sintoma relatado: ao adicionar uma foto de referência, a tela mostrava
`Drive: File not found: .` — um texto que não dizia nem qual pasta faltava nem
o que fazer a respeito. O erro vinha de duas armadilhas somadas:

1. **O 404 apontava o alvo errado.** `getOrCreateFolder()` procurava a pasta do
   ano com `files.list`, e essa chamada **não falha quando a pasta pai é
   inacessível** — devolve lista vazia. O código concluía "ainda não existe" e
   seguia para o `files.create`, que aí sim estourava 404. O ID no texto do erro
   era o da **pasta raiz**, não o do arquivo que se queria enviar.
2. **O 404 do Drive é ambíguo de propósito.** Para não revelar a existência de
   arquivos que você não pode ver, o Drive responde "não encontrado" tanto para
   pasta inexistente quanto para pasta existente **sem permissão**. Os dois
   problemas mais comuns — ID errado e pasta não compartilhada com a conta de
   serviço — chegavam à tela com exatamente o mesmo texto.

| Arquivo | Papel |
| --- | --- |
| `src/lib/googleDrive.ts` | `validarPastaRaiz()` confere a raiz com `files.get` **antes** de criar qualquer coisa, então a falha aparece na etapa certa; `descreveErroDrive()` traduz 404/403/401 e cota esgotada para instruções com o ID e o e-mail à vista; `normalizarIdPasta()` aceita URL colada, tira aspas e caracteres invisíveis, e rejeita `"."`/`""`/`"root"` |
| `src/app/api/upload-imagem/route.ts` | o ID salvo em `pedidos.drive_folder_id` é usado como está e pode ter envelhecido — pasta apagada no Drive (404) ou criada quando a raiz apontava para outro lugar (403). Nos dois casos a pasta é recriada sob a raiz atual e o envio repetido uma vez, senão trocar `GOOGLE_DRIVE_ROOT_FOLDER_ID` deixaria todo pedido antigo preso à configuração velha |
| `src/app/api/pedidos/route.ts` | o guard usava `GOOGLE_SERVICE_ACCOUNT_EMAIL` e ignorava quem configurou pelo JSON completo (a opção 1 do `.env.local.example`); agora usa `driveConfigurado()` |
| `src/app/api/test-drive/route.ts` | mostra o ID **normalizado** que o app usa de fato e o `client_email` que precisa receber o compartilhamento |

### Autenticar como um usuário, não como a conta de serviço

Conta de serviço **não tem espaço de armazenamento próprio**, e o arquivo que
ela envia fica no nome dela. Isso separa as duas operações de um jeito que
confunde: criar pastas funciona (pasta não ocupa bytes), e só o upload do
arquivo falha com 403. Dá a impressão de problema de permissão — a pasta do
pedido aparece no Drive, mas a foto nunca chega.

Compartilhar a pasta como Editor **não resolve**: permissão é sobre a pasta,
cota é sobre quem envia. As saídas são um Drive compartilhado (exige Google
Workspace — um Drive pessoal `@gmail.com` não cria) ou autenticar como um
usuário de verdade, via OAuth. É o que o app faz quando as variáveis
`GOOGLE_OAUTH_*` estão presentes: cada foto nasce no nome da pessoa autorizada e
ocupa o espaço que ela já paga.

`getDriveClient()` prefere OAuth e cai na conta de serviço só se as variáveis
OAuth faltarem — assim dá para voltar atrás sem mexer no código.

#### Configurar o OAuth (uma vez)

1. No Google Cloud, crie um **client OAuth** do tipo "Aplicativo para
   computador" e adicione `http://localhost:53682/` como URI de redirecionamento.
2. Na tela de consentimento, **publique o app como "In production"**. Em
   "Testing" o Google expira o refresh token a cada 7 dias e a importação volta
   a quebrar toda semana. Publicar é um botão; *verificação* é outra coisa, só
   exigida para tirar o aviso de "app não verificado" e para passar de 100
   usuários.
3. Rode a autorização, logado na conta dona do Drive:

   ```bash
   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... \
     node scripts/autorizar-drive.mjs
   ```

   O script sobe um servidor local, abre o consentimento e imprime o
   `GOOGLE_OAUTH_REFRESH_TOKEN`. O aviso de app não verificado é esperado:
   "Avançado" → "Acessar ... (não seguro)".
4. Guarde as três variáveis `GOOGLE_OAUTH_*` no ambiente do app.

O escopo é o `drive` completo, e não `drive.file`, porque `drive.file` só
enxerga o que o próprio app criou — com ele a pasta raiz que já existe ficaria
invisível.

### Configurar a pasta raiz

1. Crie a pasta no Drive e copie a URL da barra de endereços.
2. Coloque em `GOOGLE_DRIVE_ROOT_FOLDER_ID` — a URL inteira serve, o ID também.
3. Confira com `GET /api/test-drive?secret=<TEST_DRIVE_SECRET>`. A resposta traz
   `modo` (`oauth` ou `conta-de-servico`), `identidade` (o e-mail que o Google
   confirmou), `armazenamento` (usado/limite) e `pastaRaiz.podeCriarSubpastas`.

Esse diagnóstico vive em `diagnosticarDrive()`, junto do código que o app usa de
verdade. Quando morava na rota, ele conferia variáveis que o app não lia mais e
dizia "tudo certo" enquanto o upload falhava.

`"root"` não é aceito como pasta raiz: com conta de serviço é o Drive dela
própria, que não tem espaço. Para usar um Drive compartilhado, aponte para uma
pasta dentro dele; as chamadas já mandam `supportsAllDrives`.
