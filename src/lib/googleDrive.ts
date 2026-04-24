import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

function getDriveClient(): drive_v3.Drive {
  // Prefer a single JSON credentials blob (avoids OpenSSL 3.x newline issues
  // that occur when the private key is split across env vars in Vercel).
  // Fallback: build credentials from individual env vars.
  let credentials: { client_email: string; private_key: string };

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  } else {
    // Strip surrounding quotes that some tools add (e.g. copy-pasting .env format into Vercel)
    // then convert literal \n sequences to actual newlines.
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
  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });
  if (res.data.files?.length) return res.data.files[0].id!;

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  return folder.data.id!;
}

export async function createPedidoFolder(
  pedidoId: string,
  nomeCliente: string
): Promise<string> {
  const drive = getDriveClient();
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
  const now = new Date();
  const ano = now.getFullYear().toString();
  const mes = String(now.getMonth() + 1).padStart(2, "0");

  const anoId = await getOrCreateFolder(drive, ano, rootId);
  const mesId = await getOrCreateFolder(drive, mes, anoId);

  const safeName = nomeCliente.replace(/[^a-zA-Z0-9À-ÿ\s\-]/g, "").trim();
  const folderName = `${safeName}-${pedidoId.slice(0, 8)}`;

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [mesId],
    },
    fields: "id",
  });

  const folderId = folder.data.id!;
  await drive.permissions.create({
    fileId: folderId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return folderId;
}

export async function uploadFileToDrive(
  folderId: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; url: string }> {
  const drive = getDriveClient();

  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: buffer },
    fields: "id",
  });

  const fileId = res.data.id!;
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return { fileId, url: `https://drive.google.com/uc?id=${fileId}` };
}
