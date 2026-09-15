import { google } from "googleapis";
import type { drive_v3 } from "googleapis";
import { PassThrough } from "stream";

/**
 * Integração com o Google Drive para as imagens de referência do pedido.
 *
 * O erro que motivou a revisão deste módulo era `Drive: File not found: <id>.`
 * na hora de importar uma foto. A causa não estava no upload: `files.list` NÃO
 * falha quando a pasta pai é inacessível — devolve lista vazia. O código então
 * seguia para o `files.create`, que é quem estourava o 404, apontando a pasta
 * raiz e não o arquivo. E o Drive responde 404 ("não existe") em vez de 403
 * ("sem permissão") quando a conta de serviço não enxerga a pasta, então o
 * mesmo texto cobria dois problemas bem diferentes:
 *
 *   1. `GOOGLE_DRIVE_ROOT_FOLDER_ID` com valor errado (URL colada inteira,
 *      aspas, ID de outro arquivo);
 *   2. pasta raiz que existe, mas nunca foi compartilhada com o e-mail da
 *      conta de serviço.
 *
 * Agora a pasta raiz é conferida com `files.get` antes de qualquer criação, e
 * toda falha do Drive passa por `descreveErroDrive()`, que diz qual ID falhou,
 * em que etapa, e qual e-mail precisa receber o compartilhamento.
 */

/** IDs reais do Drive: 25+ caracteres de [A-Za-z0-9_-]. */
const PADRAO_ID_DRIVE = /^[A-Za-z0-9_-]{25,}$/;

/** Formatos de URL do Drive de onde dá para extrair o ID. */
const PADROES_URL_DRIVE = [
  /\/folders\/([A-Za-z0-9_-]{25,})/,
  /\/file\/d\/([A-Za-z0-9_-]{25,})/,
  /[?&]id=([A-Za-z0-9_-]{25,})/,
];

type DetalheErro = { reason?: string; message?: string };

/**
 * O googleapis nem sempre promove `errors`/`message` da resposta para o topo do
 * erro — dependendo da versão eles só existem em `response.data.error`. Ler um
 * só dos dois lugares foi o que fez uma falha de cota de armazenamento cair no
 * ramo genérico de 403 e sair na tela como "compartilhe a pasta", mandando
 * resolver uma permissão que já estava correta.
 */
type ErroDrive = {
  code?: number | string;
  status?: number;
  message?: string;
  errors?: DetalheErro[];
  response?: {
    status?: number;
    data?: { error?: { code?: number; message?: string; errors?: DetalheErro[] } };
  };
};

/**
 * Aceita o ID puro ou a URL da pasta copiada da barra de endereços — é o que a
 * pessoa tem à mão ao configurar. Remove aspas e espaços invisíveis, que
 * passavam despercebidos na variável de ambiente e viravam 404 no Drive.
 */
export function normalizarIdPasta(valor: string | undefined | null): string | null {
  if (!valor) return null;

  let limpo = valor.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  if (
    (limpo.startsWith('"') && limpo.endsWith('"')) ||
    (limpo.startsWith("'") && limpo.endsWith("'"))
  ) {
    limpo = limpo.slice(1, -1).trim();
  }
  if (!limpo) return null;

  for (const padrao of PADROES_URL_DRIVE) {
    const achado = limpo.match(padrao);
    if (achado) return achado[1];
  }

  return PADRAO_ID_DRIVE.test(limpo) ? limpo : null;
}

function credenciaisDoAmbiente(): { client_email: string; private_key: string } {
  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (json) {
    let parsed: { client_email?: string; private_key?: string };
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error(
        "GOOGLE_APPLICATION_CREDENTIALS_JSON não é um JSON válido. " +
          "Cole o conteúdo completo do arquivo .json da conta de serviço."
      );
    }
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error(
        "GOOGLE_APPLICATION_CREDENTIALS_JSON não tem 'client_email' e/ou 'private_key'."
      );
    }
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  let rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error(
      "Credenciais do Google Drive não configuradas. Defina " +
        "GOOGLE_APPLICATION_CREDENTIALS_JSON, ou o par " +
        "GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY."
    );
  }

  if (rawKey.startsWith('"') && rawKey.endsWith('"')) rawKey = rawKey.slice(1, -1);
  return { client_email: email, private_key: rawKey.replace(/\\n/g, "\n") };
}

