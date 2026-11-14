import { NextRequest, NextResponse } from "next/server";
import { recusarSemSessao } from "@/lib/sessao";
import { getDriveClient, hasDriveCredentials } from "@/lib/googleDrive";

// Diagnóstico do Drive: GET /api/test-drive com o app logado.
// (Antes pedia ?secret= na URL, que fica gravado em logs; agora vale o login.)
export async function GET(req: NextRequest) {
  const negado = await recusarSemSessao(req);
  if (negado) return negado;

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
