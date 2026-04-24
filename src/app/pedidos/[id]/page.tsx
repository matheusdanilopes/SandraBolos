import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertaBadge } from "@/components/AlertaBadge";
import { formatDate, formatPhone, calcularValorFinal } from "@/lib/utils";
import { TIPO_LABELS, TOPPER_LABELS, STATUS_FLOW, type PedidoComCliente } from "@/types/database";
import { Edit } from "lucide-react";
import { StatusActions } from "./StatusActions";
import { PrecificacaoForm } from "./PrecificacaoForm";
import { EntregaForm } from "./EntregaForm";
import { ImagensSection } from "./ImagensSection";

export const dynamic = "force-dynamic";

export default async function PedidoDetailPage({ params }: { params: { id: string } }) {
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("*, clientes(nome, telefone)")
    .eq("id", params.id)
    .single();

  if (!pedido) notFound();

  const pedidoTyped = pedido as unknown as PedidoComCliente;

  const { data: imagens } = await supabase
    .from("imagens_pedido")
    .select("*")
    .eq("pedido_id", params.id)
    .order("created_at");

  const cliente = pedidoTyped.clientes ?? null;
  const valorFinal = calcularValorFinal(pedidoTyped);
  const proximoStatus = STATUS_FLOW[pedidoTyped.status];

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{cliente?.nome ?? "Sem cliente"}</h1>
            <StatusBadge status={pedidoTyped.status} />
            <AlertaBadge dataEntrega={pedidoTyped.data_entrega} status={pedidoTyped.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{TIPO_LABELS[pedidoTyped.tipo]} • Entrega: {formatDate(pedidoTyped.data_entrega)}</p>
        </div>
        <Link href={`/pedidos/${pedidoTyped.id}/editar`} className="btn-secondary flex items-center gap-1 text-sm px-3 py-1.5">
          <Edit size={14} /> Editar
        </Link>
      </div>

      {/* Cliente info */}
      {cliente && (
        <div className="card p-3">
          <p className="text-xs text-gray-500 mb-1">Cliente</p>
          <p className="font-medium text-sm">{cliente.nome}</p>
          <a href={`tel:${cliente.telefone}`} className="text-sm text-brand-600 hover:underline">{formatPhone(cliente.telefone)}</a>
        </div>
      )}

      {/* Detalhes */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-sm text-gray-700">Detalhes</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-gray-500">Tipo</dt>
            <dd className="font-medium">{TIPO_LABELS[pedidoTyped.tipo]}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Topper</dt>
            <dd className="font-medium">{TOPPER_LABELS[pedidoTyped.topper]}</dd>
          </div>
          {pedidoTyped.peso && (
            <div>
              <dt className="text-xs text-gray-500">Peso</dt>
              <dd className="font-medium">{pedidoTyped.peso} kg</dd>
            </div>
          )}
          {pedidoTyped.quantidade && (
            <div>
              <dt className="text-xs text-gray-500">Quantidade</dt>
              <dd className="font-medium">{pedidoTyped.quantidade} un.</dd>
            </div>
          )}
        </dl>
        {pedidoTyped.descricao && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Descrição</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedidoTyped.descricao}</p>
          </div>
        )}
      </div>

      {/* Imagens */}
      <ImagensSection pedidoId={pedidoTyped.id} imagens={imagens ?? []} />

      {/* Precificação — aparece quando status = feito e tipo = bolo */}
      {pedidoTyped.tipo === "bolo" && (pedidoTyped.status === "feito" || pedidoTyped.status === "entregue") && (
        <PrecificacaoForm pedido={pedidoTyped} />
      )}

      {/* Entrega */}
      {pedidoTyped.status === "entregue" && (
        <EntregaForm pedido={pedidoTyped} valorFinal={valorFinal} />
      )}

      {/* Avançar Status */}
      {proximoStatus && (
        <StatusActions pedidoId={pedidoTyped.id} currentStatus={pedidoTyped.status} proximoStatus={proximoStatus} />
      )}
    </div>
  );
}