/** A configuração do Drive está completa? Usado para pular a integração sem quebrar o pedido. */
export function driveConfigurado(): boolean {
  const temCredencial =
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    (!!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && !!process.env.GOOGLE_PRIVATE_KEY);
  return temCredencial && !!normalizarIdPasta(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID);
}

function getDriveClient(): { drive: drive_v3.Drive; contaDeServico: string } {
  const credentials = credenciaisDoAmbiente();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return {
    drive: google.drive({ version: "v3", auth }),
    contaDeServico: credentials.client_email,
  };
}

function razaoDoErro(erro: unknown): string {
  const e = erro as ErroDrive;
  return e?.errors?.[0]?.reason ?? e?.response?.data?.error?.errors?.[0]?.reason ?? "";
}

/** O texto que o próprio Drive mandou — a pista mais confiável quando `reason` falta. */
function mensagemDoDrive(erro: unknown): string {
  const e = erro as ErroDrive;
  return (e?.response?.data?.error?.message ?? e?.message ?? "").trim();
}

function statusDoErro(erro: unknown): number | undefined {
  const e = erro as ErroDrive;
  for (const bruto of [e?.code, e?.status, e?.response?.status, e?.response?.data?.error?.code]) {
    if (typeof bruto === "number") return bruto;
    if (typeof bruto === "string" && /^\d+$/.test(bruto)) return Number(bruto);
  }
  return undefined;
}

/**
 * Conta de serviço não tem espaço próprio no Drive: ela cria pastas (não ocupam
 * bytes), mas o primeiro upload de arquivo bate na cota. Checa `reason` e também
 * o texto, porque o `reason` nem sempre chega.
 */
function ehFaltaDeCota(erro: unknown): boolean {
  if (razaoDoErro(erro) === "storageQuotaExceeded") return true;
  return /storage quota|storagequotaexceeded|do not have storage/i.test(mensagemDoDrive(erro));
}

/**
 * Traduz a falha do Drive para uma instrução acionável. O 404 do Drive é
 * ambíguo de propósito (não revela a existência de arquivos que você não pode
 * ver), então aqui ele vira as duas hipóteses reais, com o ID e o e-mail à
 * vista — que era exatamente o que faltava em "File not found: .".
 */
export function descreveErroDrive(
  erro: unknown,
  contexto: { etapa: string; id?: string; contaDeServico?: string }
): string {
  const status = statusDoErro(erro);
  const razao = razaoDoErro(erro);
  const alvo = contexto.id ? `"${contexto.id}"` : "(ID vazio)";
  const conta = contexto.contaDeServico ?? "a conta de serviço";

  if (status === 404 || razao === "notFound") {
    return (
      `${contexto.etapa}: o Google Drive não encontrou a pasta ${alvo}. ` +
      `Confira se GOOGLE_DRIVE_ROOT_FOLDER_ID tem o ID correto e se a pasta ` +
      `foi compartilhada como Editor com ${conta}. ` +
      `O Drive responde "não encontrado" também quando a pasta existe mas a ` +
      `conta de serviço não tem acesso a ela.`
    );
  }

  if (ehFaltaDeCota(erro)) {
    return (
      `${contexto.etapa}: a conta de serviço ${conta} não tem espaço de ` +
      `armazenamento próprio, e arquivos que ela envia ficam no nome dela. ` +
      `Criar pastas funciona (não ocupam espaço), mas o arquivo não sobe. ` +
      `A saída é um Drive compartilhado (Shared Drive) ou enviar em nome de um ` +
      `usuário de verdade, via OAuth.`
    );
  }

  if (status === 403) {
    // Sem `reason` conhecido não dá para afirmar a causa. A versão anterior
    // chutava "compartilhe a pasta" para todo 403 e mandava arrumar uma
    // permissão que já estava certa — então aqui vai o texto do próprio Drive,
    // com a hipótese mais comum como sugestão, não como diagnóstico.
    const original = mensagemDoDrive(erro);
    return (
      `${contexto.etapa}: o Google Drive recusou a operação na pasta ${alvo}` +
      `${razao ? ` (${razao})` : ""}. ` +
      `${original ? `Resposta do Drive: "${original}". ` : ""}` +
      `Se ${conta} ainda não tem acesso de Editor a essa pasta, esse é o ` +
      `primeiro lugar para conferir.`
    );
  }

  if (status === 401) {
    return (
      `${contexto.etapa}: as credenciais do Google Drive foram recusadas. ` +
      `Confira GOOGLE_APPLICATION_CREDENTIALS_JSON (ou o par e-mail + chave privada).`
    );
  }

  const message = (erro as ErroDrive)?.message;
  return `${contexto.etapa}: ${message?.trim() || "falha desconhecida no Google Drive"}`;
}

