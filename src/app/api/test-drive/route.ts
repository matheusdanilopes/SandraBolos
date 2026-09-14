import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { descreveErroDrive, normalizarIdPasta } from "@/lib/googleDrive";

// Diagnostic endpoint — gate with TEST_DRIVE_SECRET env var.
// Usage: GET /api/test-drive?secret=<TEST_DRIVE_SECRET>
//
// Responde às duas perguntas que a mensagem de erro do Drive não responde:
// qual ID de pasta o app está usando de fato, e com qual e-mail essa pasta
// precisa estar compartilhada.
export async function GET(req: NextRequest) {
  const secret = process.env.TEST_DRIVE_SECRET;
  if (!secret || req.nextUrl.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rootBruto = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const rootFolderId = normalizarIdPasta(rootBruto);
  const hasJson = !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const hasKey = !!process.env.GOOGLE_PRIVATE_KEY;

  const envCheck = {
    using: hasJson ? "GOOGLE_APPLICATION_CREDENTIALS_JSON" : "separate vars",
    GOOGLE_APPLICATION_CREDENTIALS_JSON: hasJson ? "present" : "MISSING",
    GOOGLE_SERVICE_ACCOUNT_EMAIL: hasEmail ? "present" : "MISSING",
    GOOGLE_PRIVATE_KEY: hasKey ? "present" : "MISSING",
    GOOGLE_DRIVE_ROOT_FOLDER_ID: rootBruto ?? "MISSING",
    idNormalizado: rootFolderId ?? "INVÁLIDO",
  };

  if (!rootFolderId) {
    return NextResponse.json({
      ok: false,
      envCheck,
      error:
        `GOOGLE_DRIVE_ROOT_FOLDER_ID não contém um ID de pasta válido: "${rootBruto ?? ""}". ` +
        "Use o trecho longo depois de /folders/ na URL do Drive, ou cole a URL inteira.",
    });
  }
  if (!hasJson && (!hasEmail || !hasKey)) {
    return NextResponse.json({ ok: false, envCheck, error: "Variáveis de ambiente faltando" });
  }

  let credentials: { client_email: string; private_key: string };
  try {
    if (hasJson) {
      credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!);
    } else {
      let rawKey = process.env.GOOGLE_PRIVATE_KEY!;
      if (rawKey.startsWith('"') && rawKey.endsWith('"')) rawKey = rawKey.slice(1, -1);
      credentials = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
        private_key: rawKey.replace(/\\n/g, "\n"),
      };
    }
  } catch {
    return NextResponse.json({
      ok: false,
      envCheck,
      error: "GOOGLE_APPLICATION_CREDENTIALS_JSON não é um JSON válido.",
    });
  }

  const contaDeServico = credentials.client_email;

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });
    const res = await drive.files.get({
      fileId: rootFolderId,
      fields: "id,name,mimeType,trashed,capabilities(canAddChildren)",
      supportsAllDrives: true,
    });

    const pasta = res.data;
    const ehPasta = pasta.mimeType === "application/vnd.google-apps.folder";
    const podeCriar = pasta.capabilities?.canAddChildren !== false;

    return NextResponse.json({
      ok: ehPasta && podeCriar && !pasta.trashed,
      contaDeServico,
      envCheck,
      rootFolder: pasta,
      diagnostico: {
        ehPasta,
        naLixeira: !!pasta.trashed,
        podeCriarSubpastas: podeCriar,
      },
      ...(ehPasta && podeCriar && !pasta.trashed
        ? {}
        : {
            error: !ehPasta
              ? "O ID aponta para um arquivo, não para uma pasta."
              : pasta.trashed
                ? "A pasta está na lixeira do Drive."
                : `${contaDeServico} só tem acesso de leitura. Compartilhe a pasta como Editor.`,
          }),
    });
  } catch (err: unknown) {
    const e = err as { code?: number; errors?: unknown };
    return NextResponse.json(
      {
        ok: false,
        contaDeServico,
        envCheck,
        error: descreveErroDrive(err, {
          etapa: "Pasta raiz do Drive",
          id: rootFolderId,
          contaDeServico,
        }),
        code: e.code,
        details: e.errors,
      },
      { status: 500 }
    );
  }
}
