import { NextRequest, NextResponse } from "next/server";
import { getDriveAuthMode, getDriveClient } from "@/lib/googleDrive";

// Diagnostic endpoint — gate with TEST_DRIVE_SECRET env var.
// Usage: GET /api/test-drive?secret=<TEST_DRIVE_SECRET>
export async function GET(req: NextRequest) {
  const secret = process.env.TEST_DRIVE_SECRET;
  if (!secret || req.nextUrl.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
  const mode = getDriveAuthMode();
  const present = (v?: string) => (v ? "present" : "MISSING");

  const envCheck = {
    using: mode ?? "none",
    GOOGLE_OAUTH_CLIENT_ID: present(process.env.GOOGLE_OAUTH_CLIENT_ID),
    GOOGLE_OAUTH_CLIENT_SECRET: present(process.env.GOOGLE_OAUTH_CLIENT_SECRET),
    GOOGLE_OAUTH_REFRESH_TOKEN: present(process.env.GOOGLE_OAUTH_REFRESH_TOKEN),
    GOOGLE_APPLICATION_CREDENTIALS_JSON: present(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
    GOOGLE_SERVICE_ACCOUNT_EMAIL: present(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    GOOGLE_PRIVATE_KEY: present(process.env.GOOGLE_PRIVATE_KEY),
    GOOGLE_IMPERSONATE_USER: process.env.GOOGLE_IMPERSONATE_USER?.trim() || "not set",
    GOOGLE_DRIVE_ROOT_FOLDER_ID: rootFolderId ?? "MISSING",
  };

  if (!rootFolderId || !mode) {
    return NextResponse.json({ ok: false, envCheck, error: "Variáveis de ambiente faltando" });
  }

  try {
    const drive = getDriveClient();
    const res = await drive.files.get({
      fileId: rootFolderId,
      fields: "id,name,mimeType,driveId",
      supportsAllDrives: true,
    });

    // Conta de serviço sem Drive compartilhado nem delegação: lê a pasta, mas
    // qualquer upload falha por falta de cota.
    const warning =
      mode === "service_account" && !res.data.driveId && !process.env.GOOGLE_IMPERSONATE_USER?.trim()
        ? "A pasta raiz está num 'Meu Drive' e a autenticação é por conta de serviço, que não " +
          "tem cota de armazenamento: uploads vão falhar. Use OAuth (GOOGLE_OAUTH_*), mova a " +
          "pasta para um Drive compartilhado ou defina GOOGLE_IMPERSONATE_USER."
        : undefined;

    return NextResponse.json({ ok: !warning, envCheck, rootFolder: res.data, warning });
  } catch (err: unknown) {
    const e = err as { message?: string; code?: number; errors?: unknown };
    return NextResponse.json(
      { ok: false, envCheck, error: e.message ?? String(err), code: e.code, details: e.errors },
      { status: 500 }
    );
  }
}