/**
 * Confere a pasta raiz antes de tentar criar qualquer coisa dentro dela.
 * Sem isso o primeiro erro só aparecia no `files.create`, apontando um ID que
 * não dizia nada sobre a origem do problema.
 */
async function validarPastaRaiz(
  drive: drive_v3.Drive,
  rootId: string,
  contaDeServico: string
): Promise<void> {
  let pasta: drive_v3.Schema$File;
  try {
    const res = await drive.files.get({
      fileId: rootId,
      fields: "id,name,mimeType,trashed,capabilities(canAddChildren)",
      supportsAllDrives: true,
    });
    pasta = res.data;
  } catch (erro) {
    throw new Error(
      descreveErroDrive(erro, {
        etapa: "Pasta raiz do Drive",
        id: rootId,
        contaDeServico,
      })
    );
  }

  if (pasta.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error(
      `GOOGLE_DRIVE_ROOT_FOLDER_ID aponta para "${pasta.name ?? rootId}", que não é ` +
        `uma pasta (${pasta.mimeType ?? "tipo desconhecido"}). Use o ID de uma pasta.`
    );
  }
  if (pasta.trashed) {
    throw new Error(
      `A pasta raiz "${pasta.name ?? rootId}" está na lixeira do Drive. ` +
        `Restaure-a ou aponte GOOGLE_DRIVE_ROOT_FOLDER_ID para outra pasta.`
    );
  }
  if (pasta.capabilities?.canAddChildren === false) {
    throw new Error(
      `${contaDeServico} enxerga a pasta "${pasta.name ?? rootId}", mas só como ` +
        `leitor — não consegue criar pastas dentro dela. Troque o ` +
        `compartilhamento para Editor.`
    );
  }
}

function idRaizConfigurado(): string {
  const bruto = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const rootId = normalizarIdPasta(bruto);
  if (!rootId) {
    throw new Error(
      `GOOGLE_DRIVE_ROOT_FOLDER_ID inválido ou não configurado: "${bruto ?? ""}". ` +
        "Use o ID da pasta (o trecho longo depois de /folders/ na URL do Drive) " +
        "ou cole a URL inteira da pasta."
    );
  }
  return rootId;
}

