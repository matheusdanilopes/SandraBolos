import { NextRequest, NextResponse } from "next/server";
import { getDriveClient, hasDriveCredentials } from "@/lib/googleDrive";

// Diagnostic endpoint — gate with TEST_DRIVE_SECRET env var.
// Usage: GET /api/test-drive?secret=<TEST_DRIVE_SECRET>
export async function GET(req: NextRequest) {
  const secret = process.env.TEST_DRIVE_SECRET;
  if (!secret || req.nextUrl.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const present = (v?: string) => (v ? "present" : "MISSING");

  const envCheck = {
    GOOGLE_OAUTH_CLIENT_ID: present(process.env.GOOGLE_OAUTH_CLIENT_ID),
    GOOGLE_OAUTH_CLIENT_SECRET: present(process.env.GOOGLE_OAUTH_CLIENT_SECRET),
    GOOGLE_OAUTH_REFRESH_TOKEN: present(process.env.GOOGLE_OAUTH_REFRESH_TOKEN),
    GOOGLE_DRIVE_ROOT_FOLDER_ID: rootFolderId ?? "MISSING",
  };

  if (!rootFolderId || !hasDriveCredentials()) {
    return NextResponse.json({ ok: false, envCheck, error: "Variáveis de ambiente faltando" });
  }

  try {
    const drive = getDriveClient();
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
