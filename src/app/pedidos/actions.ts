"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { isErroDeConexao, mensagemErro } from "@/lib/erros";
import type { TipoPedido, Topper, TopperPedido } from "@/types/database";

interface ItemPayload {
  produtoId: string;
  nomeProduto: string;
  unidadeMedida: string;
  precoUnitario: number;
  quantidade: number;
  valorTotal: number;
}

interface PedidoPayload {
  clienteId?: string;
  novoClienteNome?: string;
  novoClienteTelefone?: string;
  tipo: TipoPedido;
  dataEntrega: string;
  horaEntrega?: string | null;
  horaRetirada?: string | null;
  descricao?: string;
  topper: Topper;
  topperDetalhes?: TopperDetalhesPayload;
  /** Valor do topper de brinde — receita do pedido, não custo de fornecedor. */
  valorBrinde?: number | null;
  peso?: number | null;
  quantidade?: number | null;
  itens?: ItemPayload[];
}

interface TopperDetalhesPayload {
  fornecedor?: string | null;
  valor?: number | null;
  frete?: number | null;
  observacoes?: string | null;
}

type SupabaseServerClient = ReturnType<typeof createServerSupabaseClient>;

/**
 * Valor do brinde a gravar no pedido.
 *
 * Só faz sentido com topper "brinde": trocar a opção depois não pode deixar para
 * trás uma receita de um brinde que não existe mais.
 */
function valorBrindeDoPedido(topper: Topper, valor?: number | null): number | null {
  if (topper !== "brinde") return null;
  return valor && valor > 0 ? valor : null;
}

/** Ficha de topper que ninguém preencheu ainda — nada a perder se for descartada. */
function fichaEmBranco(ficha: TopperPedido): boolean {
  return (
    !ficha.fornecedor &&
    Number(ficha.valor) === 0 &&
    Number(ficha.frete) === 0 &&
    !ficha.solicitado &&
    !ficha.recebido &&
    !ficha.pago_fornecedor &&
    !ficha.observacoes
  );
}

/**
 * Mantém a ficha de `toppers_pedido` alinhada com a opção escolhida no pedido.
 *
 * É essa ficha que alimenta a tela de Toppers (fornecedor, valores, solicitado/
 * recebido/pago) e o custo no financeiro. Antes ela só nascia quando alguém
 * abria /toppers e salvava algo — até lá o pedido com topper "sim" aparecia lá
 * em branco, sem nada para acompanhar. Agora o registro do pedido já a cria.
 *
 * Só vale para "sim": brinde não é compra de fornecedor e não entra na tela de
 * Toppers.
 */
async function sincronizarTopperPedido(
  supabase: SupabaseServerClient,
  pedidoId: string,
  topper: Topper,
  detalhes?: TopperDetalhesPayload
): Promise<{ error?: string }> {
  const { data: fichaAtual, error: erroBusca } = await supabase
    .from("toppers_pedido")
    .select("*")
    .eq("pedido_id", pedidoId)
    .maybeSingle();

  // Sem saber o que já existe não há como decidir entre criar, atualizar ou
  // apagar — mexer às cegas aqui poderia zerar valores já lançados.
  if (erroBusca) return { error: mensagemErro(erroBusca) };

  const ficha = fichaAtual as TopperPedido | null;

  if (topper !== "sim") {
    // Topper desmarcado ou virou brinde: descarta a ficha apenas se ainda
    // estiver em branco. Apagar valores ou pagamento já registrados tiraria
    // custo do financeiro.
    if (ficha && fichaEmBranco(ficha)) {
      const { error } = await supabase.from("toppers_pedido").delete().eq("pedido_id", pedidoId);
      if (error) return { error: mensagemErro(error) };
    }
    return {};
  }

  // Sem dados do formulário e com ficha já existente não há o que alimentar —
  // sobrescrever com vazio apagaria o que foi preenchido na tela de Toppers.
  if (!detalhes && ficha) return {};

  const campos = {
    fornecedor: detalhes?.fornecedor?.trim() || null,
    valor: detalhes?.valor ?? 0,
    frete: detalhes?.frete ?? 0,
    observacoes: detalhes?.observacoes?.trim() || null,
  };

  const { error } = ficha
    ? await supabase.from("toppers_pedido").update(campos).eq("pedido_id", pedidoId)
    : await supabase.from("toppers_pedido").insert({ pedido_id: pedidoId, ...campos });

  if (error) return { error: mensagemErro(error) };
  return {};
}

