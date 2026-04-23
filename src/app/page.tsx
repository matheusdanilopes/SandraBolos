import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDate, isEntregaHoje, pedidoAlerta } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertaBadge } from "@/components/AlertaBadge";
import { TIPO_LABELS, type PedidoComCliente } from "@/types/database";
import { Plus, Package, Loader, CheckCircle, AlertTriangle } from "lucide-react";

async function getDashboardData() {
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("*, clientes(nome)")
    .neq("status", "entregue")
    .order("data_entrega", { ascending: true });

  const todos = pedidos ?? [];

  const hoje = todos.filter((p) => isEntregaHoje(p.data_entrega));
  const produzindo = todos.filter((p) => p.status === "produzindo");
  const atrasados = todos.filter((p) => pedidoAlerta(p.data_entrega) === "atrasado");

  return { todos, hoje, produzindo, atrasados };
}

export default async function DashboardPage() {
  const { todos, hoje, produzindo, atrasados } = await getDashboardData();

  return (
    <div className="py-4 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <Link href="/pedidos/novo" className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={16} />
          Novo Pedido
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-brand-600">{hoje.length}</div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
            <Package size={11} /> Hoje
          </div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{produzindo.length}</div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
            <Loader size={11} /> Produzindo
          </div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{atrasados.length}</div>
          <div className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
            <AlertTriangle size={11} /> Atrasados
          </div>
        </div>
      </div>

      {/* Atrasados alert */}
      {atrasados.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm font-medium text-red-800 flex items-center gap-1.5">
            <AlertTriangle size={15} /> {atrasados.length} pedido{atrasados.length > 1 ? "s" : ""} atrasado{atrasados.length > 1 ? "s" : ""}
          </p>
          <div className="mt-2 space-y-1">
            {atrasados.map((p) => (
              <Link key={p.id} href={`/pedidos/${p.id}`} className="block text-xs text-red-700 hover:underline">
                {(p as unknown as PedidoComCliente).clientes?.nome ?? "Cliente"} — {formatDate(p.data_entrega)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pedidos ativos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Pedidos Ativos</h2>
        {todos.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            <CheckCircle size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum pedido ativo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todos.map((pedido) => (
              <PedidoCard key={pedido.id} pedido={pedido as unknown as PedidoComCliente} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PedidoCard({ pedido }: { pedido: PedidoComCliente }) {
  return (
    <Link href={`/pedidos/${pedido.id}`} className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow active:bg-gray-50 block">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-gray-900 truncate">
            {pedido.clientes?.nome ?? "Sem cliente"}
          </span>
          <StatusBadge status={pedido.status} />
          <AlertaBadge dataEntrega={pedido.data_entrega} status={pedido.status} />
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{TIPO_LABELS[pedido.tipo]}</span>
          <span className="text-gray-300">·</span>
          <span className="text-xs text-gray-500">Entrega: {formatDate(pedido.data_entrega)}</span>
        </div>
      </div>
    </Link>
  );
}
