'use client';

import type { OrderStatus, Pedido } from '@/lib/types';

const labels: Record<OrderStatus, string> = {
  pendente: 'Pendente',
  em_producao: 'Em produção',
  entregue: 'Entregue'
};

export function OrdersList({
  pedidos,
  onStatusChange
}: {
  pedidos: Pedido[];
  onStatusChange: (id: string, status: OrderStatus) => Promise<void>;
}) {
  if (!pedidos.length) {
    return <p className="rounded bg-white p-4 shadow">Nenhum pedido encontrado.</p>;
  }

  return (
    <div className="space-y-3">
      {pedidos.map((pedido) => (
        <div key={pedido.id} className="rounded bg-white p-4 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Cliente: {pedido.cliente?.nome ?? pedido.cliente_id}</p>
              <p className="text-sm text-slate-600">
                Entrega: {pedido.data_entrega} | Valor: R$ {pedido.valor.toFixed(2)}
              </p>
              {pedido.observacoes && <p className="text-sm">Obs: {pedido.observacoes}</p>}
            </div>
            <select
              className="rounded border px-3 py-2"
              value={pedido.status}
              onChange={(e) => onStatusChange(pedido.id, e.target.value as OrderStatus)}
            >
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
