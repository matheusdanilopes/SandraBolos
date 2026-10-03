import { google } from "googleapis";
import type { drive_v3 } from "googleapis";
import { PassThrough } from "stream";

// Contas de serviço não têm cota de armazenamento própria: todo arquivo criado
// por elas numa pasta do "Meu Drive" (mesmo compartilhada) conta na cota da
// própria conta de serviço, que é zero — e o upload falha com
// `storageQuotaExceeded`. Há três formas de autenticar que funcionam:
//
// 1. OAuth de usuário (recomendado para conta Gmail pessoal): o app age como a
//    própria dona do Drive, usando um refresh token. Os arquivos ficam no Drive
//    dela e contam na cota dela.
//    GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
//    (gere o token com `node scripts/gerar-token-google-drive.mjs`).
// 2. Conta de serviço + Drive compartilhado (só Google Workspace): a pasta raiz
//    precisa estar dentro de um Drive compartilhado onde a conta de serviço é
//    membro; a cota passa a ser a do Drive compartilhado.
// 3. Conta de serviço + delegação em todo o domínio (só Google Workspace):
//    GOOGLE_IMPERSONATE_USER=usuario@dominio faz a conta de serviço agir como
//    esse usuário.

export type DriveAuthMode = "oauth" | "service_account";

function hasOAuthEnv(): boolean {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  );
}

function hasServiceAccountEnv(): boolean {
  return !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY)
  );
}

export function getDriveAuthMode(): DriveAuthMode | null {
  if (hasOAuthEnv()) return "oauth";
  if (hasServiceAccountEnv()) return "service_account";
  return null;
}

/** Há credenciais e pasta raiz configuradas para usar o Drive? */
export function isDriveConfigured(): boolean {
  return getDriveAuthMode() !== null && !!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
}

function getServiceAccountCredentials(): { client_email: string; private_key: string } {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    return JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  }
  let rawKey = process.env.GOOGLE_PRIVATE_KEY!;
  if (rawKey.startsWith('"') && rawKey.endsWith('"')) rawKey = rawKey.slice(1, -1);
  return {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    private_key: rawKey.replace(/\\n/g, "\n"),
  };
}

export function getDriveClient(): drive_v3.Drive {
  const mode = getDriveAuthMode();

  if (mode === "oauth") {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
    return google.drive({ version: "v3", auth });
  }

  if (mode === "service_account") {
    const { client_email, private_key } = getServiceAccountCredentials();
    const auth = new google.auth.JWT({
      email: client_email,
      key: private_key,
      scopes: ["https://www.googleapis.com/auth/drive"],
      subject: process.env.GOOGLE_IMPERSONATE_USER?.trim() || undefined,
    });
    return google.drive({ version: "v3", auth });
  }

  throw new Error(
    "Credenciais do Google Drive não configuradas. Defina GOOGLE_OAUTH_CLIENT_ID, " +
      "GOOGLE_OAUTH_CLIENT_SECRET e GOOGLE_OAUTH_REFRESH_TOKEN (ou as da conta de serviço)."
  );
}

function isStorageQuotaError(err: unknown): boolean {
  const e = err as { message?: unknown; errors?: Array<{ reason?: string }> } | null;
  if (e?.errors?.some((x) => x.reason === "storageQuotaExceeded")) return true;
  return typeof e?.message === "string" && /storage quota|storageQuotaExceeded/i.test(e.message);
}

// Troca o erro cru do Google por uma instrução de como resolver.
function traduzirErroDrive(err: unknown): unknown {
  if (!isStorageQuotaError(err)) return err;
  const msg =
    getDriveAuthMode() === "service_account"
      ? "A conta de serviço não tem espaço próprio no Google Drive. Configure o acesso " +
        "por OAuth (GOOGLE_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN), coloque a pasta raiz " +
        "num Drive compartilhado ou defina GOOGLE_IMPERSONATE_USER (Workspace)."
      : "O Google Drive está sem espaço de armazenamento.";
  return Object.assign(new Error(msg), { code: (err as { code?: number })?.code });
}

async function getOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string
): Promise<string> {
  if (!parentId || parentId.length < 2) {
    throw new Error(`ID da pasta pai inválido ao buscar '${name}': "${parentId}"`);
  }

  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
    // Required for Shared Drive support
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  const existingId = res.data.files?.[0]?.id;
  if (existingId) return existingId;

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
}

export async function createPedidoFolder(
  pedidoId: string,
  nomeCliente: string
): Promise<string> {
  try {
    return await createPedidoFolderInner(pedidoId, nomeCliente);
  } catch (err) {
    throw traduzirErroDrive(err);
  }
}

async function createPedidoFolderInner(pedidoId: string, nomeCliente: string): Promise<string> {
  const drive = getDriveClient();
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
  if (!rootId || (rootId !== "root" && rootId.length < 10)) {
    throw new Error(
      `GOOGLE_DRIVE_ROOT_FOLDER_ID inválido ou não configurado: "${rootId ?? ""}". ` +
        "Configure o ID correto da pasta raiz no Google Drive."
    );
  }

  const now = new Date();
  const ano = now.getFullYear().toString();
  const mes = String(now.getMonth() + 1).padStart(2, "0");

  const anoId = await getOrCreateFolder(drive, ano, rootId);
  const mesId = await getOrCreateFolder(drive, mes, anoId);

  const safeName = nomeCliente.replace(/[^a-zA-Z0-9À-ÿ\s\-]/g, "").trim() || "pedido";
  const folderName = `${safeName}-${pedidoId.slice(0, 8)}`;

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [mesId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  const folderId = folder.data.id;
  if (!folderId) throw new Error("Drive não retornou ID da pasta do pedido");

  await drive.permissions.create({
    fileId: folderId,
    requestBody: { role: "reader", type: "anyone" },
    supportsAllDrives: true,
  });

  return folderId;
}

export async function uploadFileToDrive(
  folderId: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; url: string }> {
  try {
    return await uploadFileToDriveInner(folderId, buffer, fileName, mimeType);
  } catch (err) {
    throw traduzirErroDrive(err);
  }
}

async function uploadFileToDriveInner(
  folderId: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; url: string }> {
  if (!folderId || folderId.length < 10)
    throw new Error(`folderId inválido para upload no Drive: "${folderId}"`);

  const drive = getDriveClient();

  const body = new PassThrough();
  body.end(buffer);

  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body },
    fields: "id",
    supportsAllDrives: true,
  });

  const fileId = res.data.id;
  if (!fileId) throw new Error("Drive não retornou ID do arquivo enviado");
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
    supportsAllDrives: true,
  });

  return { fileId, url: `https://drive.google.com/uc?id=${fileId}` };
}
