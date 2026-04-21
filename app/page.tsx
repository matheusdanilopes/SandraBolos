'use client';

import { AuthForm } from '@/components/auth-form';
import { ClientForm } from '@/components/client-form';
import { OrderForm } from '@/components/order-form';
import { OrdersList } from '@/components/orders-list';
import { getBrowserSupabaseClient, hasSupabaseEnv } from '@/lib/supabase';
import type { Cliente, OrderStatus, Pedido } from '@/lib/types';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  async function getAuthHeader() {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) return undefined;

    const {
      data: { session }
    } = await supabase.auth.getSession();

    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
  }

  async function carregarDados() {
    const headers = await getAuthHeader();

    if (!headers) {
      setToken(null);
      setClientes([]);
      setPedidos([]);
      setLoading(false);
      return;
    }

    setToken(headers.Authorization);

    const [clientesRes, pedidosRes] = await Promise.all([
      fetch('/api/clients', { headers }),
      fetch('/api/orders', { headers })
    ]);

    const [clientesData, pedidosData] = await Promise.all([clientesRes.json(), pedidosRes.json()]);

    setClientes(Array.isArray(clientesData) ? clientesData : []);
    setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
    setLoading(false);
  }

  async function atualizarStatus(id: string, status: OrderStatus) {
    if (!token) return;

    await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ status })
    });

    await carregarDados();
  }

  async function logout() {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;

    await supabase.auth.signOut();
    await carregarDados();
  }

  useEffect(() => {
    void carregarDados();
  }, []);

  if (!hasSupabaseEnv()) {
    return (
      <main className="mx-auto mt-10 max-w-xl rounded bg-white p-6 shadow">
        <h1 className="text-2xl font-bold">Configuração pendente</h1>
        <p className="mt-2 text-slate-700">
          Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no ambiente
          (ex.: Vercel Project Settings → Environment Variables).
        </p>
      </main>
    );
  }

  if (!token && !loading) {
    return <AuthForm onAuthenticated={carregarDados} />;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Pedidos de Bolos</h1>
          <p className="text-slate-600">Uso interno: clientes, pedidos e atualização de status.</p>
        </div>
        <button className="rounded bg-slate-900 px-3 py-2 text-white" onClick={logout}>
          Sair
        </button>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <ClientForm onCreated={carregarDados} authToken={token} />
        <OrderForm clientes={clientes} onCreated={carregarDados} authToken={token} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Pedidos</h2>
        {loading ? <p>Carregando...</p> : <OrdersList pedidos={pedidos} onStatusChange={atualizarStatus} />}
      </section>
    </main>
  );
}
