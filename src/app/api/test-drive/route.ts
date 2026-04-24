import { NextResponse } from "next/server";
import { google } from "googleapis";

// Diagnostic endpoint — remove after debugging is complete.
// GET /api/test-drive
export async function GET() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  const envCheck = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: email ? `${email.slice(0, 20)}…` : "MISSING",
    GOOGLE_PRIVATE_KEY: rawKey
      ? `${rawKey.slice(0, 30)}… (${rawKey.length} chars, contains_newline=${rawKey.includes("\n")}, contains_literal_n=${rawKey.includes("\\n")})`
      : "MISSING",
    GOOGLE_DRIVE_ROOT_FOLDER_ID: rootFolderId ?? "MISSING",
  };

  if (!email || !rawKey || !rootFolderId) {
    return NextResponse.json({ ok: false, envCheck, error: "Variáveis de ambiente faltando" });
  }

  const key = rawKey.replace(/\\n/g, "\n");

  try {
    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    await auth.authorize();

    const drive = google.drive({ version: "v3", auth });

    const res = await drive.files.get({
      fileId: rootFolderId,
      fields: "id,name,mimeType",
    });

    return NextResponse.json({
      ok: true,
      envCheck,
      rootFolder: res.data,
    });
  } catch (err: unknown) {
    const e = err as { message?: string; code?: number; errors?: unknown };
    return NextResponse.json(
      {
        ok: false,
        envCheck,
        error: e.message ?? String(err),
        code: e.code,
        details: e.errors,
      },
      { status: 500 }
    );
  }
}
