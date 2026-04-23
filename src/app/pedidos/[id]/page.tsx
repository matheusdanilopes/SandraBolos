import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertaBadge } from "@/components/AlertaBadge";
import { formatDate, formatCurrency, formatPhone, calcularValorFinal } from "@/lib/utils";
import { TIPO_LABELS, TOPPER_LABELS, STATUS_FLOW, STATUS_LABELS } from "@/types/database";
import { Edit, ArrowRight } from "lucide-react";
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

  const { data: imagens } = await supabase
    .from("imagens_pedido")
    .select("*")
    .eq("pedido_id", params.id)
    .order("created_at");

  const cliente = pedido.clientes as { nome: string; telefone: string } | null;
  const valorFinal = calcularValorFinal(pedido);
  const proximoStatus = STATUS_FLOW[pedido.status];

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{cliente?.nome ?? "Sem cliente"}</h1>
            <StatusBadge status={pedido.status} />
            <AlertaBadge dataEntrega={pedido.data_entrega} status={pedido.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{TIPO_LABELS[pedido.tipo]} • Entrega: {formatDate(pedido.data_entrega)}</p>
        </div>
        <Link href={`/pedidos/${pedido.id}/editar`} className="btn-secondary flex items-center gap-1 text-sm px-3 py-1.5">
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
            <dd className="font-medium">{TIPO_LABELS[pedido.tipo]}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Topper</dt>
            <dd className="font-medium">{TOPPER_LABELS[pedido.topper]}</dd>
          </div>
          {pedido.peso && (
            <div>
              <dt className="text-xs text-gray-500">Peso</dt>
              <dd className="font-medium">{pedido.peso} kg</dd>
            </div>
          )}
          {pedido.quantidade && (
            <div>
              <dt className="text-xs text-gray-500">Quantidade</dt>
              <dd className="font-medium">{pedido.quantidade} un.</dd>
            </div>
          )}
        </dl>
        {pedido.descricao && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Descrição</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.descricao}</p>
          </div>
        )}
      </div>

      {/* Imagens */}
      <ImagensSection pedidoId={pedido.id} imagens={imagens ?? []} />

      {/* Precificação — aparece quando status = feito e tipo = bolo */}
      {pedido.tipo === "bolo" && (pedido.status === "feito" || pedido.status === "entregue") && (
        <PrecificacaoForm pedido={pedido} />
      )}

      {/* Entrega */}
      {pedido.status === "entregue" && (
        <EntregaForm pedido={pedido} valorFinal={valorFinal} />
      )}

      {/* Avançar Status */}
      {proximoStatus && (
        <StatusActions pedidoId={pedido.id} currentStatus={pedido.status} proximoStatus={proximoStatus} />
      )}
    </div>
  );
}
