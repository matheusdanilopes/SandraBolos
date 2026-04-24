import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { StatusPedido } from "@/types/database";
import { STATUS_FLOW } from "@/types/database";

const VALID_STATUSES: StatusPedido[] = ["novo", "produzindo", "feito", "entregue"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body inválido" }, { status: 400 });

  const { status: novoStatus } = body as { status?: string };

  if (!novoStatus || !VALID_STATUSES.includes(novoStatus as StatusPedido)) {
    return NextResponse.json(
      { error: `Status inválido. Valores aceitos: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  const { data: pedido, error: fetchError } = await supabase
    .from("pedidos")
    .select("id, status")
    .eq("id", params.id)
    .single();

  if (fetchError || !pedido) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  // Enforce linear status flow
  const statusAtual = pedido.status as StatusPedido;
  const proximoPermitido = STATUS_FLOW[statusAtual];

  if (novoStatus !== proximoPermitido) {
    return NextResponse.json(
      {
        error: `Transição inválida: ${statusAtual} → ${novoStatus}. Próximo status permitido: ${proximoPermitido ?? "nenhum (já entregue)"}`,
      },
      { status: 422 }
    );
  }

  const { data: atualizado, error: updateError } = await supabase
    .from("pedidos")
    .update({ status: novoStatus })
    .eq("id", params.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(atualizado);
}
