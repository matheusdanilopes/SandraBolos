import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createPedidoFolder, uploadFileToDrive } from "@/lib/googleDrive";
import sharp from "sharp";

const MAX_IMAGENS = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "FormData inválido" }, { status: 400 });

  const file = formData.get("file") as File | null;
  const pedidoId = formData.get("pedido_id") as string | null;

  if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  if (!pedidoId) return NextResponse.json({ error: "pedido_id é obrigatório" }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de arquivo não suportado" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Fetch pedido — use * so missing optional columns (drive_folder_id, nome_cliente)
  // don't cause PostgREST to error when migration hasn't been applied yet.
  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .select("*, clientes(nome)")
    .eq("id", pedidoId)
    .single();

  if (pedidoError) {
    console.error("[upload-imagem] pedido fetch error:", pedidoError);
    // PGRST116 = no rows returned by .single()
    const status = pedidoError.code === "PGRST116" ? 404 : 500;
    const message = status === 404 ? "Pedido não encontrado" : pedidoError.message;
    return NextResponse.json({ error: message }, { status });
  }
  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  // Enforce max images limit
  const { count } = await supabase
    .from("imagens_pedido")
    .select("id", { count: "exact", head: true })
    .eq("pedido_id", pedidoId);

  if ((count ?? 0) >= MAX_IMAGENS) {
    return NextResponse.json(
      { error: `Limite de ${MAX_IMAGENS} imagens por pedido atingido` },
      { status: 422 }
    );
  }

  // Lazy folder creation: create Drive folder now if not yet created
  let folderId = pedido.drive_folder_id;
  if (!folderId) {
    const clienteNome =
      (pedido.clientes as { nome: string } | null)?.nome ??
      pedido.nome_cliente ??
      "pedido";

    try {
      folderId = await createPedidoFolder(pedido.id, clienteNome);
      await supabase.from("pedidos").update({ drive_folder_id: folderId }).eq("id", pedido.id);
    } catch (driveErr: unknown) {
      const e = driveErr as { message?: string; code?: number };
      console.error("[Drive] createPedidoFolder failed:", driveErr);
      return NextResponse.json(
        { error: `Drive: ${e.message ?? String(driveErr)}`, code: e.code },
        { status: 502 }
      );
    }
  }

  // Read and compress the image
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const compressed = await sharp(rawBuffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;

  // Upload to Drive
  let fileId: string;
  let url: string;
  try {
    ({ fileId, url } = await uploadFileToDrive(folderId, compressed, fileName, "image/jpeg"));
  } catch (driveErr) {
    console.error("[Drive] uploadFileToDrive failed:", driveErr);
    return NextResponse.json({ error: "Falha no upload para o Drive" }, { status: 502 });
  }

  // Persist reference in DB
  const { data: imagem, error: imgError } = await supabase
    .from("imagens_pedido")
    .insert({ pedido_id: pedidoId, file_id: fileId, url, nome_arquivo: fileName })
    .select()
    .single();

  if (imgError) {
    return NextResponse.json({ error: imgError.message }, { status: 500 });
  }

  return NextResponse.json(imagem, { status: 201 });
}
