import { NextRequest, NextResponse } from "next/server";
import { recusarSemSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
// Garante que nenhuma leitura do Supabase venha do cache de dados do Next.
export const fetchCache = "force-no-store";

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const negado = await recusarSemSessao(_req);
  if (negado) return negado;
  const params = await props.params;
  const supabase = createServerSupabaseClient();

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id")
    .eq("id", params.id)
    .single();

  if (!pedido) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  const { data: imagens, error } = await supabase
    .from("imagens_pedido")
    .select("*")
    .eq("pedido_id", params.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: mensagemErro(error) }, { status: 500 });
  }

  return NextResponse.json(imagens);
}
