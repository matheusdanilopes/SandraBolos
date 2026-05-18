import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertaBadge } from "@/components/AlertaBadge";
import { formatDate, formatTime, formatPhone, calcularValorFinal, formatCurrency, pedidoNumero } from "@/lib/utils";
import { TIPO_LABELS, TOPPER_LABELS, STATUS_FLOW, type PedidoComCliente, type ItemPedido, type Produto } from "@/types/database";
import { Edit, CheckCircle, AlertCircle, MessageCircle, Phone, ArrowLeft, Lock, FileEdit } from "lucide-react";
import { StatusActions } from "./StatusActions";
import { PrecificacaoForm } from "./PrecificacaoForm";
import { EntregaForm } from "./EntregaForm";
import { ImagensSection } from "./ImagensSection";
import { ItensForm } from "./ItensForm";

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

  const { data: itens } = await supabase
    .from("itens_pedido")
    .select("*")
    .eq("pedido_id", params.id)
    .order("created_at");

  const { data: produtos } = await supabase
    .from("produtos")
    .select("*")
    .eq("ativo", true)
    .order("nome");

  const cliente = pedidoTyped.clientes ?? null;
  const valorFinal = calcularValorFinal(pedidoTyped);
  const proximoStatus = STATUS_FLOW[pedidoTyped.status];
  const numero = pedidoNumero(pedidoTyped.created_at, pedidoTyped.id);

  const telefoneLimpo = cliente?.telefone?.replace(/\D/g, "") ?? "";
  const whatsappHref = telefoneLimpo ? `https://wa.me/55${telefoneLimpo}` : null;

  const isPago = pedidoTyped.status === "entregue" && pedidoTyped.valor_cobrado != null;
  const isEntregeSemValor = pedidoTyped.status === "entregue" && pedidoTyped.valor_cobrado == null;

  const horaLabel = pedidoTyped.hora_entrega
    ? `Entrega: ${formatDate(pedidoTyped.data_entrega)} às ${formatTime(pedidoTyped.hora_entrega)}`
    : pedidoTyped.hora_retirada
    ? `Retirada: ${formatDate(pedidoTyped.data_entrega)} às ${formatTime(pedidoTyped.hora_retirada)}`
    : `Entrega: ${formatDate(pedidoTyped.data_entrega)}`;

  const precisaPreco = pedidoTyped.status === "novo" || pedidoTyped.status === "produzindo";

  return (
    <div className="py-4 space-y-4">
      {/* Navegação de volta */}
      <div className="flex items-center gap-2 -mb-1">
        <Link
          href="/pedidos"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors py-1 pr-2 rounded-lg hover:bg-gray-100 -ml-1 min-h-[36px]"
        >
          <ArrowLeft size={15} />
          Pedidos
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] text-gray-400 font-mono mb-0.5">{numero}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">
              {cliente?.nome ?? pedidoTyped.nome_cliente ?? "Sem cliente"}
            </h1>
            <StatusBadge status={pedidoTyped.status} />
            <AlertaBadge
              dataEntrega={pedidoTyped.data_entrega}
              status={pedidoTyped.status}
              horaEntrega={pedidoTyped.hora_entrega}
              horaRetirada={pedidoTyped.hora_retirada}
            />
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{TIPO_LABELS[pedidoTyped.tipo]} • {horaLabel}</p>
        </div>
        <Link
          href={`/pedidos/${pedidoTyped.id}/editar`}
          className="btn-secondary flex items-center gap-1.5 text-sm px-3"
        >
          <Edit size={14} /> Editar
        </Link>
      </div>

      {/* Banner de rascunho */}
      {pedidoTyped.status === "rascunho" && (
        <div className="card p-4 bg-amber-50 border-amber-200 space-y-3">
          <div className="flex items-center gap-2.5">
            <FileEdit size={18} className="text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-800 font-semibold">Pedido incompleto</p>
              <p className="text-xs text-amber-600 mt-0.5">Complete as informações para iniciar o fluxo</p>
            </div>
          </div>
          <Link
            href={`/pedidos/${pedidoTyped.id}/editar`}
            className="btn-primary flex items-center justify-center gap-2 text-sm"
          >
            <Edit size={14} />
            Completar Pedido
          </Link>
        </div>
      )}

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
      {cliente ? (
        <div className="card p-4">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Cliente</p>
          <p className="font-semibold text-sm text-gray-900 mb-3">{cliente.nome}</p>
          <div className="flex items-center gap-4">
            <a
              href={`tel:${cliente.telefone}`}
              className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 transition-colors py-2 font-medium"
            >
              <Phone size={15} />
              {formatPhone(cliente.telefone)}
            </a>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 transition-colors py-2 font-medium"
              >
                <MessageCircle size={15} />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      ) : pedidoTyped.nome_cliente ? (
        <div className="card p-4">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Cliente</p>
          <p className="font-semibold text-sm text-gray-900">{pedidoTyped.nome_cliente}</p>
          <p className="text-xs text-gray-400 mt-1">Cadastro incompleto · Vincule ao completar o pedido</p>
        </div>
      ) : null}

      {/* Detalhes */}
      <div className="card p-4 space-y-3">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Detalhes</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-gray-400 mb-0.5">Tipo</dt>
            <dd className="font-medium text-gray-900">{TIPO_LABELS[pedidoTyped.tipo]}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-400 mb-0.5">Topper</dt>
            <dd className="font-medium text-gray-900">{TOPPER_LABELS[pedidoTyped.topper]}</dd>
          </div>
          {pedidoTyped.peso && (
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Peso</dt>
              <dd className="font-medium text-gray-900">{pedidoTyped.peso} kg</dd>
            </div>
          )}
          {pedidoTyped.quantidade && (
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Quantidade</dt>
              <dd className="font-medium text-gray-900">{pedidoTyped.quantidade} un.</dd>
            </div>
          )}
          {pedidoTyped.hora_entrega && (
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Hora de Entrega</dt>
              <dd className="font-medium text-gray-900">{formatTime(pedidoTyped.hora_entrega)}</dd>
            </div>
          )}
          {pedidoTyped.hora_retirada && (
            <div>
              <dt className="text-xs text-gray-400 mb-0.5">Hora de Retirada</dt>
              <dd className="font-medium text-gray-900">{formatTime(pedidoTyped.hora_retirada)}</dd>
            </div>
          )}
          {valorFinal != null && (
            <div className="col-span-2">
              <dt className="text-xs text-gray-400 mb-0.5">Valor estimado</dt>
              <dd className="font-semibold text-emerald-700 text-base">{formatCurrency(valorFinal)}</dd>
            </div>
          )}
        </dl>
        {pedidoTyped.descricao && (
          <div className="pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1.5">Descrição</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{pedidoTyped.descricao}</p>
          </div>
        )}
      </div>

      {/* Itens */}
      <ItensForm
        pedidoId={pedidoTyped.id}
        produtos={(produtos ?? []) as Produto[]}
        itens={(itens ?? []) as ItemPedido[]}
      />

      {/* Imagens */}
      <ImagensSection pedidoId={pedidoTyped.id} imagens={imagens ?? []} driveFolderId={pedidoTyped.drive_folder_id} />

      {/* Precificação — aparece quando status = feito ou entregue */}
      {(pedidoTyped.status === "feito" || pedidoTyped.status === "entregue") && (
        <PrecificacaoForm pedido={pedidoTyped} />
      )}

      {/* Hint de precificação quando status ainda não chegou em "feito" */}
      {precisaPreco && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
          <Lock size={13} className="flex-shrink-0 text-gray-400" />
          Precificação disponível após marcar como <span className="font-medium text-gray-700">Feito</span>
        </div>
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
