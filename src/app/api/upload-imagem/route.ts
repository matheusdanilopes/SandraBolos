import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import {
  createPedidoFolder,
  devePastaSerRecriada,
  normalizarIdPasta,
  uploadFileToDrive,
} from "@/lib/googleDrive";
import { isErroDeConexao, mensagemErro } from "@/lib/erros";
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
    const message = status === 404 ? "Pedido não encontrado" : mensagemErro(pedidoError);
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

  const clienteNome =
    (pedido.clientes as { nome: string } | null)?.nome ?? pedido.nome_cliente ?? "pedido";
  const pedidoUuid: string = pedido.id;

  /** Cria a pasta do pedido no Drive e guarda o ID. `createPedidoFolder` reaproveita
   *  uma pasta de mesmo nome, então chamar de novo não gera pasta duplicada. */
  async function criarPasta(): Promise<string> {
    const novoId = await createPedidoFolder(pedidoUuid, clienteNome);
    await supabase.from("pedidos").update({ drive_folder_id: novoId }).eq("id", pedidoUuid);
    return novoId;
  }

  // Criação preguiçosa: a pasta só nasce no primeiro upload. Valores estranhos
  // salvos por execuções antigas (".", string vazia, URL) são descartados aqui —
  // `normalizarIdPasta` devolve null para tudo que não é um ID de verdade.
  let folderId = normalizarIdPasta(pedido.drive_folder_id);
  if (!folderId) {
    if (pedido.drive_folder_id) {
      await supabase.from("pedidos").update({ drive_folder_id: null }).eq("id", pedidoUuid);
    }
    try {
      folderId = await criarPasta();
    } catch (driveErr: unknown) {
      const e = driveErr as { code?: number };
      console.error("[Drive] createPedidoFolder failed:", driveErr);
      const detalhe = mensagemErro(driveErr);
      return NextResponse.json(
        { error: isErroDeConexao(driveErr) ? detalhe : `Drive: ${detalhe}`, code: e.code },
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

  // Upload to Drive. O ID salvo em `pedidos.drive_folder_id` é usado como está,
  // e pode ter envelhecido: a pasta foi apagada no Drive (404), ou foi criada
  // quando GOOGLE_DRIVE_ROOT_FOLDER_ID apontava para outro lugar e hoje a conta
  // de serviço não escreve mais nela (403). Nos dois casos a pasta é recriada
  // sob a raiz configurada agora e o envio é repetido uma vez — senão trocar a
  // pasta raiz deixaria todo pedido antigo preso à configuração velha.
  let fileId: string;
  let url: string;
  try {
    ({ fileId, url } = await uploadFileToDrive(folderId, compressed, fileName, "image/jpeg"));
  } catch (driveErr: unknown) {
    if (devePastaSerRecriada(driveErr)) {
      console.warn("[Drive] pasta do pedido inutilizável, recriando:", folderId, driveErr);
      try {
        folderId = await criarPasta();
        ({ fileId, url } = await uploadFileToDrive(folderId, compressed, fileName, "image/jpeg"));
      } catch (retryErr: unknown) {
        const e = retryErr as { code?: number };
        console.error("[Drive] uploadFileToDrive retry failed:", retryErr);
        const detalhe = mensagemErro(retryErr);
        return NextResponse.json(
          { error: isErroDeConexao(retryErr) ? detalhe : `Drive: ${detalhe}`, code: e.code },
          { status: 502 }
        );
      }
    } else {
      const e = driveErr as { code?: number };
      console.error("[Drive] uploadFileToDrive failed:", driveErr);
      const detalhe = mensagemErro(driveErr);
      return NextResponse.json(
        { error: isErroDeConexao(driveErr) ? detalhe : `Drive: ${detalhe}`, code: e.code },
        { status: 502 }
      );
    }
  }

  // Persist reference in DB
  const { data: imagem, error: imgError } = await supabase
    .from("imagens_pedido")
    .insert({ pedido_id: pedidoId, file_id: fileId, url, nome_arquivo: fileName })
    .select()
    .single();

  if (imgError) {
    return NextResponse.json({ error: mensagemErro(imgError) }, { status: 500 });
  }

  return NextResponse.json(imagem, { status: 201 });
}
