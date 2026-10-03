import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { deleteFileFromDrive } from "@/lib/googleDrive";
import { isErroDeConexao, mensagemErro } from "@/lib/erros";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  const { data: imagem, error: fetchError } = await supabase
    .from("imagens_pedido")
    .select("id, file_id")
    .eq("id", params.id)
    .single();

  if (fetchError || !imagem) {
    const status = fetchError?.code === "PGRST116" || !imagem ? 404 : 500;
    const message = status === 404 ? "Imagem não encontrada" : mensagemErro(fetchError);
    return NextResponse.json({ error: message }, { status });
  }

  // Apaga no Drive antes do banco: se o Drive falhar, o registro continua no
  // app e dá para tentar de novo, em vez de deixar o arquivo órfão no Drive.
  if (imagem.file_id) {
    try {
      await deleteFileFromDrive(imagem.file_id);
    } catch (driveErr: unknown) {
      console.error("[Drive] deleteFileFromDrive failed:", driveErr);
      const detalhe = mensagemErro(driveErr);
      return NextResponse.json(
        { error: isErroDeConexao(driveErr) ? detalhe : `Drive: ${detalhe}` },
        { status: 502 }
      );
    }
  }

  const { error } = await supabase.from("imagens_pedido").delete().eq("id", imagem.id);
  if (error) return NextResponse.json({ error: mensagemErro(error) }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
