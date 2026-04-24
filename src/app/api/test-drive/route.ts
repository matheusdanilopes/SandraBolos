import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// Diagnostic endpoint — gate with TEST_DRIVE_SECRET env var.
// Usage: GET /api/test-drive?secret=<TEST_DRIVE_SECRET>
export async function GET(req: NextRequest) {
  const secret = process.env.TEST_DRIVE_SECRET;
  if (!secret || req.nextUrl.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const hasJson = !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const hasEmail = !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const hasKey = !!process.env.GOOGLE_PRIVATE_KEY;

  const envCheck = {
    using: hasJson ? "GOOGLE_APPLICATION_CREDENTIALS_JSON" : "separate vars",
    GOOGLE_APPLICATION_CREDENTIALS_JSON: hasJson ? "present" : "MISSING",
    GOOGLE_SERVICE_ACCOUNT_EMAIL: hasEmail ? "present" : "MISSING",
    GOOGLE_PRIVATE_KEY: hasKey ? "present" : "MISSING",
    GOOGLE_DRIVE_ROOT_FOLDER_ID: rootFolderId ?? "MISSING",
  };

  if (!rootFolderId || (!hasJson && (!hasEmail || !hasKey))) {
    return NextResponse.json({ ok: false, envCheck, error: "Variáveis de ambiente faltando" });
  }

  try {
    let credentials: { client_email: string; private_key: string };
    if (hasJson) {
      credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON!);
    } else {
      credentials = {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
        private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      };
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });
    const res = await drive.files.get({ fileId: rootFolderId, fields: "id,name,mimeType" });

    return NextResponse.json({ ok: true, envCheck, rootFolder: res.data });
  } catch (err: unknown) {
    const e = err as { message?: string; code?: number; errors?: unknown };
    return NextResponse.json(
      { ok: false, envCheck, error: e.message ?? String(err), code: e.code, details: e.errors },
      { status: 500 }
    );
  }
}
