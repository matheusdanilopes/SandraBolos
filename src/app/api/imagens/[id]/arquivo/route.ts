import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { downloadFileFromDrive } from "@/lib/googleDrive";
import { mensagemErro } from "@/lib/erros";

export const dynamic = "force-dynamic";

// Serve a imagem pelo próprio app: o link do Drive, no celular, pede login
// ou escolha de conta do Google antes de mostrar o arquivo.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  const { data: imagem, error } = await supabase
    .from("imagens_pedido")
    .select("file_id")
    .eq("id", params.id)
    .single();

  if (error || !imagem?.file_id) {
    return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
  }

  try {
    const { buffer, mimeType } = await downloadFileFromDrive(imagem.file_id);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        // O arquivo de um id nunca muda: pode ficar no cache do navegador.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (driveErr: unknown) {
    console.error("[Drive] downloadFileFromDrive failed:", driveErr);
    const status = (driveErr as { code?: number }).code === 404 ? 404 : 502;
    return NextResponse.json({ error: mensagemErro(driveErr) }, { status });
  }
}
