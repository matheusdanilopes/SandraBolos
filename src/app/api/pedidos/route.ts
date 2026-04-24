import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createPedidoFolder } from "@/lib/googleDrive";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { cliente_id, nome_cliente } = body as {
    cliente_id?: string;
    nome_cliente?: string;
  };

  if (!nome_cliente?.trim()) {
    return NextResponse.json({ error: "nome_cliente é obrigatório" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Resolve display name: prefer cliente record, fall back to provided nome_cliente
  let nomeParaPasta = nome_cliente.trim();
  if (cliente_id) {
    const { data: cliente } = await supabase
      .from("clientes")
      .select("nome")
      .eq("id", cliente_id)
      .single();
    if (cliente?.nome) nomeParaPasta = cliente.nome;
  }

  const hoje = new Date().toISOString().split("T")[0];

  const { data: pedido, error: dbError } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: cliente_id ?? null,
      nome_cliente: nome_cliente.trim(),
      data_entrega: hoje,
      tipo: "bolo",
      status: "novo",
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Create Drive folder (non-fatal if env vars not configured)
  let drive_folder_id: string | null = null;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    try {
      drive_folder_id = await createPedidoFolder(pedido.id, nomeParaPasta);
      await supabase
        .from("pedidos")
        .update({ drive_folder_id })
        .eq("id", pedido.id);
    } catch (driveErr) {
      console.error("[Drive] createPedidoFolder failed:", driveErr);
    }
  }

  return NextResponse.json({ ...pedido, drive_folder_id }, { status: 201 });
}
