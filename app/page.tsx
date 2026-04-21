'use client';

import { ClientForm } from '@/components/client-form';
import { OrderForm } from '@/components/order-form';
import { OrdersList } from '@/components/orders-list';
import type { Cliente, OrderStatus, Pedido } from '@/lib/types';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregarDados() {
    const [clientesRes, pedidosRes] = await Promise.all([fetch('/api/clients'), fetch('/api/orders')]);

    const [clientesData, pedidosData] = await Promise.all([clientesRes.json(), pedidosRes.json()]);

    setClientes(clientesData);
    setPedidos(pedidosData);
    setLoading(false);
  }

  async function atualizarStatus(id: string, status: OrderStatus) {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    await carregarDados();
  }

  useEffect(() => {
    void carregarDados();
  }, []);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Gestão de Pedidos de Bolos</h1>
        <p className="text-slate-600">Uso interno: clientes, pedidos e atualização de status.</p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <ClientForm onCreated={carregarDados} />
        <OrderForm clientes={clientes} onCreated={carregarDados} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Pedidos</h2>
        {loading ? <p>Carregando...</p> : <OrdersList pedidos={pedidos} onStatusChange={atualizarStatus} />}
      </section>
    </main>
  );
}