/** Escapa o nome para uso dentro da query `q` do Drive, que usa aspas simples. */
function escaparParaQuery(nome: string): string {
  return nome.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function getOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string,
  contaDeServico: string
): Promise<string> {
  try {
    const res = await drive.files.list({
      q:
        `name='${escaparParaQuery(name)}' and '${parentId}' in parents and ` +
        `mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
      spaces: "drive",
      // Necessário para pastas em Drive compartilhado.
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    const existingId = res.data.files?.[0]?.id;
    if (existingId) return existingId;
  } catch (erro) {
    throw new Error(
      descreveErroDrive(erro, {
        etapa: `Buscar a pasta '${name}' no Drive`,
        id: parentId,
        contaDeServico,
      })
    );
  }

  try {
    const folder = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
      supportsAllDrives: true,
    });

    const newId = folder.data.id;
    if (!newId) throw new Error(`Drive não retornou ID para a pasta '${name}'`);
    return newId;
  } catch (erro) {
    if (erro instanceof Error && erro.message.startsWith("Drive não retornou")) throw erro;
    throw new Error(
      descreveErroDrive(erro, {
        etapa: `Criar a pasta '${name}' no Drive`,
        id: parentId,
        contaDeServico,
      })
    );
  }
}

export async function createPedidoFolder(
  pedidoId: string,
  nomeCliente: string
): Promise<string> {
  const rootId = idRaizConfigurado();
  const { drive, contaDeServico } = getDriveClient();

  await validarPastaRaiz(drive, rootId, contaDeServico);

  const now = new Date();
  const ano = now.getFullYear().toString();
  const mes = String(now.getMonth() + 1).padStart(2, "0");

  const anoId = await getOrCreateFolder(drive, ano, rootId, contaDeServico);
  const mesId = await getOrCreateFolder(drive, mes, anoId, contaDeServico);

  const safeName = nomeCliente.replace(/[^a-zA-Z0-9À-ÿ\s\-]/g, "").trim() || "pedido";
  const folderName = `${safeName}-${pedidoId.slice(0, 8)}`;
  const folderId = await getOrCreateFolder(drive, folderName, mesId, contaDeServico);

  // Link de leitura para quem abrir a imagem pelo app. Não é fatal: a pasta já
  // existe e o upload funciona mesmo se o compartilhamento público for barrado
  // por política do domínio.
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });
  } catch (erro) {
    console.warn("[Drive] não foi possível tornar a pasta pública:", erro);
  }

  return folderId;
}

/**
 * A pasta gravada em `pedidos.drive_folder_id` ficou inutilizável e vale a pena
 * recriá-la sob a raiz configurada hoje?
 *
 * Cobre 404 (pasta apagada ou movida) e 403 (pasta de uma configuração antiga,
 * em que a conta de serviço escrevia em outro lugar). O 403 importa tanto
 * quanto o 404: trocar GOOGLE_DRIVE_ROOT_FOLDER_ID não apaga o ID que os
 * pedidos já têm salvo, e sem isso cada pedido antigo ficaria preso à pasta
 * velha para sempre.
 *
 * Cota estourada fica de fora de propósito — o problema não é a pasta, e
 * recriar só trocaria a mensagem útil por uma tentativa inútil.
 */
export function devePastaSerRecriada(erro: unknown): boolean {
  if (ehFaltaDeCota(erro)) return false;
  const status = statusDoErro(erro);
  return status === 404 || status === 403 || razaoDoErro(erro) === "notFound";
}

export async function uploadFileToDrive(
  folderId: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; url: string }> {
  const pastaId = normalizarIdPasta(folderId);
  if (!pastaId) throw new Error(`folderId inválido para upload no Drive: "${folderId}"`);

  const { drive, contaDeServico } = getDriveClient();

  const body = new PassThrough();
  body.end(buffer);

  let fileId: string;
  try {
    const res = await drive.files.create({
      requestBody: { name: fileName, parents: [pastaId] },
      media: { mimeType, body },
      fields: "id",
      supportsAllDrives: true,
    });
    if (!res.data.id) throw new Error("Drive não retornou ID do arquivo enviado");
    fileId = res.data.id;
  } catch (erro) {
    if (erro instanceof Error && erro.message.startsWith("Drive não retornou")) throw erro;
    // Preserva code/errors para quem chama decidir se recria a pasta.
    const traduzido = new Error(
      descreveErroDrive(erro, {
        etapa: "Enviar a imagem para o Drive",
        id: pastaId,
        contaDeServico,
      })
    );
    Object.assign(traduzido, {
      code: statusDoErro(erro),
      errors: (erro as ErroDrive)?.errors,
    });
    throw traduzido;
  }

  try {
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });
  } catch (erro) {
    console.warn("[Drive] não foi possível tornar a imagem pública:", erro);
  }

  return { fileId, url: `https://drive.google.com/uc?id=${fileId}` };
}
