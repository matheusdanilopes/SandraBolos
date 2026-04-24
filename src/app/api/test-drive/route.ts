import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// Diagnostic endpoint for validating Google Drive configuration.
// Protected by TEST_DRIVE_SECRET env var — set it in Vercel and pass as:
//   GET /api/test-drive?secret=<TEST_DRIVE_SECRET>
export async function GET(req: NextRequest) {
  const secret = process.env.TEST_DRIVE_SECRET;
  if (!secret || req.nextUrl.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  const envCheck = {
    GOOGLE_SERVICE_ACCOUNT_EMAIL: email ? `${email.slice(0, 20)}…` : "MISSING",
    GOOGLE_PRIVATE_KEY: rawKey
      ? `present (${rawKey.length} chars, newline=${rawKey.includes("\n")}, literal_n=${rawKey.includes("\\n")})`
      : "MISSING",
    GOOGLE_DRIVE_ROOT_FOLDER_ID: rootFolderId ?? "MISSING",
  };

  if (!email || !rawKey || !rootFolderId) {
    return NextResponse.json({ ok: false, envCheck, error: "Variáveis de ambiente faltando" });
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: rawKey.replace(/\\n/g, "\n"),
      },
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