export async function criarPedidoAction(
  data: PedidoPayload
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  let resolvedClienteId: string | null = data.clienteId || null;

  if (!resolvedClienteId) {
    const { data: clienteData, error: clienteError } = await supabase
      .from("clientes")
      .insert({ nome: data.novoClienteNome!, telefone: data.novoClienteTelefone! })
      .select()
      .single();
    if (clienteError) return { error: mensagemErro(clienteError) };
    resolvedClienteId = clienteData.id;
    revalidatePath("/clientes");
  }

  const { data: novoPedido, error } = await supabase
    .from("pedidos")
    .insert({
      cliente_id: resolvedClienteId,
      data_entrega: data.dataEntrega,
      hora_entrega: data.horaEntrega ?? null,
      hora_retirada: data.horaRetirada ?? null,
      tipo: data.tipo,
      descricao: data.descricao || null,
      topper: data.topper,
      valor_brinde: valorBrindeDoPedido(data.topper, data.valorBrinde),
      peso: data.peso ?? null,
      quantidade: data.quantidade ?? null,
      status: "novo",
    })
    .select()
    .single();

  if (error) return { error: mensagemErro(error) };

  if (data.itens && data.itens.length > 0) {
    await supabase.from("itens_pedido").insert(
      data.itens.map((item) => ({
        pedido_id: novoPedido.id,
        produto_id: item.produtoId,
        nome_produto: item.nomeProduto,
        unidade_medida: item.unidadeMedida,
        preco_unitario: item.precoUnitario,
        quantidade: item.quantidade,
        valor_total: Math.round(item.valorTotal * 100) / 100,
      }))
    );
  }

  // Topper "sim" nasce com ficha própria, para o pedido já entrar na tela de
  // Toppers com o que foi informado aqui. Sem bloquear a criação: o pedido já
  // está gravado e o redirect não pode ser abortado por causa da ficha, que
  // continua editável em /toppers.
  if (data.topper === "sim") {
    await sincronizarTopperPedido(supabase, novoPedido.id, data.topper, data.topperDetalhes);
    revalidatePath("/toppers");
    revalidatePath("/financeiro");
  }

  revalidatePath("/pedidos");
  revalidatePath("/");
  redirect(`/pedidos/${novoPedido.id}`);
}

export async function excluirRascunhoAction(
  pedidoId: string
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();

  const { data: pedido, error: fetchError } = await supabase
    .from("pedidos")
    .select("status")
    .eq("id", pedidoId)
    .single();

  // Rede fora do ar não é pedido inexistente — dizer "não encontrado" aqui
  // faria parecer que o pedido sumiu do banco.
  if (isErroDeConexao(fetchError)) return { error: mensagemErro(fetchError) };
  if (fetchError || !pedido) return { error: "Pedido não encontrado" };
  if (pedido.status !== "rascunho") return { error: "Apenas rascunhos podem ser excluídos" };

  // Três tabelas distintas, nenhuma depende do resultado da outra: em série
  // eram três idas ao banco enfileiradas antes de apagar o pedido.
  await Promise.all([
    supabase.from("itens_pedido").delete().eq("pedido_id", pedidoId),
    supabase.from("imagens_pedido").delete().eq("pedido_id", pedidoId),
    supabase.from("toppers_pedido").delete().eq("pedido_id", pedidoId),
  ]);

  const { error } = await supabase.from("pedidos").delete().eq("id", pedidoId);
  if (error) return { error: mensagemErro(error) };

  revalidatePath("/pedidos");
  revalidatePath("/");
  return {};
}

export async function criarPedidoRapidoAction(data: {
  nomeCliente: string;
  descricao?: string;
  valorEstimado?: number;
  dataEntrega?: string;
}): Promise<{ pedidoId?: string; error?: string }> {
  const supabase = createServerSupabaseClient();

  const hoje = new Date().toISOString().split("T")[0];

  const { data: novoPedido, error } = await supabase
    .from("pedidos")
    .insert({
      nome_cliente: data.nomeCliente.trim(),
      data_entrega: data.dataEntrega || hoje,
      tipo: "bolo",
      descricao: data.descricao?.trim() || null,
      topper: "nao",
      preco_corrigido: data.valorEstimado ?? null,
      status: "rascunho",
    })
    .select()
    .single();

  if (error) return { error: mensagemErro(error) };

  revalidatePath("/pedidos");
  revalidatePath("/");

  return { pedidoId: novoPedido.id };
}

export async function editarPedidoAction(
  pedidoId: string,
  data: Pick<PedidoPayload, "tipo" | "dataEntrega" | "horaEntrega" | "horaRetirada" | "descricao" | "topper" | "topperDetalhes" | "valorBrinde" | "peso" | "quantidade">
): Promise<{ error?: string }> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("pedidos")
    .update({
      data_entrega: data.dataEntrega,
      hora_entrega: data.horaEntrega ?? null,
      hora_retirada: data.horaRetirada ?? null,
      tipo: data.tipo,
      descricao: data.descricao || null,
      topper: data.topper,
      valor_brinde: valorBrindeDoPedido(data.topper, data.valorBrinde),
      peso: data.peso ?? null,
      quantidade: data.quantidade ?? null,
    })
    .eq("id", pedidoId);

  if (error) return { error: mensagemErro(error) };

  // Aqui a edição pode ser repetida sem efeito colateral, então a falha na
  // ficha do topper é devolvida para a tela em vez de passar em silêncio.
  const topperResult = await sincronizarTopperPedido(
    supabase,
    pedidoId,
    data.topper,
    data.topperDetalhes
  );
  if (topperResult.error) return topperResult;

  revalidatePath("/toppers");
  revalidatePath("/financeiro");
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
  revalidatePath("/");
  redirect(`/pedidos/${pedidoId}`);
}
