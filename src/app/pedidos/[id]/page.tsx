import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertaBadge } from "@/components/AlertaBadge";
import { formatDate, formatPhone, calcularValorFinal, formatCurrency, pedidoNumero } from "@/lib/utils";
import { TIPO_LABELS, TOPPER_LABELS, STATUS_FLOW, type PedidoComCliente } from "@/types/database";
import { Edit, CheckCircle, AlertCircle, MessageCircle, Phone } from "lucide-react";
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
  const numero = pedidoNumero(pedidoTyped.created_at, pedidoTyped.id);

  const telefoneLimpo = cliente?.telefone?.replace(/\D/g, "") ?? "";
  const whatsappHref = telefoneLimpo ? `https://wa.me/55${telefoneLimpo}` : null;

  const isPago = pedidoTyped.status === "entregue" && pedidoTyped.valor_cobrado != null;
  const isEntregeSemValor = pedidoTyped.status === "entregue" && pedidoTyped.valor_cobrado == null;

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] text-gray-400 font-mono mb-0.5">{numero}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{cliente?.nome ?? "Sem cliente"}</h1>
            <StatusBadge status={pedidoTyped.status} />
            <AlertaBadge dataEntrega={pedidoTyped.data_entrega} status={pedidoTyped.status} />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {TIPO_LABELS[pedidoTyped.tipo]} · Entrega: {formatDate(pedidoTyped.data_entrega)}
          </p>
        </div>
        <Link href={`/pedidos/${pedidoTyped.id}/editar`} className="btn-secondary flex items-center gap-1 text-sm px-3 py-1.5">
          <Edit size={14} /> Editar
        </Link>
      </div>

      {/* Banner de pagamento */}
      {isPago && (
        <div className="card p-3 bg-emerald-50 border-emerald-200 flex items-center gap-2.5">
          <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-xs text-emerald-700 font-medium">Pedido entregue e pago</p>
            <p className="text-base font-bold text-emerald-800">{formatCurrency(pedidoTyped.valor_cobrado)}</p>
          </div>
        </div>
      )}
      {isEntregeSemValor && (
        <div className="card p-3 bg-orange-50 border-orange-200 flex items-center gap-2.5">
          <AlertCircle size={18} className="text-orange-400 flex-shrink-0" />
          <p className="text-xs text-orange-700 font-medium">Pedido entregue — registre o valor cobrado abaixo</p>
        </div>
      )}

      {/* Cliente info */}
      {cliente && (
        <div className="card p-3">
          <p className="text-xs text-gray-500 mb-2">Cliente</p>
          <p className="font-medium text-sm mb-1.5">{cliente.nome}</p>
          <div className="flex items-center gap-3">
            <a
              href={`tel:${cliente.telefone}`}
              className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
            >
              <Phone size={13} />
              {formatPhone(cliente.telefone)}
            </a>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-green-600 hover:underline"
              >
                <MessageCircle size={13} />
                WhatsApp
              </a>
            )}
          </div>
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
          {valorFinal != null && (
            <div className="col-span-2">
              <dt className="text-xs text-gray-500">Valor estimado</dt>
              <dd className="font-semibold text-emerald-700">{formatCurrency(valorFinal)}</dd>
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
      <ImagensSection pedidoId={pedidoTyped.id} imagens={imagens ?? []} driveFolderId={pedidoTyped.drive_folder_id} />

      {/* Precificação — aparece quando status = feito ou entregue (todos os tipos) */}
      {(pedidoTyped.status === "feito" || pedidoTyped.status === "entregue") && (
        <PrecificacaoForm pedido={pedidoTyped} />
      )}

      {/* Entrega */}
      {pedidoTyped.status === "entregue" && (
        <EntregaForm pedido={pedidoTyped} valorFinal={valorFinal} />
      )}

      {/* Status */}
      <StatusActions pedidoId={pedidoTyped.id} currentStatus={pedidoTyped.status} proximoStatus={proximoStatus} />
    </div>
  );
}
