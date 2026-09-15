import { NextRequest, NextResponse } from "next/server";
import { diagnosticarDrive } from "@/lib/googleDrive";

// Diagnóstico do Drive — protegido por TEST_DRIVE_SECRET.
// Uso: GET /api/test-drive?secret=<TEST_DRIVE_SECRET>
//
// Toda a lógica vive em `diagnosticarDrive()`, junto do código que o app usa de
// verdade. Quando a checagem morava aqui, ela olhava variáveis que o app não
// lia mais e dizia "tudo certo" enquanto o upload falhava.
export async function GET(req: NextRequest) {
  const secret = process.env.TEST_DRIVE_SECRET;
  if (!secret || req.nextUrl.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resultado = await diagnosticarDrive();
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 500 });
}
