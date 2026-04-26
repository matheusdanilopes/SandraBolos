import { google } from "googleapis";
import type { drive_v3 } from "googleapis";
import { PassThrough } from "stream";

function getDriveClient(): drive_v3.Drive {
  let credentials: { client_email: string; private_key: string };

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  } else {
    let rawKey = process.env.GOOGLE_PRIVATE_KEY!;
    if (rawKey.startsWith('"') && rawKey.endsWith('"')) rawKey = rawKey.slice(1, -1);
    credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: rawKey.replace(/\\n/g, "\n"),
    };
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
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
